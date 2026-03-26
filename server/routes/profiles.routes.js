const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { redeemPoints, getVouchers, lookupVoucher, markVoucherUsed, updateProfile } = require('../controllers/profiles.controller');

// Customer routes
router.post('/redeem', verifyToken, redeemPoints);
router.get('/vouchers', verifyToken, getVouchers);
router.put('/:id', verifyToken, updateProfile);

// Admin routes
router.get('/vouchers/lookup', verifyToken, requireRole('admin'), lookupVoucher);
router.patch('/vouchers/:id/use', verifyToken, requireRole('admin'), markVoucherUsed);

module.exports = router;