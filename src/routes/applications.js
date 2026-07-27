const express = require('express');
const router = express.Router();
const appsController = require('../controllers/appsController');
const logsController = require('../controllers/logsController');
const privateAuth = require('../middleware/privateAuth');

router.get('/:id_aplicacion', privateAuth, appsController.getApp);
router.get('/:id_aplicacion/logs', privateAuth, logsController.getProjectLogs);
router.get('/:id_aplicacion/pm2-logs', privateAuth, logsController.getPM2ErrorLogs);

module.exports = router;
