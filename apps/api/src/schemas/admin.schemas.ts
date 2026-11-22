import { z } from "zod";

const role = z.enum(["STUDENT", "ADVISOR"]);
const id = z.coerce.number().int().positive();
const nonEmpty = (o: object) => Object.keys(o).length > 0;

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(100),
  role,
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    password: z.string().min(8).max(100),
  })
  .partial()
  .refine(nonEmpty, "No hay nada que actualizar");

export const createBookingSchema = z
  .object({
    studentId: id,
    professorId: id,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt > d.startsAt, "La hora de fin debe ser posterior a la de inicio")
  .refine((d) => d.startsAt > new Date(), "No se pueden agendar tutorías en fechas pasadas");

export const updateBookingSchema = z
  .object({
    studentId: id,
    professorId: id,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    status: z.enum(["CONFIRMED", "CANCELLED"]),
  })
  .partial()
  .refine(nonEmpty, "No hay nada que actualizar")
  .refine(
    (d) => !(d.startsAt && d.endsAt) || d.endsAt > d.startsAt,
    "La hora de fin debe ser posterior a la de inicio"
  );