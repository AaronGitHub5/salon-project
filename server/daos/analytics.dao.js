const supabase = require('../supabaseClient');

async function getAnalyticsBookings(fromDate) {
  const { data, error } = await supabase
    .from('bookings')
    .select('start_time, services(base_price), stylists(name)')
    .gte('start_time', fromDate.toISOString());
  if (error) throw error;
  return data;
}

module.exports = { getAnalyticsBookings };
