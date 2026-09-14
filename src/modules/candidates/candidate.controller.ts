import type { Request, Response } from 'express';
import * as candidateService from './candidate.service.js';
import { createCandidateSchema } from './candidate.schema.js';

export async function createCandidateHandler(req: Request, res: Response): Promise<void> {
  const parseResult = createCandidateSchema.safeParse(req.body);

  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({ error: 'Validation Error', details: errorDetails });
    return;
  }

  const candidate = await candidateService.createCandidate(parseResult.data);
  res.status(201).json(candidate);
}

export async function getCandidateByIdHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Candidate ID is required and must be a string' });
    return;
  }

  const candidate = await candidateService.getCandidateById(id);
  if (!candidate) {
    res.status(404).json({ error: 'Candidate not found' });
    return;
  }

  res.status(200).json(candidate);
}
