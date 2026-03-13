const supabase = require('../supabaseClient');

async function getStylistShift(stylistId, dayOfWeek) {
  const { data, error } = await supabase
    .from('shifts')
    .select('start_time, end_time')
    .eq('stylist_id', stylistId)
    .eq('day_of_week', dayOfWeek)
    .single();
  if (error) throw error;
  return data;
}

async function getBookingsForDay(stylistId, date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('stylist_id', stylistId)
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString())
    .neq('status', 'cancelled');
  if (error) throw error;
  return data;
}

module.exports = { getStylistShift, getBookingsForDay };
