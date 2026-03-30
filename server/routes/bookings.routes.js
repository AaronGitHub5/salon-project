const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookings.controller');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

router.get('/', verifyToken, requireRole('admin'), bookingsController.getAll);
router.post('/', verifyToken, bookingsController.create);
router.post('/guest', verifyToken, requireRole('admin'), bookingsController.createGuest);
router.get('/search', verifyToken, requireRole('admin'), bookingsController.searchBookings);
router.get('/customer/:id', verifyToken, bookingsController.getByCustomer);
router.get('/stylist/:id', verifyToken, requireRole('stylist'), bookingsController.getByStylist);
router.get('/stylist/:id/pending', verifyToken, requireRole('stylist'), bookingsController.getPendingForStylist);
router.put('/:id/approve', verifyToken, requireRole('stylist'), bookingsController.approve);
router.put('/:id/reject', verifyToken, requireRole('stylist'), bookingsController.reject);
router.put('/:id/cancel', verifyToken, bookingsController.cancel);
router.put('/:id/complete', verifyToken, requireRole('stylist'), bookingsController.complete);
router.put('/:id/reschedule', verifyToken, bookingsController.reschedule);
router.get('/:id/export', verifyToken, bookingsController.exportIcs);

module.exports = router;