const { z } = require('zod');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwtUtils');
const AuditService = require('../services/auditService');

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

      if (!user || !user.isActive) {
        return ApiResponse.unauthorized(res, 'Invalid email or password');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return ApiResponse.unauthorized(res, 'Invalid email or password');
      }

      user.lastLoginAt = new Date();
      await user.save();

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      await AuditService.log({
        entityType: 'user',
        entityId: user._id,
        action: 'LOGIN',
        performedBy: user._id,
        ipAddress: req.ip,
      });

      return ApiResponse.success(
        res,
        {
          user: user.toJSON(),
          accessToken,
          refreshToken,
        },
        'Login successful'
      );
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const decoded = verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return ApiResponse.unauthorized(res, 'Invalid refresh token or inactive account');
      }

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      return ApiResponse.success(
        res,
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        'Token refreshed successfully'
      );
    } catch (err) {
      return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }
  }

  static async logout(req, res, next) {
    try {
      if (req.user) {
        await AuditService.log({
          entityType: 'user',
          entityId: req.user._id,
          action: 'LOGOUT',
          performedBy: req.user._id,
          ipAddress: req.ip,
        });
      }
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      return ApiResponse.success(res, { user: req.user }, 'Current user profile');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { AuthController, loginSchema, refreshSchema };
