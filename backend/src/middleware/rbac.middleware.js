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

// Checks req.user.clinicStaffType (DOCTOR, NURSE, DENTIST).
// Use after authorize() to further restrict by staff sub-type.
const authorizeStaffType = (...types) => {
  return (req, res, next) => {
    const staffType = req.user?.clinicStaffType;
    if (!staffType || !types.includes(staffType)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires staff type ${types.join(' or ')}. Your type is ${staffType || 'None'}.`,
      });
    }
    next();
  };
};

module.exports = { authorize, authorizeStaffType };