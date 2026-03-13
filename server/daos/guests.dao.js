const supabase = require('../supabaseClient');

async function createGuest({ full_name, phone_number, email }) {
  const { data, error } = await supabase
    .from('guests')
    .insert([{ full_name, phone_number, email }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteGuest(id) {
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { createGuest, deleteGuest };
