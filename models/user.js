const mongoose = require('mongoose');
const Joi = require('joi');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'superuser', 'admin'], default: 'user' },
  points: { type: Number, default: 0 },
  registrationDate: { type: Date, default: Date.now },
  testsTaken: [{
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    correct: { type: Boolean, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
});

const User = mongoose.model('User', userSchema);

function validateUser(user) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().min(5).required().email(),
    password: Joi.string().min(5).required(),
    role: Joi.string().valid('user', 'superuser', 'admin')
  });
  return schema.validate(user);
}

function validateLogin(req) {
    const schema = Joi.object({
      email: Joi.string().min(5).required().email(),
      password: Joi.string().min(5).required(),
    });
    return schema.validate(req);
  }
  

module.exports = { User, validateUser, validateLogin  };
