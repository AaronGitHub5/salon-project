const supabase = require('../supabaseClient');

async function getAllStylists() {
  const { data, error } = await supabase
    .from('stylists')
    .select('id, name, email, price_multiplier, peak_surcharge_percent, peak_days, peak_hour_start')
    .order('name');
  if (error) throw error;
  return data;
}

async function getStylistById(id) {
  const { data, error } = await supabase
    .from('stylists')
    .select('id, name, email, price_multiplier, peak_surcharge_percent, peak_days, peak_hour_start')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function updateStylistPricing(id, { price_multiplier, peak_surcharge_percent, peak_days, peak_hour_start }) {
  const updates = {};
  if (price_multiplier !== undefined) updates.price_multiplier = price_multiplier;
  if (peak_surcharge_percent !== undefined) updates.peak_surcharge_percent = peak_surcharge_percent;
  if (peak_days !== undefined) updates.peak_days = peak_days;
  if (peak_hour_start !== undefined) updates.peak_hour_start = peak_hour_start;

  const { data, error } = await supabase
    .from('stylists')
    .update(updates)
    .eq('id', id)
    .select('id, name, price_multiplier, peak_surcharge_percent, peak_days, peak_hour_start')
    .single();
  if (error) throw error;
  return data;
}

module.exports = { getAllStylists, getStylistById, updateStylistPricing };