import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config';

interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

export const protectRoute = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (!decoded.id || !decoded.email) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token payload' });
    }

    req.user = { userId: decoded.id, email: decoded.email, role: decoded.role };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  next();
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role?: string;
      };
    }
  }
}