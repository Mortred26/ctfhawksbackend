const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, validateUser, validateLogin } = require('../models/user');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const authMiddleware = require('../middleware/authMiddleware');
const checkAdmin = require('../middleware/checkAdmin');


// Register a new user
router.post('/register', async (req, res) => {
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);
  
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) return res.status(400).send('User already registered.');
  
      user = new User({ ...req.body, role: 'user' });
  
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
  
      await user.save();
  
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
  
      res.send({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('Error registering user:', err);
      res.status(500).send('Error registering user.');
    }
  });
  
  // Login user or admin
  router.post('/login', async (req, res) => {
    const { error } = validateLogin(req.body);
    if (error) return res.status(400).send(error.details[0].message);
  
    let user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('Invalid email or password.');
  
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password.');
  
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
  
    res.send({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    });
  });
  
  // Refresh token
  router.post('/refresh', async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) return res.status(401).send('Access denied. No refresh token provided.');
  
    try {
      const decoded = verifyRefreshToken(refreshToken);
  
      let user = await User.findById(decoded.id);
      if (!user) return res.status(400).send('Invalid refresh token.');
  
      const accessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);
  
      res.send({
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (err) {
      console.error('Error refreshing token:', err);
      res.status(403).send('Invalid or expired refresh token.');
    }
  });

  // Grant admin rights to a user (admin only)
router.put('/:id/superuser', authMiddleware, checkAdmin, async (req, res) => {
    try {
      // Find the user by ID
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).send('User not found.');
  
      // Update the user's role to 'admin'
      user.role = 'admin';
      await user.save();
  
      res.send({ message: `${user.name} has been granted admin rights.` });
    } catch (err) {
      console.error('Error granting admin rights:', err);
      res.status(500).send('Error granting admin rights.');
    }
  });
  

// Delete user's points (admin only)
router.delete('/:id/points', authMiddleware, checkAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send('User not found.');

  user.points = 0;
  await user.save();

  res.send({ message: 'User points deleted successfully.' });
});

// Get all users (admin only)
router.get('/', async (req, res) => {
    try {
      const users = await User.find().select('-password'); // Exclude passwords
      res.send(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).send('Error fetching users.');
    }
  });
  
  // Get a single user by ID
router.get('/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password'); // Exclude password
      if (!user) return res.status(404).send('User not found.');
      res.send(user);
    } catch (err) {
      console.error('Error fetching user:', err);
      res.status(500).send('Error fetching user.');
    }
  });
  
  // Update user information
router.put('/:id', authMiddleware, async (req, res) => {
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);
  
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).send('User not found.');
  
      // Allow only the user or admin to update the user info
      if (req.user._id !== req.params.id && req.user.role !== 'admin') {
        return res.status(403).send('Access denied.');
      }
  
      user.name = req.body.name;
      user.email = req.body.email;
  
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }
  
      await user.save();
      res.send(user);
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).send('Error updating user.');
    }
  });

  // Delete a user (admin only)
router.delete('/:id', authMiddleware, checkAdmin, async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).send('User not found.');
  
      res.send({ message: 'User deleted successfully.' });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).send('Error deleting user.');
    }
  });

  // Admin route to reset a user's points for a specific group
router.put('/reset-points/:userId/:groupId', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found.');

    // Find the specific group attempt by the user
    let groupAttempt = user.groupsTaken.find(
      (g) => g.groupId.toString() === req.params.groupId
    );

    if (!groupAttempt) {
      return res.status(404).send('Group not found for this user.');
    }

    // Reset the points for this group
    groupAttempt.totalPoints = 0;
    await user.save();

    res.send({ message: `User's points for the group have been reset to 0.` });
  } catch (error) {
    console.error('Error resetting points for the group:', error);
    res.status(500).send('Error resetting points for the group.');
  }
});


module.exports = router;
