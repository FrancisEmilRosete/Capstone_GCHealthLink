const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if the user's role is in the list of allowed roles
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role (${req.user?.role || 'None'}) is not authorized to access this route.`
      });
    }
    // If they have the right badge, let them through!
    next();
  };
};

module.exports = { authorize };