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

async function redeemPoints(id) {
  const profile = await getProfileById(id);
  if (!profile) throw Object.assign(new Error('Profile not found'), { status: 404 });
  if ((profile.loyalty_points || 0) < 10) {
    throw Object.assign(new Error('You need 10 visits to redeem a voucher.'), { status: 400 });
  }

  // Reset visit count to 0
  await updateLoyaltyPoints(id, 0);

  // Generate voucher code
  const code = 'AMNESIA10-' + Math.random().toString(36).substring(2, 7).toUpperCase();

  // Save voucher to database
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .insert([{ customer_id: id, code, discount: 10, used: false }])
    .select()
    .single();
  if (error) throw error;

  return { code, discount: 10, visitsRemaining: 0, voucherId: voucher.id };
}

async function getVouchers(customerId) {
  const { data, error } = await supabase
    .from('vouchers')
    .select('id, code, discount, used, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = { getProfileById, updateLoyaltyPoints, redeemPoints, getVouchers };