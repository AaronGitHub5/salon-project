const supabase = require('../supabaseClient');

async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, full_name, phone_number, loyalty_points')
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

  const remaining = profile.loyalty_points - 10;
  await updateLoyaltyPoints(id, remaining);

  const code = 'AMNESIA10-' + Math.random().toString(36).substring(2, 7).toUpperCase();

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .insert([{ customer_id: id, code, discount: 10, used: false }])
    .select()
    .single();
  if (error) throw error;

  return { code, discount: 10, visitsRemaining: remaining, voucherId: voucher.id };
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

async function lookupVoucherByCode(code) {
  const { data, error } = await supabase
    .from('vouchers')
    .select(`
      id,
      code,
      discount,
      used,
      created_at,
      profiles:customer_id ( full_name, email )
    `)
    .eq('code', code.toUpperCase().trim())
    .single();
  if (error) return null;
  return data;
}

async function markVoucherUsed(voucherId) {
  const { data, error } = await supabase
    .from('vouchers')
    .update({ used: true })
    .eq('id', voucherId)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('Voucher not found'), { status: 404 });
  return data;
}

async function updateProfile(id, { full_name, phone_number }) {
  const updates = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (phone_number !== undefined) updates.phone_number = phone_number;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, full_name, phone_number, email')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  getProfileById,
  updateLoyaltyPoints,
  updateProfile,
  redeemPoints,
  getVouchers,
  lookupVoucherByCode,
  markVoucherUsed,
};