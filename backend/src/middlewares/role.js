export const ensureOwner = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
};

export const ensureMember = (req, res, next) => {
  if (req.user.role !== 'member') {
    return res.status(403).json({ error: 'Member access required' });
  }
  next();
};

export const ensureOwnerOrStaff = (req, res, next) => {
  if (req.user.role !== 'owner' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Owner or staff access required' });
  }
  next();
};