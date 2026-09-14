import * as jobModel from './job.model.js';
import type { Job, CreateJobDTO } from './job.model.js';

export async function createJob(jobData: CreateJobDTO): Promise<Job> {
  return await jobModel.createJob(jobData);
}

export async function getAllJobs(): Promise<Job[]> {
  return await jobModel.getAllJobs();
}

export async function getJobById(id: string): Promise<Job | null> {
  return await jobModel.getJobById(id);
}
