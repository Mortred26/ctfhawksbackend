const mongoose = require('mongoose');
const Joi = require('joi');

const testSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  hint: { type: String },
  score: { type: Number, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const Test = mongoose.model('Test', testSchema);

function validateTest(test) {
  const schema = Joi.object({
    question: Joi.string().min(5).required(),
    answer: Joi.string().min(1).required(),
    hint: Joi.string().optional(),
    score: Joi.number().min(1).required(),
  });
  return schema.validate(test);
}

module.exports = { Test, validateTest };
