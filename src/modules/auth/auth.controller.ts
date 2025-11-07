import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RecoverPasswordDto } from './dto/recoverpassword.dto';

const service = new AuthService();

export const login = async (req: Request, res: Response) => {
  const { cpf, cnpj, password } = req.body;

  try {
    const result = await service.login({ cpf, cnpj, password });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(401).json({ error: message });
  }
};

export const logout = async (_req: Request, res: Response) => {
  const result = await service.logout();
  res.json(result);
};

export const recoverPassword = async (req: Request, res: Response) => {
  try {
    const data: RecoverPasswordDto = req.body;
    const result = await service.recoverPassword(data);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
