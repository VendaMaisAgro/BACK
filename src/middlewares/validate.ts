// src/middlewares/validate.ts
import type { ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateParams = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw result.error;        // errorHandler capturará
    }
    next();
  };
};
