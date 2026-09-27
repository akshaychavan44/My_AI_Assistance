import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { taskModel, pushSubscriptionModel } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Vercel deployments have a read-only application directory. Persistent VAPID
// keys should be supplied as environment variables there; /tmp only prevents
// startup failures when local fallback keys are required.
const VAPID_KEY_FILE = process.env.VERCEL
  ? path.join('/tmp', 'personal-ai-vault-vapid_keys.json')
  : path.join(__dirname, '..', '..', 'data', 'vapid_keys.json');

let activeVapidKeys = {
  publicKey: config.vapid.publicKey,
  privateKey: config.vapid.privateKey,
  subject: config.vapid.subject || 'mailto:admin@personal-ai-vault.app'
};

/**
 * Initialize VAPID keys from environment or persistent file
 */
export function initVapid() {
  if (activeVapidKeys.publicKey && activeVapidKeys.privateKey) {
    try {
      webpush.setVapidDetails(
        activeVapidKeys.subject,
        activeVapidKeys.publicKey,
        activeVapidKeys.privateKey
      );
      return activeVapidKeys;
    } catch (err) {
      console.warn('Configured VAPID keys invalid, generating fallback keys:', err.message);
    }
  }

  // Check persistent file
  const dataDir = path.dirname(VAPID_KEY_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(VAPID_KEY_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(VAPID_KEY_FILE, 'utf8'));
      if (fileData.publicKey && fileData.privateKey) {
        activeVapidKeys.publicKey = fileData.publicKey;
        activeVapidKeys.privateKey = fileData.privateKey;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!activeVapidKeys.publicKey || !activeVapidKeys.privateKey) {
    const generated = webpush.generateVAPIDKeys();
    activeVapidKeys.publicKey = generated.publicKey;
    activeVapidKeys.privateKey = generated.privateKey;
    try {
      fs.writeFileSync(VAPID_KEY_FILE, JSON.stringify(activeVapidKeys, null, 2));
    } catch (e) {
      console.warn('Could not save generated VAPID keys to disk:', e.message);
    }
  }

  webpush.setVapidDetails(
    activeVapidKeys.subject,
    activeVapidKeys.publicKey,
    activeVapidKeys.privateKey
  );

  return activeVapidKeys;
}

// Initialize on module load
initVapid();

export function getVapidPublicKey() {
  if (!activeVapidKeys.publicKey) {
    initVapid();
  }
  return activeVapidKeys.publicKey;
}

/**
 * Send push notification to a single device subscription
 */
export async function sendNotification(subscription, payload) {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 86400,
      urgency: 'high'
    });

    return { success: true, endpoint: subscription.endpoint };
  } catch (err) {
    const statusCode = err.statusCode || err.status;
    const isRevokedOrInvalid = statusCode === 404 || statusCode === 410 ||
      (statusCode === 400 && err.message?.includes('subscription')) ||
      (err.message && (err.message.includes('p256dh') || err.message.includes('bytes long') || err.message.includes('invalid key')));

    console.warn(`Push notification failed for endpoint (${statusCode || err.message})`);

    // Prune revoked or corrupt subscription endpoints from database
    if (isRevokedOrInvalid) {
      console.log(`Removing invalid or revoked push subscription: ${subscription.endpoint}`);
      try {
        await pushSubscriptionModel.deleteByEndpoint(subscription.endpoint);
      } catch (delErr) {
        console.error('Failed to prune bad subscription:', delErr.message);
      }
    }

    return { 
      success: false, 
      endpoint: subscription.endpoint, 
      error: err.message, 
      expired: isRevokedOrInvalid 
    };
  }
}

/**
 * Send push notification to all registered devices of a user (phone, laptop, etc.)
 */
export async function sendNotificationToUser(userId, payload) {
  const subscriptions = await pushSubscriptionModel.findByUserId(userId);
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const results = await Promise.all(
    subscriptions.map(sub => sendNotification(sub, payload))
  );

  const sent = results.filter(r => r.success).length;
  const failed = results.length - sent;

  return { sent, failed, total: subscriptions.length };
}

/**
 * Process all due task reminders across all users
 * Designed to be executed every minute via background interval or cron endpoint.
 * Prevents duplicates by marking reminder_sent before/during push delivery.
 */
export async function processDueReminders() {
  try {
    const dueTasks = await taskModel.getDueReminders();
    if (!dueTasks || dueTasks.length === 0) {
      return { processed: 0, timestamp: new Date().toISOString() };
    }

    console.log(`⏰ Found ${dueTasks.length} due reminder(s) to dispatch...`);
    const results = [];

    for (const task of dueTasks) {
      // Immediately mark as sent in database to prevent duplicate notifications
      await taskModel.markReminderSent(task.id);

      const payload = {
        title: `⏰ Reminder: ${task.title}`,
        body: task.notes ? (task.notes.length > 120 ? task.notes.slice(0, 117) + '...' : task.notes) : 'Task reminder is due now.',
        url: `/?task=${encodeURIComponent(task.id)}`,
        tag: `task-reminder-${task.id}`,
        taskId: task.id,
        dueAt: task.due_at,
        timezone: task.timezone,
        timestamp: Date.now()
      };

      const pushResult = await sendNotificationToUser(task.user_id, payload);
      results.push({ taskId: task.id, title: task.title, ...pushResult });
    }

    return {
      processed: dueTasks.length,
      details: results,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Error processing due reminders:', err);
    return { error: err.message, timestamp: new Date().toISOString() };
  }
}
