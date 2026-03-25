const supabase = require('../supabaseClient');

async function createReview({ booking_id, customer_id, stylist_id, rating, comment }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ booking_id, customer_id, stylist_id, rating, comment }])
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

async function getReviewsSummary(limit = 6) {
  // Recent reviews with joined profile and stylist names
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('rating, comment, created_at, profiles(full_name), stylists(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (reviewsError) throw reviewsError;

  // Separate query for average 
  const { data: allRatings, error: aggError } = await supabase
    .from('reviews')
    .select('rating');
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
  getReviewsSummary,
};
