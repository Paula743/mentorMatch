import { Router } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { APP_TIMEZONE, FIRST_HOUR, LAST_HOUR } from '../config/schedule';
import { authenticate, requireRole } from '../middleware/auth';
import { requireApprovedAdvisor } from '../middleware/advisor';
import { validate } from '../middleware/validate';
import { availabilitySchema, cancelSchema, profileSchema, proposalSchema } from '../schemas/advisor.schemas';
import { HttpError } from '../utils/httpError';
import { isUniqueViolation, toId } from '../utils/parse';
import { localNow, syncSlots } from '../utils/slots';

type Db = Pick<PoolClient, 'query'>;

// Solo para tutores con cuenta aprobada.
export const tutorMeRouter = Router();
tutorMeRouter.use(authenticate, requireRole('ADVISOR'), requireApprovedAdvisor);

/* ------------------------------ PERFIL ------------------------------ */

async function loadProfile(db: Db, userId: number) {
  const profile = await db.query(
    `SELECT bio, career_name, semesters_completed, semesters_total
     FROM advisor_profiles WHERE user_id = $1`,
    [userId],
  );
  const subjects = await db.query(
    `SELECT s.id, s.name
     FROM advisor_subjects x JOIN subjects s ON s.id = x.subject_id
     WHERE x.user_id = $1 ORDER BY s.name`,
    [userId],
  );
  return {
    profile: profile.rows[0] ?? null,
    subjects: subjects.rows,
    // El perfil está completo cuando existe y ofrece al menos una materia
    complete: profile.rows.length > 0 && subjects.rows.length > 0,
  };
}

// GET /api/tutors/me/profile
tutorMeRouter.get('/profile', async (req, res) => {
  res.json({ data: await loadProfile(pool, req.user!.id) });
});

