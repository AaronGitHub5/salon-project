const supabase = require('../supabaseClient');

async function getAnalyticsBookings(fromDate) {
  const { data, error } = await supabase
    .from('bookings')
    .select('start_time, services(name, base_price), stylists(name)')
    .in('status', ['confirmed', 'completed'])
    .gte('start_time', fromDate.toISOString());
  if (error) throw error;
  return data;
}

module.exports = { getAnalyticsBookings };