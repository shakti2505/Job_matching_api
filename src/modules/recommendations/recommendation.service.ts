import * as candidateService from '../candidates/candidate.service.js';
import * as jobService from '../jobs/job.service.js';
import { scoreJobForCandidate } from './scoring.engine.js';
import type {
  JobRecommendation,
  CandidateRecommendation,
  RecommendationQueryOptions,
} from './recommendation.types.js';

export async function getJobRecommendationsForCandidate(
  candidateId: string,
  options?: RecommendationQueryOptions
): Promise<JobRecommendation[] | null> {
  const candidate = await candidateService.getCandidateById(candidateId);
  if (!candidate) {
    return null;
  }

  const allJobs = await jobService.getAllJobs();

  const rankedRecommendations: JobRecommendation[] = [];

  for (const job of allJobs) {
    const scoreResult = scoreJobForCandidate(candidate, job, options?.weights);
    if (scoreResult !== null) {
      rankedRecommendations.push({
        job,
        overallScore: scoreResult.overallScore,
        breakdown: scoreResult.breakdown,
        scoreBreakdown: scoreResult.scoreBreakdown,
      });
    }
  }

  rankedRecommendations.sort((a, b) => b.overallScore - a.overallScore);

  if (options?.limit && options.limit > 0) {
    return rankedRecommendations.slice(0, options.limit);
  }

  return rankedRecommendations;
}

export async function getCandidateRecommendationsForJob(
  jobId: string,
  options?: RecommendationQueryOptions
): Promise<CandidateRecommendation[] | null> {
  const job = await jobService.getJobById(jobId);
  if (!job) {
    return null;
  }

  const allCandidates = await candidateService.getAllCandidates();

  const rankedCandidates: CandidateRecommendation[] = [];

  for (const candidate of allCandidates) {
    const scoreResult = scoreJobForCandidate(candidate, job, options?.weights);
    if (scoreResult !== null) {
      rankedCandidates.push({
        candidate,
        overallScore: scoreResult.overallScore,
        breakdown: scoreResult.breakdown,
        scoreBreakdown: scoreResult.scoreBreakdown,
      });
    }
  }

  rankedCandidates.sort((a, b) => b.overallScore - a.overallScore);

  if (options?.limit && options.limit > 0) {
    return rankedCandidates.slice(0, options.limit);
  }

  return rankedCandidates;
}
