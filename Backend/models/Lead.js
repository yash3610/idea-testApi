const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Lost', 'Won'],
    default: 'New'
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: [noteSchema],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better search performance
leadSchema.index({ name: 'text', email: 'text', phone: 'text' });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ tags: 1 });

module.exports = mongoose.model('Lead', leadSchema);
