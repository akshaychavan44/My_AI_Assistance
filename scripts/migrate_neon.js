import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required for migrations.');
const migrationFiles = fs.readdirSync(path.resolve('migrations'))
  .filter(f => f.endsWith('.sql'))
  .sort();

const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: true } });
await client.connect();
try {
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.resolve('migrations', file), 'utf8');
    await client.query(sql);
    console.log(`Executed migration: ${file}`);
  }
  console.log('Neon vault schema is ready.');
}
finally { await client.end(); }
