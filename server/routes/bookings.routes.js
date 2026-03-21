const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookings.controller');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

router.get('/', verifyToken, requireRole('admin'), bookingsController.getAll);
router.post('/', verifyToken, bookingsController.create);
router.post('/guest', verifyToken, requireRole('admin'), bookingsController.createGuest);
router.get('/customer/:id', verifyToken, bookingsController.getByCustomer);
router.put('/:id/cancel', verifyToken, bookingsController.cancel);
router.put('/:id/complete', verifyToken, requireRole('stylist'), bookingsController.complete);
router.put('/:id/reschedule', verifyToken, bookingsController.reschedule);
router.get('/:id/export', verifyToken, bookingsController.exportIcs);

module.exports = router;