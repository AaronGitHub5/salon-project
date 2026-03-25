const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { submitReview, getReviewsSummary } = require('../controllers/reviews.controller');

// Public 
router.get('/summary', getReviewsSummary);

// Protected 
router.post('/', verifyToken, submitReview);

module.exports = router;
