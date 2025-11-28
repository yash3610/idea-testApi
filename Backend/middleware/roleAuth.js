// Role-based authorization middleware

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Specific role checkers
const isSuperAdmin = checkRole('superadmin');
const isAdmin = checkRole('superadmin', 'subadmin');
const isAgent = checkRole('superadmin', 'subadmin', 'agent');

module.exports = {
  checkRole,
  isSuperAdmin,
  isAdmin,
  isAgent
};
