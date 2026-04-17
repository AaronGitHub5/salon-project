const reviewsDao = require('../daos/reviews.dao');
const bookingsDao = require('../daos/bookings.dao');

async function submitReview(customerId, { booking_id, rating, comment }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw Object.assign(new Error('Rating must be an integer between 1 and 5'), { status: 400 });
  }
  if (comment && typeof comment === 'string' && comment.length > 1000) {
    throw Object.assign(new Error('Comment must be under 1000 characters'), { status: 400 });
  }

  const booking = await bookingsDao.getBookingById(booking_id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
  if (booking.customer_id !== customerId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (booking.status !== 'completed') {
    throw Object.assign(new Error('Reviews can only be submitted for completed bookings'), { status: 400 });
  }

  const existing = await reviewsDao.getReviewByBookingId(booking_id);
  if (existing) throw Object.assign(new Error('A review already exists for this booking'), { status: 409 });

  return reviewsDao.createReview({
    booking_id,
    customer_id: customerId,
    stylist_id: booking.stylist_id,
    rating,
    comment: comment || null,
  });
}

async function getReviewsSummary() {
  return reviewsDao.getReviewsSummary(6);
}

async function getPendingReviews() {
  return reviewsDao.getPendingReviews();
}

async function getApprovedReviews() {
  return reviewsDao.getApprovedReviews();
}

async function approveReview(id) {
  return reviewsDao.approveReview(id);
}

async function deleteReview(id) {
  return reviewsDao.deleteReview(id);
}

module.exports = { submitReview, getReviewsSummary, getPendingReviews, getApprovedReviews, approveReview, deleteReview };