import { describe, it, expect } from 'vitest';
import {
  calculateSkillScore,
  calculateExperienceScore,
  calculateLocationScore,
  calculateSalaryScore,
  scoreJobForCandidate,
  normalizeWeights,
} from '../src/modules/recommendations/scoring.engine.js';
import type { Candidate } from '../src/modules/candidates/candidate.model.js';
import type { Job } from '../src/modules/jobs/job.model.js';

describe('Scoring Engine', () => {
  describe('calculateSkillScore (Hard Filter & Proportional Boosting)', () => {
    it('should exclude candidate if a must-have skill is missing', () => {
      const candidateSkills = ['JavaScript', 'HTML', 'CSS'];
      const jobSkills = [
        { name: 'TypeScript', mustHave: true },
        { name: 'JavaScript', mustHave: false },
      ];

      const result = calculateSkillScore(candidateSkills, jobSkills, 50);
      expect(result.isExcluded).toBe(true);
      expect(result.dimensionScore.score).toBe(0);
      expect(result.exclusionReason).toContain('TypeScript');
    });

    it('should match skills case-insensitively', () => {
      const candidateSkills = ['TYPESCRIPT', 'React'];
      const jobSkills = [
        { name: 'typescript', mustHave: true },
        { name: 'react', mustHave: false },
      ];

      const result = calculateSkillScore(candidateSkills, jobSkills, 50);
      expect(result.isExcluded).toBe(false);
      expect(result.dimensionScore.score).toBe(50);
      expect(result.dimensionScore.formatted).toBe('50/50');
    });

    it('should grant full score if all must-haves and nice-to-haves match', () => {
      const candidateSkills = ['Node.js', 'PostgreSQL', 'Docker', 'AWS'];
      const jobSkills = [
        { name: 'Node.js', mustHave: true },
        { name: 'PostgreSQL', mustHave: true },
        { name: 'Docker', mustHave: false },
        { name: 'AWS', mustHave: false },
      ];

      const result = calculateSkillScore(candidateSkills, jobSkills, 50);
      expect(result.isExcluded).toBe(false);
      expect(result.dimensionScore.score).toBe(50);
    });

    it('should allow candidate with all must-haves but missing nice-to-haves with partial score', () => {
      const candidateSkills = ['Node.js', 'PostgreSQL'];
      const jobSkills = [
        { name: 'Node.js', mustHave: true },
        { name: 'PostgreSQL', mustHave: true },
        { name: 'Kubernetes', mustHave: false },
        { name: 'GraphQL', mustHave: false },
      ];

      const result = calculateSkillScore(candidateSkills, jobSkills, 50);
      expect(result.isExcluded).toBe(false);
      // Total potential: 2*2 + 2*1 = 6 points. Earned: 2*2 = 4 points. Score: (4/6) * 50 = 33.3
      expect(result.dimensionScore.score).toBeCloseTo(33.3, 1);
    });

    it('should give full score if job lists no required skills', () => {
      const result = calculateSkillScore(['Python'], [], 50);
      expect(result.isExcluded).toBe(false);
      expect(result.dimensionScore.score).toBe(50);
    });
  });

  describe('calculateExperienceScore (Penalty vs Exclusion)', () => {
    it('should award full points when candidate meets or exceeds minimum experience', () => {
      const result = calculateExperienceScore(5, 3, 20);
      expect(result.score).toBe(20);
      expect(result.formatted).toBe('20/20');
    });

    it('should award full points when job requires 0 min experience', () => {
      const result = calculateExperienceScore(1, 0, 20);
      expect(result.score).toBe(20);
    });

    it('should proportionally penalize under-qualified candidate instead of disqualifying', () => {
      // 2 years out of 4 required = 50% ratio => 10/20 points
      const result = calculateExperienceScore(2, 4, 20);
      expect(result.score).toBe(10);
      expect(result.formatted).toBe('10/20');
    });
  });

  describe('calculateLocationScore', () => {
    it('should award full points (15/15) for exact location match', () => {
      const result = calculateLocationScore('Austin, TX', 'Austin, TX', false, 15);
      expect(result.score).toBe(15);
      expect(result.formatted).toBe('15/15');
    });

    it('should award full points if job location is Remote', () => {
      const result = calculateLocationScore('Seattle, WA', 'Remote', false, 15);
      expect(result.score).toBe(15);
    });

    it('should award 10/15 points if location differs but remoteAllowed is true', () => {
      const result = calculateLocationScore('Boston, MA', 'San Francisco, CA', true, 15);
      expect(result.score).toBe(10);
      expect(result.formatted).toBe('10/15');
    });

    it('should award 0/15 points if location differs and remoteAllowed is false', () => {
      const result = calculateLocationScore('Boston, MA', 'San Francisco, CA', false, 15);
      expect(result.score).toBe(0);
      expect(result.formatted).toBe('0/15');
    });
  });

  describe('calculateSalaryScore', () => {
    it('should award full points (15/15) when job min exceeds candidate expectation', () => {
      const result = calculateSalaryScore(100000, 110000, 140000, 15);
      expect(result.score).toBe(15);
      expect(result.formatted).toBe('15/15');
    });

    it('should award high score when candidate expectation is within range', () => {
      const result = calculateSalaryScore(120000, 100000, 140000, 15);
      expect(result.score).toBeGreaterThanOrEqual(10);
      expect(result.score).toBeLessThanOrEqual(15);
    });

    it('should award 0 points when candidate expectation far exceeds job maximum', () => {
      const result = calculateSalaryScore(200000, 100000, 130000, 15);
      expect(result.score).toBe(0);
      expect(result.formatted).toBe('0/15');
    });
  });

  describe('scoreJobForCandidate (End-to-End Evaluation)', () => {
    const candidate: Candidate = {
      id: 'c-1',
      name: 'Alice Developer',
      skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
      years_of_experience: 4,
      location: 'Remote',
      expected_salary: 130000,
    };

    const matchingJob: Job = {
      id: 'j-1',
      title: 'Senior Fullstack Engineer',
      required_skills: [
        { name: 'TypeScript', mustHave: true },
        { name: 'Node.js', mustHave: true },
        { name: 'React', mustHave: false },
      ],
      min_years_experience: 3,
      location: 'Remote',
      salary_min: 120000,
      salary_max: 150000,
      remote_allowed: true,
    };

    it('should return a high overall score (near 100) for an ideal match', () => {
      const result = scoreJobForCandidate(candidate, matchingJob);
      expect(result).not.toBeNull();
      expect(result!.isExcluded).toBe(false);
      expect(result!.overallScore).toBeGreaterThanOrEqual(95);
      expect(result!.breakdown.skills).toBe('50/50');
      expect(result!.breakdown.experience).toBe('20/20');
      expect(result!.breakdown.location).toBe('15/15');
    });

    it('should return null when must-have skill is missing', () => {
      const disqualifiedJob: Job = {
        ...matchingJob,
        required_skills: [
          { name: 'Rust', mustHave: true },
          { name: 'TypeScript', mustHave: true },
        ],
      };

      const result = scoreJobForCandidate(candidate, disqualifiedJob);
      expect(result).toBeNull();
    });

    it('should apply custom weights when provided', () => {
      const customWeights = { skills: 40, experience: 30, location: 15, salary: 15 };
      const result = scoreJobForCandidate(candidate, matchingJob, customWeights);
      expect(result).not.toBeNull();
      expect(result!.scoreBreakdown.skills.max).toBe(40);
      expect(result!.scoreBreakdown.experience.max).toBe(30);
    });
  });

  describe('normalizeWeights', () => {
    it('should normalize custom weights that sum to 200 into 100%', () => {
      const weights = normalizeWeights({ skills: 100, experience: 40, location: 30, salary: 30 });
      expect(weights.skills).toBe(50);
      expect(weights.experience).toBe(20);
      expect(weights.location).toBe(15);
      expect(weights.salary).toBe(15);
    });
  });
});
