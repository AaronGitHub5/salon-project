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

module.exports = { redeemPoints, getVouchers };