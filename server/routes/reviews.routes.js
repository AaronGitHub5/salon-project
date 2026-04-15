const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { submitReview, getReviewsSummary, getPendingReviews, getApprovedReviews, approveReview, deleteReview } = require('../controllers/reviews.controller');

// Public landing page reviews strip
router.get('/summary', getReviewsSummary);

// Customer submit a review
router.post('/', verifyToken, submitReview);

// Admin moderation
router.get('/pending', verifyToken, requireRole('admin'), getPendingReviews);
router.get('/approved', verifyToken, requireRole('admin'), getApprovedReviews);
router.patch('/:id/approve', verifyToken, requireRole('admin'), approveReview);
router.delete('/:id', verifyToken, requireRole('admin'), deleteReview);

module.exports = router;