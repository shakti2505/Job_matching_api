import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.PGUSER || 'admin',
  password: process.env.PGPASSWORD || 'password123',
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'job_match',
});

export async function initializeDB(): Promise<void> {
  const currentDir = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

  const sqlPath = path.join(currentDir, 'init.sql');
  const sql = await fs.readFile(sqlPath, 'utf-8');

  await pool.query(sql);
}
