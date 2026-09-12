const { z } = require('zod');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');
const { ALL_ROLES } = require('../config/constants');

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(ALL_ROLES),
  jurisdiction: z
    .object({
      state: z.string().optional(),
      district: z.string().optional(),
      tehsil: z.string().optional(),
      village: z.string().optional(),
    })
    .optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ALL_ROLES).optional(),
  jurisdiction: z
    .object({
      state: z.string().optional(),
      district: z.string().optional(),
      tehsil: z.string().optional(),
      village: z.string().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

class UserController {
  static async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.role) filter.role = req.query.role;
      if (req.query.district) filter['jurisdiction.district'] = new RegExp(`^${req.query.district}$`, 'i');
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

      const [users, total] = await Promise.all([
        User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        User.countDocuments(filter),
      ]);

      return ApiResponse.success(res, users, 'Users retrieved successfully', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return ApiResponse.notFound(res, 'User not found');
      return ApiResponse.success(res, user, 'User details');
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req, res, next) {
    try {
      const { name, email, password, role, jurisdiction } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return ApiResponse.conflict(res, 'A user with this email address already exists');
      }

      const user = await User.create({
        name,
        email,
        passwordHash: password,
        role,
        jurisdiction: jurisdiction || {},
      });

      await AuditService.log({
        entityType: 'user',
        entityId: user._id,
        action: 'CREATE',
        performedBy: req.user._id,
        diff: { name, email, role, jurisdiction },
      });

      return ApiResponse.created(res, user, 'User provisioned successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const user = await User.findById(req.params.id).select('+passwordHash');
      if (!user) return ApiResponse.notFound(res, 'User not found');

      const before = user.toJSON();

      if (req.body.name) user.name = req.body.name;
      if (req.body.role) user.role = req.body.role;
      if (req.body.jurisdiction) user.jurisdiction = { ...user.jurisdiction, ...req.body.jurisdiction };
      if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
      if (req.body.password) user.passwordHash = req.body.password;

      await user.save();

      await AuditService.log({
        entityType: 'user',
        entityId: user._id,
        action: 'UPDATE',
        performedBy: req.user._id,
        diff: AuditService.computeDiff(before, user.toJSON()),
      });

      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return ApiResponse.notFound(res, 'User not found');

      user.isActive = false;
      await user.save();

      await AuditService.log({
        entityType: 'user',
        entityId: user._id,
        action: 'DELETE',
        performedBy: req.user._id,
        diff: { isActive: false },
      });

      return ApiResponse.success(res, null, 'User deactivated successfully (soft-delete)');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { UserController, createUserSchema, updateUserSchema };
