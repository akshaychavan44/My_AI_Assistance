import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required for migrations.');
const sql = fs.readFileSync(path.resolve('migrations/001_neon_vault.sql'), 'utf8');
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: true } });
await client.connect();
try { await client.query(sql); console.log('Neon vault schema is ready.'); }
finally { await client.end(); }
