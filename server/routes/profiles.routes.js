const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { redeemPoints, getVouchers } = require('../controllers/profiles.controller');

router.post('/redeem', verifyToken, redeemPoints);
router.get('/vouchers', verifyToken, getVouchers);

module.exports = router;