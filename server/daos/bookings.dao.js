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
    .select(`*, services(name, base_price), profiles(full_name, email, phone_number), guests(full_name, email, phone_number)`)
    .eq('stylist_id', stylistId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

async function getPendingBookingsForStylist(stylistId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, services(name, base_price, duration_minutes), profiles(full_name, email, phone_number), guests(full_name, email, phone_number)`)
    .eq('stylist_id', stylistId)
    .eq('status', 'pending')
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

async function searchBookings(query) {
  const q = query.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: profileBookings, error: profileError } = await supabase
    .from('bookings')
    .select(`*, services(name), stylists(name), profiles(full_name, email, phone_number)`)
    .in('status', ['confirmed', 'pending'])
    .not('customer_id', 'is', null)
    .gte('start_time', now)
    .order('start_time', { ascending: true });
  if (profileError) throw profileError;

  const { data: guestBookings, error: guestError } = await supabase
    .from('bookings')
    .select(`*, services(name), stylists(name), guests(full_name, email, phone_number)`)
    .in('status', ['confirmed', 'pending'])
    .not('guest_id', 'is', null)
    .gte('start_time', now)
    .order('start_time', { ascending: true });
  if (guestError) throw guestError;

  const matchesProfile = (b) => {
    const p = b.profiles;
    if (!p) return false;
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone_number?.toLowerCase().includes(q)
    );
  };

  const matchesGuest = (b) => {
    const g = b.guests;
    if (!g) return false;
    return (
      g.full_name?.toLowerCase().includes(q) ||
      g.email?.toLowerCase().includes(q) ||
      g.phone_number?.toLowerCase().includes(q)
    );
  };

  return [
    ...profileBookings.filter(matchesProfile),
    ...guestBookings.filter(matchesGuest),
  ].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

async function createBooking({ customer_id, service_id, stylist_id, start_time, end_time, status = 'confirmed' }) {
  const { data, error } = await supabase
    .from('bookings')
    .insert([{ customer_id, service_id, stylist_id, start_time, end_time, status }])
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

async function approveBooking(id) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', id)
    .select('*, services(name), profiles(email, full_name), stylists(name)')
    .single();
  if (error) throw error;
  return data;
}

async function rejectBooking(id) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*, services(name), profiles(email, full_name), stylists(name)')
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
  getPendingBookingsForStylist,
  getCustomerBookings,
  searchBookings,
  createBooking,
  createGuestBooking,
  approveBooking,
  rejectBooking,
  cancelBooking,
  completeBooking,
  rescheduleBooking,
  checkConflict,
};