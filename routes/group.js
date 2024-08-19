const express = require('express');
const router = express.Router();
const { Group, validateGroup } = require('../models/group');
const { Category } = require('../models/category');
const { Test } = require('../models/test');
const { User } = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/:groupId/run-tests', authMiddleware, async (req, res) => {
    try {
      const group = await Group.findById(req.params.groupId).populate('tests');
      if (!group) return res.status(404).send('Group not found.');
  
      let totalPoints = 0;
      let totalTimeSpent = 0;
  
      // Find the group's previous attempt by the user
      let groupAttempt = req.user.groupsTaken.find(
        (g) => g.groupId.toString() === group._id.toString()
      );
  
      if (!groupAttempt) {
        // If no previous attempt, create a new one
        groupAttempt = {
          groupId: group._id,
          totalPoints: 0,
          totalTimeSpent: 0,
          tests: [],
        };
        req.user.groupsTaken.push(groupAttempt);
      }
  
      // Loop through each test in the group
      for (let test of group.tests) {
        const startTime = req.body.startTime || Date.now(); // Test start time
  
        const previousTest = groupAttempt.tests.find(
          (t) => t.testId.toString() === test._id.toString()
        );
  
        let correct = false;
        let pointsAwarded = 0;
        const timeSpent = Math.floor((Date.now() - startTime) / 60000); // Time spent in minutes
  
        if (previousTest) {
          // If the test was already taken and was answered correctly, no points are awarded
          if (!previousTest.correct) {
            // Only award points if the test was previously answered incorrectly
            correct = req.body.answers[test._id] === test.answer;
            pointsAwarded = correct ? test.score : 0;
          } else {
            // The test was already correctly answered, so no additional points are awarded
            correct = true;
            pointsAwarded = 0;
          }
          previousTest.isRetake = true; // Mark this attempt as a retake
        } else {
          // If it's the first attempt, award full points if correct
          correct = req.body.answers[test._id] === test.answer;
          pointsAwarded = correct ? test.score : 0;
          totalPoints += pointsAwarded;
        }
  
        // Add or update the test attempt in the group
        if (!previousTest) {
          groupAttempt.tests.push({
            testId: test._id,
            correct,
            timestamp: Date.now(),
            timeSpent,
            isRetake: false,
          });
        } else {
          previousTest.correct = correct;
          previousTest.timestamp = Date.now();
          previousTest.timeSpent += timeSpent;
        }
  
        totalTimeSpent += timeSpent;
      }
  
      // Update the group's total points and time spent
      groupAttempt.totalPoints += totalPoints;
      groupAttempt.totalTimeSpent += totalTimeSpent;
  
      await req.user.save();
  
      res.send({
        message: 'Tests completed for group',
        totalPoints: groupAttempt.totalPoints,
        totalTimeSpent: groupAttempt.totalTimeSpent,
        tests: groupAttempt.tests,
      });
    } catch (error) {
      res.status(500).send('Error running tests for the group.');
    }
  });

module.exports = router;


// Yangi guruh yaratish
router.post('/', async (req, res) => {
  const { error } = validateGroup(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const category = await Category.findById(req.body.category);
  if (!category) return res.status(400).send('Noto\'g\'ri kategoriya.');

  let group = new Group({ name: req.body.name, category: req.body.category });
  try {
    group = await group.save();
    category.groups.push(group._id);
    await category.save();
    res.send(group);
  } catch (err) {
    res.status(500).send('Guruh yaratishda xatolik.');
  }
});

// Guruhlarni olish
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find()
    res.send(groups);
  } catch (err) {
    res.status(500).send('Guruhlarni olishda xatolik.');
  }
});

// Guruhni ID bo'yicha olish
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('tests');
    if (!group) return res.status(404).send('Guruh topilmadi.');
    res.send(group);
  } catch (err) {
    res.status(500).send('Guruh olishda xatolik.');
  }
});

// Guruhni yangilash
router.put('/:id', async (req, res) => {
  const { error } = validateGroup(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const group = await Group.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!group) return res.status(404).send('Guruh topilmadi.');
    res.send(group);
  } catch (err) {
    res.status(500).send('Guruhni yangilashda xatolik.');
  }
});

// Guruhni o'chirish
router.delete('/:id', async (req, res) => {
    try {
      // Delete the group and return the deleted document
      const group = await Group.findByIdAndDelete(req.params.id);
      if (!group) return res.status(404).send('Guruh topilmadi.');
  
      // Find the category associated with the group
      const category = await Category.findOne({ groups: group._id });
      if (category) {
        // Remove the group reference from the category
        category.groups.pull(group._id);
        await category.save();
      }
  
      res.send({ message: 'Guruh muvaffaqiyatli o\'chirildi.' });
    } catch (err) {
      console.error('Guruhni o\'chirishda xatolik:', err);
      res.status(500).send('Guruhni o\'chirishda xatolik.');
    }
  });
  
  

module.exports = router;
