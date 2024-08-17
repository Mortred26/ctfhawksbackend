function checkAdmin(req, res, next) {
  if (req.role !== 'admin') {
    return res.status(403).send('Access denied. Admins only.');
  }
  next();
}

module.exports = checkAdmin;
