const express = require('express');
const router = express.Router();
const { Test, validateTest } = require('../models/test');
const authMiddleware = require('../middleware/authMiddleware');
const checkAdmin = require('../middleware/checkAdmin');
const { Group } = require('../models/group');
const { User } = require('../models/user');
const bcrypt = require('bcryptjs');
const checkRole = require('../middleware/checkRole');
const Team  = require('../models/team'); // Team modeli

// Create a new test (admin only)
router.post('/', authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
  const { error } = validateTest(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  if (!req.user || !req.user._id || !req.user.role) {
    return res.status(400).send('Foydalanuvchi ma\'lumotlari mavjud emas.');
  }

  const test = new Test({
    ...req.body,
    createdBy: req.user._id, // Yaratgan foydalanuvchi ID
    createdByRole: req.user.role // Yaratgan foydalanuvchining roli
  });

  try {
    const savedTest = await test.save();

    const group = await Group.findById(req.body.group);
    if (!group) return res.status(404).send('Group not found.');

    // Group modelini yangilash, agar kerak bo‘lsa
    if (group.createdByRole === undefined || group.createdBy === undefined) {
      group.createdBy = req.user._id;
      group.createdByRole = req.user.role;
      await group.save();
    }

    group.tests.push(savedTest._id);
    await group.save();

    res.send(savedTest);
  } catch (err) {
    console.error('Error creating test:', err.message); // Xatolikning to'liq matnini ko'rsatish
    res.status(500).send('Test yaratishda xato yuz berdi: ' + err.message);
  }
});


// Adminlar uchun barcha testlarni olish
router.get('/all', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const tests = await Test.find();
    res.send(tests);
  } catch (err) {
    console.error('Error fetching all tests:', err.message); 
    res.status(500).send('Error fetching all tests.');
  }
});

// Adminlar uchun testni ID orqali olish
router.get('/all/:id', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('_id name question answerHashed answerPlain hint score group logindetail createdAt');
    if (!test) return res.status(404).send('Test not found.');

    res.send(test);
  } catch (err) {
    console.error('Error fetching test by ID:', err);
    res.status(500).send('Error fetching test by ID.');
  }
});

// Oddiy foydalanuvchilar uchun barcha testlarni olish
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find().select('-answerHashed -answerPlain'); // Javoblarni chiqarib tashlash
    res.send(tests);
  } catch (err) {
    console.error('Error fetching tests:', err);
    res.status(500).send('Error fetching tests.');
  }
});

// Oddiy foydalanuvchilar uchun testni ID orqali olish
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('-answerHashed -answerPlain'); // Javoblarni chiqarib tashlash
    if (!test) return res.status(404).send('Test not found.');
    res.send(test);
  } catch (err) {
    res.status(500).send('Error fetching test.');
  }
});

// Testni yangilash (admin only)
router.put('/:id', authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
  const { error } = validateTest(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        question: req.body.question,
        answerPlain: req.body.answerPlain,
        hint: req.body.hint,
        score: req.body.score,
        logindetail: req.body.logindetail,
        group : req.body.group
      },
      { new: true }
    );

    if (!test) return res.status(404).send('Test not found.');
    res.send(test);
  } catch (err) {
    res.status(500).send('Error updating test.');
  }
});

// Testni o'chirish (admin only)
router.delete('/:id', authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).send('Test not found.');

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


// Testni olish va baholash
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('group');
    if (!test) return res.status(404).send('Test not found.');

    const { answer, userEmail } = req.body;
    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(404).send('User not found.');

    const correct = await bcrypt.compare(answer, test.answerHashed);
    if (!correct) return res.status(400).send('Incorrect answer.');

    let groupAttempt = user.groupsTaken.find(
      (g) => g.groupId.toString() === test.group._id.toString()
    );

    if (groupAttempt && groupAttempt.tests.some((t) => t.testId.equals(test._id) && t.correct)) {
      return res.status(400).send('You have already completed this test.');
    }

    if (!groupAttempt) {
      user.groupsTaken.push({
        groupId: test.group._id,
        totalPoints: test.score,
        tests: [{ testId: test._id, correct: true }],
      });
    } else {
      groupAttempt.totalPoints += test.score;

      // Bajarilgan yangi testni qo'shish
      groupAttempt.tests.push({ testId: test._id, correct: true });
    }

    await user.save();

    console.log('Updated user groupsTaken:', user.groupsTaken);

    res.send({ correct, testId: test._id });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).send('Error submitting test.');
  }
});



// Admin route to reset a user's points for a specific group
router.put('/reset-points/:userId/:groupId', authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found.');

    let groupAttempt = user.groupsTaken.find(
      (g) => g.groupId.toString() === req.params.groupId
    );

    if (!groupAttempt) {
      return res.status(404).send('Group not found for this user.');
    }

    groupAttempt.totalPoints = 0;
    await user.save();

    res.send({ message: `User's points for the group have been reset to 0.` });
  } catch (error) {
    console.error('Error resetting points for the group:', error);
    res.status(500).send('Error resetting points for the group.');
  }
});

// Adminlar uchun test yaratuvchini va uning testlarini olish
router.get('/user/:userId', authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found.');

    const tests = await Test.find({ createdBy: req.params.userId });
    res.send({ user: { id: user._id, role: user.role }, tests });
  } catch (err) {
    console.error('Error fetching user and their tests:', err);
    res.status(500).send('Error fetching user and their tests.');
  }
});

// Jamoa ichidagi foydalanuvchilar va ularning testlarini olish
router.get('/team/:id', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);  // teamId o'rniga id ishlatilgan
    if (!team) return res.status(404).send('Team not found.');

    // Teamga tegishli adminlarni topish
    const usersInTeam = await User.find({ _id: { $in: team.admins } });
    if (!usersInTeam || usersInTeam.length === 0) return res.status(404).send('No users found in the team.');

    // Adminlar tomonidan yaratilgan testlarni olish
    const tests = await Test.find({ createdBy: { $in: team.admins } });
    
    res.send(tests );
  } catch (err) {
    console.error('Error fetching team users and their tests:', err);
    res.status(500).send('Error fetching team users and their tests.');
  }
});



module.exports = router;
