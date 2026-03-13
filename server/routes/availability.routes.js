const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availability.controller');

router.get('/:stylistId/:date', availabilityController.getSlots);

module.exports = router;
