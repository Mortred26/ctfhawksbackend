const mongoose = require('mongoose');
const Joi = require('joi');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Guruh nomi
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // Bog'langan kategoriya
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }], // Testlar ro'yxati
  createdAt: { type: Date, default: Date.now }, // Yaratilgan sana
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add this line
  createdByRole: { type: String, enum: ['user', 'superuser', 'admin'], required: true } // Add this line
});

const Group = mongoose.model('Group', groupSchema);

function validateGroup(group) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(), // Guruh nomini validatsiya qilish
    category: Joi.string().required(), // Kategoriya ID sini validatsiya qilish
  });
  return schema.validate(group);
}

module.exports = { Group, validateGroup };
