import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../src/app.js';
import * as candidateService from '../src/modules/candidates/candidate.service.js';
import * as jobService from '../src/modules/jobs/job.service.js';

describe('App Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /health should return 200 with status ok', async () => {
    // Test route handler directly through express mock dispatch or listener
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const data = (await response.json()) as { status: string };

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');

    server.close();
  });

  it('GET /unknown-route should return 404', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/unknown-route`);
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(data.error).toBe('Route not found');

    server.close();
  });

  it('GET /jobs should return 200 with jobs list', async () => {
    vi.spyOn(jobService, 'getAllJobs').mockResolvedValueOnce([
      {
        id: 'job-1',
        title: 'Backend Engineer',
        required_skills: [{ name: 'TypeScript', mustHave: true }],
        min_years_experience: 3,
        location: 'Remote',
        salary_min: 100000,
        salary_max: 130000,
        remote_allowed: true,
      },
    ]);

    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/jobs`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);

    server.close();
  });
});
