import { Request, Response } from "express";
import { AddressService } from "./address.service";

const service = new AddressService();

export class AddressController {
  private isSelfOrAdmin(req: Request, userId: string): boolean {
    return req.user?.role === "admin" || req.user?.userId === userId;
  }

  async add(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!this.isSelfOrAdmin(req, userId)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const address = await service.addAddress(userId, req.body);
      res.status(201).json(address);
    } catch (err: any) {
      res.status(400).json({ error: "Erro ao adicionar endereço", details: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { addressId } = req.params;

      const existing = await service.findById(addressId);
      if (!existing) {
        res.status(404).json({ error: "Endereço não encontrado" });
        return;
      }
      if (!this.isSelfOrAdmin(req, existing.userId)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const address = await service.updateAddress(addressId.toString(), req.body);
      res.json(address);
    } catch (err: any) {
      res.status(400).json({ error: "Erro ao atualizar endereço", details: err.message });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const { addressId } = req.params;

      const existing = await service.findById(addressId);
      if (!existing) {
        res.status(404).json({ error: "Endereço não encontrado" });
        return;
      }
      if (!this.isSelfOrAdmin(req, existing.userId)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await service.deleteAddress(addressId.toString());
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: "Erro ao excluir endereço", details: err.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!this.isSelfOrAdmin(req, userId)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const addresses = await service.listUserAddresses(userId);
      res.json(addresses);
    } catch (err: any) {
      res.status(400).json({ error: "Erro ao listar endereços", details: err.message });
    }
  }

  async setDefault(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { addressId } = req.params;

      if (!this.isSelfOrAdmin(req, userId)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const address = await service.setDefaultAddress(userId, addressId);
      res.json(address);
    } catch (err: any) {
      res.status(400).json({ error: "Erro ao definir endereço padrão", details: err.message });
    }
  }

}
