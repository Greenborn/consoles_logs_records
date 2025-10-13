const express = require('express');
const router = express.Router();
const appsController = require('../controllers/appsController');

router.get('/:id_aplicacion', appsController.getApp);

module.exports = router;
