const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models/user');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

async function createStaticAdmin() {
  try {
    await mongoose.connect("mongodb+srv://IamShadow:IamShadow26@cluster0.nvrqahb.mongodb.net/RedHawks", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected.');

    const existingSuperadmin = await User.findOne({ email: 'superadmin@gmail.com' }); // Change to appropriate superadmin email
    if (existingSuperadmin) {
      console.log('Superadmin already exists.');
      return;
    }

   
    const newSuperadminData = {
      name: 'superadmin',
      email: 'superadmin@gmail.com', // Replace with your desired email
      password: 'superadmin',  // Plain text password, you should change this for security
      role: 'superuser'
    };

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newSuperadminData.password, salt);
    newSuperadminData.password = hashedPassword;

    const newSuperadmin = new User(newSuperadminData);
    await newSuperadmin.save();
    
    console.log('Admin created successfully.');
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    mongoose.disconnect();
  }
}

createStaticAdmin();
