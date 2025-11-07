import { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';

const prisma = new PrismaClient();
const service = new UserService(prisma);

export class UserController {
  public async createHandler(req: Request, res: Response): Promise<void> {
    try {
      let data = { ...req.body };

      // Parse do securityQuestions se vier como string JSON
      if (typeof data.securityQuestions === 'string') {
        try {
          data.securityQuestions = JSON.parse(data.securityQuestions);
        } catch (error) {
          res.status(400).json({ error: 'securityQuestions deve ser um JSON válido' });
          return;
        }
      }

      const user = await service.create(data, req.file);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  public getAllHandler: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.getAll();
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  };

  public getByIdHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({ error: 'ID deve ser um UUID válido' });
        return;
      }
      const result = await service.getById(id);
      if (!result) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  };

  public updateHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({ error: 'ID deve ser um UUID válido' });
        return;
      }

      const file = req.file;
      const result = await service.update(id, req.body, file);
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  };

  public deleteHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      // Agora o ID é uma string UUID, não precisa converter
      const { id } = req.params;

      // Validação básica de UUID (opcional)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({ error: 'ID deve ser um UUID válido' });
        return;
      }

      await service.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  };
}