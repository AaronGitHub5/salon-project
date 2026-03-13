const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
 
router.get('/', verifyToken, requireRole('admin'), analyticsController.getAnalytics);
 
module.exports = router;