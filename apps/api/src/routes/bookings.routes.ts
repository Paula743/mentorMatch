import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBookingSchema, reviewSchema } from '../schemas/advisor.schemas';
import { HttpError } from '../utils/httpError';
import { isUniqueViolation, toId } from '../utils/parse';

/** Sesiones desde el lado del alumno: reservar, cancelar, calificar y responder propuestas. */
export const bookingsRouter = Router();
bookingsRouter.use(authenticate, requireRole('STUDENT'));

// POST /api/bookings
bookingsRouter.post('/', validate(createBookingSchema), async (req, res) => {
  const studentId = req.user!.id;
  const { availability_id, subject_id } = req.body as { availability_id: number; subject_id: number };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const slot = await client.query<{ tutor_id: number }>(
      `SELECT a.tutor_id
       FROM availability a JOIN users u ON u.id = a.tutor_id
       WHERE a.id = $1 AND a.is_active AND a.starts_at > now() AND u.status = 'APPROVED'
       FOR UPDATE OF a`,
      [availability_id],
    );
    if (slot.rows.length === 0) throw new HttpError(404, 'Ese horario no está disponible');

    const offers = await client.query(
      'SELECT 1 FROM advisor_subjects WHERE user_id = $1 AND subject_id = $2',
      [slot.rows[0].tutor_id, subject_id],
    );
    if (offers.rows.length === 0) throw new HttpError(400, 'Ese tutor no ofrece asesorías de esa materia');

    const overlap = await client.query(
      `SELECT 1
       FROM bookings b
       JOIN availability a ON a.id = b.availability_id
       JOIN availability n ON n.id = $2
       WHERE b.student_id = $1 AND b.status = 'CONFIRMED'
         AND tstzrange(a.starts_at, a.ends_at) && tstzrange(n.starts_at, n.ends_at)`,
      [studentId, availability_id],
    );
    if (overlap.rows.length > 0) throw new HttpError(409, 'Ya tienes otra asesoría a esa hora');

    const { rows } = await client.query(
      `INSERT INTO bookings (student_id, availability_id, subject_id)
       VALUES ($1, $2, $3) RETURNING id, status`,
      [studentId, availability_id, subject_id],
    );
    await client.query('COMMIT');
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (isUniqueViolation(error)) throw new HttpError(409, 'Ese horario ya fue reservado');
    throw error;
  } finally {
    client.release();
  }
});

