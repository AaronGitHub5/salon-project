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

async function getInactiveServices() {
  return servicesDao.getInactiveServices();
}

async function restoreService(id) {
  return servicesDao.restoreService(id);
}

module.exports = { getAllServices, createService, updateService, deleteService, getInactiveServices, restoreService };
