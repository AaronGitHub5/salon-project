const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { redeemPoints, getVouchers, lookupVoucher, markVoucherUsed, updateProfile, searchCustomers } = require('../controllers/profiles.controller');

// Admin routes — BEFORE /:id to avoid "search" matching as an id
router.get('/search', verifyToken, requireRole('admin'), searchCustomers);
router.get('/vouchers/lookup', verifyToken, requireRole('admin'), lookupVoucher);
router.patch('/vouchers/:id/use', verifyToken, requireRole('admin'), markVoucherUsed);

// Customer routes
router.post('/redeem', verifyToken, redeemPoints);
router.get('/vouchers', verifyToken, getVouchers);
router.put('/:id', verifyToken, updateProfile);

module.exports = router;