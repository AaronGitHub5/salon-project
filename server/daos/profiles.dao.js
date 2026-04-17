const supabase = require('../supabaseClient');
const crypto = require('crypto');

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
  const current = profile.loyalty_points || 0;
  if (current < 10) {
    throw Object.assign(new Error('You need 10 visits to redeem a voucher.'), { status: 400 });
  }

  // Optimistic-concurrency guard: only decrement if the row's current points
  // still match what we just read. This prevents double-voucher exploits from
  // two parallel redemption requests.
  const remaining = current - 10;
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ loyalty_points: remaining })
    .eq('id', id)
    .eq('loyalty_points', current)
    .select('loyalty_points');
  if (updateError) throw updateError;
  if (!updated || updated.length === 0) {
    throw Object.assign(
      new Error('Redemption failed — please refresh and try again.'),
      { status: 409 }
    );
  }

  // Cryptographically-strong 10-hex-char code (1 trillion combinations — birthday
  // collisions are negligible even at high voucher volume).
  const code = 'AMNESIA10-' + crypto.randomBytes(5).toString('hex').toUpperCase();

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
  // Atomic guard: only transition used=false → true. If the voucher has already
  // been marked used (e.g., admin double-clicked), the update affects zero rows
  // and we return a 409 so the UI can refresh rather than silently "succeeding".
  const { data, error } = await supabase
    .from('vouchers')
    .update({ used: true })
    .eq('id', voucherId)
    .eq('used', false)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw Object.assign(new Error('Voucher is already used or does not exist.'), { status: 409 });
  }
  return data[0];
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

async function searchCustomers(query) {
  // Strip PostgREST filter-syntax characters to prevent the search term from
  // injecting new OR clauses via the .or() filter string. Also caps length to
  // limit DoS / pattern-backtracking on extreme inputs.
  const q = query
    .trim()
    .toLowerCase()
    .replace(/[,()*%]/g, '')
    .slice(0, 100);
  if (!q) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number')
    .eq('role', 'customer')
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

module.exports = {
  getProfileById,
  updateLoyaltyPoints,
  updateProfile,
  redeemPoints,
  getVouchers,
  lookupVoucherByCode,
  markVoucherUsed,
  searchCustomers,
};