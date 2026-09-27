import express from 'express';
import crypto from 'crypto';
import { pushSubscriptionModel } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { getVapidPublicKey, sendNotificationToUser, sendNotification } from '../services/push.js';

const router = express.Router();

/**
 * GET /api/push/vapid-key - Retrieve public VAPID key for service worker subscription
 */
router.get('/vapid-key', (req, res) => {
  try {
    const key = getVapidPublicKey();
    if (!key) {
      return res.status(500).json({ error: 'VAPID public key unavailable.' });
    }
    res.json({ publicKey: key });
  } catch (err) {
    console.error('Get VAPID key error:', err);
    res.status(500).json({ error: 'Failed to retrieve VAPID key.' });
  }
});

/**
 * POST /api/push/subscribe - Store or update a device's push subscription
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const rawSub = req.body.subscription || req.body;
    const endpoint = rawSub.endpoint;
    const keys = rawSub.keys;
    const userAgent = req.body.userAgent || req.headers['user-agent'] || '';
    const deviceName = req.body.deviceName || req.body.device_name || (req.headers['user-agent']?.includes('Mobile') ? 'Mobile Device' : 'Desktop / Laptop');

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid push subscription payload. Endpoint and keys are required.' });
    }

    const subId = crypto.randomUUID();
    const subscription = await pushSubscriptionModel.save({
      id: subId,
      userId: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
      deviceName
    });

    res.status(201).json({ subscription, message: 'Device registered for push notifications.' });
  } catch (err) {
    console.error('Subscribe push error:', err);
    res.status(500).json({ error: 'Failed to save push subscription.' });
  }
});

/**
 * POST /api/push/unsubscribe - Revoke / delete device subscription
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required to unsubscribe.' });
    }

    await pushSubscriptionModel.deleteByEndpoint(endpoint);
    res.json({ success: true, message: 'Push subscription removed.' });
  } catch (err) {
    console.error('Unsubscribe push error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe.' });
  }
});

/**
 * POST /api/push/test - Dispatch test push notification to user's registered devices
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const payload = {
      title: '🔒 Personal AI Vault',
      body: `Test notification successful! Your ${req.headers['user-agent']?.includes('Mobile') ? 'phone' : 'laptop'} is ready for reminders.`,
      url: '/?tab=tasks',
      tag: 'vault-test-notification',
      timestamp: Date.now()
    };

    const result = await sendNotificationToUser(req.user.id, payload);
    if (result.total === 0) {
      return res.status(400).json({
        error: 'No active push subscriptions found for your account on this device. Please grant notification permissions first.',
        result
      });
    }

    res.json({
      success: result.sent > 0,
      message: `Sent test notification to ${result.sent} of ${result.total} device(s).`,
      result
    });
  } catch (err) {
    console.error('Test push error:', err);
    res.status(500).json({ error: 'Failed to send test push notification: ' + err.message });
  }
});

/**
 * GET /api/push/devices - Get list of active registered devices for current user
 */
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const devices = await pushSubscriptionModel.findByUserId(req.user.id);
    const sanitized = devices.map(d => ({
      id: d.id,
      deviceName: d.device_name,
      userAgent: d.user_agent,
      created_at: d.created_at,
      updated_at: d.updated_at
    }));
    res.json({ devices: sanitized, count: sanitized.length });
  } catch (err) {
    console.error('Get devices error:', err);
    res.status(500).json({ error: 'Failed to retrieve registered devices.' });
  }
});

export default router;
