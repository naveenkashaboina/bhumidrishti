const VerificationTask = require('../models/VerificationTask');
const LandRecord = require('../models/LandRecord');
const ApiResponse = require('../utils/apiResponse');
const AuditService = require('../services/auditService');
const { TASK_STATUS } = require('../config/constants');

class VerificationController {
  static async getQueue(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      } else {
        filter.status = { $in: [TASK_STATUS.OPEN, TASK_STATUS.IN_PROGRESS] };
      }

      if (req.query.priority) {
        filter.priority = req.query.priority;
      }

      // If verifier, show tasks assigned to them or unassigned
      if (req.query.myTasks === 'true') {
        filter.assignedTo = req.user._id;
      }

      const [tasks, total] = await Promise.all([
        VerificationTask.find(filter)
          .populate({
            path: 'landRecordId',
            populate: { path: 'documentId', select: 'originalFileName storageUrl mimeType' },
          })
          .populate('assignedTo', 'name email role')
          .sort({ priority: -1, slaDueAt: 1 })
          .skip(skip)
          .limit(limit),
        VerificationTask.countDocuments(filter),
      ]);

      return ApiResponse.success(res, tasks, 'Verification queue retrieved', 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  static async claimTask(req, res, next) {
    try {
      const task = await VerificationTask.findById(req.params.taskId);
      if (!task) return ApiResponse.notFound(res, 'Verification task not found');

      if (task.status === TASK_STATUS.COMPLETED) {
        return ApiResponse.badRequest(res, 'Cannot claim an already completed task');
      }

      task.assignedTo = req.user._id;
      task.status = TASK_STATUS.IN_PROGRESS;
      await task.save();

      await AuditService.log({
        entityType: 'verificationTask',
        entityId: task._id,
        action: 'UPDATE',
        performedBy: req.user._id,
        diff: { assignedTo: req.user._id, status: TASK_STATUS.IN_PROGRESS },
      });

      return ApiResponse.success(res, task, 'Verification task claimed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async completeTask(req, res, next) {
    try {
      const task = await VerificationTask.findById(req.params.taskId);
      if (!task) return ApiResponse.notFound(res, 'Verification task not found');

      task.status = TASK_STATUS.COMPLETED;
      task.completedAt = new Date();
      if (req.body.notes) task.notes = req.body.notes;
      await task.save();

      await AuditService.log({
        entityType: 'verificationTask',
        entityId: task._id,
        action: 'APPROVE',
        performedBy: req.user._id,
        diff: { status: TASK_STATUS.COMPLETED },
      });

      return ApiResponse.success(res, task, 'Verification task marked as completed');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = VerificationController;
