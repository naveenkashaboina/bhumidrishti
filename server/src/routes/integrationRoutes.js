const express = require('express');
const router = express.Router();
const IntegrationController = require('../controllers/integrationController');
const requireApiKey = require('../middlewares/apiKeyMiddleware');

// All integration endpoints authenticate with x-api-key header
router.get('/records', requireApiKey('read:records'), IntegrationController.getRecords);
router.get('/records/:surveyNumber', requireApiKey('read:records'), IntegrationController.getRecordBySurveyNumber);
router.get('/gis/plots', requireApiKey('read:gis'), IntegrationController.getGisPlots);

module.exports = router;
