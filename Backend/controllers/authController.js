const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sendPasswordResetEmail } = require('../config/email');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if any users exist
    const userCount = await User.countDocuments();
    
    // First user must be superadmin
    let userRole = role || 'agent';
    if (userCount === 0) {
      userRole = 'superadmin';
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user with specified role
    const user = await User.create({
      name,
      email,
      password,
      role: userRole
    });

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'REGISTER',
      resource: 'user',
      resourceId: user._id,
      details: 'Super admin account created',
      ipAddress: req.ip
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'LOGIN',
      resource: 'user',
      resourceId: user._id,
      details: 'User logged in',
      ipAddress: req.ip
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'LOGOUT',
      resource: 'user',
      resourceId: req.user._id,
      details: 'User logged out',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security, don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent to your email'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    try {
      // Send email
      await sendPasswordResetEmail(user.email, resetToken);

      // Log activity
      await ActivityLog.create({
        user: user._id,
        action: 'FORGOT_PASSWORD',
        resource: 'user',
        resourceId: user._id,
        details: 'Password reset email sent successfully',
        ipAddress: req.ip
      });

      console.log('✅ Password reset email sent to:', user.email);

      res.json({
        success: true,
        message: 'Password reset link has been sent to your email'
      });
    } catch (emailError) {
      // If email fails, remove the reset token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('❌ Email sending failed:', emailError);

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.'
      });
    }
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const crypto = require('crypto');
    
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'RESET_PASSWORD',
      resource: 'user',
      resourceId: user._id,
      details: 'Password reset successfully',
      ipAddress: req.ip
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
