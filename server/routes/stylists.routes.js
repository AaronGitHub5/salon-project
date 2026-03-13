const express = require('express');
const router = express.Router();
const stylistsController = require('../controllers/stylists.controller');

router.get('/', stylistsController.getAll);

module.exports = router;
