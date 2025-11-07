import { Request, Response, RequestHandler } from "express";
import { SaleService } from "./sales.service";
import { CreateSaleDataDto, UpdateSaleDataDto } from "./dto/create-sales.dto";

const service = new SaleService();

export class SaleController {
  public create: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.create(req.body as CreateSaleDataDto);
      res.status(201).json(result);
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes("não encontrado")) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error.code === "P2003") {
        res.status(400).json({
          error: "Erro de referência: Verifique se todos os IDs informados existem no banco de dados.",
        });
        return;
      }
      res.status(500).json({ error: "Failed to create sale" });
    }
  };

  public getAll: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.getAll();
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  };

  public getById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const result = await service.getById(id);
      if (!result) {
        res.status(404).json({ error: "Sale not found" });
        return;
      }
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch sale" });
    }
  };

  public getSalesForProducer: RequestHandler = async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        res.status(400).json({ error: "userId deve ser uma string (UUID) válida" });
        return;
      }
      const result = await service.getSalesForProducer(userId);
      res.json({
        message: "Vendas do producer obtidas com sucesso",
        totalSales: result.length,
        totalValue: result.reduce((sum, sale) => {
          const saleTotal = sale.boughtProducts.reduce((acc, p) => acc + p.value * p.amount, 0);
          return sum + saleTotal + sale.transportValue;
        }, 0),
        sales: result,
      });
    } catch (error: any) {
      console.error(error);
      if (error.message && (error.message.includes("não encontrado") || error.message.includes("não é um producer"))) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Failed to fetch producer sales" });
    }
  };

  public getPurchasesForBuyer: RequestHandler = async (req, res) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        res.status(400).json({ error: "userId deve ser uma string (UUID) válida" });
        return;
      }
      const result = await service.getPurchasesForBuyer(userId);
      res.json({
        message: "Compras do buyer obtidas com sucesso",
        totalPurchases: result.length,
        totalSpent: result.reduce((sum, purchase) => {
          const purchaseTotal = purchase.boughtProducts.reduce((acc, p) => acc + p.value * p.amount, 0);
          return sum + purchaseTotal + purchase.transportValue;
        }, 0),
        purchases: result,
      });
    } catch (error: any) {
      console.error(error);
      if (error.message && (error.message.includes("não encontrado") || error.message.includes("não é um buyer"))) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Failed to fetch buyer purchases" });
    }
  };

  public update: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const result = await service.update(id, req.body as UpdateSaleDataDto);
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  };

  public delete: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      await service.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete sale" });
    }
  };

  public calculateFreight: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id; // UUID como string
    const { distanceKm, pricePerKm } = req.body;

    if (!id || typeof distanceKm !== "number" || typeof pricePerKm !== "number") {
      res.status(400).json({ message: "Parâmetros inválidos." });
      return;
    }

    try {
      const result = await service.calculateFreight(id, distanceKm, pricePerKm);
      res.status(200).json({ message: "Frete calculado com sucesso.", data: result });
    } catch (error: any) {
      console.error("Erro ao calcular o frete:", error);
      res.status(500).json({ message: error.message || "Erro interno." });
    }
  };

  public setSellerDecision: RequestHandler = async (req, res) => {
    try {
      const id = req.params.id;
      const { approved } = req.body; // boolean

      if (typeof approved !== "boolean") {
        res.status(400).json({ error: "Campo 'approved' deve ser boolean." });
        return;
      }

      const result = await service.setSellerDecision(id, approved);
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to set seller decision" });
    }
  };
}
