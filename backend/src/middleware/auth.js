import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/http.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      baseId: payload.baseId ?? null,
      name: payload.name,
    };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }
    next();
  };
}

export function assertBaseAccess(user, baseId) {
  const id = Number(baseId);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Valid baseId is required');
  if (user.role !== 'ADMIN' && Number(user.baseId) !== id) {
    throw new HttpError(403, 'You may only operate on your assigned base');
  }
  return id;
}
