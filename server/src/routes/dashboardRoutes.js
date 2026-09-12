const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const authenticate = require('../middlewares/authMiddleware');
const { requireJurisdiction } = require('../middlewares/rbacMiddleware');

router.use(authenticate);

router.get('/summary', requireJurisdiction(), DashboardController.getSummary);
router.get('/by-region', requireJurisdiction(), DashboardController.getByRegion);
router.get('/error-stats', DashboardController.getErrorStats);
router.get('/trend', DashboardController.getTrend);

module.exports = router;
