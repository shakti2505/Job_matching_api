import { Router } from 'express';
import {
  createJobHandler,
  getAllJobsHandler,
  getJobByIdHandler,
} from './job.controller.js';
import { getCandidateRecommendationsHandler } from '../recommendations/recommendation.controller.js';

export const jobRouter = Router();

jobRouter.post('/', createJobHandler);
jobRouter.get('/', getAllJobsHandler);
jobRouter.get('/:id', getJobByIdHandler);
jobRouter.get('/:id/recommendations', getCandidateRecommendationsHandler);
