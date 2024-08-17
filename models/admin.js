const mongoose = require('mongoose');
const Joi = require('joi');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin'], default: 'admin' }
});

const Admin = mongoose.model('Admin', adminSchema);

function validateAdmin(admin) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().min(5).required().email(),
    password: Joi.string().min(5).required(),
  });
  return schema.validate(admin);
}

module.exports = { Admin, validateAdmin };
