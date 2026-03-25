const supabase = require('../supabaseClient');

async function getBookingsDueForReminder(window) {
  const now = new Date();

  let windowStart, windowEnd, sentColumn;

  if (window === '1h') {
    windowStart = new Date(now.getTime() + 45 * 60 * 1000);  // now + 45min
    windowEnd   = new Date(now.getTime() + 75 * 60 * 1000);  // now + 75min
    sentColumn  = 'reminder_1h_sent';
  } else {
    windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // now + 23h
    windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000); // now + 25h
    sentColumn  = 'reminder_sent';
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      customer_id,
      profiles:customer_id ( full_name, email ),
      services:service_id ( name ),
      stylists:stylist_id ( name )
    `)
    .eq('status', 'confirmed')
    .eq(sentColumn, false)
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString());

  if (error) throw error;
  return data || [];
}

async function markReminderSent(bookingId, window) {
  const column = window === '1h' ? 'reminder_1h_sent' : 'reminder_sent';

  const { error } = await supabase
    .from('bookings')
    .update({ [column]: true })
    .eq('id', bookingId);

  if (error) throw error;
}

module.exports = { getBookingsDueForReminder, markReminderSent };
