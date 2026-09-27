import { processDueReminders } from './push.js';

let intervalHandle = null;
const POLL_INTERVAL_MS = 60 * 1000; // Run every minute (60 seconds)

/**
 * Start the background scheduled reminder job
 */
export function startReminderScheduler() {
  if (intervalHandle) return;

  console.log('⏰ Reminder background scheduler initialized (polling every 60s)');
  
  // Initial check shortly after boot (5s)
  setTimeout(() => {
    processDueReminders().catch(err => {
      console.error('Initial reminder check error:', err.message);
    });
  }, 5000);

  intervalHandle = setInterval(async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error('Scheduled reminder run error:', err.message);
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the scheduler (for clean shutdown)
 */
export function stopReminderScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('⏰ Reminder background scheduler stopped');
  }
}
