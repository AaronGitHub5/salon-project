const { sendPendingReminders } = require('../services/reminders.service');

async function triggerReminders(req, res) {
  // Shared secret check — called by cron-job.org, not a user
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // window: '1h' or '24h' (default '24h')
  const window = req.body?.window === '1h' ? '1h' : '24h';

  try {
    const result = await sendPendingReminders(window);
    console.log(`Reminder job (${window}) complete: ${result.sent} sent, ${result.failed} failed`);
    return res.json({ success: true, window, ...result });
  } catch (err) {
    console.error('Reminder job error:', err);
    return res.status(500).json({ error: 'Reminder job failed' });
  }
}

module.exports = { triggerReminders };
