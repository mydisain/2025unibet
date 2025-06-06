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
  process.env.MONGODB_URI = 'mongodb+srv://admin:admin123@cluster0.mongodb.net/kardikeskus?retryWrites=true&w=majority';
  console.log('Using default MongoDB URI');
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

// CORS Configuration - Allow all origins for now to debug the issue
app.use(cors());

// Add explicit CORS headers for all responses
app.use((req, res, next) => {
  // Set permissive CORS headers for debugging
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Log detailed information about the request
  console.log(`${new Date().toISOString()} - CORS Debug - Request from origin:`, req.headers.origin);
  console.log(`${new Date().toISOString()} - CORS Debug - Request method:`, req.method);
  console.log(`${new Date().toISOString()} - CORS Debug - Request path:`, req.path);
  
  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`${new Date().toISOString()} - CORS Debug - Handling OPTIONS preflight request`);
    return res.status(200).end();
  }
  
  next();
});

// Development logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
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
