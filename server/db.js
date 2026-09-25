import initSqlJs from 'sql.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqliteDb = null;
let SQL = null;
let pgPool = null;

// Determine if we should use Neon Postgres
function isNeonEnabled() {
  return Boolean(config.db.url);
}

function getPgPool() {
  if (!pgPool && isNeonEnabled()) {
    pgPool = new Pool({
      connectionString: config.db.url,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle Neon PostgreSQL client:', err.message);
    });
  }
  return pgPool;
}

// Persist the in-memory SQLite database to disk
function persistSqlite() {
  if (!sqliteDb) return;
  try {
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.db.path, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database:', err);
  }
}

export async function initDatabase() {
  if (isNeonEnabled()) {
    const pool = getPgPool();
    try {
      await pool.query('SELECT 1');
      console.log('✅ Connected to Neon Serverless PostgreSQL Database at:', config.db.url.split('@')[1]?.split('?')[0] || 'Neon Cloud');

      // Ensure tables exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          voiceprint JSONB DEFAULT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        ALTER TABLE users ADD COLUMN IF NOT EXISTS voiceprint JSONB DEFAULT NULL;

        CREATE TABLE IF NOT EXISTS files (
          id UUID PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          original_name TEXT NOT NULL,
          storage_key TEXT NOT NULL,
          storage_provider TEXT NOT NULL DEFAULT 's3',
          mime_type TEXT NOT NULL,
          size_bytes BIGINT NOT NULL,
          extracted_text TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          tags JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_note BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS files_user_created_idx ON files(user_id, created_at DESC);
      `);

      return pool;
    } catch (err) {
      console.error('⚠️ Failed to connect to Neon PostgreSQL, falling back to SQLite:', err.message);
    }
  }

  // SQLite Fallback
  if (sqliteDb) return sqliteDb;

  const dbDir = path.dirname(config.db.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(config.db.path)) {
    try {
      const fileBuffer = fs.readFileSync(config.db.path);
      sqliteDb = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Existing DB corrupted or empty, initializing fresh database');
      sqliteDb = new SQL.Database();
    }
  } else {
    sqliteDb = new SQL.Database();
  }

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 's3',
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      extracted_text TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      is_note INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  persistSqlite();
  console.log('✅ SQLite WASM Database initialized at:', config.db.path);
  return sqliteDb;
}

// User Model
export const userModel = {
  async create(username, email, passwordHash) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
        [username, email, passwordHash]
      );
      const u = res.rows[0];
      return { ...u, id: Number(u.id) };
    }

    sqliteDb.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    persistSqlite();
    return this.findByEmail(email);
  },

  async findByEmail(email) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (!res.rows[0]) return null;
      const u = res.rows[0];
      return { ...u, id: Number(u.id) };
    }

    const stmt = sqliteDb.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  async findByUsername(username) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (!res.rows[0]) return null;
      const u = res.rows[0];
      return { ...u, id: Number(u.id) };
    }

    const stmt = sqliteDb.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  async findById(id) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [id]);
      if (!res.rows[0]) return null;
      const u = res.rows[0];
      return { ...u, id: Number(u.id) };
    }

    const stmt = sqliteDb.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  async saveVoiceprint(id, voiceprint) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query('UPDATE users SET voiceprint = $1::jsonb WHERE id = $2 RETURNING id, voiceprint', [JSON.stringify(voiceprint), id]);
      return res.rows[0];
    }
    return { id, voiceprint };
  },

  async getVoiceprint(id) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query('SELECT voiceprint FROM users WHERE id = $1', [id]);
      return res.rows[0]?.voiceprint || null;
    }
    return null;
  }
};

// File Model
export const fileModel = {
  async create({ id, userId, originalName, storageKey, storageProvider, mimeType, sizeBytes, extractedText = '', summary = '', tags = [], isNote = 0 }) {
    const tagsArray = Array.isArray(tags) ? tags : [];

    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query(
        `INSERT INTO files (id, user_id, original_name, storage_key, storage_provider, mime_type, size_bytes, extracted_text, summary, tags, is_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [id, userId, originalName, storageKey, storageProvider, mimeType, sizeBytes, extractedText, summary, JSON.stringify(tagsArray), Boolean(isNote)]
      );
      const row = res.rows[0];
      return {
        ...row,
        user_id: Number(row.user_id),
        size_bytes: Number(row.size_bytes),
        is_note: row.is_note ? 1 : 0
      };
    }

    const tagsJson = JSON.stringify(tagsArray);
    sqliteDb.run(
      `INSERT INTO files (id, user_id, original_name, storage_key, storage_provider, mime_type, size_bytes, extracted_text, summary, tags, is_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, originalName, storageKey, storageProvider, mimeType, sizeBytes, extractedText, summary, tagsJson, isNote]
    );
    persistSqlite();
    return this.findById(id, userId);
  },

  async findById(id, userId) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [id, userId]);
      if (!res.rows[0]) return null;
      const row = res.rows[0];
      return {
        ...row,
        user_id: Number(row.user_id),
        size_bytes: Number(row.size_bytes),
        is_note: row.is_note ? 1 : 0
      };
    }

    const stmt = sqliteDb.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?');
    stmt.bind([id, userId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  async listByUser(userId, { type, limit = 100, offset = 0 } = {}) {
    if (isNeonEnabled() && pgPool) {
      let sql = 'SELECT id, user_id, original_name, storage_key, storage_provider, mime_type, size_bytes, summary, tags, is_note, created_at, updated_at FROM files WHERE user_id = $1';
      const params = [userId];

      if (type === 'pdf') {
        sql += ' AND mime_type = \'application/pdf\'';
      } else if (type === 'image') {
        sql += ' AND mime_type LIKE \'image/%\'';
      } else if (type === 'doc') {
        sql += ' AND (mime_type LIKE \'%word%\' OR mime_type LIKE \'%document%\' OR mime_type = \'text/plain\' OR mime_type = \'text/markdown\') AND is_note = false AND mime_type NOT IN (\'application/x-credential\', \'message/rfc822\')';
      } else if (type === 'note') {
        sql += ' AND is_note = true AND mime_type NOT IN (\'application/x-credential\', \'message/rfc822\')';
      } else if (type === 'credential' || type === 'password') {
        sql += ' AND mime_type IN (\'application/x-credential\', \'message/rfc822\')';
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const res = await pgPool.query(sql, params);
      return res.rows.map(row => ({
        ...row,
        user_id: Number(row.user_id),
        size_bytes: Number(row.size_bytes),
        is_note: row.is_note ? 1 : 0
      }));
    }

    let sql = 'SELECT id, user_id, original_name, storage_key, storage_provider, mime_type, size_bytes, summary, tags, is_note, created_at FROM files WHERE user_id = ?';
    const params = [userId];

    if (type === 'pdf') {
      sql += ' AND mime_type = "application/pdf"';
    } else if (type === 'image') {
      sql += ' AND mime_type LIKE "image/%"';
    } else if (type === 'doc') {
      sql += ' AND (mime_type LIKE "%word%" OR mime_type LIKE "%document%" OR mime_type = "text/plain" OR mime_type = "text/markdown") AND is_note = 0 AND mime_type NOT IN ("application/x-credential", "message/rfc822")';
    } else if (type === 'note') {
      sql += ' AND is_note = 1 AND mime_type NOT IN ("application/x-credential", "message/rfc822")';
    } else if (type === 'credential' || type === 'password') {
      sql += ' AND mime_type IN ("application/x-credential", "message/rfc822")';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = sqliteDb.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  async getAllTextChunksByUser(userId) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query(
        'SELECT id, original_name, mime_type, is_note, extracted_text, summary, tags, created_at FROM files WHERE user_id = $1',
        [userId]
      );
      return res.rows.map(row => ({
        ...row,
        is_note: row.is_note ? 1 : 0
      }));
    }

    const stmt = sqliteDb.prepare('SELECT id, original_name, mime_type, is_note, extracted_text, summary, tags, created_at FROM files WHERE user_id = ?');
    stmt.bind([userId]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  async search(userId, queryText) {
    if (!queryText || !queryText.trim()) {
      return this.listByUser(userId);
    }

    const clean = queryText.trim().toLowerCase();
    const pattern = `%${clean}%`;

    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query(`
        SELECT id, user_id, original_name, storage_key, storage_provider, mime_type, size_bytes, summary, tags, is_note, created_at,
               extracted_text
        FROM files
        WHERE user_id = $1 AND (
          original_name ILIKE $2 OR
          extracted_text ILIKE $2 OR
          summary ILIKE $2 OR
          tags::text ILIKE $2
        )
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId, pattern]);

      return res.rows.map(row => {
        const fullText = row.extracted_text || '';
        const idx = fullText.toLowerCase().indexOf(clean);
        let textSnippet = '';
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(fullText.length, idx + clean.length + 60);
          const snippetRaw = fullText.substring(start, end);
          textSnippet = (start > 0 ? '...' : '') + snippetRaw.replace(new RegExp(clean, 'gi'), match => `<mark>${match}</mark>`) + (end < fullText.length ? '...' : '');
        } else {
          textSnippet = row.summary ? row.summary.slice(0, 120) + '...' : '';
        }
        const { extracted_text, ...rest } = row;
        return {
          ...rest,
          user_id: Number(rest.user_id),
          size_bytes: Number(rest.size_bytes),
          is_note: rest.is_note ? 1 : 0,
          text_snippet: textSnippet
        };
      });
    }

    const stmt = sqliteDb.prepare(`
      SELECT id, user_id, original_name, storage_key, storage_provider, mime_type, size_bytes, summary, tags, is_note, created_at,
             extracted_text
      FROM files
      WHERE user_id = ? AND (
        LOWER(original_name) LIKE ? OR
        LOWER(extracted_text) LIKE ? OR
        LOWER(tags) LIKE ? OR
        LOWER(summary) LIKE ?
      )
      ORDER BY created_at DESC
      LIMIT 50
    `);
    stmt.bind([userId, pattern, pattern, pattern, pattern]);
    const results = [];
    while (stmt.step()) {
      const obj = stmt.getAsObject();
      const fullText = (obj.extracted_text || '');
      const idx = fullText.toLowerCase().indexOf(clean);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(fullText.length, idx + clean.length + 60);
        const snippetRaw = fullText.substring(start, end);
        obj.text_snippet = (start > 0 ? '...' : '') + snippetRaw.replace(new RegExp(clean, 'gi'), match => `<mark>${match}</mark>`) + (end < fullText.length ? '...' : '');
      } else {
        obj.text_snippet = obj.summary ? obj.summary.slice(0, 120) + '...' : '';
      }
      delete obj.extracted_text;
      results.push(obj);
    }
    stmt.free();
    return results;
  },

  async updateContent(id, userId, { extractedText, summary, tags }) {
    const file = await this.findById(id, userId);
    if (!file) return null;

    const tagsArray = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : (typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : file.tags);
    const newExtracted = extractedText !== undefined ? extractedText : file.extracted_text;
    const newSummary = summary !== undefined ? summary : file.summary;

    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query(
        'UPDATE files SET extracted_text = $1, summary = $2, tags = $3::jsonb, updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING *',
        [newExtracted, newSummary, JSON.stringify(tagsArray), id, userId]
      );
      if (!res.rows[0]) return null;
      const row = res.rows[0];
      return {
        ...row,
        user_id: Number(row.user_id),
        size_bytes: Number(row.size_bytes),
        is_note: row.is_note ? 1 : 0
      };
    }

    const tagsJson = JSON.stringify(tagsArray);
    sqliteDb.run(
      'UPDATE files SET extracted_text = ?, summary = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [newExtracted, newSummary, tagsJson, id, userId]
    );
    persistSqlite();
    return this.findById(id, userId);
  },

  async delete(id, userId) {
    const file = await this.findById(id, userId);
    if (!file) return null;

    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query('DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
      if (!res.rows[0]) return null;
      const row = res.rows[0];
      return {
        ...row,
        user_id: Number(row.user_id),
        size_bytes: Number(row.size_bytes),
        is_note: row.is_note ? 1 : 0
      };
    }

    sqliteDb.run('DELETE FROM files WHERE id = ? AND user_id = ?', [id, userId]);
    persistSqlite();
    return file;
  },

  async getStats(userId) {
    if (isNeonEnabled() && pgPool) {
      const res = await pgPool.query(`
        SELECT 
          COUNT(*)::int as total_files,
          COALESCE(SUM(size_bytes), 0)::bigint as total_bytes,
          COUNT(*) FILTER (WHERE mime_type = 'application/pdf')::int as pdf_count,
          COUNT(*) FILTER (WHERE mime_type LIKE 'image/%')::int as image_count,
          COUNT(*) FILTER (WHERE is_note = true AND mime_type NOT IN ('application/x-credential', 'message/rfc822'))::int as note_count,
          COUNT(*) FILTER (WHERE mime_type IN ('application/x-credential', 'message/rfc822'))::int as credential_count,
          COUNT(*) FILTER (WHERE is_note = false AND mime_type NOT LIKE 'image/%' AND mime_type != 'application/pdf' AND mime_type NOT IN ('application/x-credential', 'message/rfc822'))::int as doc_count
        FROM files
        WHERE user_id = $1
      `, [userId]);

      const s = res.rows[0] || {};
      return {
        total_files: s.total_files || 0,
        total_bytes: Number(s.total_bytes || 0),
        pdf_count: s.pdf_count || 0,
        image_count: s.image_count || 0,
        note_count: s.note_count || 0,
        doc_count: s.doc_count || 0,
        credential_count: s.credential_count || 0
      };
    }

    const allFiles = await this.listByUser(userId, { limit: 10000 });
    let totalBytes = 0;
    let pdfCount = 0;
    let imageCount = 0;
    let noteCount = 0;
    let docCount = 0;
    let credentialCount = 0;

    for (const f of allFiles) {
      totalBytes += (f.size_bytes || 0);
      if (f.mime_type === 'application/pdf') pdfCount++;
      else if (f.mime_type.startsWith('image/')) imageCount++;
      else if (f.mime_type === 'application/x-credential' || f.mime_type === 'message/rfc822') credentialCount++;
      else if (f.is_note) noteCount++;
      else docCount++;
    }

    return {
      total_files: allFiles.length,
      total_bytes: totalBytes,
      pdf_count: pdfCount,
      image_count: imageCount,
      note_count: noteCount,
      doc_count: docCount,
      credential_count: credentialCount
    };
  }
};

