const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Joi = require('joi');

const testSchema = new mongoose.Schema({
  name: { type: String, required: true },
  question: { type: String, required: true },
  answerHashed: { type: String },
  answerPlain: { type: String },
  hint: { type: String },
  score: { type: Number, required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  logindetail: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  }, // Bu maydonni saqlash uchun
  createdByRole: { type: String, enum: ['user', 'superuser', 'admin'], } // Bu maydonni saqlash uchun
});


// Javobni hashlab saqlashdan oldin
testSchema.pre('save', async function (next) {
  if (this.isModified('answerPlain')) {
    const salt = await bcrypt.genSalt(10);
    this.answerHashed = await bcrypt.hash(this.answerPlain, salt);
  }
  next();
});

const Test = mongoose.model('Test', testSchema);

function validateTest(test) {
  const schema = Joi.object({
    name: Joi.string().min(1).required(),
    question: Joi.string().min(5).required(),
    answerPlain: Joi.string().min(1).required(), // Plain answer uchun
    hint: Joi.string().optional(),
    score: Joi.number().min(1).required(),
    group: Joi.string().required(),
    logindetail: Joi.string().min(1),
  });
  return schema.validate(test);
}

module.exports = { Test, validateTest };
