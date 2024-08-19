const express = require('express');
const router = express.Router();
const { Category, validateCategory } = require('../models/category');
const { Group } = require('../models/group');

// Yangi kategoriya yaratish
router.post('/', async (req, res) => {
  const { error } = validateCategory(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let category = new Category({ name: req.body.name });
  try {
    category = await category.save();
    res.send(category);
  } catch (err) {
    res.status(500).send('Kategoriya yaratishda xatolik.');
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) return res.status(404).send('Kategoriya topilmadi.');
      res.send({ message: 'Kategoriya muvaffaqiyatli o\'chirildi.' });
    } catch (err) {
      console.error('Kategoriyani o\'chirishda xatolik:', err);
      res.status(500).send('Kategoriyani o\'chirishda xatolik.');
    }
  });
  

module.exports = router;
