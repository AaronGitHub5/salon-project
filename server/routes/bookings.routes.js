const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookings.controller');

router.get('/', bookingsController.getAll);
router.post('/', bookingsController.create);
router.post('/guest', bookingsController.createGuest);
router.get('/customer/:id', bookingsController.getByCustomer);
router.put('/:id/cancel', bookingsController.cancel);
router.put('/:id/complete', bookingsController.complete);

module.exports = router;
