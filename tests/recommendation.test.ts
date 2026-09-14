import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import * as candidateService from '../src/modules/candidates/candidate.service.js';
import * as jobService from '../src/modules/jobs/job.service.js';
import * as recommendationService from '../src/modules/recommendations/recommendation.service.js';
import * as recommendationController from '../src/modules/recommendations/recommendation.controller.js';
import type { Candidate } from '../src/modules/candidates/candidate.model.js';
import type { Job } from '../src/modules/jobs/job.model.js';

describe('Recommendation Service & Controller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCandidate: Candidate = {
    id: 'c-100',
    name: 'Bob Smith',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    years_of_experience: 5,
    location: 'Denver, CO',
    expected_salary: 130000,
  };

  const mockJobs: Job[] = [
    {
      id: 'job-best',
      title: 'Senior TS Dev',
      required_skills: [
        { name: 'TypeScript', mustHave: true },
        { name: 'Node.js', mustHave: true },
        { name: 'PostgreSQL', mustHave: false },
      ],
      min_years_experience: 4,
      location: 'Denver, CO',
      salary_min: 120000,
      salary_max: 150000,
      remote_allowed: true,
    },
    {
      id: 'job-good-remote',
      title: 'Fullstack Dev',
      required_skills: [{ name: 'TypeScript', mustHave: true }],
      min_years_experience: 3,
      location: 'San Francisco, CA',
      salary_min: 110000,
      salary_max: 140000,
      remote_allowed: true,
    },
    {
      id: 'job-excluded-must-have',
      title: 'Golang Lead',
      required_skills: [{ name: 'Go', mustHave: true }],
      min_years_experience: 5,
      location: 'Denver, CO',
      salary_min: 150000,
      salary_max: 180000,
      remote_allowed: true,
    },
  ];

  describe('Recommendation Service', () => {
    it('should rank jobs by match score and exclude hard-filtered jobs', async () => {
      vi.spyOn(candidateService, 'getCandidateById').mockResolvedValueOnce(mockCandidate);
      vi.spyOn(jobService, 'getAllJobs').mockResolvedValueOnce(mockJobs);

      const recommendations = await recommendationService.getJobRecommendationsForCandidate('c-100');

      expect(recommendations).not.toBeNull();
      expect(recommendations!.length).toBe(2); // 'job-excluded-must-have' should be excluded
      expect(recommendations![0]!.job.id).toBe('job-best');
      expect(recommendations![0]!.overallScore).toBeGreaterThanOrEqual(recommendations![1]!.overallScore);
    });

    it('should respect the limit parameter', async () => {
      vi.spyOn(candidateService, 'getCandidateById').mockResolvedValueOnce(mockCandidate);
      vi.spyOn(jobService, 'getAllJobs').mockResolvedValueOnce(mockJobs);

      const recommendations = await recommendationService.getJobRecommendationsForCandidate('c-100', {
        limit: 1,
      });

      expect(recommendations).not.toBeNull();
      expect(recommendations!.length).toBe(1);
      expect(recommendations![0]!.job.id).toBe('job-best');
    });

    it('should return null when candidate is not found', async () => {
      vi.spyOn(candidateService, 'getCandidateById').mockResolvedValueOnce(null);

      const recommendations = await recommendationService.getJobRecommendationsForCandidate('non-existent');
      expect(recommendations).toBeNull();
    });

    it('should perform reverse candidate matching for a job', async () => {
      vi.spyOn(jobService, 'getJobById').mockResolvedValueOnce(mockJobs[0]!);
      vi.spyOn(candidateService, 'getAllCandidates').mockResolvedValueOnce([mockCandidate]);

      const candidates = await recommendationService.getCandidateRecommendationsForJob('job-best');
      expect(candidates).not.toBeNull();
      expect(candidates!.length).toBe(1);
      expect(candidates![0]!.candidate.id).toBe('c-100');
    });
  });

  describe('Recommendation Controller', () => {
    it('getJobRecommendationsHandler should return 200 with recommendations list', async () => {
      vi.spyOn(recommendationService, 'getJobRecommendationsForCandidate').mockResolvedValueOnce([
        {
          job: mockJobs[0]!,
          overallScore: 98,
          breakdown: {
            skills: '50/50',
            experience: '20/20',
            location: '15/15',
            salary: '13/15',
          },
          scoreBreakdown: {
            skills: { score: 50, max: 50, formatted: '50/50' },
            experience: { score: 20, max: 20, formatted: '20/20' },
            location: { score: 15, max: 15, formatted: '15/15' },
            salary: { score: 13, max: 15, formatted: '13/15' },
          },
        },
      ]);

      const req = {
        params: { id: 'c-100' },
        query: { limit: '5' },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await recommendationController.getJobRecommendationsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: 'c-100',
          count: 1,
        })
      );
    });

    it('getJobRecommendationsHandler should return 404 if candidate does not exist', async () => {
      vi.spyOn(recommendationService, 'getJobRecommendationsForCandidate').mockResolvedValueOnce(null);

      const req = {
        params: { id: 'unknown-id' },
        query: {},
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await recommendationController.getJobRecommendationsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Candidate not found' });
    });
  });
});
