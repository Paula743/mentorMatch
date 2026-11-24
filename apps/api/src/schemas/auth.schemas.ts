import { z } from 'zod';

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Correo inválido').max(180, 'Máximo 180 caracteres'));

export const fullNameField = z
  .string()
  .trim()
  .min(2, 'Mínimo 2 caracteres')
  .max(120, 'Máximo 120 caracteres');

export const passwordField = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Máximo 72 bytes');

export const registerSchema = z.object({
  full_name: fullNameField,
  email,
  password: passwordField,
  role: z.enum(['STUDENT', 'ADVISOR']).default('STUDENT'),
});

export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Contraseña requerida')
    .max(128)
    ,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
