import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pool, initializeDB } from '../src/config/db.js';
import fs from 'fs/promises';

describe('Database Configuration & Initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export a configured pg.Pool instance', () => {
    expect(pool).toBeDefined();
    expect(typeof pool.query).toBe('function');
  });

  it('should read init.sql and execute the query against the pool', async () => {
    const querySpy = vi.spyOn(pool, 'query').mockResolvedValueOnce({} as any);
    const readFileSpy = vi.spyOn(fs, 'readFile');

    await initializeDB();

    expect(readFileSpy).toHaveBeenCalled();
    expect(querySpy).toHaveBeenCalled();
    const executedSql = querySpy.mock.calls[0]?.[0] as string;
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS candidates');
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS jobs');
  });
});
