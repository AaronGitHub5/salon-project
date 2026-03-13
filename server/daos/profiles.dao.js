const supabase = require('../supabaseClient');

async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, full_name, loyalty_points')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function updateLoyaltyPoints(id, newPoints) {
  const { error } = await supabase
    .from('profiles')
    .update({ loyalty_points: newPoints })
    .eq('id', id);
  if (error) throw error;
}

module.exports = { getProfileById, updateLoyaltyPoints };
