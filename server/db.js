import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

let pgPool = null;
let schemaInitialized = false;

export function getPgPool() {
  if (!pgPool) {
    let rawUrl = config.db.url || process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '';
    rawUrl = rawUrl.trim().replace(/^["']|["']$/g, '');

    if (!rawUrl) {
      throw new Error('DATABASE_URL is not configured in environment variables.');
    }

    // Clean connection string for Node.js pg driver in serverless environments
    // Strip channel_binding which causes SCRAM failures in Node pg on Linux
    let cleanUrl = rawUrl
      .replace(/[?&]channel_binding=[^&]+/g, '')
      .replace(/[?&]sslmode=[^&]+/g, '');

    if (cleanUrl.includes('?')) {
      cleanUrl += '&sslmode=require';
    } else {
      cleanUrl += '?sslmode=require';
    }

    pgPool = new Pool({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false },
      max: process.env.VERCEL ? 1 : 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });

    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle Neon PostgreSQL client:', err.message);
      // In serverless, reset pool on error so subsequent requests can reconnect cleanly
      pgPool = null;
    });
  }
  return pgPool;
}

export async function initDatabase() {
  if (schemaInitialized) return getPgPool();
  const pool = getPgPool();
  try {
    await pool.query('SELECT 1');
    const host = config.db.url?.split('@')[1]?.split('?')[0] || 'Neon Cloud';
    console.log('✅ Connected to Neon Serverless PostgreSQL Database at:', host);

    // Run DDL schema check safely once
    try {
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
      `);
    } catch (ddlErr) {
      console.warn('Schema check warning (non-fatal):', ddlErr.message);
    }

    schemaInitialized = true;
    return pool;
  } catch (err) {
    console.error('❌ Failed to initialize Neon PostgreSQL database:', err.message);
    throw err;
  }
}

// User Model (Pure Neon PostgreSQL)
export const userModel = {
  async create(username, email, passwordHash) {
    const pool = getPgPool();
    const res = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );
    const u = res.rows[0];
    return { ...u, id: Number(u.id) };
  },

  async findByEmail(email) {
    const pool = getPgPool();
    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (!res.rows[0]) return null;
    const u = res.rows[0];
    return { ...u, id: Number(u.id) };
  },

  async findByUsername(username) {
    const pool = getPgPool();
    const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (!res.rows[0]) return null;
    const u = res.rows[0];
    return { ...u, id: Number(u.id) };
  },

  async findById(id) {
    const pool = getPgPool();
    const res = await pool.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [id]);
    if (!res.rows[0]) return null;
    const u = res.rows[0];
    return { ...u, id: Number(u.id) };
  },

  async saveVoiceprint(id, voiceprint) {
    const pool = getPgPool();
    const res = await pool.query(
      'UPDATE users SET voiceprint = $1::jsonb WHERE id = $2 RETURNING id, voiceprint',
      [JSON.stringify(voiceprint), id]
    );
    return res.rows[0];
  },

  async getVoiceprint(id) {
    const pool = getPgPool();
    const res = await pool.query('SELECT voiceprint FROM users WHERE id = $1', [id]);
    return res.rows[0]?.voiceprint || null;
  }
};

// File Model (Pure Neon PostgreSQL)
export const fileModel = {
  async create({ id, userId, originalName, storageKey, storageProvider, mimeType, sizeBytes, extractedText = '', summary = '', tags = [], isNote = 0 }) {
    const pool = getPgPool();
    const tagsArray = Array.isArray(tags) ? tags : [];

    const res = await pool.query(
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
  },

  async findById(id, userId) {
    const pool = getPgPool();
    const res = await pool.query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...row,
      user_id: Number(row.user_id),
      size_bytes: Number(row.size_bytes),
      is_note: row.is_note ? 1 : 0
    };
  },

  async listByUser(userId, { type, limit = 100, offset = 0 } = {}) {
    const pool = getPgPool();
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

    const res = await pool.query(sql, params);
    return res.rows.map(row => ({
      ...row,
      user_id: Number(row.user_id),
      size_bytes: Number(row.size_bytes),
      is_note: row.is_note ? 1 : 0
    }));
  },

  async getAllTextChunksByUser(userId) {
    const pool = getPgPool();
    const res = await pool.query(
      'SELECT id, original_name, mime_type, is_note, extracted_text, summary, tags, created_at FROM files WHERE user_id = $1',
      [userId]
    );
    return res.rows.map(row => ({
      ...row,
      is_note: row.is_note ? 1 : 0
    }));
  },

  async search(userId, queryText) {
    if (!queryText || !queryText.trim()) {
      return this.listByUser(userId);
    }

    const pool = getPgPool();
    const clean = queryText.trim().toLowerCase();
    const pattern = `%${clean}%`;

    const res = await pool.query(`
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
  },

  async updateContent(id, userId, { extractedText, summary, tags }) {
    const file = await this.findById(id, userId);
    if (!file) return null;

    const pool = getPgPool();
    const tagsArray = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : (typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : file.tags);
    const newExtracted = extractedText !== undefined ? extractedText : file.extracted_text;
    const newSummary = summary !== undefined ? summary : file.summary;

    const res = await pool.query(
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
  },

  async delete(id, userId) {
    const pool = getPgPool();
    const res = await pool.query('DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...row,
      user_id: Number(row.user_id),
      size_bytes: Number(row.size_bytes),
      is_note: row.is_note ? 1 : 0
    };
  },

  async getStats(userId) {
    const pool = getPgPool();
    const res = await pool.query(`
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
};

function formatTaskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: Number(row.user_id),
    title: row.title,
    notes: row.notes || '',
    due_at: row.due_at ? (typeof row.due_at === 'string' ? row.due_at : new Date(row.due_at).toISOString()) : null,
    timezone: row.timezone || 'UTC',
    reminder_timing: row.reminder_timing || 'due_time',
    reminder_offset_minutes: Number(row.reminder_offset_minutes || 0),
    reminder_at: row.reminder_at ? (typeof row.reminder_at === 'string' ? row.reminder_at : new Date(row.reminder_at).toISOString()) : null,
    reminder_sent: Boolean(row.reminder_sent),
    reminder_sent_at: row.reminder_sent_at ? (typeof row.reminder_sent_at === 'string' ? row.reminder_sent_at : new Date(row.reminder_sent_at).toISOString()) : null,
    is_completed: Boolean(row.is_completed),
    completed_at: row.completed_at ? (typeof row.completed_at === 'string' ? row.completed_at : new Date(row.completed_at).toISOString()) : null,
    recurrence_rule: row.recurrence_rule || 'none',
    created_at: row.created_at ? (typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString()) : new Date().toISOString(),
    updated_at: row.updated_at ? (typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at).toISOString()) : new Date().toISOString()
  };
}

function formatPushSubRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: Number(row.user_id),
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    user_agent: row.user_agent || '',
    device_name: row.device_name || '',
    created_at: row.created_at ? (typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString()) : new Date().toISOString(),
    updated_at: row.updated_at ? (typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at).toISOString()) : new Date().toISOString()
  };
}

// Task & Reminder Model (Pure Neon PostgreSQL)
export const taskModel = {
  async create({ id, userId, title, notes = '', dueAt = null, timezone = 'UTC', reminderTiming = 'due_time', reminderOffsetMinutes = 0, reminderAt = null, recurrenceRule = 'none' }) {
    const pool = getPgPool();
    const isCompleted = false;
    const reminderSent = false;

    const res = await pool.query(
      `INSERT INTO tasks (id, user_id, title, notes, due_at, timezone, reminder_timing, reminder_offset_minutes, reminder_at, reminder_sent, is_completed, recurrence_rule, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [id, userId, title, notes, dueAt, timezone, reminderTiming, reminderOffsetMinutes, reminderAt, reminderSent, isCompleted, recurrenceRule]
    );
    return formatTaskRow(res.rows[0]);
  },

  async findById(id, userId = null) {
    const pool = getPgPool();
    const sql = userId ? 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2' : 'SELECT * FROM tasks WHERE id = $1';
    const params = userId ? [id, userId] : [id];
    const res = await pool.query(sql, params);
    return formatTaskRow(res.rows[0]);
  },

  async listByUser(userId, { status = 'all', search = '', limit = 300, offset = 0 } = {}) {
    const pool = getPgPool();
    const cleanSearch = (search || '').trim().toLowerCase();
    const searchPattern = `%${cleanSearch}%`;

    let sql = 'SELECT * FROM tasks WHERE user_id = $1';
    const params = [userId];

    if (cleanSearch) {
      params.push(searchPattern);
      sql += ` AND (title ILIKE $${params.length} OR notes ILIKE $${params.length})`;
    }

    if (status === 'pending') {
      sql += ' AND is_completed = false';
    } else if (status === 'completed') {
      sql += ' AND is_completed = true';
    } else if (status === 'today') {
      sql += ' AND due_at IS NOT NULL AND date_trunc(\'day\', due_at AT TIME ZONE timezone) = date_trunc(\'day\', NOW() AT TIME ZONE timezone)';
    } else if (status === 'upcoming') {
      sql += ' AND is_completed = false AND (due_at >= NOW() OR due_at IS NULL)';
    } else if (status === 'overdue') {
      sql += ' AND is_completed = false AND due_at IS NOT NULL AND due_at < NOW()';
    }

    sql += ` ORDER BY is_completed ASC, due_at ASC NULLS LAST, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const res = await pool.query(sql, params);
    return res.rows.map(formatTaskRow);
  },

  async update(id, userId, { title, notes, dueAt, timezone, reminderTiming, reminderOffsetMinutes, reminderAt, isCompleted, recurrenceRule }) {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const pool = getPgPool();
    const newTitle = title !== undefined ? title : existing.title;
    const newNotes = notes !== undefined ? notes : existing.notes;
    const newDueAt = dueAt !== undefined ? dueAt : existing.due_at;
    const newTimezone = timezone !== undefined ? timezone : existing.timezone;
    const newReminderTiming = reminderTiming !== undefined ? reminderTiming : existing.reminder_timing;
    const newReminderOffset = reminderOffsetMinutes !== undefined ? reminderOffsetMinutes : existing.reminder_offset_minutes;
    const newReminderAt = reminderAt !== undefined ? reminderAt : existing.reminder_at;
    const newRecurrence = recurrenceRule !== undefined ? recurrenceRule : existing.recurrence_rule;

    let newIsCompleted = existing.is_completed;
    let newCompletedAt = existing.completed_at;
    if (isCompleted !== undefined) {
      newIsCompleted = Boolean(isCompleted);
      newCompletedAt = newIsCompleted ? (existing.completed_at || new Date().toISOString()) : null;
    }

    // Reset reminder_sent if reminder_at was moved to a future timestamp
    let reminderSent = existing.reminder_sent;
    let reminderSentAt = existing.reminder_sent_at;
    if (newReminderAt && newReminderAt !== existing.reminder_at) {
      const isFuture = new Date(newReminderAt).getTime() > Date.now();
      if (isFuture) {
        reminderSent = false;
        reminderSentAt = null;
      }
    }

    const res = await pool.query(
      `UPDATE tasks
       SET title = $1, notes = $2, due_at = $3, timezone = $4, reminder_timing = $5,
           reminder_offset_minutes = $6, reminder_at = $7, reminder_sent = $8, reminder_sent_at = $9,
           is_completed = $10, completed_at = $11, recurrence_rule = $12, updated_at = NOW()
       WHERE id = $13 AND user_id = $14
       RETURNING *`,
      [newTitle, newNotes, newDueAt, newTimezone, newReminderTiming, newReminderOffset, newReminderAt, reminderSent, reminderSentAt, newIsCompleted, newCompletedAt, newRecurrence, id, userId]
    );
    return formatTaskRow(res.rows[0]);
  },

  async toggleComplete(id, userId) {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const pool = getPgPool();
    const nextCompleted = !existing.is_completed;
    const completedAt = nextCompleted ? new Date().toISOString() : null;

    const res = await pool.query(
      `UPDATE tasks
       SET is_completed = $1, completed_at = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [nextCompleted, completedAt, id, userId]
    );
    return formatTaskRow(res.rows[0]);
  },

  async delete(id, userId) {
    const pool = getPgPool();
    const res = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    return formatTaskRow(res.rows[0]);
  },

  async getDueReminders() {
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT * FROM tasks
       WHERE is_completed = false
         AND reminder_sent = false
         AND reminder_at IS NOT NULL
         AND reminder_at <= NOW()
       ORDER BY reminder_at ASC
       LIMIT 100`
    );
    return res.rows.map(formatTaskRow);
  },

  async markReminderSent(id) {
    const pool = getPgPool();
    const res = await pool.query(
      'UPDATE tasks SET reminder_sent = true, reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return formatTaskRow(res.rows[0]);
  },

  async getStats(userId) {
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE is_completed = false)::int as pending,
         COUNT(*) FILTER (WHERE is_completed = true)::int as completed,
         COUNT(*) FILTER (WHERE is_completed = false AND due_at IS NOT NULL AND due_at < NOW())::int as overdue,
         COUNT(*) FILTER (WHERE due_at IS NOT NULL AND date_trunc('day', due_at AT TIME ZONE timezone) = date_trunc('day', NOW() AT TIME ZONE timezone))::int as today
       FROM tasks
       WHERE user_id = $1`,
      [userId]
    );
    const s = res.rows[0] || {};
    return {
      total: s.total || 0,
      pending: s.pending || 0,
      completed: s.completed || 0,
      overdue: s.overdue || 0,
      today: s.today || 0
    };
  }
};

// Push Subscription Model (Pure Neon PostgreSQL)
export const pushSubscriptionModel = {
  async save({ id, userId, endpoint, p256dh, auth, userAgent = '', deviceName = '' }) {
    const pool = getPgPool();
    const res = await pool.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, device_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent,
         device_name = EXCLUDED.device_name,
         updated_at = NOW()
       RETURNING *`,
      [id, userId, endpoint, p256dh, auth, userAgent, deviceName]
    );
    return formatPushSubRow(res.rows[0]);
  },

  async findByEndpoint(endpoint) {
    const pool = getPgPool();
    const res = await pool.query('SELECT * FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    return formatPushSubRow(res.rows[0]);
  },

  async findByUserId(userId) {
    const pool = getPgPool();
    const res = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    return res.rows.map(formatPushSubRow);
  },

  async deleteByEndpoint(endpoint) {
    const pool = getPgPool();
    const res = await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 RETURNING *', [endpoint]);
    return formatPushSubRow(res.rows[0]);
  },

  async deleteById(id, userId) {
    const pool = getPgPool();
    const res = await pool.query('DELETE FROM push_subscriptions WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    return formatPushSubRow(res.rows[0]);
  },

  async countByUser(userId) {
    const pool = getPgPool();
    const res = await pool.query('SELECT COUNT(*)::int as count FROM push_subscriptions WHERE user_id = $1', [userId]);
    return res.rows[0]?.count || 0;
  }
};
