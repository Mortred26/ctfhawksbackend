const mongoose = require('mongoose');
const Joi = require('joi');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Kategoriya nomi
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], // Guruhlar ro'yxati
  createdAt: { type: Date, default: Date.now }, // Yaratilgan sana
});

const Category = mongoose.model('Category', categorySchema);

function validateCategory(category) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(), // Kategoriya nomini validatsiya qilish
  });
  return schema.validate(category);
}

module.exports = { Category, validateCategory };
