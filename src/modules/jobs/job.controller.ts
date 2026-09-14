import type { Request, Response } from 'express';
import * as jobService from './job.service.js';
import { createJobSchema } from './job.schema.js';

export async function createJobHandler(req: Request, res: Response): Promise<void> {
  const parseResult = createJobSchema.safeParse(req.body);

  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({ error: 'Validation Error', details: errorDetails });
    return;
  }

  const job = await jobService.createJob(parseResult.data);
  res.status(201).json(job);
}

export async function getAllJobsHandler(_req: Request, res: Response): Promise<void> {
  const jobs = await jobService.getAllJobs();
  res.status(200).json(jobs);
}

export async function getJobByIdHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Job ID is required and must be a string' });
    return;
  }

  const job = await jobService.getJobById(id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.status(200).json(job);
}
