import * as candidateModel from './candidate.model.js';
import type { Candidate, CreateCandidateDTO } from './candidate.model.js';

export async function createCandidate(candidateData: CreateCandidateDTO): Promise<Candidate> {
  return await candidateModel.createCandidate(candidateData);
}

export async function getCandidateById(id: string): Promise<Candidate | null> {
  return await candidateModel.getCandidateById(id);
}

export async function getAllCandidates(): Promise<Candidate[]> {
  return await candidateModel.getAllCandidates();
}
