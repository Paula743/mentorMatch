import { z } from 'zod';
import { FIRST_HOUR, LAST_HOUR } from '../config/schedule';

const intField = (label: string) =>
  z.coerce.number({ error: `${label} debe ser un número` }).int(`${label} debe ser un número entero`);

const subjectName = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'Cada materia necesita al menos 2 caracteres').max(60, 'Máximo 60 caracteres por materia'));

export const profileSchema = z
  .object({
    bio: z
      .string()
      .trim()
      .min(20, 'La presentación debe tener al menos 20 caracteres')
      .max(600, 'La presentación puede tener máximo 600 caracteres'),
    career_name: z
      .string()
      .trim()
      .min(3, 'Escribe el nombre de tu carrera')
      .max(120, 'Máximo 120 caracteres'),
    semesters_completed: intField('Los semestres cursados')
      .min(0, 'Los semestres cursados no pueden ser negativos')
      .max(20, 'Máximo 20 semestres'),
    semesters_total: intField('El total de semestres')
      .min(1, 'El total de semestres debe ser al menos 1')
      .max(20, 'Máximo 20 semestres'),
    subjects: z
      .array(subjectName)
      .min(1, 'Agrega al menos una materia')
      .max(10, 'Puedes ofrecer máximo 10 materias'),
  })
  .refine((d) => d.semesters_completed <= d.semesters_total, {
    message: 'Los semestres cursados no pueden ser más que el total de la carrera',
    path: ['semesters_completed'],
  });

export const availabilitySchema = z.object({
  slots: z
    .array(
      z.object({
        weekday: z.number().int().min(1).max(7),
        hour: z.number().int().min(FIRST_HOUR).max(LAST_HOUR),
      }),
    )
    .max(7 * (LAST_HOUR - FIRST_HOUR + 1)),
});

export const proposalSchema = z.object({
  availability_id: intField('El horario').positive('Elige un horario'),
  message: z
    .string()
    .trim()
    .max(300, 'El mensaje puede tener máximo 300 caracteres')
    .optional()
    .transform((v) => (v ? v : null)),
});

export const createBookingSchema = z.object({
  availability_id: intField('El horario').positive('Elige un horario'),
  subject_id: intField('La materia').positive('Elige una materia'),
});

export const reviewSchema = z.object({
  rating: intField('La calificación').min(1, 'La calificación mínima es 1').max(5, 'La calificación máxima es 5'),
  comment: z
    .string()
    .trim()
    .max(600, 'El comentario puede tener máximo 600 caracteres')
    .optional()
    .transform((v) => (v ? v : null)),
});

export const tutorRatingSchema = z.object({
  rating: intField('La calificación').min(1, 'La calificación mínima es 1').max(5, 'La calificación máxima es 5'),
});

// El motivo es opcional, así que también se acepta una petición sin cuerpo
export const cancelSchema = z.preprocess(
  (value) => value ?? {},
  z.object({
    reason: z
      .string()
      .trim()
      .max(300, 'El motivo puede tener máximo 300 caracteres')
      .optional()
      .transform((v) => (v ? v : null)),
  }),
);

export const userStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING'], { error: 'Estado inválido' }),
});