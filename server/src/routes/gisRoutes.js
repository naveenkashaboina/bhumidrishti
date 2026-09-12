const express = require('express');
const router = express.Router();
const GisController = require('../controllers/gisController');
const authenticate = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/plots', GisController.getPlots);
router.patch(
  '/records/:id/geo',
  requireRole([ROLES.VERIFIER, ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN]),
  GisController.updatePlotBoundary
);

module.exports = router;
