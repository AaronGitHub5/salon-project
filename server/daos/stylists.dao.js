const supabase = require('../supabaseClient');

async function getAllStylists() {
  const { data, error } = await supabase
    .from('stylists')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

module.exports = { getAllStylists };
