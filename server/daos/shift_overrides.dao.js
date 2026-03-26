const supabase = require('../supabaseClient');

async function getOverridesByStylist(stylistId) {
  const { data, error } = await supabase
    .from('shift_overrides')
    .select('*')
    .eq('stylist_id', stylistId)
    .order('override_date', { ascending: true });
  if (error) throw error;
  return data;
}

async function getOverrideForDate(stylistId, overrideDate) {
  const { data, error } = await supabase
    .from('shift_overrides')
    .select('*')
    .eq('stylist_id', stylistId)
    .eq('override_date', overrideDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Upsert — insert or update if same stylist+date already exists
async function upsertOverride({ stylist_id, override_date, is_working, reason }) {
  const { data, error } = await supabase
    .from('shift_overrides')
    .upsert(
      { stylist_id, override_date, is_working, reason },
      { onConflict: 'stylist_id,override_date' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteOverride(id) {
  const { error } = await supabase
    .from('shift_overrides')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Get confirmed bookings for a stylist on a specific date
// cancelRemainingOnly: if true, only return bookings that start from now onwards
async function getConfirmedBookingsForDate(stylistId, overrideDate, cancelRemainingOnly = false) {
  const dayStart = `${overrideDate}T00:00:00.000Z`;
  const dayEnd = `${overrideDate}T23:59:59.999Z`;
  const fromTime = cancelRemainingOnly ? new Date().toISOString() : dayStart;

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, customer_id, guest_id,
      services(name),
      profiles(email, full_name),
      guests(email, full_name)
    `)
    .eq('stylist_id', stylistId)
    .eq('status', 'confirmed')
    .gte('start_time', fromTime)
    .lte('start_time', dayEnd);
  if (error) throw error;
  return data;
}

async function cancelBookingById(id) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}

module.exports = {
  getOverridesByStylist,
  getOverrideForDate,
  upsertOverride,
  deleteOverride,
  getConfirmedBookingsForDate,
  cancelBookingById,
};
