const express = require('express');
const router = express.Router();
const { RecordController, updateRecordSchema } = require('../controllers/recordController');
const authenticate = require('../middlewares/authMiddleware');
const { requireRole, requireJurisdiction } = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/', requireJurisdiction(), RecordController.getRecords);
router.get('/export', requireJurisdiction(), RecordController.exportRecords);
router.get('/:id', RecordController.getRecordById);
router.patch(
  '/:id',
  requireRole([ROLES.VERIFIER, ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN]),
  validate({ body: updateRecordSchema }),
  RecordController.updateRecord
);
router.post(
  '/:id/approve',
  requireRole([ROLES.VERIFIER, ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN]),
  RecordController.approveRecord
);
router.post(
  '/:id/reject',
  requireRole([ROLES.VERIFIER, ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN]),
  RecordController.rejectRecord
);
router.post(
  '/:id/publish',
  requireRole([ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN]),
  RecordController.publishRecord
);
router.get('/:id/duplicates', RecordController.getDuplicates);
router.get('/:id/audit', RecordController.getRecordAudit);

module.exports = router;
