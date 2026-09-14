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

  const candidatePaths = [
    path.join(currentDir, 'init.sql'),
    path.resolve(process.cwd(), 'src/config/init.sql'),
    path.resolve(process.cwd(), 'dist/config/init.sql'),
    path.resolve(process.cwd(), 'config/init.sql'),
  ];

  let sql: string | null = null;
  for (const candidatePath of candidatePaths) {
    try {
      sql = await fs.readFile(candidatePath, 'utf-8');
      break;
    } catch {
      // Try next path
    }
  }

  if (!sql) {
    throw new Error('Unable to locate init.sql database initialization script');
  }

  await pool.query(sql);
}
