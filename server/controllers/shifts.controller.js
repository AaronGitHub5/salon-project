const shiftService = require('../services/shift.service');

async function getAllShifts(req, res) {
  try {
    const data = await shiftService.getAllShifts();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getShiftsByStylist(req, res) {
  try {
    const data = await shiftService.getShiftsForStylist(req.params.stylistId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createShift(req, res) {
  try {
    const { stylist_id, day_of_week, start_time, end_time } = req.body;
    if (!stylist_id || day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ error: 'stylist_id, day_of_week, start_time, end_time required' });
    }
    const data = await shiftService.createShift({ stylist_id, day_of_week, start_time, end_time });
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function updateShift(req, res) {
  try {
    const { day_of_week, start_time, end_time } = req.body;
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time required' });
    }
    const data = await shiftService.updateShift(req.params.id, { day_of_week, start_time, end_time });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function deleteShift(req, res) {
  try {
    await shiftService.deleteShift(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAllShifts, getShiftsByStylist, createShift, updateShift, deleteShift };
