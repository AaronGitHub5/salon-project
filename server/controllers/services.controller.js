const servicesService = require('../services/services.service');

async function getAll(req, res) {
  try {
    const data = await servicesService.getAllServices();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { name, base_price, duration_minutes, category } = req.body;
    const data = await servicesService.createService({ name, base_price, duration_minutes, category });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const { name, base_price, duration_minutes, category } = req.body;
    const data = await servicesService.updateService(req.params.id, { name, base_price, duration_minutes, category });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await servicesService.deleteService(req.params.id);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getInactive(req, res) {
  try {
    const data = await servicesService.getInactiveServices();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function restore(req, res) {
  try {
    await servicesService.restoreService(req.params.id);
    res.json({ message: 'Service restored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove, getInactive, restore };
