const express = require('express');
const router = express.Router();
const { Category, validateCategory } = require('../models/category');
const { Group } = require('../models/group');
const { Test } = require('../models/test');
const { User } = require('../models/user');
const checkRole = require('../middleware/checkRole');
const authMiddleware = require('../middleware/authMiddleware');
const Team = require('../models/team');


// Yangi kategoriya yaratish
router.post('/', authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
  try {
    const { error } = validateCategory(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let category = new Category({
      name: req.body.name,
      team: req.body.team,
      createdBy: req.user._id,
      createdByRole: req.user.role,
    });

    category = await category.save();
    res.send(category);
  } catch (err) {
    console.error("Error creating category:", err); // Log the error
    res.status(500).send(`Kategoriya yaratishda xatolik: ${err.message || "Serverda xatolik."}`);
  }
});


// Kategoriyalarni olish
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.send(categories);
  } catch (err) {
    res.status(500).send('Kategoriyalarni olishda xatolik.');
  }
});

// Kategoriya ID bo'yicha olish
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) return res.status(404).send('Kategoriya topilmadi.');
    res.send(category);
  } catch (err) {
    res.status(500).send('Kategoriya olishda xatolik.');
  }
});



// Kategoriyani yangilash
router.put('/:id',authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
  const { error } = validateCategory(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!category) return res.status(404).send('Kategoriya topilmadi.');
    res.send(category);
  } catch (err) {
    res.status(500).send('Kategoriyani yangilashda xatolik.');
  }
});

// Kategoriyani o'chirish
router.delete('/:id',authMiddleware, checkRole(['admin', 'superuser']), async (req, res) => {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) return res.status(404).send('Kategoriya topilmadi.');
      res.send({ message: 'Kategoriya muvaffaqiyatli o\'chirildi.' });
    } catch (err) {
      console.error('Kategoriyani o\'chirishda xatolik:', err);
      res.status(500).send('Kategoriyani o\'chirishda xatolik.');
    }
  });

// Kategoriya bo'yicha umumiy ballarni hisoblash
router.get('/:id/total-score', async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Kategoriyaga tegishli barcha guruhlarni topish
    const groups = await Group.find({ category: categoryId });

    let totalScore = 0;

    // Har bir guruh uchun tegishli testlarni topish va ballarni qo'shish
    for (let group of groups) {
      const tests = await Test.find({ group: group._id });

      for (let test of tests) {
        totalScore += test.score;
      }
    }

    res.send({ categoryId, totalScore });
  } catch (err) {
    console.error('Umumiy ballarni hisoblashda xatolik:', err);
    res.status(500).send('Umumiy ballarni hisoblashda xatolik.');
  }
});
  
// Kategoriya bo'yicha foydalanuvchilarni umumiy ballari bilan olish

router.get('/:id/users-with-scores', async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Kategoriyaga tegishli barcha guruhlarni topish
    const groups = await Group.find({ category: categoryId }).select('_id');

    // Agar guruhlar topilmasa, to'g'ri xato javob qaytaring
    if (groups.length === 0) return res.status(404).send('No groups found for this category.');

    const groupIds = groups.map(group => group._id.toString());
    console.log(`Group IDs for category ${categoryId}:`, groupIds);

    // Foydalanuvchilarni olish
    const users = await User.find().select('-password'); // Parollarni chiqarib tashlash

    // Har bir foydalanuvchining kategoriya bo'yicha umumiy ballarini hisoblash
    const usersData = users.map(user => {
      console.log(`User: ${user.name}, Groups Taken: ${JSON.stringify(user.groupsTaken)}`);

      let totalCategoryScore = 0;
      let latestCompletionTime = null;

      user.groupsTaken.forEach(group => {
        if (groupIds.includes(group.groupId.toString())) {
          console.log(`User ${user.name} has taken group ${group.groupId} belonging to the category.`);
          
          totalCategoryScore += group.totalPoints;

          group.tests.forEach(test => {
            const testTime = new Date(test.timestamp);
            if (!latestCompletionTime || testTime > latestCompletionTime) {
              latestCompletionTime = testTime;
            }
          });
        } else {
          console.log(`Group ID ${group.groupId} for user ${user.name} does not belong to the category ${categoryId}.`);
        }
      });

      return {
        _id: user._id,
        name: user.name,
        role: user.role,
        totalCategoryScore,
        latestCompletionTime,
      };
    });

    // Umumiy balli foydalanuvchilarni filtrdan o'tkazish
    const filteredUsers = usersData.filter(user => user.totalCategoryScore > 0);

    // Natijalarni qaytarish
    res.send(filteredUsers);
  } catch (err) {
    console.error('Foydalanuvchilarni olishda xatolik:', err);
    res.status(500).send('Foydalanuvchilarni olishda xatolik yuz berdi.');
  }
});



router.get('/user-tests/:email/:categoryId', async (req, res) => {
  try {
    const { email, categoryId } = req.params;

    // Foydalanuvchini email orqali topish
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send('Foydalanuvchi topilmadi.');
    }

    // Kategoriyaga tegishli guruhlarni topish
    const groups = await Group.find({ category: categoryId }).populate('tests');

    // Bajarilgan testlarni saqlash uchun massiv
    const completedTestIds = new Set(); // Takrorlanmas IDlar uchun Setdan foydalanamiz

    // Foydalanuvchining barcha `groupsTaken` orqali testlarni tekshirish
    user.groupsTaken.forEach((groupTaken) => {
      const relevantGroup = groups.find((group) => group._id.toString() === groupTaken.groupId.toString());

      // Agar guruh kategoriyaga tegishli bo'lsa va foydalanuvchi u guruhdagi testlarni olgan bo'lsa
      if (relevantGroup) {
        groupTaken.tests.forEach((testAttempt) => {
          // Har bir testni to'g'ri ishlaganligini tekshirish
          if (testAttempt.correct) {
            completedTestIds.add(testAttempt.testId.toString()); // Setga qo'shamiz
          }
        });
      }
    });

    // Setni massivga aylantiramiz
    const completedTestIdsArray = Array.from(completedTestIds);

    // Barcha to'g'ri ishlangan testlarni chop etamiz
    console.log('Completed test IDs:', completedTestIdsArray);

    res.send({
      user,
      groups,
      completedTestIds: completedTestIdsArray,
    });
  } catch (error) {
    console.error('Foydalanuvchi testlarini olishda xatolik:', error);
    res.status(500).send('Xatolik yuz berdi.');
  }
});






router.get('/team/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
    if (!team) return res.status(404).send('Team not found.');

    const category = await Category.find({ createdBy: { $in: team.admins } });
    if (!category) return res.status(404).send('Kategoriya topilmadi.');

    res.send(category);
  } catch (err) {
    res.status(500).send('Kategoriya olishda xatolik.');
  }
});





module.exports = router;
