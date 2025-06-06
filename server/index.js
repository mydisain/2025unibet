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

// CORS Configuration with specific allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3009',
  'https://test.bookid.ee',
  'https://unibet-2025.onrender.com'
];

// Configure CORS with specific options
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) {
      console.log('Request with no origin allowed');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      console.log(`Origin allowed: ${origin}`);
      callback(null, true);
    } else {
      console.log(`Origin not allowed: ${origin}`);
      callback(null, true); // Still allow for now, but log it
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Add explicit CORS headers to all responses for maximum compatibility
app.use((req, res, next) => {
  // Log the request for debugging
  console.log(`${new Date().toISOString()} - Request from origin:`, req.headers.origin);
  console.log(`${new Date().toISOString()} - Request method:`, req.method);
  console.log(`${new Date().toISOString()} - Request path:`, req.path);
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`${new Date().toISOString()} - Responding to OPTIONS preflight request`);
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
