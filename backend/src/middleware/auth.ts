import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env.js';

export function getExpectedToken(): string {
  const secret = config.encryptionKey || 'syncra_fallback_secret_key_2026';
  return crypto.createHmac('sha256', secret).update(`auth_${config.dashboardPassword}`).digest('hex');
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Public bypass paths
  const path = req.path;
  if (
    path === '/auth/login' ||
    path === '/auth/check' ||
    path === '/health' ||
    path.includes('/callback')
  ) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.headers['x-syncra-key'] as string);

  if (!token) {
    res.status(401).json({ error: 'Access token required. Please unlock with password.', authenticated: false });
    return;
  }

  const expected = getExpectedToken();
  if (token !== expected) {
    res.status(401).json({ error: 'Invalid or expired session. Please re-enter password.', authenticated: false });
    return;
  }

  next();
}
