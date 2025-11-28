// Middleware to check if user has required role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Check if user is admin (superadmin or subadmin)
exports.isAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'subadmin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Check if user is super admin only
exports.isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin privileges required.'
    });
  }
  next();
};
