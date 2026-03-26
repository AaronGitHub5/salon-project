const supabase = require('../supabaseClient');

async function getAllShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, stylists(name)')
    .order('stylist_id')
    .order('day_of_week');
  if (error) throw error;
  return data;
}

async function getShiftsByStylist(stylistId) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('stylist_id', stylistId)
    .order('day_of_week');
  if (error) throw error;
  return data;
}

async function createShift({ stylist_id, day_of_week, start_time, end_time }) {
  const { data, error } = await supabase
    .from('shifts')
    .insert([{ stylist_id, day_of_week, start_time, end_time }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateShift(id, { day_of_week, start_time, end_time }) {
  const { data, error } = await supabase
    .from('shifts')
    .update({ day_of_week, start_time, end_time })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteShift(id) {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function getShiftForDay(stylistId, dayOfWeek) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('stylist_id', stylistId)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = {
  getAllShifts,
  getShiftsByStylist,
  createShift,
  updateShift,
  deleteShift,
  getShiftForDay,
};
