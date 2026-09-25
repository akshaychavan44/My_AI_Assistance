import 'dotenv/config';
import fs from 'fs';
import initSqlJs from 'sql.js';
import { Client } from 'pg';

if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required.');
const source = process.env.DB_PATH || 'data/vault.sqlite';
if (!fs.existsSync(source)) throw new Error(`SQLite source not found: ${source}`);
const SQL = await initSqlJs();
const sqlite = new SQL.Database(fs.readFileSync(source));
const query = (sql) => { const statement = sqlite.prepare(sql); const rows = []; while (statement.step()) rows.push(statement.getAsObject()); statement.free(); return rows; };
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await client.connect();
try {
  await client.query('BEGIN');
  for (const user of query('SELECT * FROM users')) {
    await client.query('INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [user.id, user.username, user.email, user.password_hash, user.created_at]);
  }
  for (const file of query('SELECT * FROM files')) {
    let tags; try { tags = JSON.parse(file.tags || '[]'); } catch { tags = []; }
    await client.query(`INSERT INTO files (id,user_id,original_name,storage_key,storage_provider,mime_type,size_bytes,extracted_text,summary,tags,is_note,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
      [file.id, file.user_id, file.original_name, file.storage_key, file.storage_provider, file.mime_type, file.size_bytes, file.extracted_text || '', file.summary || '', JSON.stringify(tags), Boolean(file.is_note), file.created_at, file.updated_at || file.created_at]);
  }
  await client.query("SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users), 1), true)");
  await client.query('COMMIT');
  console.log('SQLite users and vault metadata copied to Neon. Source data remains unchanged.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); sqlite.close(); }
