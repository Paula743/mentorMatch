import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { authenticate, requireRole } from '../middleware/auth';
import { HttpError } from '../utils/httpError';

export const usersRouter = Router();

const roleSchema = z.enum(['STUDENT', 'ADVISOR', 'ADMIN']);
const statusFilterSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

// GET /api/users?role=ADVISOR&status=PENDING  (solo ADMIN)
usersRouter.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  const conditions: string[] = []; //"role = $1", "status = $2"
  const values: string[] = []; //"ADVISOR", "PENDING"

  if (req.query.role !== undefined) {
    const parsed = roleSchema.safeParse(req.query.role);
    if (!parsed.success) throw new HttpError(400, 'Rol inválido');
    values.push(parsed.data);
    conditions.push(`role = $${values.length}`);
  }

  if (req.query.status !== undefined) {
    const parsed = statusFilterSchema.safeParse(req.query.status);
      if (!parsed.success) throw new HttpError(400, 'Estado inválido');
      values.push(parsed.data);
      conditions.push(`status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, status, created_at
       FROM users ${where} ORDER BY created_at DESC`,
      values,
    );

    res.json({ data: rows });
});