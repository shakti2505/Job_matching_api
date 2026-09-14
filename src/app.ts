import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import 'express-async-errors';
import { candidateRouter } from './modules/candidates/candidate.routes.js';
import { jobRouter } from './modules/jobs/job.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/candidates', candidateRouter);
app.use('/jobs', jobRouter);

// Fallback 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});
