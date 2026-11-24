import { Router } from "express";
import bcrypt from "bcrypt"; // usa la MISMA librería de hash que en auth.routes.ts
import { pool } from "../db/pool";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { HttpError } from "../utils/httpError";
import {
  createUserSchema, updateUserSchema, createBookingSchema, updateBookingSchema,
} from "../schemas/admin.schemas";
import { userStatusSchema } from "../schemas/advisor.schemas";

const router = Router();
router.use(authenticate, requireRole("ADMIN")); // todo lo de aquí es solo para administradores

const toId = (v: string | string[]) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Id inválido");
  return n;
}

/* ---------- RESUMEN ---------- */
router.get("/summary", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM users WHERE role = 'STUDENT')  AS students,
      (SELECT count(*)::int FROM users WHERE role = 'ADVISOR')  AS professors,
      (SELECT count(*)::int FROM users
        WHERE role = 'ADVISOR' AND status = 'PENDING')          AS pending_advisors,
      (SELECT count(*)::int FROM bookings)                      AS bookings,
      (SELECT count(*)::int FROM bookings b
         JOIN availability a ON a.id = b.availability_id
        WHERE b.status = 'CONFIRMED' AND a.starts_at > now())   AS upcoming
  `);
  res.json(rows[0]);
});

/* ---------- ALUMNOS Y PROFESORES (users) ---------- */
const USER_COLS = "id, full_name, email, role, status, created_at";

router.get("/users", async (req, res) => {
  const role = req.query.role === "ADVISOR" ? "ADVISOR" : "STUDENT";
  const status = ["PENDING", "APPROVED", "REJECTED"].includes(String(req.query.status))
    ? String(req.query.status) : null;
  const { rows } = await pool.query(
    `SELECT ${USER_COLS} FROM users
     WHERE role = $1 AND ($2::text IS NULL OR status = $2)
     ORDER BY created_at DESC`, [role, status]);
  res.json(rows);
});

router.post("/users", validate(createUserSchema), async (req, res) => {
  const { full_name, email, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES ($1, $2, $3, $4) RETURNING ${USER_COLS}`,
      [full_name, email, hash, role]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    if (e.code === "23505") throw new HttpError(409, "Ese correo ya está registrado");
    throw e;
  }
});