// PUT /api/tutors/me/profile
tutorMeRouter.put('/profile', validate(profileSchema), async (req, res) => {
  const userId = req.user!.id;
  const { bio, career_name, semesters_completed, semesters_total, subjects } = req.body as {
    bio: string;
    career_name: string;
    semesters_completed: number;
    semesters_total: number;
    subjects: string[];
  };

  // Sin repetidas, sin importar mayúsculas
  const seen = new Set<string>();
  const names = subjects
    .filter((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((n) => n.charAt(0).toUpperCase() + n.slice(1));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO advisor_profiles (user_id, bio, career_name, semesters_completed, semesters_total)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         bio = EXCLUDED.bio,
         career_name = EXCLUDED.career_name,
         semesters_completed = EXCLUDED.semesters_completed,
         semesters_total = EXCLUDED.semesters_total,
         updated_at = now()`,
      [userId, bio, career_name, semesters_completed, semesters_total],
    );

    const ids: number[] = [];
    for (const name of names) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO subjects (name) VALUES ($1)
         ON CONFLICT ((lower(name))) DO UPDATE SET name = subjects.name
         RETURNING id`,
        [name],
      );
      ids.push(rows[0].id);
    }
    await client.query('DELETE FROM advisor_subjects WHERE user_id = $1', [userId]);
    await client.query(
      'INSERT INTO advisor_subjects (user_id, subject_id) SELECT $1::int, unnest($2::int[])',
      [userId, ids],
    );

    await client.query('COMMIT');
    res.json({ data: await loadProfile(pool, userId) });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

/* ------------------------------ INICIO ------------------------------ */

// GET /api/tutors/me/summary
tutorMeRouter.get('/summary', async (req, res) => {
  const userId = req.user!.id;
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM bookings b JOIN availability a ON a.id = b.availability_id
         WHERE a.tutor_id = $1 AND b.status = 'CONFIRMED' AND a.ends_at >= now()) AS upcoming,
       (SELECT count(*)::int FROM bookings b JOIN availability a ON a.id = b.availability_id
         WHERE a.tutor_id = $1 AND b.status = 'CONFIRMED' AND a.ends_at < now()) AS taught,
       (SELECT rating_avg::float FROM advisor_profiles WHERE user_id = $1) AS avg_rating,
       (SELECT rating_count FROM advisor_profiles WHERE user_id = $1) AS rating_count,
       (SELECT count(*)::int FROM reschedule_proposals p JOIN bookings b ON b.id = p.booking_id
          JOIN availability a ON a.id = b.availability_id
         WHERE a.tutor_id = $1 AND p.status = 'PENDING') AS pending_proposals`,
    [userId],
  );
  const profile = await loadProfile(pool, userId);
  res.json({ data: { ...rows[0], profile_complete: profile.complete } });
});

/* ------------------------- DISPONIBILIDAD --------------------------- */

async function availabilityPayload(db: Db, tutorId: number) {
  const now = await localNow(db);
  const template = await db.query(
    'SELECT weekday, hour FROM weekly_hours WHERE tutor_id = $1 ORDER BY weekday, hour',
    [tutorId],
  );
  // Horas de esta semana que ya tienen una sesión confirmada
  const booked = await db.query(
    `SELECT to_char(a.starts_at AT TIME ZONE $2::text, 'YYYY-MM-DD') AS date,
            EXTRACT(HOUR FROM a.starts_at AT TIME ZONE $2::text)::int AS hour
     FROM bookings b JOIN availability a ON a.id = b.availability_id
     WHERE a.tutor_id = $1 AND b.status = 'CONFIRMED'
       AND a.starts_at >= ($3::date::timestamp AT TIME ZONE $2::text)
       AND a.starts_at <  (($3::date + 7)::timestamp AT TIME ZONE $2::text)
     ORDER BY a.starts_at`,
    [tutorId, APP_TIMEZONE, now.week_start],
  );
  // Horas de esta semana que el tutor canceló y quedaron bloqueadas
  const blocked = await db.query(
    `SELECT to_char(a.starts_at AT TIME ZONE $2::text, 'YYYY-MM-DD') AS date,
            EXTRACT(HOUR FROM a.starts_at AT TIME ZONE $2::text)::int AS hour
     FROM availability a
     WHERE a.tutor_id = $1 AND a.blocked
       AND a.starts_at >= ($3::date::timestamp AT TIME ZONE $2::text)
       AND a.starts_at <  (($3::date + 7)::timestamp AT TIME ZONE $2::text)
     ORDER BY a.starts_at`,
    [tutorId, APP_TIMEZONE, now.week_start],
  );
  return {
    timezone: APP_TIMEZONE,
    week_start: now.week_start,
    now: { date: now.today, hour: now.hour },
    first_hour: FIRST_HOUR,
    last_hour: LAST_HOUR,
    template: template.rows,
    booked: booked.rows,
    blocked: blocked.rows,
  };
}

// GET /api/tutors/me/availability
tutorMeRouter.get('/availability', async (req, res) => {
  const tutorId = req.user!.id;
  await syncSlots(pool, tutorId); // mantiene los horarios de las próximas semanas
  res.json({ data: await availabilityPayload(pool, tutorId) });
});

// PUT /api/tutors/me/availability
tutorMeRouter.put('/availability', validate(availabilitySchema), async (req, res) => {
  const tutorId = req.user!.id;
  const { slots } = req.body as { slots: { weekday: number; hour: number }[] };

  const unique = new Map<string, { weekday: number; hour: number }>();
  for (const s of slots) unique.set(`${s.weekday}-${s.hour}`, s);
  const list = [...unique.values()];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM weekly_hours WHERE tutor_id = $1', [tutorId]);
    if (list.length > 0) {
      await client.query(
        `INSERT INTO weekly_hours (tutor_id, weekday, hour)
         SELECT $1::int, t.w, t.h FROM unnest($2::int[], $3::int[]) AS t(w, h)`,
        [tutorId, list.map((s) => s.weekday), list.map((s) => s.hour)],
      );
    }
    await syncSlots(client, tutorId);
    await client.query('COMMIT');
    res.json({ data: await availabilityPayload(pool, tutorId) });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// GET /api/tutors/me/open-slots  (horarios libres, para proponer un cambio)
tutorMeRouter.get('/open-slots', async (req, res) => {
  const tutorId = req.user!.id;
  await syncSlots(pool, tutorId);
  const { rows } = await pool.query(
    `SELECT a.id, a.starts_at, a.ends_at
     FROM availability a
     WHERE a.tutor_id = $1 AND a.is_active AND a.starts_at > now()
       AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.availability_id = a.id AND b.status = 'CONFIRMED')
     ORDER BY a.starts_at
     LIMIT 80`,
    [tutorId],
  );
  res.json({ data: rows });
});

/* ------------------------- SESIONES AGENDADAS ----------------------- */

// GET /api/tutors/me/bookings?scope=upcoming|past
tutorMeRouter.get('/bookings', async (req, res) => {
  const scope = req.query.scope === 'past' ? 'past' : 'upcoming';
  const condition = scope === 'past' ? 'a.ends_at < now()' : 'a.ends_at >= now()';
  const order = scope === 'past' ? 'DESC' : 'ASC';

  const { rows } = await pool.query(
    `SELECT b.id, a.starts_at, a.ends_at,
            s.id AS student_id, s.full_name AS student_name,
            sub.name AS subject_name,
            r.rating, r.comment, r.created_at AS reviewed_at,
            p.id AS proposal_id, p.status AS proposal_status, p.message AS proposal_message,
            pa.starts_at AS proposal_starts_at, pa.ends_at AS proposal_ends_at
     FROM bookings b
     JOIN availability a ON a.id = b.availability_id AND a.tutor_id = $1
     JOIN users s ON s.id = b.student_id
     LEFT JOIN subjects sub ON sub.id = b.subject_id
     LEFT JOIN session_reviews r ON r.booking_id = b.id
     LEFT JOIN LATERAL (
       SELECT * FROM reschedule_proposals rp WHERE rp.booking_id = b.id ORDER BY rp.id DESC LIMIT 1
     ) p ON true
     LEFT JOIN availability pa ON pa.id = p.proposed_availability_id
     WHERE b.status = 'CONFIRMED' AND ${condition}
     ORDER BY a.starts_at ${order}
     LIMIT 100`,
    [req.user!.id],
  );

  const data = rows.map((row) => ({
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    student: { id: row.student_id, full_name: row.student_name },
    subject: row.subject_name,
    review: row.rating
      ? { rating: row.rating, comment: row.comment, created_at: row.reviewed_at }
      : null,
    proposal: row.proposal_id
      ? {
          id: row.proposal_id,
          status: row.proposal_status,
          message: row.proposal_message,
          starts_at: row.proposal_starts_at,
          ends_at: row.proposal_ends_at,
        }
      : null,
  }));
  res.json({ data });
});

// POST /api/tutors/me/bookings/:id/proposals
tutorMeRouter.post('/bookings/:id/proposals', validate(proposalSchema), async (req, res) => {
  const tutorId = req.user!.id;
  const bookingId = toId(req.params.id);
  const { availability_id, message } = req.body as { availability_id: number; message: string | null };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const booking = await client.query<{ slot_id: number; future: boolean }>(
      `SELECT a.id AS slot_id, (a.starts_at > now()) AS future
       FROM bookings b JOIN availability a ON a.id = b.availability_id
       WHERE b.id = $1 AND a.tutor_id = $2 AND b.status = 'CONFIRMED'
       FOR UPDATE OF b`,
      [bookingId, tutorId],
    );
    if (booking.rows.length === 0) throw new HttpError(404, 'Sesión no encontrada');
    if (!booking.rows[0].future) throw new HttpError(400, 'Esta sesión ya comenzó, no se puede reagendar');
    if (booking.rows[0].slot_id === availability_id) {
      throw new HttpError(400, 'Elige un horario distinto al actual');
    }

    const slot = await client.query(
      `SELECT a.id FROM availability a
       WHERE a.id = $1 AND a.tutor_id = $2 AND a.is_active AND a.starts_at > now()
         AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.availability_id = a.id AND x.status = 'CONFIRMED')`,
      [availability_id, tutorId],
    );
    if (slot.rows.length === 0) throw new HttpError(400, 'Ese horario ya no está disponible');

    const { rows } = await client.query(
      `INSERT INTO reschedule_proposals (booking_id, proposed_availability_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, status, message`,
      [bookingId, availability_id, message],
    );
    await client.query('COMMIT');
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (isUniqueViolation(error)) {
      throw new HttpError(409, 'Esta sesión ya tiene una propuesta pendiente');
    }
    throw error;
  } finally {
    client.release();
  }
});

// POST /api/tutors/me/bookings/:id/cancel
// El tutor cancela sin proponer otro horario. Esa hora queda bloqueada para que nadie más la reserve.
tutorMeRouter.post('/bookings/:id/cancel', validate(cancelSchema), async (req, res) => {
  const tutorId = req.user!.id;
  const bookingId = toId(req.params.id);
  const { reason } = req.body as { reason: string | null };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ availability_id: number }>(
      `UPDATE bookings b
       SET status = 'CANCELLED', cancelled_at = now(), cancelled_by = 'TUTOR', cancel_reason = $3
       FROM availability a
       WHERE b.id = $1 AND a.id = b.availability_id AND a.tutor_id = $2
         AND b.status = 'CONFIRMED' AND a.starts_at > now()
       RETURNING b.availability_id`,
      [bookingId, tutorId, reason],
    );
    if (rows.length === 0) throw new HttpError(404, 'Sesión no encontrada o ya no se puede cancelar');

    await client.query(
      'UPDATE availability SET is_active = false, blocked = true WHERE id = $1',
      [rows[0].availability_id],
    );
    await client.query(
      `UPDATE reschedule_proposals SET status = 'CANCELLED', responded_at = now()
       WHERE booking_id = $1 AND status = 'PENDING'`,
      [bookingId],
    );
    await client.query('COMMIT');
    res.json({ data: { id: bookingId, status: 'CANCELLED' } });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// DELETE /api/tutors/me/proposals/:id (cancela una propuesta pendiente)
tutorMeRouter.delete('/proposals/:id', async (req, res) => {
  const { rowCount } = await pool.query(
    `UPDATE reschedule_proposals p SET status = 'CANCELLED', responded_at = now()
     FROM bookings b JOIN availability a ON a.id = b.availability_id
     WHERE p.id = $1 AND p.booking_id = b.id AND a.tutor_id = $2 AND p.status = 'PENDING'`,
    [toId(req.params.id), req.user!.id],
  );
  if (rowCount === 0) throw new HttpError(404, 'Propuesta no encontrada o ya respondida');
  res.status(204).end();
});
