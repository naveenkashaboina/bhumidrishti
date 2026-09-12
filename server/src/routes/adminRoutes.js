const express = require('express');
const router = express.Router();
const {
  AdminController,
  updateConfigSchema,
  createApiClientSchema,
} = require('../controllers/adminController');
const authenticate = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);
router.use(requireRole([ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN]));

router.get('/config', AdminController.getConfig);
router.patch('/config', validate({ body: updateConfigSchema }), AdminController.updateConfig);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/api-clients', AdminController.getApiClients);
router.post('/api-clients', validate({ body: createApiClientSchema }), AdminController.createApiClient);
router.patch('/api-clients/:id', AdminController.updateApiClient);

module.exports = router;
