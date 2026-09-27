-- Migration 002: Tasks, Reminders & Web Push Subscriptions for Personal AI Vault

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  reminder_timing TEXT NOT NULL DEFAULT 'due_time',
  reminder_offset_minutes INTEGER NOT NULL DEFAULT 0,
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  recurrence_rule TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_user_due_idx ON tasks(user_id, due_at ASC);
CREATE INDEX IF NOT EXISTS tasks_user_completed_idx ON tasks(user_id, is_completed, due_at ASC);
CREATE INDEX IF NOT EXISTS tasks_reminder_pending_idx ON tasks(reminder_sent, reminder_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  device_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subscriptions(user_id);
