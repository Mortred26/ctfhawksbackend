const mongoose = require('mongoose');
const Joi = require('joi');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Kategoriya nomi
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], // Guruhlar ro'yxati
  totalPoints: { type: Number, default: 0 }, // Kategoriya ichidagi jami ballar
  createdAt: { type: Date, default: Date.now }, // Yaratilgan sana
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Yaratilgan foydalanuvchi ID
  createdByRole: { type: String, enum: ['user', 'superuser', 'admin'], required: true }, // Yaratilgan foydalanuvchining roli
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true } // Kategoriya qaysi jamoaga tegishli ekanligi
});

const Category = mongoose.model('Category', categorySchema);

function validateCategory(category) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(), // Kategoriya nomini validatsiya qilish
    team: Joi.string().required(), // Team maydonini validatsiya qilish
  });
  return schema.validate(category);
}

module.exports = { Category, validateCategory };
