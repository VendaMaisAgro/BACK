import { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';

const prisma = new PrismaClient();
const service = new UserService(prisma);

/**
 * Mensagens de erro de validação/regra de negócio lançadas por UserService.create()
 * e UserService.createAdmin() — qualquer outra exceção (ex.: banco indisponível) é
 * uma falha interna e deve virar 500, não 400.
 */
const KNOWN_USER_VALIDATION_ERRORS = new Set([
  'Campos obrigatórios faltando.',
  'Perfil inválido.',
  'CPF ou CNPJ é obrigatório.',
  'CPF inválido.',
  'CPF já cadastrado.',
  'CNPJ inválido.',
  'CNPJ já cadastrado.',
  'Email já cadastrado.',
  'A senha deve conter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma letra minúscula, um número e um caractere especial.',
]);

function isKnownUserValidationError(message: string | undefined): boolean {
  return !!message && KNOWN_USER_VALIDATION_ERRORS.has(message);
}

export class UserController {
  public async createHandler(req: Request, res: Response): Promise<void> {
    try {
      await service.create(req.body);
      res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    } catch (error: any) {
      if (isKnownUserValidationError(error.message)) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
    }
  }

  public createAdminHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const admin = await service.createAdmin(req.body);
      res.status(201).json({ message: 'Usuário admin criado com sucesso!', user: admin });
    } catch (error: any) {
      if (isKnownUserValidationError(error.message)) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar usuário admin.' });
    }
  };

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

      if (req.user?.role !== 'admin' && req.user?.userId !== id) {
        res.status(403).json({ error: 'Forbidden' });
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

      if (req.user?.role !== 'admin' && req.user?.userId !== id) {
        res.status(403).json({ error: 'Forbidden' });
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
      const { id } = req.params;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({ error: 'ID deve ser um UUID válido' });
        return;
      }

      if (req.user?.role !== 'admin' && req.user?.userId !== id) {
        res.status(403).json({ error: 'Forbidden' });
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