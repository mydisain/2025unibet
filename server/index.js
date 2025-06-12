const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const mongoose = require('mongoose');
const fs = require('fs');
const { connectDB } = require('./config/db');

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);
const { errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Set default MongoDB URI if not provided in environment
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://atlas-sql-67f3b9adeb8761049845c555-0y7zr.a.query.mongodb.net/kart-booking?ssl=true&authSource=admin';
  console.log('Using MongoDB Atlas URI for kart-booking database');
}

// Set default JWT secret if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'unibet-kart-booking-secret-2025';
  console.log('Using default JWT_SECRET');
}

// Try to read JWT_SECRET from the secret file if it exists
try {
  if (fs.existsSync('/etc/secrets/JWT_SECRET')) {
    const jwtSecret = fs.readFileSync('/etc/secrets/JWT_SECRET', 'utf8').trim();
    process.env.JWT_SECRET = jwtSecret;
    console.log('JWT_SECRET loaded from secret file');
  } else {
    console.log('JWT_SECRET secret file not found, using environment variable');
  }
} catch (error) {
  console.error('Error reading JWT_SECRET from secret file:', error.message);
}

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS Configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3009',               // Local development
    'https://unibet.bookid.ee',            // Production on zone.ee
    'https://www.unibet.bookid.ee',        // www subdomain
    /\.bookid\.ee$/,                     // Any subdomain of bookid.ee
    /https?:\/\/.*\.zone\.ee/          // Any zone.ee domain
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - Request from origin: ${req.headers.origin || 'Unknown'}`);
  console.log(`${new Date().toISOString()} - Request method: ${req.method}`);
  console.log(`${new Date().toISOString()} - Request path: ${req.path}`);
  
  // Additional logging for admin-related requests
  if (req.path.includes('/admin') || req.path.includes('/bookings')) {
    console.log(`${new Date().toISOString()} - Admin request headers:`, JSON.stringify(req.headers));
  }
  
  next();
});

// Development logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// EMERGENCY ADMIN CREATION ENDPOINT (REMOVE AFTER USE!!)
// This bypasses all auth middleware and is a security risk
app.post('/emergency-create-admin', async (req, res) => {
  try {
    const User = require('./models/userModel');
    const { name, email, password } = req.body;
    
    console.log('Emergency admin creation attempt for:', { name, email });
    
    // Input validation
    if (!name || !email || !password) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.error('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      isAdmin: true
    });
    
    if (user) {
      console.log('EMERGENCY ADMIN USER CREATED:', { name, email });
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        message: 'Admin created successfully - REMOVE THIS ENDPOINT IMMEDIATELY!'
      });
    } else {
      console.error('Failed to create admin user');
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Emergency admin creation error:', error);
    return res.status(500).json({ 
      message: 'Server error creating admin', 
      error: error.message 
    });
  }
});

// Regular API routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/karts', require('./routes/kartRoutes'));
app.use('/api/kart-types', require('./routes/kartTypeRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../client/build/index.html'))
  );
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

// Error handling middleware
app.use(errorHandler);

// Use the port provided by Render or default to 5004 for local development
const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});
