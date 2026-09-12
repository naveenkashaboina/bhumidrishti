const express = require('express');
const router = express.Router();
const VerificationController = require('../controllers/verificationController');
const authenticate = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);
router.use(requireRole([ROLES.VERIFIER, ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN]));

router.get('/queue', VerificationController.getQueue);
router.post('/:taskId/claim', VerificationController.claimTask);
router.post('/:taskId/complete', VerificationController.completeTask);

module.exports = router;
