const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfqController');

router.get('/', rfqController.getRFQs);
router.post('/', rfqController.createRFQ);

module.exports = router;
