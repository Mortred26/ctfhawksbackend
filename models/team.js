const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Jamoa nomi
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Faqat adminlar
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Jamoani yaratgan foydalanuvchi
  createdByRole: { type: String, enum: ['superuser', 'admin'], required: true } // Bu foydalanuvchi roliga mos keladi
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