router.patch("/users/:id", validate(updateUserSchema), async (req, res) => {
  const id = toId(req.params.id);
  const { full_name, email, password } = req.body;
  const hash = password ? await bcrypt.hash(password, 10) : null;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         full_name = COALESCE($2, full_name),
         email     = COALESCE($3, email),
         password  = COALESCE($4, password)
       WHERE id = $1 AND role IN ('STUDENT', 'ADVISOR')
       RETURNING ${USER_COLS}`,
      [id, full_name ?? null, email ?? null, hash]);
    if (rows.length === 0) throw new HttpError(404, "Usuario no encontrado");
    res.json(rows[0]);
  } catch (e: any) {
    if (e.code === "23505") throw new HttpError(409, "Ese correo ya está registrado");
    throw e;
  }
});

// Aprobar o rechazar la cuenta de un tutor
router.patch("/users/:id/status", validate(userStatusSchema), async (req, res) => {
  const id = toId(req.params.id);
  const { rows } = await pool.query(
    `UPDATE users SET status = $2 WHERE id = $1 AND role = 'ADVISOR' RETURNING ${USER_COLS}`,
    [id, req.body.status]);
  if (rows.length === 0) throw new HttpError(404, "Tutor no encontrado");
  res.json(rows[0]);
});

router.delete("/users/:id", async (req, res) => {
  const id = toId(req.params.id);
  const { rowCount } = await pool.query(
    "DELETE FROM users WHERE id = $1 AND role IN ('STUDENT', 'ADVISOR')", [id]);
  if (rowCount === 0) throw new HttpError(404, "Usuario no encontrado");
  res.status(204).end();
});

/* ---------- TUTORÍAS AGENDADAS (bookings) ---------- */
const BOOKING_SELECT = `
  SELECT b.id, b.status, b.created_at,
         s.id AS student_id,   s.full_name AS student_name,
         t.id AS professor_id, t.full_name AS professor_name,
         a.id AS availability_id, a.starts_at, a.ends_at
  FROM bookings b
  JOIN users s        ON s.id = b.student_id
  JOIN availability a ON a.id = b.availability_id
  JOIN users t        ON t.id = a.tutor_id`;

const getBooking = async (id: number) =>
  (await pool.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows[0];

const mustBeRole = async (client: any, userId: number, role: string, label: string) => {
  const r = await client.query("SELECT 1 FROM users WHERE id = $1 AND role = $2", [userId, role]);
  if (r.rowCount === 0) throw new HttpError(404, `${label} no encontrado`);
};

const bookingDbError = (e: any) => {
  if (e.code === "23505")
    throw new HttpError(409, "Ese horario ya está ocupado o el profesor ya tiene una tutoría a esa hora");
  if (e.code === "23514")
    throw new HttpError(400, "La hora de fin debe ser posterior a la de inicio");
  throw e;
};

router.get("/bookings", async (_req, res) => {
  const { rows } = await pool.query(`${BOOKING_SELECT} ORDER BY a.starts_at DESC`);
  res.json(rows);
});

router.post("/bookings", validate(createBookingSchema), async (req, res) => {
  const { studentId, professorId, startsAt, endsAt } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await mustBeRole(client, studentId, "STUDENT", "Alumno");
    await mustBeRole(client, professorId, "ADVISOR", "Profesor");
    const slot = await client.query(
      "INSERT INTO availability (tutor_id, starts_at, ends_at) VALUES ($1, $2, $3) RETURNING id",
      [professorId, startsAt, endsAt]);
    const bk = await client.query(
      "INSERT INTO bookings (student_id, availability_id) VALUES ($1, $2) RETURNING id",
      [studentId, slot.rows[0].id]);
    await client.query("COMMIT");
    res.status(201).json(await getBooking(bk.rows[0].id));
  } catch (e: any) {
    await client.query("ROLLBACK");
    bookingDbError(e);
  } finally {
    client.release();
  }
});

router.patch("/bookings/:id", validate(updateBookingSchema), async (req, res) => {
  const id = toId(req.params.id);
  const { studentId, professorId, startsAt, endsAt, status } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query(
      "SELECT availability_id FROM bookings WHERE id = $1 FOR UPDATE", [id]);
    if (cur.rowCount === 0) throw new HttpError(404, "Tutoría no encontrada");
    if (studentId) await mustBeRole(client, studentId, "STUDENT", "Alumno");
    if (professorId) await mustBeRole(client, professorId, "ADVISOR", "Profesor");

    await client.query(
      `UPDATE bookings SET
         student_id   = COALESCE($2, student_id),
         status       = COALESCE($3, status),
         cancelled_at = CASE WHEN COALESCE($3, status) = 'CANCELLED'
                             THEN COALESCE(cancelled_at, now()) ELSE NULL END
       WHERE id = $1`,
      [id, studentId ?? null, status ?? null]);

    await client.query(
      `UPDATE availability SET
         tutor_id  = COALESCE($2, tutor_id),
         starts_at = COALESCE($3, starts_at),
         ends_at   = COALESCE($4, ends_at)
       WHERE id = $1`,
      [cur.rows[0].availability_id, professorId ?? null, startsAt ?? null, endsAt ?? null]);

    await client.query("COMMIT");
    res.json(await getBooking(id));
  } catch (e: any) {
    await client.query("ROLLBACK");
    bookingDbError(e);
  } finally {
    client.release();
  }
});

router.delete("/bookings/:id", async (req, res) => {
  const id = toId(req.params.id);
  const { rowCount } = await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
  if (rowCount === 0) throw new HttpError(404, "Tutoría no encontrada");
  res.status(204).end(); // el horario queda libre de nuevo
});

export default router;