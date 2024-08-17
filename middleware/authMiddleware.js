const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

module.exports = async function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(400).send('Invalid token.');
    }
    req.role = decoded.role; // Store the user's role in the request
    next();
  } catch (ex) {
    if (ex.name === 'TokenExpiredError') {
      return res.status(401).send('Access token expired. Please log in again.');
    } else {
      return res.status(401).send('Invalid token.');
    }
  }
};
