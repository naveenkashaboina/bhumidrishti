const express = require('express');
const router = express.Router();
const { UserController, createUserSchema, updateUserSchema } = require('../controllers/userController');
const authenticate = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validationMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);
router.use(requireRole([ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN]));

router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUserById);
router.post('/', validate({ body: createUserSchema }), UserController.createUser);
router.patch('/:id', validate({ body: updateUserSchema }), UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;
