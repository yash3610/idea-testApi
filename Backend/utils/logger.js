const ActivityLog = require('../models/ActivityLog');

// Logger utility for activity logging
exports.logActivity = async (userId, action, resource, resourceId, details, ipAddress) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Get activity logs with filters
exports.getActivityLogs = async (filters = {}, options = {}) => {
  try {
    const { user, resource, dateFrom, dateTo } = filters;
    const { limit = 50, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    let query = {};

    if (user) query.user = user;
    if (resource) query.resource = resource;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const logs = await ActivityLog.find(query)
      .populate('user', 'name email role')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    return {
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: logs
    };
  } catch (error) {
    throw error;
  }
};
