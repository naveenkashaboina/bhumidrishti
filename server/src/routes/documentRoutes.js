const express = require('express');
const router = express.Router();
const { DocumentController, upload } = require('../controllers/documentController');
const authenticate = require('../middlewares/authMiddleware');
const { requireJurisdiction } = require('../middlewares/rbacMiddleware');

router.use(authenticate);

router.post('/upload', upload.single('file'), DocumentController.uploadSingle);
router.post('/bulk-upload', upload.array('files', 20), DocumentController.uploadBulk);
router.get('/', requireJurisdiction(), DocumentController.getDocuments);
router.get('/:id', DocumentController.getDocumentById);
router.get('/:id/file', DocumentController.getDocumentFile);

module.exports = router;
