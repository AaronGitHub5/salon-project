const shiftOverrideService = require('../services/shift_override.service');

// GET /api/shifts/overrides/:stylistId
async function getOverrides(req, res) {
  try {
    const data = await shiftOverrideService.getOverridesForStylist(req.params.stylistId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/shifts/overrides/preview
// Returns count + list of bookings that would be affected
async function previewOverride(req, res) {
  try {
    const { stylist_id, override_date, end_date, cancel_remaining_only, all_stylists } = req.body;
    if (!all_stylists && !stylist_id) {
      return res.status(400).json({ error: 'stylist_id required (or set all_stylists: true)' });
    }
    if (!override_date) {
      return res.status(400).json({ error: 'override_date required' });
    }
    const preview = await shiftOverrideService.previewOverride({
      stylist_id,
      override_date,
      end_date: end_date || null,
      cancel_remaining_only: cancel_remaining_only ?? false,
      all_stylists: all_stylists ?? false,
    });
    res.json(preview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/shifts/overrides
// Saves override + cancels bookings + sends emails
async function saveOverride(req, res) {
  try {
    const { stylist_id, override_date, end_date, is_working, reason, cancel_remaining_only, all_stylists } = req.body;
    if (!all_stylists && !stylist_id) {
      return res.status(400).json({ error: 'stylist_id required (or set all_stylists: true)' });
    }
    if (!override_date) {
      return res.status(400).json({ error: 'override_date required' });
    }
    const result = await shiftOverrideService.saveOverride({
      stylist_id,
      override_date,
      end_date: end_date || null,
      is_working: is_working ?? false,
      reason: reason || null,
      cancel_remaining_only: cancel_remaining_only ?? false,
      all_stylists: all_stylists ?? false,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/shifts/overrides/:id
async function deleteOverride(req, res) {
  try {
    await shiftOverrideService.deleteOverride(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getOverrides, previewOverride, saveOverride, deleteOverride };