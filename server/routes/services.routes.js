const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
 
// Public
router.get('/', servicesController.getAll);
 
// Admin only
router.post('/', verifyToken, requireRole('admin'), servicesController.create);
router.put('/:id', verifyToken, requireRole('admin'), servicesController.update);
router.delete('/:id', verifyToken, requireRole('admin'), servicesController.remove);
 
module.exports = router;