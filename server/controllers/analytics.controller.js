const analyticsService = require('../services/analytics.service');

async function getAnalytics(req, res) {
  try {
    const data = await analyticsService.getAnalytics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAnalytics };
