const express = require('express');
const router = express.Router();
const Team = require('../models/team');
const {User} = require("../models/user")
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');

// Yangi jamoa yaratish (faqat superuser)
router.post('/', authMiddleware, checkRole(['superuser']), async (req, res) => {
  const { name } = req.body;

  const team = new Team({
    name,
    createdBy: req.user._id, // Yaratilgan foydalanuvchi ID
    createdByRole: req.user.role // Yaratilgan foydalanuvchining roli
  });

  try {
    const savedTeam = await team.save();
    res.send(savedTeam);
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).send('Error creating team.');
  }
});

// Barcha jamoalarni olish
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find()
    res.send(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).send('Error fetching teams.');
  }
});

// Ma'lum bir jamoani olish
router.get('/:teamId', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', 'username email').populate('admins', 'username email');
    if (!team) return res.status(404).send('Team not found.');
    res.send(team);
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).send('Error fetching team.');
  }
});

// Jamoani tahrirlash (faqat superuser o'zi yaratgan jamoalarni tahrirlashi mumkin)
router.put('/:teamId', authMiddleware, checkRole(['superuser']), async (req, res) => {
  const { name } = req.body;

  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).send('Team not found.');

    // Faqat superuser o'zi yaratgan jamoani tahrirlashi mumkin
    if (team.createdBy.equals(req.user._id)) {
      team.name = name || team.name;
      await team.save();
      res.send(team);
    } else {
      res.status(403).send('Permission denied.');
    }
  } catch (err) {
    console.error('Error updating team:', err);
    res.status(500).send('Error updating team.');
  }
});

// Jamoani o'chirish (faqat superuser o'zi yaratgan jamoalarni o'chirishi mumkin)
router.delete('/:teamId', authMiddleware, checkRole(['superuser']), async (req, res) => {
    try {
      const team = await Team.findById(req.params.teamId);
      if (!team) return res.status(404).send('Team not found.');
  
      // Faqat superuser o'zi yaratgan jamoani o'chirishi mumkin
      if (team.createdBy.equals(req.user._id)) {
        await team.deleteOne(); // Bu yerda .deleteOne() metodidan foydalanamiz
        res.send({ message: 'Team deleted successfully.' });
      } else {
        res.status(403).send('Permission denied.');
      }
    } catch (err) {
      console.error('Error deleting team:', err);
      res.status(500).send('Error deleting team.');
    }
  });




// Adminni jamoaga qo'shish (faqat superuser yoki admin)
router.post('/:teamId/add-admin', authMiddleware, checkRole(['superuser', 'admin']), async (req, res) => {
  const { adminId } = req.body;

  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).send('Jamoa topilmadi.');

    // Admin yoki superuser faqat o'z jamoasiga admin qo'shishi mumkin
    if (
      (req.user.role === 'admin' && team.admins.includes(req.user._id)) || 
      (req.user.role === 'superuser' && team.createdBy.equals(req.user._id))
    ) {
      const user = await User.findById(adminId);
      console.log("User:", user); // Debug: Foydalanuvchi ma'lumotlari
      if (!user) return res.status(404).send('Admin topilmadi.');

      if (user.role !== 'admin') return res.status(444).send('Foydalanuvchi admin emas.');

      // Agar admin allaqachon jamoada bo'lsa, qo'shishni rad etamiz
      if (team.admins.includes(user._id)) {
        return res.status(445).send('Bu admin allaqachon jamoada mavjud.');
      }

      // Agar foydalanuvchi allaqachon boshqa jamoada mavjud bo'lsa, qo'shishni rad etamiz
      if (user.team && !user.team.equals(team._id)) {
        return res.status(400).send('Foydalanuvchi allaqachon boshqa jamoada mavjud.');
      }

      // Jamoaga adminni qo'shish
      team.admins.push(user._id);
      await team.save();

      // Adminning `team` maydonini yangilash
      user.team = team._id; // Yangilanish
      await user.save(); // Bu yerda foydalanuvchi endi yangi jamoaga bog'lanadi

      res.send(team);
    } else {
      res.status(403).send('Ruxsat rad etildi.');
    }
  } catch (err) {
    console.error('Jamoaga admin qo\'shishda xatolik:', err);
    res.status(500).send('Jamoaga admin qo\'shishda xatolik.');
  }
});





// Adminni jamoadan olib tashlash (faqat superuser yoki admin)
router.post('/:teamId/remove-admin', authMiddleware, checkRole(['superuser', 'admin']), async (req, res) => {
  const { adminId } = req.body;

  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).send('Team not found.');

    // Admin yoki superuser faqat o'z jamoasidan admin olib tashlashi mumkin
    if (req.user.role === 'admin' || (req.user.role === 'superuser' && team.createdBy.equals(req.user._id))) {
      const adminIndex = team.admins.indexOf(adminId);
      if (adminIndex === -1) return res.status(404).send('Admin not found in team.');

      team.admins.splice(adminIndex, 1);
      await team.save();

      res.send(team);
    } else {
      res.status(403).send('Permission denied.');
    }
  } catch (err) {
    console.error('Error removing admin from team:', err);
    res.status(500).send('Error removing admin from team.');
  }
});



module.exports = router;
