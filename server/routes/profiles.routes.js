const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { redeemPoints } = require('../controllers/profiles.controller');

// Customer redeems 200 points for a voucher code
router.post('/redeem', verifyToken, redeemPoints);

module.exports = router;
