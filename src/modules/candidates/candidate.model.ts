import { pool } from '../../config/db.js';

export interface Candidate {
  id: string;
  name: string;
  skills: string[];
  years_of_experience: number;
  location: string;
  expected_salary: number;
  created_at?: Date;
}

export interface CreateCandidateDTO {
  name: string;
  skills: string[];
  years_of_experience: number;
  location: string;
  expected_salary: number;
}

export async function createCandidate(candidateData: CreateCandidateDTO): Promise<Candidate> {
  const query = `
    INSERT INTO candidates (name, skills, years_of_experience, location, expected_salary)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    candidateData.name,
    candidateData.skills,
    candidateData.years_of_experience,
    candidateData.location,
    candidateData.expected_salary,
  ];

  const result = await pool.query<Candidate>(query, values);
  return result.rows[0]!;
}

export async function getCandidateById(id: string): Promise<Candidate | null> {
  const query = `
    SELECT * FROM candidates
    WHERE id = $1;
  `;

  const result = await pool.query<Candidate>(query, [id]);
  return result.rows[0] || null;
}

export async function getAllCandidates(): Promise<Candidate[]> {
  const query = `
    SELECT * FROM candidates;
  `;

  const result = await pool.query<Candidate>(query);
  return result.rows;
}
