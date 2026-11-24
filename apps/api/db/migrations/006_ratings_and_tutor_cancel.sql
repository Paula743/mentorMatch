-- Calificación del tutor (estrellas) con promedio guardado, y cancelación hecha por el tutor.

-- Una calificación por alumno y tutor (el alumno puede cambiarla después)
CREATE TABLE IF NOT EXISTS tutor_ratings (
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, tutor_id),
  CHECK (student_id <> tutor_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_ratings_tutor ON tutor_ratings (tutor_id);

-- Promedio y total guardados en el perfil del tutor 
ALTER TABLE advisor_profiles ADD COLUMN IF NOT EXISTS rating_avg   NUMERIC(2,1);
ALTER TABLE advisor_profiles ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- El promedio se recalcula solo cada vez que cambia una calificación
CREATE OR REPLACE FUNCTION refresh_tutor_rating() RETURNS trigger AS $$
DECLARE
  target INTEGER;
BEGIN
  target := COALESCE(NEW.tutor_id, OLD.tutor_id);
  UPDATE advisor_profiles p
  SET rating_avg = (SELECT round(avg(rating)::numeric, 1) FROM tutor_ratings WHERE tutor_id = target),
      rating_count = (SELECT count(*) FROM tutor_ratings WHERE tutor_id = target)
  WHERE p.user_id = target;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_tutor_rating ON tutor_ratings;
CREATE TRIGGER trg_refresh_tutor_rating
  AFTER INSERT OR UPDATE OR DELETE ON tutor_ratings
  FOR EACH ROW EXECUTE FUNCTION refresh_tutor_rating();

-- Quién canceló la asesoría y por qué
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('STUDENT', 'TUTOR'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Hora que el tutor cancelór
ALTER TABLE availability ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;
