const express = require('express');
const router = express.Router();
const { Test, validateTest } = require('../models/test');
const authMiddleware = require('../middleware/authMiddleware');
const checkAdmin = require('../middleware/checkAdmin');

// Create a new test (admin only)
router.post('/', authMiddleware, checkAdmin, async (req, res) => {
  const { error } = validateTest(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const test = new Test({
    ...req.body,
    addedBy: req.user._id,
  });

  try {
    await test.save();
    res.send(test);
  } catch (err) {
    res.status(500).send('Error creating test.');
  }
});

// Get all tests
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find().populate('addedBy', 'name email');
    res.send(tests);
  } catch (err) {
    res.status(500).send('Error fetching tests.');
  }
});

// Get a single test by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('addedBy', 'name email');
    if (!test) return res.status(404).send('Test not found.');
    res.send(test);
  } catch (err) {
    res.status(500).send('Error fetching test.');
  }
});

// Update a test (admin only)
router.put('/:id', authMiddleware, checkAdmin, async (req, res) => {
  const { error } = validateTest(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      {
        question: req.body.question,
        answer: req.body.answer,
        hint: req.body.hint,
        score: req.body.score,
      },
      { new: true } // Return the updated document
    );

    if (!test) return res.status(404).send('Test not found.');
    res.send(test);
  } catch (err) {
    res.status(500).send('Error updating test.');
  }
});

// Delete a test (admin only)
router.delete('/:id', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).send('Test not found.');
    res.send({ message: 'Test deleted successfully.' });
  } catch (err) {
    res.status(500).send('Error deleting test.');
  }
});



// Take a test
router.post('/:id', authMiddleware, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).send('Test not found.');

    const correct = req.body.answer === test.answer;
    if (correct) {
      req.user.points += test.score;
    }

    req.user.testsTaken.push({
      testId: test._id,
      correct,
      timestamp: Date.now(),
    });

    await req.user.save();

    res.send({
      correct,
      points: req.user.points,
      testTimestamp: req.user.testsTaken[req.user.testsTaken.length - 1].timestamp,
    });
  } catch (error) {
    res.status(500).send('Error taking test.');
  }
});

// Admin route to reset a user's points
router.put('/reset-points/:userId', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found.');

    user.points = 0;
    await user.save();

    res.send({ message: 'User points have been reset to 0.' });
  } catch (error) {
    res.status(500).send('Error resetting points.');
  }
});

module.exports = router;
