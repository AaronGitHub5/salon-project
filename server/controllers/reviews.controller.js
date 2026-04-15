const reviewsService = require('../services/reviews.service');

async function submitReview(req, res) {
  try {
    const customerId = req.user.id;
    const review = await reviewsService.submitReview(customerId, req.body);
    res.status(201).json(review);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function getReviewsSummary(req, res) {
  try {
    const summary = await reviewsService.getReviewsSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getPendingReviews(req, res) {
  try {
    const reviews = await reviewsService.getPendingReviews();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getApprovedReviews(req, res) {
  try {
    const reviews = await reviewsService.getApprovedReviews();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function approveReview(req, res) {
  try {
    const review = await reviewsService.approveReview(req.params.id);
    res.json(review);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function deleteReview(req, res) {
  try {
    await reviewsService.deleteReview(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { submitReview, getReviewsSummary, getPendingReviews, getApprovedReviews, approveReview, deleteReview };