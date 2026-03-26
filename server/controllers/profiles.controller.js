const profilesDao = require('../daos/profiles.dao');

async function redeemPoints(req, res) {
  try {
    const userId = req.user.id;
    const result = await profilesDao.redeemPoints(userId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function getVouchers(req, res) {
  try {
    const userId = req.user.id;
    const vouchers = await profilesDao.getVouchers(userId);
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin: lookup voucher by code
async function lookupVoucher(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Code is required' });
    const voucher = await profilesDao.lookupVoucherByCode(code);
    if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin: mark voucher as used
async function markVoucherUsed(req, res) {
  try {
    const { id } = req.params;
    const voucher = await profilesDao.markVoucherUsed(id);
    res.json(voucher);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { redeemPoints, getVouchers, lookupVoucher, markVoucherUsed };