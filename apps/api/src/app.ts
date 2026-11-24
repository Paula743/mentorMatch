import express from 'express';
import cors from 'cors';
import { pool } from './db/pool';
import { authRouter } from './routes/auth.routes';
import { usersRouter } from './routes/users.routes';
import { errorHandler, notFound } from './middleware/errors';
import adminRoutes from "./routes/admin.routes";
import { tutorMeRouter } from './routes/tutorMe.routes';
import { tutorsRouter, subjectsRouter } from './routes/tutors.routes';
import { bookingsRouter } from './routes/bookings.routes';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() });
});

app.get('/api/health/db', async (_req, res) => {
  const result = await pool.query('SELECT now() AS now');
  res.json({ 
    status: 'ok',
    dbTime: result.rows[0].now });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use("/api/admin", adminRoutes);
app.use('/api/tutors/me', tutorMeRouter);
app.use('/api/tutors', tutorsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/bookings', bookingsRouter);

app.use(notFound);
app.use(errorHandler);