import type { Request, Response } from 'express';
import * as recommendationService from './recommendation.service.js';
import type { RecommendationQueryOptions, ScoringWeights } from './recommendation.types.js';

function parseQueryOptions(req: Request): RecommendationQueryOptions {
  const options: RecommendationQueryOptions = {};

  const limitParam = req.query['limit'];
  if (limitParam && typeof limitParam === 'string') {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      options.limit = parsedLimit;
    }
  }

  // Parse optional custom weights
  const skillParam = req.query['skillWeight'] ?? req.query['skillsWeight'] ?? req.query['skills'];
  const expParam = req.query['experienceWeight'] ?? req.query['expWeight'] ?? req.query['experience'];
  const locParam = req.query['locationWeight'] ?? req.query['locWeight'] ?? req.query['location'];
  const salParam = req.query['salaryWeight'] ?? req.query['salWeight'] ?? req.query['salary'];

  if (skillParam || expParam || locParam || salParam) {
    const weights: Partial<ScoringWeights> = {};
    if (skillParam && typeof skillParam === 'string' && !isNaN(Number(skillParam))) {
      weights.skills = Number(skillParam);
    }
    if (expParam && typeof expParam === 'string' && !isNaN(Number(expParam))) {
      weights.experience = Number(expParam);
    }
    if (locParam && typeof locParam === 'string' && !isNaN(Number(locParam))) {
      weights.location = Number(locParam);
    }
    if (salParam && typeof salParam === 'string' && !isNaN(Number(salParam))) {
      weights.salary = Number(salParam);
    }
    options.weights = weights;
  }

  return options;
}

export async function getJobRecommendationsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Candidate ID is required' });
    return;
  }

  const options = parseQueryOptions(req);
  const recommendations = await recommendationService.getJobRecommendationsForCandidate(id, options);

  if (recommendations === null) {
    res.status(404).json({ error: 'Candidate not found' });
    return;
  }

  res.status(200).json({
    candidateId: id,
    count: recommendations.length,
    recommendations,
  });
}

export async function getCandidateRecommendationsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Job ID is required' });
    return;
  }

  const options = parseQueryOptions(req);
  const recommendations = await recommendationService.getCandidateRecommendationsForJob(id, options);

  if (recommendations === null) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.status(200).json({
    jobId: id,
    count: recommendations.length,
    recommendations,
  });
}
