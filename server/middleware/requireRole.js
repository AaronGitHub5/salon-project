function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.user?.user_metadata?.role;

    if (!userRole || userRole !== role) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }

    next();
  };
}

module.exports = { requireRole };
