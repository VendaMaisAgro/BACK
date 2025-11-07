import { Request, Response } from "express";
import { SellingUnitProductService } from "./sellingUnitProduct.service";

const service = new SellingUnitProductService();

export class SellingUnitProductController {

  async create(req: Request, res: Response) {
    try {
      const result = await service.create(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error(error);

      if (error.message && (
        error.message.includes('não encontrado') ||
        error.message.includes('não encontrada') ||
        error.message.includes('Já existe')
      )) {
        return res.status(400).json({ error: error.message });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          error: "Erro de referência: Verifique se o produto e a unidade de venda existem"
        });
      }

      if (error.code === 'P2002') {
        return res.status(400).json({
          error: "Esta combinação de produto e unidade de venda já existe"
        });
      }

      res.status(500).json({ error: "Erro interno do servidor ao criar unidade de venda do produto" });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const result = await service.getAll();
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Erro interno do servidor ao buscar unidades de venda dos produtos" });
    }
  }

  async getByProductId(req: Request, res: Response) {
    try {
      const productId = parseInt(req.params.productId, 10);

      if (isNaN(productId)) {
        return res.status(400).json({ error: "ID do produto deve ser um número válido" });
      }

      const result = await service.getByProductId(productId.toString());
      res.json(result);
    } catch (error: any) {
      console.error(error);

      if (error.message && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Erro interno do servidor ao buscar unidades de venda do produto" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID deve ser um número válido" });
      }

      const result = await service.getById(id.toString());

      if (!result) {
        return res.status(404).json({ error: "Unidade de venda do produto não encontrada" });
      }

      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Erro interno do servidor ao buscar unidade de venda do produto" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID deve ser um número válido" });
      }

      const result = await service.update(id.toString(), req.body);
      res.json(result);
    } catch (error: any) {
      console.error(error);

      if (error.message && (
        error.message.includes('não encontrado') ||
        error.message.includes('não encontrada') ||
        error.message.includes('Já existe')
      )) {
        return res.status(400).json({ error: error.message });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          error: "Erro de referência: Verifique se a unidade de venda existe"
        });
      }

      if (error.code === 'P2002') {
        return res.status(400).json({
          error: "Esta combinação de produto e unidade de venda já existe"
        });
      }

      res.status(500).json({ error: "Erro interno do servidor ao atualizar unidade de venda do produto" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID deve ser um número válido" });
      }

      await service.delete(id.toString());
      res.status(204).send();
    } catch (error: any) {
      console.error(error);

      if (error.message && error.message.includes('não encontrada')) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message && error.message.includes('Não é possível deletar')) {
        return res.status(400).json({ error: error.message });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          error: "Não é possível deletar esta unidade de venda pois possui registros relacionados"
        });
      }

      res.status(500).json({ error: "Erro interno do servidor ao deletar unidade de venda do produto" });
    }
  }

  async deleteByProductId(req: Request, res: Response) {
    try {
      const productId = parseInt(req.params.productId, 10);

      if (isNaN(productId)) {
        return res.status(400).json({ error: "ID do produto deve ser um número válido" });
      }

      const result = await service.deleteByProductId(productId.toString());
      res.json({
        message: "Unidades de venda do produto deletadas com sucesso",
        deletedCount: result.count
      });
    } catch (error: any) {
      console.error(error);

      if (error.message && error.message.includes('não encontrado')) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message && error.message.includes('Não é possível deletar')) {
        return res.status(400).json({ error: error.message });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          error: "Não é possível deletar as unidades de venda pois possuem registros relacionados"
        });
      }

      res.status(500).json({ error: "Erro interno do servidor ao deletar unidades de venda do produto" });
    }
  }
}