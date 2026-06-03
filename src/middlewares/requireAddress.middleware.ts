import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireAddress = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId as string | undefined;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const address = await prisma.address.findFirst({ where: { userId } });

  if (!address) {
    return res.status(422).json({
      code: 'USER_ADDRESS_REQUIRED',
      message: 'Cadastre um endereço antes de prosseguir com a compra.',
    });
  }

  next();
};
