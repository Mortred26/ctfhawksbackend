// middleware/checkAdmin.js
function checkAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superuser') {
    return res.status(403).send('Ruxsat etilmagan.');
  }
  next();
}

module.exports = checkAdmin;
