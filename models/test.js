const mongoose = require('mongoose');
const Joi = require('joi');

const testSchema = new mongoose.Schema({
  question: { type: String, required: true }, // Test savoli
  answer: { type: String, required: true }, // Test javobi
  hint: { type: String }, // Maslahat (ixtiyoriy)
  score: { type: Number, required: true }, // Test uchun ball
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true }, // Bog'langan guruh
  createdAt: { type: Date, default: Date.now }, // Yaratilgan sana
});

const Test = mongoose.model('Test', testSchema);

function validateTest(test) {
  const schema = Joi.object({
    question: Joi.string().min(5).required(), // Savolni validatsiya qilish
    answer: Joi.string().min(1).required(), // Javobni validatsiya qilish
    hint: Joi.string().optional(), // Maslahatni validatsiya qilish
    score: Joi.number().min(1).required(), // Ballni validatsiya qilish
    group: Joi.string().required(), // Guruh ID sini validatsiya qilish
  });
  return schema.validate(test);
}

module.exports = { Test, validateTest };
