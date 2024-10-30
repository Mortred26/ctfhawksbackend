const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

module.exports = async function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Kirish rad etildi. Token taqdim etilmagan.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).send('Token noto\'g\'ri. Foydalanuvchi topilmadi.');
    }
    req.user.role = decoded.role; // Foydalanuvchi rolini saqlash
    next();
  } catch (ex) {
    if (ex.name === 'TokenExpiredError') {
      return res.status(401).send("Token muddati o'tdi. Iltimos, qaytadan kirishingiz kerak.");
    } else {
      return res.status(401).send('Noto\'g\'ri token.');
    }
  }
};
