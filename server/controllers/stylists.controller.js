const stylistsDao = require('../daos/stylists.dao');

async function getAllStylists(req, res) {
  try {
    const data = await stylistsDao.getAllStylists();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateStylistPricing(req, res) {
  try {
    const { price_multiplier, peak_surcharge_percent, peak_days, peak_hour_start } = req.body;

    if (price_multiplier !== undefined) {
      const m = parseFloat(price_multiplier);
      if (isNaN(m) || m < 0.5 || m > 3.0) {
        return res.status(400).json({ error: 'price_multiplier must be between 0.5 and 3.0' });
      }
    }

    if (peak_surcharge_percent !== undefined) {
      const p = parseFloat(peak_surcharge_percent);
      if (isNaN(p) || p < 0 || p > 50) {
        return res.status(400).json({ error: 'peak_surcharge_percent must be between 0 and 50' });
      }
    }

    if (peak_days !== undefined) {
      if (!Array.isArray(peak_days) || peak_days.some(d => d < 0 || d > 6)) {
        return res.status(400).json({ error: 'peak_days must be an array of integers 0–6' });
      }
    }

    if (peak_hour_start !== undefined) {
      const h = parseInt(peak_hour_start);
      if (isNaN(h) || h < 0 || h > 23) {
        return res.status(400).json({ error: 'peak_hour_start must be an integer 0–23' });
      }
    }

    const data = await stylistsDao.updateStylistPricing(req.params.id, {
      price_multiplier: price_multiplier !== undefined ? parseFloat(price_multiplier) : undefined,
      peak_surcharge_percent: peak_surcharge_percent !== undefined ? parseFloat(peak_surcharge_percent) : undefined,
      peak_days: peak_days !== undefined ? peak_days.map(Number) : undefined,
      peak_hour_start: peak_hour_start !== undefined ? parseInt(peak_hour_start) : undefined,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAllStylists, updateStylistPricing };