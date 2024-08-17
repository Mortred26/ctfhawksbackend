const mongoose = require('mongoose');
const User = require('./models/user');

const bcrypt = require('bcryptjs');

async function testPassword() {
  try {
    const plainPassword = 'IamShadow26';
    
    // Parolni shifrlash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    console.log('Shifrlangan parol:', hashedPassword);

    // Shifrlangan parolni tekshirish
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    if (isMatch) {
      console.log('Parol mos keladi');
    } else {
      console.log('Parol mos kelmaydi');
    }
  } catch (error) {
    console.error('Xato:', error);
  }
}

testPassword();
