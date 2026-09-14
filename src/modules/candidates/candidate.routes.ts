import { Router } from 'express';
import {
  createCandidateHandler,
  getCandidateByIdHandler,
} from './candidate.controller.js';
import { getJobRecommendationsHandler } from '../recommendations/recommendation.controller.js';

export const candidateRouter = Router();

candidateRouter.post('/', createCandidateHandler);
candidateRouter.get('/:id', getCandidateByIdHandler);
candidateRouter.get('/:id/recommendations', getJobRecommendationsHandler);
