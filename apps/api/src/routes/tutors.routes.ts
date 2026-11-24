import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { tutorRatingSchema } from '../schemas/advisor.schemas';
import { HttpError } from '../utils/httpError';
import { toId } from '../utils/parse';
import { syncSlots } from '../utils/slots';

export const tutorsRouter = Router();
export const subjectsRouter = Router();

tutorsRouter.use(authenticate);
subjectsRouter.use(authenticate);

// Solo aparecen tutores aprobados con el perfil completo
const TUTOR_SELECT = `
  SELECT u.id, u.full_name, p.bio, p.career_name, p.semesters_completed, p.semesters_total,
    COALESCE((
      SELECT json_agg(json_build_object('id', s.id, 'name', s.name) ORDER BY s.name)
      FROM advisor_subjects x JOIN subjects s ON s.id = x.subject_id
      WHERE x.user_id = u.id
    ), '[]'::json) AS subjects,
    (SELECT count(*)::int FROM availability a
      WHERE a.tutor_id = u.id AND a.is_active AND a.starts_at > now()
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.availability_id = a.id AND b.status = 'CONFIRMED')
    ) AS open_slots,
    p.rating_avg::float AS avg_rating,
    p.rating_count
  FROM users u
  JOIN advisor_profiles p ON p.user_id = u.id
  WHERE u.role = 'ADVISOR' AND u.status = 'APPROVED'
    AND EXISTS (SELECT 1 FROM advisor_subjects x WHERE x.user_id = u.id)`;

tutorsRouter.get('/', async (req, res) => {
  const values: string[] = [];
  let extra = '';

  if (typeof req.query.subject === 'string' && req.query.subject.trim()) {
    values.push(req.query.subject.trim().toLowerCase());
    extra += ` AND EXISTS (
      SELECT 1 FROM advisor_subjects x JOIN subjects s ON s.id = x.subject_id
      WHERE x.user_id = u.id AND lower(s.name) = $${values.length})`;
  }
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    values.push(`%${req.query.q.trim().replace(/[\\%_]/g, '\\$&')}%`);
    extra += ` AND (u.full_name ILIKE $${values.length} OR p.career_name ILIKE $${values.length})`;
  }

  const order = req.query.sort === 'rating'
    ? 'p.rating_avg DESC NULLS LAST, p.rating_count DESC, u.full_name'
    : 'u.full_name';
  const { rows } = await pool.query(`${TUTOR_SELECT}${extra} ORDER BY ${order}`, values);
  res.json({ data: rows });
});

// GET /api/tutors/:id
tutorsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`${TUTOR_SELECT} AND u.id = $1`, [toId(req.params.id)]);
  if (rows.length === 0) throw new HttpError(404, 'Tutor no encontrado');
  res.json({ data: rows[0] });
});

// PUT /api/tutors/:id/rating (solo alumnos que ya tuvieron una sesión terminada con ese tutor)
tutorsRouter.put('/:id/rating', requireRole('STUDENT'), validate(tutorRatingSchema), async (req, res) => {
  const tutorId = toId(req.params.id);
  const studentId = req.user!.id;
  const { rating } = req.body as { rating: number };

  const visible = await pool.query(`${TUTOR_SELECT} AND u.id = $1`, [tutorId]);
  if (visible.rows.length === 0) throw new HttpError(404, 'Tutor no encontrado');

  const had = await pool.query(
    `SELECT 1 FROM bookings b JOIN availability a ON a.id = b.availability_id
     WHERE b.student_id = $1 AND a.tutor_id = $2 AND b.status = 'CONFIRMED' AND a.ends_at < now()
     LIMIT 1`,
    [studentId, tutorId],
  );
  if (had.rows.length === 0) throw new HttpError(403, 'Solo puedes calificar a un tutor con el que ya tuviste una asesoría');

  await pool.query(
    `INSERT INTO tutor_ratings (student_id, tutor_id, rating) VALUES ($1, $2, $3)
     ON CONFLICT (student_id, tutor_id) DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()`,
    [studentId, tutorId, rating],
  );
  const { rows } = await pool.query(
    'SELECT rating_avg::float AS avg_rating, rating_count FROM advisor_profiles WHERE user_id = $1',
    [tutorId],
  );
  res.json({ data: { my_rating: rating, ...rows[0] } });
});

// GET /api/tutors/:id/availability (horarios libres en las próximas semanas)
tutorsRouter.get('/:id/availability', async (req, res) => {
  const id = toId(req.params.id);
  const exists = await pool.query(`${TUTOR_SELECT} AND u.id = $1`, [id]);
  if (exists.rows.length === 0) throw new HttpError(404, 'Tutor no encontrado');

  await syncSlots(pool, id);
  const { rows } = await pool.query(
    `SELECT a.id, a.starts_at, a.ends_at
     FROM availability a
     WHERE a.tutor_id = $1 AND a.is_active AND a.starts_at > now()
       AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.availability_id = a.id AND b.status = 'CONFIRMED')
     ORDER BY a.starts_at
     LIMIT 200`,
    [id],
  );
  res.json({ data: rows });
});

// GET /api/subjects (materias con al menos un tutor visible, para los filtros)
subjectsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, count(DISTINCT u.id)::int AS tutors
     FROM subjects s
     JOIN advisor_subjects x ON x.subject_id = s.id
     JOIN users u ON u.id = x.user_id AND u.role = 'ADVISOR' AND u.status = 'APPROVED'
     JOIN advisor_profiles p ON p.user_id = u.id
     GROUP BY s.id, s.name
     ORDER BY s.name`,
  );
  res.json({ data: rows });
});
