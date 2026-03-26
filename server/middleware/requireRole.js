const supabase = require('../supabaseClient');

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !data || !roles.includes(data.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
      }

      req.userRole = data.role;
      next();
    } catch {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }
  };
}

module.exports = { requireRole };
