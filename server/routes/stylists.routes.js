const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const ctrl = require('../controllers/stylists.controller');

// Public: booking modal needs stylist list (name + multiplier for price preview)
router.get('/', ctrl.getAllStylists);

// Admin only: update price_multiplier and/or peak_surcharge_percent
router.put('/:id/pricing', verifyToken, requireRole('admin'), ctrl.updateStylistPricing);

module.exports = router;