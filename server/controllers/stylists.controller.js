const { getAllStylists } = require('../daos/stylists.dao');

async function getAll(req, res) {
  try {
    const data = await getAllStylists();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll };
