import { Request, Response } from "express";
import { CartService } from "./cart.service";
import { AddToCartDto, ClearCartDto } from "./dto/cart.dto";

const cartService = new CartService();

export class CartController {
  async getUserCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = String(req.params.userId);
      const cart = await cartService.getUserCart(userId);
      res.json(cart);
    } catch (error) {
      console.error("Erro ao buscar carrinho:", error);
      res.status(500).json({ error: "Erro ao buscar carrinho" });
    }
  }

  async addToCart(req: Request, res: Response): Promise<void> {
    try {
      const { id, ...cleanedData }: any = req.body; // descarta `id` caso venha

      const item = await cartService.addToCart(
        cleanedData.userId,
        cleanedData.productId,
        cleanedData.sellingUnitProductId,
        cleanedData.amount,
        cleanedData.value
      );
      console.log("Item adicionado ao carrinho:", item);
      res.status(201).json(item);
    } catch (error) {
      console.error("Erro ao adicionar item ao carrinho:", error);
      res.status(500).json({ error: "Erro ao adicionar item ao carrinho" });
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = String(req.params.itemId);
      const { amount, value } = req.body;
      const updatedItem = await cartService.updateItem(itemId, amount, value);
      res.json(updatedItem);
    } catch (error) {
      console.error("Erro ao atualizar item do carrinho:", error);
      res.status(500).json({ error: "Erro ao atualizar item do carrinho" });
    }
  }


  async removeItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = String(req.params.itemId);
      const updatedCart = await cartService.removeItem(itemId);
      res.json(updatedCart);
    } catch (error) {
      console.error("Erro ao remover item do carrinho:", error);
      res.status(500).json({ error: "Erro ao remover item do carrinho" });
    }
  }


  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const data: ClearCartDto = req.body;
      await cartService.clearCart(data.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao limpar carrinho:", error);
      res.status(500).json({ error: "Erro ao limpar carrinho" });
    }
  }
}