import type { Job } from '../jobs/job.model.js';
import type { Candidate } from '../candidates/candidate.model.js';

export interface ScoringWeights {
  skills: number;
  experience: number;
  location: number;
  salary: number;
}

export const DEFAULT_SCORING_WEIGHTS: Readonly<ScoringWeights> = {
  skills: 50,
  experience: 20,
  location: 15,
  salary: 15,
};

export interface DimensionScore {
  score: number;
  max: number;
  formatted: string;
  details?: string;
}

export interface ScoreBreakdown {
  skills: DimensionScore;
  experience: DimensionScore;
  location: DimensionScore;
  salary: DimensionScore;
}

export interface FormattedBreakdown {
  skills: string;
  experience: string;
  location: string;
  salary: string;
}

export interface JobRecommendation {
  job: Job;
  overallScore: number;
  breakdown: FormattedBreakdown;
  scoreBreakdown: ScoreBreakdown;
}

export interface CandidateRecommendation {
  candidate: Candidate;
  overallScore: number;
  breakdown: FormattedBreakdown;
  scoreBreakdown: ScoreBreakdown;
}

export interface RecommendationQueryOptions {
  limit?: number;
  weights?: Partial<ScoringWeights>;
}
