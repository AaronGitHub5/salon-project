const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const ctrl = require('../controllers/shifts.controller');
const overrideCtrl = require('../controllers/shifts_override.controller');

// --- Recurring shifts ---
router.get('/', verifyToken, requireRole('admin'), ctrl.getAllShifts);
router.get('/stylist/:stylistId', verifyToken, requireRole('admin', 'stylist'), ctrl.getShiftsByStylist);
router.post('/', verifyToken, requireRole('admin'), ctrl.createShift);
router.put('/:id', verifyToken, requireRole('admin'), ctrl.updateShift);
router.delete('/:id', verifyToken, requireRole('admin'), ctrl.deleteShift);

// --- Day overrides ---
// Preview affected bookings before committing (no DB changes)
router.post('/overrides/preview', verifyToken, requireRole('admin'), overrideCtrl.previewOverride);
// Get all overrides for a stylist
router.get('/overrides/:stylistId', verifyToken, requireRole('admin'), overrideCtrl.getOverrides);
// Save override + cancel bookings + send emails
router.post('/overrides', verifyToken, requireRole('admin'), overrideCtrl.saveOverride);
// Remove an override
router.delete('/overrides/:id', verifyToken, requireRole('admin'), overrideCtrl.deleteOverride);

module.exports = router;