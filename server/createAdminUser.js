const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const User = require('./models/userModel');
const { connectDB } = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@unibetkart.ee' });

    if (adminExists) {
      console.log('Admin user already exists'.yellow.inverse);
      process.exit();
    }

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@unibetkart.ee',
      password: 'admin123',  // This will be hashed automatically by the pre-save hook
      isAdmin: true,
    });

    console.log('Admin user created:'.green.inverse);
    console.log({
      name: adminUser.name,
      email: adminUser.email,
      isAdmin: adminUser.isAdmin,
      id: adminUser._id
    });

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`.red.inverse);
    process.exit(1);
  }
};

createAdminUser();
