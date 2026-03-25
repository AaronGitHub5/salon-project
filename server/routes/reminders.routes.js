const express = require('express');
const { triggerReminders } = require('../controllers/reminders.controller');

const router = express.Router();

// POST /api/reminders/send
// Called by cron-job.org every hour — protected by x-cron-secret header
router.post('/send', triggerReminders);

module.exports = router;
