const supabase = require('../supabaseClient');

async function getAllBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `*, services(name, base_price), stylists(name), profiles(full_name, email), guests(full_name, phone_number, email)`
    )
    .order('start_time');
  if (error) throw error;
  return data;
}

async function getBookingById(id) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, services(name, duration_minutes, base_price), profiles(email, full_name), stylists(name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function getStylistBookings(stylistId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, services(name, base_price), profiles(full_name), guests(full_name)`)
    .eq('stylist_id', stylistId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

async function getCustomerBookings(customerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, start_time, end_time, status, services(name, duration_minutes, base_price), stylists(name)`
    )
    .eq('customer_id', customerId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

async function createBooking({ customer_id, service_id, stylist_id, start_time, end_time }) {
  const { data, error } = await supabase
    .from('bookings')
    .insert([{ customer_id, service_id, stylist_id, start_time, end_time, status: 'confirmed' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createGuestBooking({ guest_id, service_id, stylist_id, start_time, end_time }) {
  const { data, error } = await supabase
    .from('bookings')
    .insert([{ guest_id, service_id, stylist_id, start_time, end_time, status: 'confirmed' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function cancelBooking(id) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select(`*, profiles(email), services(name)`)
    .single();
  if (error) throw error;
  return data;
}

async function completeBooking(id) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', id);
  if (error) throw error;
}

async function rescheduleBooking(id, newStartTime, newEndTime) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ start_time: newStartTime, end_time: newEndTime })
    .eq('id', id)
    .select('*, services(name), stylists(name), profiles(email, full_name)')
    .single();
  if (error) throw error;
  return data;
}

async function checkConflict(stylistId, startTime, endTime, excludeBookingId = null) {
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('stylist_id', stylistId)
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .neq('status', 'cancelled');

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.length > 0;
}

module.exports = {
  getAllBookings,
  getBookingById,
  getStylistBookings,
  getCustomerBookings,
  createBooking,
  createGuestBooking,
  cancelBooking,
  completeBooking,
  rescheduleBooking,
  checkConflict,
};