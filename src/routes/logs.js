const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const auth = require('../middleware/auth');
const validateLog = require('../middleware/validation');

router.post('/', auth, validateLog, logsController.createLog);

module.exports = router;
