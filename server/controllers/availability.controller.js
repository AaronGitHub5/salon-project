const availabilityService = require('../services/availability.service');

async function getSlots(req, res) {
  try {
    const { stylistId, date } = req.params;
    const { serviceId } = req.query;
    const result = await availabilityService.getAvailableSlots(stylistId, date, serviceId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getSlots };
