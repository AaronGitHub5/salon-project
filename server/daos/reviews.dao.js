const supabase = require('../supabaseClient');

async function createReview({ booking_id, customer_id, stylist_id, rating, comment }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ booking_id, customer_id, stylist_id, rating, comment, approved: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getReviewByBookingId(bookingId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getPendingReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, profiles(full_name), stylists(name)')
    .eq('approved', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function getApprovedReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, profiles(full_name), stylists(name)')
    .eq('approved', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function approveReview(id) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ approved: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteReview(id) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function getReviewsSummary(limit = 6) {
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('rating, comment, created_at, profiles(full_name), stylists(name)')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (reviewsError) throw reviewsError;

  const { data: allRatings, error: aggError } = await supabase
    .from('reviews')
    .select('rating')
    .eq('approved', true);
  if (aggError) throw aggError;

  const average =
    allRatings.length > 0
      ? parseFloat(
          (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
        )
      : null;

  return { average, total: allRatings.length, reviews };
}

module.exports = {
  createReview,
  getReviewByBookingId,
  getPendingReviews,
  getApprovedReviews,
  approveReview,
  deleteReview,
  getReviewsSummary,
};