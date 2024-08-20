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
        name: req.body.name, // Update the name field
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

    const correct = req.body.answer === test.answer;
    let pointsAwarded = 0;

    // Check if the user has already attempted this test
    let testAttempt = req.user.testsTaken.find(
      (t) => t.testId.toString() === test._id.toString()
    );

    if (correct && (!testAttempt || !testAttempt.correct)) {
      // Award points if it's the first correct attempt or if the test was never attempted before
      pointsAwarded = test.score;

      // Check if the group is already in `groupsTaken`
      let groupAttempt = req.user.groupsTaken.find(
        (g) => g.groupId.toString() === test.group._id.toString()
      );

      if (!groupAttempt) {
        // If the group is not in `groupsTaken`, add it
        groupAttempt = {
          groupId: test.group._id,
          totalPoints: pointsAwarded,
          tests: [{
            testId: test._id,
            correct,
            timestamp: Date.now(), // Record the timestamp when the test is taken
          }],
        };
        req.user.groupsTaken.push(groupAttempt);
      } else {
        // If the group is already in `groupsTaken`, update it
        groupAttempt.totalPoints += pointsAwarded;
        groupAttempt.tests.push({
          testId: test._id,
          correct,
          timestamp: Date.now(), // Record the timestamp when the test is taken
        });
      }

      // Add or update the test in `testsTaken`
      if (!testAttempt) {
        req.user.testsTaken.push({
          testId: test._id,
          correct,
          timestamp: Date.now(), // Record the timestamp when the test is taken
        });
      } else {
        testAttempt.correct = true;
        testAttempt.timestamp = Date.now(); // Update the timestamp if the test is taken again
      }
    }

    await req.user.save();

    res.send({
      correct,
      totalPoints: req.user.groupsTaken.find(
        (g) => g.groupId.toString() === test.group._id.toString()
      ).totalPoints, // Return the total points for the group
      testTimestamp: testAttempt ? testAttempt.timestamp : Date.now(), // Return the timestamp
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
