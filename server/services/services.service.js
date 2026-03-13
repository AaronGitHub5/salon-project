const servicesDao = require('../daos/services.dao');

async function getAllServices() {
  return servicesDao.getAllServices();
}

async function createService(data) {
  return servicesDao.createService(data);
}

async function updateService(id, data) {
  return servicesDao.updateService(id, data);
}

async function deleteService(id) {
  return servicesDao.deleteService(id);
}

module.exports = { getAllServices, createService, updateService, deleteService };
