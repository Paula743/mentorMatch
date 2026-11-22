import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '../schemas/auth.schemas';
import { HttpError } from '../utils/httpError';
import { signToken, type Role } from '../utils/jwt';

export const authRouter = Router();

interface UserRow {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: Date;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

// POST /api/auth/register
authRouter.post('/register', validate(registerSchema), async (req, res) => {
  const { full_name, email, password, role } = req.body as RegisterInput;
  const status = role === 'ADVISOR' ? 'PENDING' : 'APPROVED';
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  try {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (full_name, email, password, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, status, created_at`,
      [full_name, email, passwordHash, role, status],
    );
    const user = rows[0];

    if (user.status === 'PENDING') {
     res.status(201).json({ data: { user } });
     return;
    }

    res.status(201).json({ data: { user, token: signToken(user) } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'El correo ya está registrado');
    throw error;
  }
});

// POST /api/auth/login
authRouter.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as LoginInput;

  const { rows } = await pool.query<UserRow & { password: string }>(
    'SELECT id, full_name, email, role, status, created_at, password FROM users WHERE email = $1',
    [email],
  );
  const found = rows[0];

  // Mismo mensaje para correo inexistente y contraseña incorrecta.
  if (!found || !(await bcrypt.compare(password, found.password))) {
    throw new HttpError(401, 'Credenciales inválidas');
  }

  if (found.status === 'PENDING') {
    throw new HttpError(403, 'Tu cuenta está pendiente de aprobación por un administrador');
  }
  if (found.status === 'REJECTED') {
    throw new HttpError(403, 'Tu cuenta fue rechazada. Contacta a un administrador');
  }

  const { password: _hash, ...user } = found;
  res.json({ data: { user, token: signToken(user) } });
});

// GET /api/auth/me  (ruta protegida: requiere token)
authRouter.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query<UserRow>(
    'SELECT id, full_name, email, role, status, created_at FROM users WHERE id = $1',
    [req.user!.id],
  );
  if (!rows[0]) throw new HttpError(401, 'Usuario no encontrado');
  res.json({ data: rows[0] });
});