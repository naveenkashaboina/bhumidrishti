const express = require('express');
const router = express.Router();
const { AuthController, loginSchema, refreshSchema } = require('../controllers/authController');
const validate = require('../middlewares/validationMiddleware');
const authenticate = require('../middlewares/authMiddleware');

router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.post('/refresh', validate({ body: refreshSchema }), AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

module.exports = router;
