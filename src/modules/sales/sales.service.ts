import { PrismaClient } from "@prisma/client";
import { CreateSaleDataDto, UpdateSaleDataDto } from "./dto/create-sales.dto";

export class SaleService {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async create(data: CreateSaleDataDto) {
    try {
      const buyer = await this.prisma.user.findUnique({ where: { id: data.buyerId } });
      if (!buyer) throw new Error(`Usuário comprador (buyerId=${data.buyerId}) não encontrado`);

      // addressId agora é opcional: só valida se veio
      if (data.addressId) {
        const address = await this.prisma.address.findUnique({ where: { id: data.addressId } });
        if (!address) throw new Error(`Endereço (addressId=${data.addressId}) não encontrado`);
      }

      const paymentMethod = await this.prisma.paymentMethod.findUnique({ where: { id: data.paymentMethodId } });
      if (!paymentMethod) throw new Error(`Método de pagamento (paymentMethodId=${data.paymentMethodId}) não encontrado`);

      const transportType = await this.prisma.transportTypes.findUnique({ where: { id: data.transportTypeId } });
      if (!transportType) throw new Error(`Tipo de transporte (transportTypeId=${data.transportTypeId}) não encontrado`);

      if (!data.boughtProducts || data.boughtProducts.length === 0) {
        throw new Error("É necessário informar pelo menos um produto para comprar");
      }

      const boughtProductsWithCalculatedValue = await Promise.all(
        data.boughtProducts.map(async (boughtProduct) => {
          const product = await this.prisma.product.findUnique({
            where: { id: boughtProduct.productId },
            select: { id: true, name: true, stock: true, status: true },
          });
          if (!product) throw new Error(`Produto (productId=${boughtProduct.productId}) não encontrado`);
          if (!product.status) throw new Error(`Produto "${product.name}" não está ativo`);

          const sellingUnitProduct = await this.prisma.sellingUnitProduct.findUnique({
            where: { id: boughtProduct.sellingUnitProductId },
            include: { unit: { select: { unit: true, title: true } }, product: { select: { id: true, name: true } } },
          });
          if (!sellingUnitProduct)
            throw new Error(`Unidade de venda (sellingUnitProductId=${boughtProduct.sellingUnitProductId}) não encontrada`);
          if (sellingUnitProduct.productId !== boughtProduct.productId) {
            throw new Error(`A unidade de venda ${boughtProduct.sellingUnitProductId} não pertence ao produto ${boughtProduct.productId}`);
          }

          const calculatedValue = sellingUnitProduct.minPrice * boughtProduct.amount;
          return {
            productId: boughtProduct.productId,
            sellingUnitProductId: boughtProduct.sellingUnitProductId,
            value: calculatedValue,
            amount: boughtProduct.amount,
          };
        })
      );

      return this.prisma.saleData.create({
        data: {
          transportTypeId: data.transportTypeId,
          createdAt: data.createdAt ?? new Date(),
          shippedAt: data.shippedAt,
          arrivedAt: data.arrivedAt,
          transportValue: data.transportValue,
          cargoWeightKg: data.cargoWeightKg,
          productRating: data.productRating ?? 0,
          sellerRating: data.sellerRating ?? 0,
          status: data.status ?? "Pedido realizado!",
          sellerApproved: data.sellerApproved ?? null, // novo campo
          addressId: data.addressId ?? null,
          paymentMethodId: data.paymentMethodId,
          buyerId: data.buyerId,
          paymentCompleted: data.paymentCompleted ?? false,
          boughtProducts: { create: boughtProductsWithCalculatedValue },
        },
        include: {
          boughtProducts: {
            include: {
              product: { select: { id: true, name: true, category: true, variety: true, sellerId: true } },
              sellingUnitProduct: { include: { unit: { select: { unit: true, title: true } } } },
            },
          },
          buyer: { select: { id: true, name: true, email: true } },
          shippingAddress: true,
          paymentMethod: true,
          transportType: true,
        },
      });
    } catch (error) {
      console.error("Erro ao criar venda:", error);
      throw error;
    }
  }

  async getAll() {
    return this.prisma.saleData.findMany({
      include: { boughtProducts: true },
    });
  }

  async getById(id: string) {
    return this.prisma.saleData.findUnique({
      where: { id },
      include: { boughtProducts: true },
    });
  }

