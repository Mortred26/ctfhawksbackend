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

    const existingAdmin = await User.findOne({ email: 'admin@example.com' }); // Change to appropriate admin email
    if (existingAdmin) {
      console.log('Admin already exists.');
      return;
    }

    const newAdminData = {
      name: 'admin',
       email: 'admin@example.com',
      password: 'admin',  // Plain text password, you should change this
      role: 'admin'
    };

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newAdminData.password, salt);
    newAdminData.password = hashedPassword;

    const newAdmin = new User(newAdminData);
    await newAdmin.save();

    console.log('Admin created successfully.');
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    mongoose.disconnect();
  }
}

createStaticAdmin();
