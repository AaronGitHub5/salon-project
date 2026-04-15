const supabase = require('../supabaseClient');

async function getAllServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name');
  if (error) throw error;
  return data;
}

async function createService({ name, base_price, duration_minutes, category }) {
  const { data, error } = await supabase
    .from('services')
    .insert([{ name, base_price, duration_minutes, category }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateService(id, { name, base_price, duration_minutes, category }) {
  const { data, error } = await supabase
    .from('services')
    .update({ name, base_price, duration_minutes, category })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Soft delete — sets active=false so the service disappears from the menu
// but historical bookings that reference it still resolve correctly.
async function deleteService(id) {
  const { error } = await supabase
    .from('services')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}

async function getInactiveServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', false)
    .order('name');
  if (error) throw error;
  return data;
}

async function restoreService(id) {
  const { error } = await supabase
    .from('services')
    .update({ active: true })
    .eq('id', id);
  if (error) throw error;
}

module.exports = { getAllServices, createService, updateService, deleteService, getInactiveServices, restoreService };
