import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { pool } from '../src/config/db.js';
import * as jobModel from '../src/modules/jobs/job.model.js';
import * as jobService from '../src/modules/jobs/job.service.js';
import * as jobController from '../src/modules/jobs/job.controller.js';

describe('Job Module (Model, Service, Controller)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockJobInput: jobModel.CreateJobDTO = {
    title: 'Senior Backend Engineer',
    required_skills: [
      { name: 'TypeScript', mustHave: true },
      { name: 'Docker', mustHave: false },
    ],
    min_years_experience: 4,
    location: 'Remote, US',
    salary_min: 120000,
    salary_max: 160000,
    remote_allowed: true,
  };

  const mockJobRow: jobModel.Job = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    ...mockJobInput,
    remote_allowed: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
  };

  describe('Job Model', () => {
    it('createJob should insert with parameterized SQL and JSON-serialized skills', async () => {
      const querySpy = vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [mockJobRow],
        rowCount: 1,
      } as any);

      const result = await jobModel.createJob(mockJobInput);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = (querySpy.mock.calls[0] as unknown) as [string, any[]];
      expect(sql).toContain(
        'INSERT INTO jobs (title, required_skills, min_years_experience, location, salary_min, salary_max, remote_allowed)'
      );
      expect(sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7)');
      expect(sql).toContain('RETURNING *');
      expect(params).toEqual([
        mockJobInput.title,
        JSON.stringify(mockJobInput.required_skills),
        mockJobInput.min_years_experience,
        mockJobInput.location,
        mockJobInput.salary_min,
        mockJobInput.salary_max,
        true,
      ]);
      expect(result).toEqual(mockJobRow);
    });

    it('createJob should default remote_allowed to false when undefined', async () => {
      const mockInput: jobModel.CreateJobDTO = {
        title: 'Lead',
        required_skills: [{ name: 'Java', mustHave: true }],
        min_years_experience: 8,
        location: 'New York, NY',
        salary_min: 150000,
        salary_max: 200000,
      };

      const querySpy = vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{ id: 'some-id', ...mockInput, remote_allowed: false }],
        rowCount: 1,
      } as any);

      await jobModel.createJob(mockInput);

      const [, params] = (querySpy.mock.calls[0] as unknown) as [string, any[]];
      expect(params?.[6]).toBe(false);
    });

    it('getAllJobs should fetch all rows from jobs table', async () => {
      const mockJobs = [mockJobRow];
      const querySpy = vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: mockJobs,
        rowCount: 1,
      } as any);

      const result = await jobModel.getAllJobs();

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql] = (querySpy.mock.calls[0] as unknown) as [string];
      expect(sql).toContain('SELECT * FROM jobs');
      expect(result).toEqual(mockJobs);
    });
  });

  describe('Job Service', () => {
    it('createJob should delegate to jobModel', async () => {
      const modelSpy = vi.spyOn(jobModel, 'createJob').mockResolvedValueOnce(mockJobRow);
      const result = await jobService.createJob(mockJobInput);
      expect(modelSpy).toHaveBeenCalledWith(mockJobInput);
      expect(result).toEqual(mockJobRow);
    });

    it('getAllJobs should delegate to jobModel', async () => {
      const modelSpy = vi.spyOn(jobModel, 'getAllJobs').mockResolvedValueOnce([mockJobRow]);
      const result = await jobService.getAllJobs();
      expect(modelSpy).toHaveBeenCalled();
      expect(result).toEqual([mockJobRow]);
    });
  });

  describe('Job Controller', () => {
    it('createJobHandler should return 201 with created job', async () => {
      vi.spyOn(jobService, 'createJob').mockResolvedValueOnce(mockJobRow);

      const req = { body: mockJobInput } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await jobController.createJobHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockJobRow);
    });

    it('getAllJobsHandler should return 200 with list of jobs', async () => {
      vi.spyOn(jobService, 'getAllJobs').mockResolvedValueOnce([mockJobRow]);

      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await jobController.getAllJobsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([mockJobRow]);
    });
  });
});
