const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { submitReview, getReviewsSummary, getPendingReviews, approveReview } = require('../controllers/reviews.controller');

// Public landing page reviews strip
router.get('/summary', getReviewsSummary);

// Customer submit a review
router.post('/', verifyToken, submitReview);

// Admin  moderation
router.get('/pending', verifyToken, requireRole('admin'), getPendingReviews);
router.patch('/:id/approve', verifyToken, requireRole('admin'), approveReview);

module.exports = router;