  async getSalesForProducer(userId: string) {
    try {
      const sales = await this.prisma.saleData.findMany({
        where: { boughtProducts: { some: { product: { sellerId: userId } } } },
        include: {
          buyer: true,
          boughtProducts: { include: { product: { include: { seller: true } }, sellingUnitProduct: { include: { unit: true } } } },
          shippingAddress: true,
          paymentMethod: true,
          transportType: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return sales.map((sale) => ({
        ...sale,
        buyer: {
          id: sale.buyer.id,
          name: sale.buyer.name,
          email: sale.buyer.email,
          phone_number: sale.buyer.phone_number,
          cpf: sale.buyer.cpf,
        },
        boughtProducts: sale.boughtProducts.map((bp) => ({
          ...bp,
          product: {
            id: bp.product.id,
            name: bp.product.name,
            category: bp.product.category,
            variety: bp.product.variety,
            description: bp.product.description,
            images_Path: bp.product.images_Path,
            productRating: bp.product.productRating,
            sellerId: bp.product.sellerId,
            seller: {
              id: bp.product.seller.id,
              name: bp.product.seller.name,
              email: bp.product.seller.email,
              phone_number: bp.product.seller.phone_number,
            },
          },
          sellingUnitProduct: {
            id: bp.sellingUnitProduct.id,
            minPrice: bp.sellingUnitProduct.minPrice,
            unitId: bp.sellingUnitProduct.unitId,
            unit: {
              id: bp.sellingUnitProduct.unit.id,
              unit: bp.sellingUnitProduct.unit.unit,
              title: bp.sellingUnitProduct.unit.title,
            },
          },
        })),
        shippingAddress: sale.shippingAddress
          ? {
              id: sale.shippingAddress.id,
              addressee: sale.shippingAddress.addressee,
              phone_number_addressee: sale.shippingAddress.phone_number_addressee,
              street: sale.shippingAddress.street,
              number: sale.shippingAddress.number,
              complement: sale.shippingAddress.complement,
              city: sale.shippingAddress.city,
              uf: sale.shippingAddress.uf,
              cep: sale.shippingAddress.cep,
            }
          : null,
        paymentMethod: sale.paymentMethod ? { id: sale.paymentMethod.id, method: sale.paymentMethod.method } : null,
        transportType: sale.transportType
          ? { id: sale.transportType.id, type: sale.transportType.type, valueFreight: sale.transportType.valueFreight }
          : null,
      }));
    } catch (error) {
      console.error("Erro ao buscar vendas do produtor:", error);
      throw error;
    }
  }

  async getPurchasesForBuyer(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone_number: true },
      });

      if (!user) throw new Error(`Usuário (userId=${userId}) não encontrado`);

      const purchases = await this.prisma.saleData.findMany({
        where: { buyerId: userId },
        include: {
          buyer: true,
          boughtProducts: { include: { product: { include: { seller: true } }, sellingUnitProduct: { include: { unit: true } } } },
          shippingAddress: true,
          paymentMethod: true,
          transportType: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return purchases.map((purchase) => ({
        ...purchase,
        buyer: {
          id: purchase.buyer.id,
          name: purchase.buyer.name,
          email: purchase.buyer.email,
          phone_number: purchase.buyer.phone_number,
          cpf: purchase.buyer.cpf,
        },
        boughtProducts: purchase.boughtProducts.map((bp) => ({
          ...bp,
          product: {
            id: bp.product.id,
            name: bp.product.name,
            category: bp.product.category,
            variety: bp.product.variety,
            images_Path: bp.product.images_Path,
            description: bp.product.description,
            productRating: bp.product.productRating,
            sellerId: bp.product.sellerId,
            harvestAt: bp.product.harvestAt,
            stock: bp.product.stock,
            seller: {
              id: bp.product.seller.id,
              name: bp.product.seller.name,
              email: bp.product.seller.email,
              phone_number: bp.product.seller.phone_number,
            },
          },
          sellingUnitProduct: {
            id: bp.sellingUnitProduct.id,
            minPrice: bp.sellingUnitProduct.minPrice,
            unitId: bp.sellingUnitProduct.unitId,
            unit: {
              id: bp.sellingUnitProduct.unit.id,
              unit: bp.sellingUnitProduct.unit.unit,
              title: bp.sellingUnitProduct.unit.title,
            },
          },
        })),
        shippingAddress: purchase.shippingAddress
          ? {
              id: purchase.shippingAddress.id,
              addressee: purchase.shippingAddress.addressee,
              phone_number_addressee: purchase.shippingAddress.phone_number_addressee,
              street: purchase.shippingAddress.street,
              number: purchase.shippingAddress.number,
              complement: purchase.shippingAddress.complement,
              city: purchase.shippingAddress.city,
              uf: purchase.shippingAddress.uf,
              cep: purchase.shippingAddress.cep,
            }
          : null,
        paymentMethod: purchase.paymentMethod ? { id: purchase.paymentMethod.id, method: purchase.paymentMethod.method } : null,
        transportType: purchase.transportType
          ? { id: purchase.transportType.id, type: purchase.transportType.type, valueFreight: purchase.transportType.valueFreight }
          : null,
      }));
    } catch (error) {
      console.error("Erro ao buscar compras do usuário:", error);
      throw error;
    }
  }

  async update(id: string, data: UpdateSaleDataDto) {
    const updateData: any = {
      ...(data.transportTypeId !== undefined && { transportTypeId: data.transportTypeId }),
      ...(data.createdAt && { createdAt: data.createdAt }),
      ...(data.shippedAt && { shippedAt: data.shippedAt }),
      ...(data.arrivedAt && { arrivedAt: data.arrivedAt }),
      ...(data.transportValue !== undefined && { transportValue: data.transportValue }),
      ...(data.cargoWeightKg !== undefined && { cargoWeightKg: data.cargoWeightKg }), // KG
      ...(data.productRating !== undefined && { productRating: data.productRating }),
      ...(data.sellerRating !== undefined && { sellerRating: data.sellerRating }),
      ...(data.sellerApproved !== undefined && { sellerApproved: data.sellerApproved }), // <— NOVO
      ...(data.status !== undefined && { status: data.status }),
      ...(data.addressId !== undefined && { addressId: data.addressId }),
      ...(data.paymentMethodId !== undefined && { paymentMethodId: data.paymentMethodId }),
      ...(data.paymentCompleted !== undefined && { paymentCompleted: data.paymentCompleted }),
      ...(data.buyerId !== undefined && { buyerId: data.buyerId }),
    };

    // opcional: sincronizar status quando sellerApproved vier no update
    if (data.sellerApproved === true) updateData.status = "Aprovado pelo vendedor";
    if (data.sellerApproved === false) updateData.status = "Recusado pelo vendedor";

    if (data.boughtProducts) {
      const boughtProductsWithCalculatedValue = await Promise.all(
        data.boughtProducts.map(async (boughtProduct) => {
          const sellingUnitProduct = await this.prisma.sellingUnitProduct.findUnique({
            where: { id: boughtProduct.sellingUnitProductId },
          });
          if (!sellingUnitProduct) {
            throw new Error(`Unidade de venda (sellingUnitProductId=${boughtProduct.sellingUnitProductId}) não encontrada`);
          }
          const calculatedValue = sellingUnitProduct.minPrice * boughtProduct.amount;
          return {
            productId: boughtProduct.productId,
            sellingUnitProductId: boughtProduct.sellingUnitProductId,
            value: calculatedValue,
            amount: boughtProduct.amount,
          };
        })
      );

      updateData.boughtProducts = {
        deleteMany: {},
        create: boughtProductsWithCalculatedValue,
      };
    }

    return this.prisma.saleData.update({
      where: { id },
      data: updateData,
      include: { boughtProducts: true },
    });
  }

  async delete(id: string) {
    return this.prisma.saleData.delete({ where: { id } });
  }

  async calculateFreight(saleDataId: string, distanceKm: number, pricePerKm: number) {
    const sale = await this.prisma.saleData.findUnique({
      where: { id: saleDataId },
      include: { boughtProducts: true, transportType: true, shippingAddress: true },
    });

    if (!sale) throw new Error(`Venda (saleDataId=${saleDataId}) não encontrada`);

    const baseFreight = sale.transportType.valueFreight;
    const variableFreight = distanceKm * pricePerKm;
    const finalFreight = baseFreight + variableFreight;

    await this.prisma.saleData.update({
      where: { id: saleDataId },
      data: { transportValue: finalFreight },
    });

    return { saleDataId, baseFreight, distanceKm, pricePerKm, variableFreight, transportValue: finalFreight };
  }

  async setSellerDecision(saleId: string, approved: boolean) {
    const sale = await this.prisma.saleData.findUnique({ where: { id: saleId } });
    if (!sale) throw new Error(`Venda (saleDataId=${saleId}) não encontrada`);

    const newStatus = approved ? "Aprovado pelo vendedor" : "Recusado pelo vendedor";

    return this.prisma.saleData.update({
      where: { id: saleId },
      data: { sellerApproved: approved, status: newStatus },
      include: { boughtProducts: true },
    });
  }
}
