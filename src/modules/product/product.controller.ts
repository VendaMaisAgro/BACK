import { Request, Response } from "express";
import { ProductService } from "./product.service";

const service = new ProductService();

export class ProductController {
  async create(req: Request, res: Response) {
    try {
      // Parse de payloads que podem vir como string (FormData)
      if (typeof req.body.sellingUnitsProduct === "string") {
        req.body.sellingUnitsProduct = JSON.parse(req.body.sellingUnitsProduct);
      }
      if (typeof req.body.ratingStarAmount === "string") {
        req.body.ratingStarAmount = JSON.parse(req.body.ratingStarAmount);
      }

      // Coerção de tipos simples
      if (req.body.stock !== undefined) req.body.stock = parseInt(req.body.stock);
      if (req.body.productRating !== undefined) req.body.productRating = parseFloat(req.body.productRating);
      if (req.body.amountSold !== undefined) req.body.amountSold = parseInt(req.body.amountSold);
      if (req.body.ratingAmount !== undefined) req.body.ratingAmount = parseInt(req.body.ratingAmount);
      if (req.body.isNegotiable !== undefined) req.body.isNegotiable = req.body.isNegotiable === "true" || req.body.isNegotiable === true;

      const result = await service.create(req.body, req.files as Express.Multer.File[]);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Erro ao criar produto:", error);

      if (error?.message?.includes("não encontrado")) {
        return res.status(400).json({ error: error.message });
      }
      if (error?.code === "P2003") {
        return res.status(400).json({
          error: "Erro de referência: verifique se o vendedor e as unidades de venda existem",
        });
      }
      if (error?.message?.includes("Arquivo não enviado")) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to create product" });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const name = req.query.name as string | undefined;
      const category = req.query.category as string | undefined;
      const result = await service.getAll(name, category);
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }

  async getAllByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const name = req.query.name as string | undefined;
      const category = req.query.category as string | undefined;

      const result = await service.getAllByUser(userId, name, category);
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch products by user" });
    }
  }

  public getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await service.getById(id);
      if (!result) return res.status(404).json({ error: "Product not found" });
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  };

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id;

      // Parse de possíveis strings JSON vindas via FormData
      if (typeof req.body.sellingUnitsProduct === "string") {
        req.body.sellingUnitsProduct = JSON.parse(req.body.sellingUnitsProduct);
      }
      if (typeof req.body.ratingStarAmount === "string") {
        req.body.ratingStarAmount = JSON.parse(req.body.ratingStarAmount);
      }
      // NOVO: aceitar lista de imagens que o FE quer manter
      if (typeof req.body.existingImages === "string") {
        try {
          req.body.existingImages = JSON.parse(req.body.existingImages);
        } catch {
          req.body.existingImages = undefined;
        }
      }

      const result = await service.update(id, req.body, req.files as Express.Multer.File[]);
      res.json(result);
    } catch (error: any) {
      console.error("Erro ao atualizar produto:", error);

      if (error?.message?.includes("não encontrado")) {
        return res.status(404).json({ error: error.message });
      }
      if (error?.message?.includes("inválido")) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to update product" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id; // id é UUID (String) no schema
      await service.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error(error);

      if (error?.message?.includes("não encontrado")) {
        return res.status(404).json({ error: error.message });
      }
      if (error?.code === "P2003") {
        return res.status(400).json({
          error: "Não é possível deletar este produto pois ele possui registros relacionados",
        });
      }

      res.status(500).json({ error: "Failed to delete product" });
    }
  }

  async getSellingUnits(req: Request, res: Response) {
    try {
      const result = await service.getSellingUnits();
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch selling units" });
    }
  }
}
