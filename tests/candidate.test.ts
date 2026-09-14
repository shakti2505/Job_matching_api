import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { pool } from '../src/config/db.js';
import * as candidateModel from '../src/modules/candidates/candidate.model.js';
import * as candidateService from '../src/modules/candidates/candidate.service.js';
import * as candidateController from '../src/modules/candidates/candidate.controller.js';

describe('Candidate Module (Model, Service, Controller)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCandidateInput: candidateModel.CreateCandidateDTO = {
    name: 'Jane Doe',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    years_of_experience: 5.5,
    location: 'San Francisco, CA',
    expected_salary: 140000,
  };

  const mockCandidateRow: candidateModel.Candidate = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ...mockCandidateInput,
    created_at: new Date('2026-01-01T00:00:00Z'),
  };

  describe('Candidate Model', () => {
    it('createCandidate should insert with parameterized SQL and return row', async () => {
      const querySpy = vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [mockCandidateRow],
        rowCount: 1,
      } as any);

      const result = await candidateModel.createCandidate(mockCandidateInput);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = (querySpy.mock.calls[0] as unknown) as [string, any[]];
      expect(sql).toContain('INSERT INTO candidates (name, skills, years_of_experience, location, expected_salary)');
      expect(sql).toContain('VALUES ($1, $2, $3, $4, $5)');
      expect(sql).toContain('RETURNING *');
      expect(params).toEqual([
        mockCandidateInput.name,
        mockCandidateInput.skills,
        mockCandidateInput.years_of_experience,
        mockCandidateInput.location,
        mockCandidateInput.expected_salary,
      ]);
      expect(result).toEqual(mockCandidateRow);
    });

    it('getCandidateById should query candidate by id', async () => {
      const querySpy = vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [mockCandidateRow],
        rowCount: 1,
      } as any);

      const result = await candidateModel.getCandidateById(mockCandidateRow.id);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = (querySpy.mock.calls[0] as unknown) as [string, any[]];
      expect(sql).toContain('SELECT * FROM candidates');
      expect(sql).toContain('WHERE id = $1');
      expect(params).toEqual([mockCandidateRow.id]);
      expect(result).toEqual(mockCandidateRow);
    });

    it('getCandidateById should return null when not found', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await candidateModel.getCandidateById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Candidate Service', () => {
    it('createCandidate should delegate to candidateModel', async () => {
      const modelSpy = vi.spyOn(candidateModel, 'createCandidate').mockResolvedValueOnce(mockCandidateRow);
      const result = await candidateService.createCandidate(mockCandidateInput);
      expect(modelSpy).toHaveBeenCalledWith(mockCandidateInput);
      expect(result).toEqual(mockCandidateRow);
    });

    it('getCandidateById should delegate to candidateModel', async () => {
      const modelSpy = vi.spyOn(candidateModel, 'getCandidateById').mockResolvedValueOnce(mockCandidateRow);
      const result = await candidateService.getCandidateById(mockCandidateRow.id);
      expect(modelSpy).toHaveBeenCalledWith(mockCandidateRow.id);
      expect(result).toEqual(mockCandidateRow);
    });
  });

  describe('Candidate Controller', () => {
    it('createCandidateHandler should return 201 with created candidate', async () => {
      vi.spyOn(candidateService, 'createCandidate').mockResolvedValueOnce(mockCandidateRow);

      const req = { body: mockCandidateInput } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await candidateController.createCandidateHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCandidateRow);
    });

    it('getCandidateByIdHandler should return 200 when candidate exists', async () => {
      vi.spyOn(candidateService, 'getCandidateById').mockResolvedValueOnce(mockCandidateRow);

      const req = { params: { id: mockCandidateRow.id } } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await candidateController.getCandidateByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCandidateRow);
    });

    it('getCandidateByIdHandler should return 404 when candidate is not found', async () => {
      vi.spyOn(candidateService, 'getCandidateById').mockResolvedValueOnce(null);

      const req = { params: { id: 'non-existent' } } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await candidateController.getCandidateByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Candidate not found' });
    });
  });
});
