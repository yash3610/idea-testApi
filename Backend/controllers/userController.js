const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Super Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, search } = req.query;
    
    let query = {};
    
    // Filter by role
    if (role) {
      query.role = role;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Super Admin only)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new user (Sub-Admin or Agent)
// @route   POST /api/users
// @access  Private (Super Admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate role
    if (!['subadmin', 'agent'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Can only create subadmin or agent.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      createdBy: req.user._id
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: user._id,
      details: `Created ${role}: ${name}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Super Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent updating super admin by other users
    if (user.role === 'superadmin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update super admin account'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role && ['subadmin', 'agent'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: user._id,
      details: `Updated user: ${user.name}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Super Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting super admin
    if (user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete super admin account'
      });
    }

    await user.deleteOne();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: user._id,
      details: `Deleted user: ${user.name}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user activity logs
// @route   GET /api/users/:id/activity
// @access  Private (Super Admin only)
exports.getUserActivity = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    
    const activities = await ActivityLog.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'name email');

    const total = await ActivityLog.countDocuments({ user: req.params.id });

    res.json({
      success: true,
      count: activities.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
