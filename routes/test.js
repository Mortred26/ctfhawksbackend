const express = require('express');
const router = express.Router();
const { Test, validateTest } = require('../models/test');
const authMiddleware = require('../middleware/authMiddleware');
const checkAdmin = require('../middleware/checkAdmin');
const { Group } = require('../models/group');

// Create a new test (admin only)
router.post('/', authMiddleware, checkAdmin, async (req, res) => {
  const { error } = validateTest(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const test = new Test({
    ...req.body,
    addedBy: req.user._id,
  });

  try {
    const savedTest = await test.save();
    
    // Add the test to the group's test array
    const group = await Group.findById(req.body.group);
    if (!group) return res.status(404).send('Group not found.');
    
    group.tests.push(savedTest._id);
    await group.save();

    res.send(savedTest);
  } catch (err) {
    console.error('Error creating test:', err);
    res.status(500).send('Error creating test.');
  }
});


// Get all tests
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find()
    res.send(tests);
  } catch (err) {
    console.error('Error fetching tests:', err); // Log the error details
    res.status(500).send('Error fetching tests.');
  }
});

// Get a single test by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
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

    // Find all groups containing this test and remove the test reference
    await Group.updateMany(
      { tests: test._id },
      { $pull: { tests: test._id } }
    );

    res.send({ message: 'Test deleted successfully and removed from groups.' });
  } catch (err) {
    console.error('Error deleting test:', err);
    res.status(500).send('Error deleting test.');
  }
});




// Take a test
router.post('/:id', authMiddleware, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('group');
    if (!test) return res.status(404).send('Test not found.');

    // Ensure the user has `testsTaken` and `groupsTaken` arrays
    if (!req.user.testsTaken) {
      req.user.testsTaken = [];
    }
    if (!req.user.groupsTaken) {
      req.user.groupsTaken = [];
    }

    // Check if the user has already attempted this test
    let testAttempt = req.user.testsTaken.find(
      (t) => t.testId.toString() === test._id.toString()
    );

    const correct = req.body.answer === test.answer;
    let pointsAwarded = 0;

    if (correct && (!testAttempt || !testAttempt.correct)) {
      // Award points if it's the first correct attempt or if the test was never attempted before
      pointsAwarded = test.score;

      // Add points to the user's group attempt
      let groupAttempt = req.user.groupsTaken.find(
        (g) => g.groupId.toString() === test.group._id.toString()
      );

      if (!groupAttempt) {
        groupAttempt = {
          groupId: test.group._id,
          totalPoints: pointsAwarded,
          tests: [],
        };
        req.user.groupsTaken.push(groupAttempt);
      } else {
        groupAttempt.totalPoints += pointsAwarded;
      }

      if (!testAttempt) {
        req.user.testsTaken.push({
          testId: test._id,
          correct,
          timestamp: Date.now(),
        });
      } else {
        testAttempt.correct = true;
        testAttempt.timestamp = Date.now();
      }
    } else if (testAttempt && testAttempt.correct) {
      // If the test was already correctly answered, do not award any more points
      pointsAwarded = 0;
    }

    await req.user.save();

    res.send({
      correct,
      points: req.user.groupsTaken.find(
        (g) => g.groupId.toString() === test.group._id.toString()
      ).totalPoints,
      testTimestamp: testAttempt ? testAttempt.timestamp : Date.now(),
    });
  } catch (error) {
    console.error('Error taking test:', error);
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
