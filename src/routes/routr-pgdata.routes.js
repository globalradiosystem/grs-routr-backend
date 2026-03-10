const express = require('express');
const controller = require('../controllers/routr-pgdata.controller');

const router = express.Router();

router.post('/export-model', controller.exportModel);

module.exports = router;