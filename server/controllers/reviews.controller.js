const reviewsService = require('../services/reviews.service');

async function submitReview(req, res) {
  try {
    const customerId = req.user.sub;
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

module.exports = { submitReview, getReviewsSummary };
