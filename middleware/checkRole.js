  // middleware/checkRole.js
  function checkRole(roles = []) {
      return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
          return res.status(403).send('Ruxsat etilmagan.');
        }
        next();
      };
    }
    
    module.exports = checkRole;
    