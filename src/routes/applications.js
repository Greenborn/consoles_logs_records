const express = require('express');
const router = express.Router();
const appsController = require('../controllers/appsController');
const logsController = require('../controllers/logsController');
const privateAuth = require('../middleware/privateAuth');

router.get('/:id_aplicacion', privateAuth, appsController.getApp);
router.get('/:id_aplicacion/logs', privateAuth, logsController.getProjectLogs);

module.exports = router;
