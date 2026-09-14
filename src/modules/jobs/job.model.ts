import { pool } from '../../config/db.js';

export interface RequiredSkill {
  name: string;
  mustHave: boolean;
}

export interface Job {
  id: string;
  title: string;
  required_skills: RequiredSkill[];
  min_years_experience: number;
  location: string;
  salary_min: number;
  salary_max: number;
  remote_allowed: boolean;
  created_at?: Date;
}

export interface CreateJobDTO {
  title: string;
  required_skills: RequiredSkill[];
  min_years_experience: number;
  location: string;
  salary_min: number;
  salary_max: number;
  remote_allowed?: boolean;
}

export async function createJob(jobData: CreateJobDTO): Promise<Job> {
  const query = `
    INSERT INTO jobs (title, required_skills, min_years_experience, location, salary_min, salary_max, remote_allowed)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    jobData.title,
    JSON.stringify(jobData.required_skills),
    jobData.min_years_experience,
    jobData.location,
    jobData.salary_min,
    jobData.salary_max,
    jobData.remote_allowed ?? false,
  ];

  const result = await pool.query<Job>(query, values);
  return result.rows[0]!;
}

export async function getAllJobs(): Promise<Job[]> {
  const query = `
    SELECT * FROM jobs;
  `;

  const result = await pool.query<Job>(query);
  return result.rows;
}

export async function getJobById(id: string): Promise<Job | null> {
  const query = `
    SELECT * FROM jobs
    WHERE id = $1;
  `;

  const result = await pool.query<Job>(query, [id]);
  return result.rows[0] || null;
}
