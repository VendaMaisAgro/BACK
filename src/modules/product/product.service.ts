import { PrismaClient } from "@prisma/client";
import { UploadS3Service } from "../upload-S3/uploadS3.service";

export class ProductService {
  private readonly prisma: PrismaClient;
  private readonly uploadService: UploadS3Service;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? new PrismaClient();
    this.uploadService = new UploadS3Service(this.prisma);
  }

  async create(data: any, files?: Express.Multer.File[]) {
    try {
      let imageUrls: string[] = [];

      if (files && files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const { publicUrl } = await this.uploadService.upload(file);
          return publicUrl;
        });
        imageUrls = await Promise.all(uploadPromises);
      }

      const productData: any = {
        sellerId: data.sellerId,
        name: data.name,
        category: data.category,
        variety: data.variety,
        stock: parseInt(data.stock),
        description: data.description,
        images_Path: imageUrls,
        harvestAt: new Date(data.harvestAt),
        productRating: parseFloat(data.productRating ?? 0),
        amountSold: parseInt(data.amountSold ?? 0),
        isNegotiable: data.isNegotiable === true || data.isNegotiable === "true",
        ratingAmount: parseInt(data.ratingAmount ?? 0),
        ratingStarAmount: data.ratingStarAmount ?? [],
        createdAt: new Date(),
        status: data.status !== undefined ? (data.status === true || data.status === "true") : true,
      };

      const product = await this.prisma.product.create({
        data: productData,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          sellingUnitsProduct: true,
        },
      });

      if (data.sellingUnitsProduct && data.sellingUnitsProduct.length > 0) {
        const sellingUnitsData = data.sellingUnitsProduct.map((unit: any) => ({
          productId: product.id,
          unitId: unit.unitId,
          minPrice: parseFloat(unit.minPrice),
        }));

        await this.prisma.sellingUnitProduct.createMany({
          data: sellingUnitsData,
        });

        const productWithUnits = await this.prisma.product.findUnique({
          where: { id: product.id },
          include: {
            seller: { select: { id: true, name: true, email: true } },
            sellingUnitsProduct: { include: { unit: true } },
          },
        });

        return productWithUnits;
      }

      return product;
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      throw error;
    }
  }

  async getAll(name?: string, category?: string) {
    const where: any = {};
    if (name) where.name = { contains: name, mode: "insensitive" };
    if (category) where.category = { contains: category, mode: "insensitive" };

    return this.prisma.product.findMany({
      where,
      include: {
        sellingUnitsProduct: { include: { unit: true } },
        boughtProducts: true,
        questions: true,
        seller: { select: { id: true, name: true, phone_number: true, email: true } },
      },
    });
  }

  async getAllByUser(sellerId: string, name?: string, category?: string) {
    const where: any = { sellerId };
    if (name) where.name = { contains: name, mode: "insensitive" };
    if (category) where.category = { contains: category, mode: "insensitive" };

    return this.prisma.product.findMany({
      where,
      include: {
        sellingUnitsProduct: { include: { unit: true } },
        boughtProducts: true,
        questions: true,
        seller: { select: { id: true, name: true, phone_number: true, email: true } },
      },
    });
  }

  async getById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        sellingUnitsProduct: { include: { unit: true } },
        boughtProducts: true,
        questions: true,
        seller: { select: { id: true, name: true, phone_number: true, email: true } },
      },
    });
  }

  async update(id: string, data: any, files?: Express.Multer.File[]) {
    try {
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
        select: { images_Path: true }
      });

      if (!existingProduct) {
        throw new Error("Produto não encontrado");
      }

      const sellingUnitsToUpdate = data.sellingUnitsProduct;

      let newImageUrls: string[] = [];
      if (files && files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const { publicUrl } = await this.uploadService.upload(file);
          return publicUrl; // URL permanente
        });
        newImageUrls = await Promise.all(uploadPromises);
      }

      let existingFromClient: string[] = [];
      if (Array.isArray(data.existingImages)) {
        existingFromClient = data.existingImages.filter(
          (u: any) => typeof u === "string" && u.trim() !== ""
        );
      }

      const baseExisting = existingFromClient.length > 0
        ? existingFromClient
        : (existingProduct.images_Path || []);

      const removedImages = (existingProduct.images_Path || []).filter(
        (oldUrl: string) => !baseExisting.includes(oldUrl)
      );

      if (removedImages.length > 0) {
        const deletePromises = removedImages.map(async (url: string) => {
          try {
            const key = this.extractKeyFromUrl(url);
            if (key) {
              await this.uploadService.delete(key);
            }
          } catch (error) {
            console.warn(`Erro ao deletar imagem ${url}:`, error);
          }
        });
        await Promise.allSettled(deletePromises);
      }

      const seen = new Set<string>();
      const finalImageUrls = [...baseExisting, ...newImageUrls].filter((u) => {
        const key = String(u).trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const updateData: any = { images_Path: finalImageUrls };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.variety !== undefined) updateData.variety = data.variety;
      if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
      if (data.description !== undefined) updateData.description = data.description;
      if (data.harvestAt !== undefined) updateData.harvestAt = new Date(data.harvestAt);
      if (data.productRating !== undefined) updateData.productRating = parseFloat(data.productRating);
      if (data.amountSold !== undefined) updateData.amountSold = parseInt(data.amountSold);
      if (data.ratingAmount !== undefined) updateData.ratingAmount = parseInt(data.ratingAmount);
      if (data.ratingStarAmount !== undefined) updateData.ratingStarAmount = data.ratingStarAmount;

      if (data.isNegotiable !== undefined) {
        updateData.isNegotiable = data.isNegotiable === "true" || data.isNegotiable === true;
      }
      if (data.status !== undefined) {
        updateData.status = data.status === "true" || data.status === true;
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          sellingUnitsProduct: true,
        },
      });

      if (sellingUnitsToUpdate && Array.isArray(sellingUnitsToUpdate)) {
        const processedUnits = sellingUnitsToUpdate.map((unit: any) => {
          const unitId = unit.unitId ?? unit.id;
          const minPrice =
            unit.minPrice !== undefined
              ? parseFloat(unit.minPrice)
              : unit.price !== undefined
                ? parseFloat(unit.price)
                : NaN;

          if (!unitId || isNaN(minPrice)) {
            throw new Error(
              "Unidades de venda inválidas. Cada unidade deve ter unitId e minPrice válidos."
            );
          }
          return { unitId, minPrice };
        });

        await this.prisma.sellingUnitProduct.deleteMany({ where: { productId: id } });

        if (processedUnits.length > 0) {
          await this.prisma.sellingUnitProduct.createMany({
            data: processedUnits.map((u) => ({
              productId: id,
              unitId: u.unitId,
              minPrice: u.minPrice,
            })),
          });
        }

        const productWithUpdatedUnits = await this.prisma.product.findUnique({
          where: { id },
          include: {
            seller: { select: { id: true, name: true, email: true } },
            sellingUnitsProduct: { include: { unit: true } },
          },
        });

        return productWithUpdatedUnits;
      }

      return updatedProduct;
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      throw error;
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return decodeURIComponent(urlObj.pathname.substring(1));
    } catch (error) {
      console.warn("Erro ao extrair key da URL:", url, error);
      return null;
    }
  }

  async delete(id: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        select: { images_Path: true },
      });
      if (!product) throw new Error("Produto não encontrado");

      await this.prisma.product.delete({ where: { id } });

      return { message: "Produto deletado com sucesso" };
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      throw error;
    }
  }

  async getSellingUnits() {
    return this.prisma.sellingUnit.findMany({ orderBy: { title: "asc" } });
  }
}
