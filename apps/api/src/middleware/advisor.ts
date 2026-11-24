import type { RequestHandler } from 'express';
import { pool } from '../db/pool';
import { HttpError } from '../utils/httpError';

export const requireApprovedAdvisor: RequestHandler = async (req, _res, next) => {
  const { rows } = await pool.query<{ status: string }>('SELECT status FROM users WHERE id = $1', [req.user!.id]);
  if (!rows[0]) throw new HttpError(401, 'Usuario no encontrado');
  if (rows[0].status !== 'APPROVED') {
    throw new HttpError(403, 'Tu cuenta aún no ha sido aprobada por un administrador');
  }
  next();
};
