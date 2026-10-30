import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getUserByUid, isUserAdmin } from '../db/users.ts';

export interface AuthUserPayload {
  uid: string;
  email: string;
  name?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
  isAdmin?: boolean;
  rawToken?: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'imams-fashion-accra-hmac-secret-2026';

export function createSessionToken(payload: AuthUserPayload): string {
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `imam.${data}.${sig}`;
}

export function verifySessionToken(token: string): AuthUserPayload | null {
  if (!token.startsWith('imam.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return {
      uid: parsed.uid,
      email: parsed.email,
      name: parsed.name,
    };
  } catch {
    return null;
  }
}

export function extractRequestToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.split('Bearer ')[1]?.trim();
    if (bearer) return bearer;
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [rawKey, ...rest] = pair.trim().split('=');
      if (rawKey === 'imam_session') {
        const val = decodeURIComponent(rest.join('='));
        if (val) return val;
      }
    }
  }
  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractRequestToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  req.rawToken = token;

  try {
    if (token.startsWith('imam.')) {
      const sessionUser = verifySessionToken(token);
      if (!sessionUser) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
      }
      const dbUser = await getUserByUid(sessionUser.uid);
      if (!dbUser || dbUser.accountStatus === 'Suspended') {
        return res.status(403).json({ error: 'Account is unavailable or suspended' });
      }
      req.user = sessionUser;
      req.isAdmin = await isUserAdmin(sessionUser.uid);
      return next();
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || '',
    };
    req.isAdmin = await isUserAdmin(decodedToken.uid);
    next();
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, async () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const adminStatus = await isUserAdmin(req.user.uid);
    if (!adminStatus) {
      return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
    }
    req.isAdmin = true;
    next();
  });
};
