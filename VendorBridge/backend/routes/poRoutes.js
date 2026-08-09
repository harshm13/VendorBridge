const express = require('express');
const router = express.Router();
const poController = require('../controllers/poController');

router.get('/', poController.getPOs);
router.post('/', poController.createPO);

module.exports = router;
