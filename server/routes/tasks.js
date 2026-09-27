import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { taskModel } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { processDueReminders } from '../services/push.js';
import { config } from '../config.js';

const router = express.Router();

/**
 * Helper to calculate reminder_at timestamp in UTC
 */
function calculateReminderAt(dueAt, reminderTiming, reminderOffsetMinutes, explicitReminderAt = null) {
  if (explicitReminderAt) {
    try {
      return new Date(explicitReminderAt).toISOString();
    } catch (e) {
      // ignore
    }
  }

  if (!dueAt || reminderTiming === 'none') {
    return null;
  }

  const dueDate = new Date(dueAt);
  if (isNaN(dueDate.getTime())) {
    return null;
  }

  let offsetMinutes = 0;
  if (reminderTiming === '5m') {
    offsetMinutes = 5;
  } else if (reminderTiming === '15m') {
    offsetMinutes = 15;
  } else if (reminderTiming === '1h') {
    offsetMinutes = 60;
  } else if (reminderTiming === 'custom') {
    offsetMinutes = Math.max(0, parseInt(reminderOffsetMinutes, 10) || 0);
  } else {
    // 'due_time' or default
    offsetMinutes = 0;
  }

  const reminderTime = new Date(dueDate.getTime() - offsetMinutes * 60 * 1000);
  return reminderTime.toISOString();
}

/**
 * GET /api/tasks - List tasks for authenticated user with optional filter
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const status = req.query.status || 'all';
    const search = req.query.q || req.query.search || '';
    const limit = parseInt(req.query.limit, 10) || 300;
    const offset = parseInt(req.query.offset, 10) || 0;

    const tasks = await taskModel.listByUser(req.user.id, { status, search, limit, offset });
    res.json({ tasks });
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

/**
 * GET /api/tasks/stats - Get task counts and metrics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await taskModel.getStats(req.user.id);
    res.json({ stats });
  } catch (err) {
    console.error('Task stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve task statistics.' });
  }
});

/**
 * GET /api/tasks/:id - Get a single task by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await taskModel.findById(req.params.id, req.user.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ task });
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Failed to load task.' });
  }
});

/**
 * POST /api/tasks - Create a new task with due date & reminder timing
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      notes = '',
      due_at,
      dueAt,
      timezone = 'UTC',
      reminder_timing,
      reminderTiming = 'due_time',
      reminder_offset_minutes,
      reminderOffsetMinutes = 0,
      reminder_at,
      reminderAt,
      recurrence_rule,
      recurrenceRule = 'none'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const rawDueAt = due_at || dueAt || null;
    const cleanDueAt = rawDueAt ? new Date(rawDueAt).toISOString() : null;
    const timing = reminder_timing || reminderTiming || 'due_time';
    const offset = parseInt(reminder_offset_minutes !== undefined ? reminder_offset_minutes : reminderOffsetMinutes, 10) || 0;
    const explicitReminder = reminder_at || reminderAt || null;

    const computedReminderAt = calculateReminderAt(cleanDueAt, timing, offset, explicitReminder);

    const taskId = crypto.randomUUID();
    const task = await taskModel.create({
      id: taskId,
      userId: req.user.id,
      title: title.trim(),
      notes: (notes || '').trim(),
      dueAt: cleanDueAt,
      timezone: timezone || 'UTC',
      reminderTiming: timing,
      reminderOffsetMinutes: offset,
      reminderAt: computedReminderAt,
      recurrenceRule: recurrence_rule || recurrenceRule || 'none'
    });

    res.status(201).json({ task, message: 'Task created successfully.' });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

/**
 * PUT /api/tasks/:id - Update an existing task
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await taskModel.findById(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const {
      title,
      notes,
      due_at,
      dueAt,
      timezone,
      reminder_timing,
      reminderTiming,
      reminder_offset_minutes,
      reminderOffsetMinutes,
      reminder_at,
      reminderAt,
      is_completed,
      isCompleted,
      recurrence_rule,
      recurrenceRule
    } = req.body;

    const rawDueAt = due_at !== undefined ? due_at : (dueAt !== undefined ? dueAt : existing.due_at);
    const cleanDueAt = rawDueAt ? new Date(rawDueAt).toISOString() : null;
    const timing = reminder_timing !== undefined ? reminder_timing : (reminderTiming !== undefined ? reminderTiming : existing.reminder_timing);
    const offset = parseInt(reminder_offset_minutes !== undefined ? reminder_offset_minutes : (reminderOffsetMinutes !== undefined ? reminderOffsetMinutes : existing.reminder_offset_minutes), 10) || 0;
    const explicitReminder = reminder_at !== undefined ? reminder_at : (reminderAt !== undefined ? reminderAt : null);

    let computedReminderAt = existing.reminder_at;
    if (due_at !== undefined || dueAt !== undefined || reminder_timing !== undefined || reminderTiming !== undefined || reminder_offset_minutes !== undefined || reminderOffsetMinutes !== undefined || reminder_at !== undefined || reminderAt !== undefined) {
      computedReminderAt = calculateReminderAt(cleanDueAt, timing, offset, explicitReminder);
    }

    const updated = await taskModel.update(req.params.id, req.user.id, {
      title: title !== undefined ? title.trim() : undefined,
      notes: notes !== undefined ? notes.trim() : undefined,
      dueAt: cleanDueAt,
      timezone: timezone !== undefined ? timezone : undefined,
      reminderTiming: timing,
      reminderOffsetMinutes: offset,
      reminderAt: computedReminderAt,
      isCompleted: is_completed !== undefined ? is_completed : (isCompleted !== undefined ? isCompleted : undefined),
      recurrenceRule: recurrence_rule !== undefined ? recurrence_rule : (recurrenceRule !== undefined ? recurrenceRule : undefined)
    });

    res.json({ task: updated, message: 'Task updated successfully.' });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

/**
 * PATCH /api/tasks/:id/toggle - Toggle task completion status
 */
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const updated = await taskModel.toggleComplete(req.params.id, req.user.id);
    if (!updated) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ task: updated, message: updated.is_completed ? 'Task marked complete.' : 'Task reopened.' });
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ error: 'Failed to toggle task completion.' });
  }
});

/**
 * DELETE /api/tasks/:id - Delete a task
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await taskModel.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

/**
 * POST/GET /api/tasks/cron/reminders - Serverless/cron scheduled trigger for reminder notifications
 * Supports CRON_SECRET authorization header, query param, or authenticated user session.
 */
router.all('/cron/reminders', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const cronSecretHeader = req.headers['x-cron-secret'];
  const querySecret = req.query.secret;

  let authorized = false;

  if (cronSecretHeader && cronSecretHeader === config.cronSecret) {
    authorized = true;
  } else if (querySecret && querySecret === config.cronSecret) {
    authorized = true;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === config.cronSecret) {
      authorized = true;
    } else {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded && (decoded.userId || decoded.id)) {
          authorized = true;
        }
      } catch (e) {
        // invalid token
      }
    }
  }

  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized. Provide valid CRON_SECRET or session token.' });
  }

  try {
    const result = await processDueReminders();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Cron reminder run error:', err);
    res.status(500).json({ error: 'Failed to process reminders: ' + err.message });
  }
});

export default router;
