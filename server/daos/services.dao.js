const supabase = require('../supabaseClient');

async function getAllServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
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

async function deleteService(id) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getAllServices, createService, updateService, deleteService };
