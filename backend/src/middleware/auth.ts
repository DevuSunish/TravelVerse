import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkeytravelverse2026_change_me_in_production';
    const decoded = jwt.verify(token, secret) as { id: number; username: string };
    req.user = decoded;

    // Asynchronously update last_seen timestamp
    query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [decoded.id]).catch((e: any) => {
      console.warn('Failed to update last_seen:', e.message);
    });

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
}