// GET /api/bookings/mine
bookingsRouter.get('/mine', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.status, b.cancelled_by, b.cancel_reason, a.starts_at, a.ends_at,
            t.id AS tutor_id, t.full_name AS tutor_name,
            sub.name AS subject_name,
            r.rating, r.comment,
            (SELECT tr.rating FROM tutor_ratings tr WHERE tr.student_id = b.student_id AND tr.tutor_id = t.id) AS my_tutor_rating,
            p.id AS proposal_id, pa.starts_at AS proposal_starts_at, pa.ends_at AS proposal_ends_at,
            p.message AS proposal_message
     FROM bookings b
     JOIN availability a ON a.id = b.availability_id
     JOIN users t ON t.id = a.tutor_id
     LEFT JOIN subjects sub ON sub.id = b.subject_id
     LEFT JOIN session_reviews r ON r.booking_id = b.id
     LEFT JOIN reschedule_proposals p ON p.booking_id = b.id AND p.status = 'PENDING'
     LEFT JOIN availability pa ON pa.id = p.proposed_availability_id
     WHERE b.student_id = $1
     ORDER BY a.starts_at DESC
     LIMIT 100`,
    [req.user!.id],
  );
  res.json({ data: rows });
});

// PATCH /api/bookings/:id/cancel (libera el horario)
bookingsRouter.patch('/:id/cancel', async (req, res) => {
  const id = toId(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE bookings b SET status = 'CANCELLED', cancelled_at = now(), cancelled_by = 'STUDENT'
       FROM availability a
       WHERE b.id = $1 AND b.student_id = $2 AND b.status = 'CONFIRMED'
         AND a.id = b.availability_id AND a.starts_at > now()
       RETURNING b.id, b.status`,
      [id, req.user!.id],
    );
    if (rows.length === 0) throw new HttpError(404, 'Sesión no encontrada o ya no se puede cancelar');
    await client.query(
      `UPDATE reschedule_proposals SET status = 'CANCELLED', responded_at = now()
       WHERE booking_id = $1 AND status = 'PENDING'`,
      [id],
    );
    await client.query('COMMIT');
    res.json({ data: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// POST /api/bookings/:id/review (solo sesiones ya impartidas)
bookingsRouter.post('/:id/review', validate(reviewSchema), async (req, res) => {
  const id = toId(req.params.id);
  const { rating, comment } = req.body as { rating: number; comment: string | null };

  const found = await pool.query<{ ended: boolean }>(
    `SELECT (a.ends_at < now()) AS ended
     FROM bookings b JOIN availability a ON a.id = b.availability_id
     WHERE b.id = $1 AND b.student_id = $2 AND b.status = 'CONFIRMED'`,
    [id, req.user!.id],
  );
  if (found.rows.length === 0) throw new HttpError(404, 'Sesión no encontrada');
  if (!found.rows[0].ended) throw new HttpError(400, 'Solo puedes calificar una sesión que ya terminó');

  try {
    const { rows } = await pool.query(
      `INSERT INTO session_reviews (booking_id, rating, comment)
       VALUES ($1, $2, $3) RETURNING booking_id, rating, comment`,
      [id, rating, comment],
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'Ya calificaste esta sesión');
    throw error;
  }
});

// POST /api/bookings/proposals/:id/accept (el alumno confirma el nuevo horario)
bookingsRouter.post('/proposals/:id/accept', async (req, res) => {
  const proposalId = toId(req.params.id);
  const client = await pool.connect();
  let slotTaken = false;
  try {
    await client.query('BEGIN');

    const found = await client.query<{
      booking_id: number;
      proposed_availability_id: number;
      status: string;
      booking_status: string;
    }>(
      `SELECT p.booking_id, p.proposed_availability_id, p.status, b.status AS booking_status
       FROM reschedule_proposals p JOIN bookings b ON b.id = p.booking_id
       WHERE p.id = $1 AND b.student_id = $2
       FOR UPDATE OF p, b`,
      [proposalId, req.user!.id],
    );
    const proposal = found.rows[0];
    if (!proposal) throw new HttpError(404, 'Propuesta no encontrada');
    if (proposal.status !== 'PENDING') throw new HttpError(409, 'Esta propuesta ya fue respondida');
    if (proposal.booking_status !== 'CONFIRMED') throw new HttpError(409, 'La sesión ya no está activa');

    const free = await client.query(
      `SELECT 1 FROM availability a
       WHERE a.id = $1 AND a.is_active AND a.starts_at > now()
         AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.availability_id = a.id AND x.status = 'CONFIRMED')`,
      [proposal.proposed_availability_id],
    );

    if (free.rows.length === 0) {
      await client.query(
        `UPDATE reschedule_proposals SET status = 'CANCELLED', responded_at = now() WHERE id = $1`,
        [proposalId],
      );
      slotTaken = true;
    } else {
      await client.query('UPDATE bookings SET availability_id = $2 WHERE id = $1', [
        proposal.booking_id,
        proposal.proposed_availability_id,
      ]);
      await client.query(
        `UPDATE reschedule_proposals SET status = 'ACCEPTED', responded_at = now() WHERE id = $1`,
        [proposalId],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (isUniqueViolation(error)) throw new HttpError(409, 'Ese horario ya fue reservado');
    throw error;
  } finally {
    client.release();
  }

  if (slotTaken) throw new HttpError(409, 'Ese horario ya no está disponible. Pide al tutor otra propuesta');
  res.json({ data: { id: proposalId, status: 'ACCEPTED' } });
});

// POST /api/bookings/proposals/:id/reject
bookingsRouter.post('/proposals/:id/reject', async (req, res) => {
  const { rowCount } = await pool.query(
    `UPDATE reschedule_proposals p SET status = 'REJECTED', responded_at = now()
     FROM bookings b
     WHERE p.id = $1 AND p.booking_id = b.id AND b.student_id = $2 AND p.status = 'PENDING'`,
    [toId(req.params.id), req.user!.id],
  );
  if (rowCount === 0) throw new HttpError(404, 'Propuesta no encontrada o ya respondida');
  res.json({ data: { id: toId(req.params.id), status: 'REJECTED' } });
});
