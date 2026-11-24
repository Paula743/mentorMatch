import type { PoolClient } from 'pg';
import { APP_TIMEZONE, SLOT_WEEKS_AHEAD } from '../config/schedule';

type Db = Pick<PoolClient, 'query'>;

export async function localNow(db: Db) {
  const { rows } = await db.query<{ today: string; hour: number; week_start: string }>(
    `SELECT to_char(now() AT TIME ZONE $1::text, 'YYYY-MM-DD') AS today,
            EXTRACT(HOUR FROM now() AT TIME ZONE $1::text)::int AS hour,
            to_char(date_trunc('week', now() AT TIME ZONE $1::text), 'YYYY-MM-DD') AS week_start`,
    [APP_TIMEZONE],
  );
  return rows[0];
}

const WANTED = `
  WITH days AS (
    SELECT d::date AS day
    FROM generate_series(
      date_trunc('week', now() AT TIME ZONE $2::text)::date,
      date_trunc('week', now() AT TIME ZONE $2::text)::date + ($3::int * 7 - 1),
      interval '1 day'
    ) AS d
  ), wanted AS (
    SELECT (days.day + make_interval(hours => w.hour::int)) AT TIME ZONE $2::text AS starts_at
    FROM days
    JOIN weekly_hours w
      ON w.tutor_id = $1::int AND w.weekday = EXTRACT(ISODOW FROM days.day)::int
  )`;

/**
 * Las horas bloqueadas (el tutor canceló esa asesoría) no se reabren solas.
 * Hace que los horarios reales (tabla availability) coincidan con la plantilla semanal
 * del tutor, de hoy en adelante. Nunca toca horas pasadas ni sesiones confirmadas.
 */
export async function syncSlots(db: Db, tutorId: number): Promise<void> {
  const params = [tutorId, APP_TIMEZONE, SLOT_WEEKS_AHEAD];

  // Abre las horas de la plantilla
  await db.query(
    `${WANTED}
     INSERT INTO availability (tutor_id, starts_at, ends_at, is_active)
     SELECT $1::int, wanted.starts_at, wanted.starts_at + interval '1 hour', true
     FROM wanted
     WHERE wanted.starts_at > now()
       AND NOT EXISTS (
         SELECT 1
         FROM availability a
         JOIN bookings b ON b.availability_id = a.id AND b.status = 'CONFIRMED'
         WHERE a.tutor_id = $1::int
           AND a.starts_at <> wanted.starts_at
           AND tstzrange(a.starts_at, a.ends_at) && tstzrange(wanted.starts_at, wanted.starts_at + interval '1 hour')
       )
     ON CONFLICT (tutor_id, starts_at) DO UPDATE SET is_active = true
       WHERE availability.blocked = false`,
    params,
  );

  // Cierra las horas futuras que ya no están en la plantilla y no tienen sesión
  await db.query(
    `${WANTED}
     UPDATE availability a SET is_active = false
     WHERE a.tutor_id = $1::int
       AND a.is_active
       AND a.starts_at > now()
       AND a.starts_at >= (date_trunc('week', now() AT TIME ZONE $2::text) AT TIME ZONE $2::text)
       AND a.starts_at <  (date_trunc('week', now() AT TIME ZONE $2::text) + make_interval(days => $3::int * 7)) AT TIME ZONE $2::text
       AND NOT EXISTS (
         SELECT 1 FROM bookings b WHERE b.availability_id = a.id AND b.status = 'CONFIRMED'
       )
       AND a.starts_at NOT IN (SELECT starts_at FROM wanted)`,
    params,
  );
}
