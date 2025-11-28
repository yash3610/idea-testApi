const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true // 'lead', 'user', 'tag', etc.
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: String
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Index for querying
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
