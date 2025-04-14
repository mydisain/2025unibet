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

// Configure CORS to allow requests from specific domains
const allowedOrigins = [
  'https://test.bookid.ee',  // Your actual zone.ee domain
  'http://test.bookid.ee',   // HTTP version
  'https://www.test.bookid.ee',  // www subdomain
  'http://www.test.bookid.ee',   // HTTP www subdomain
  'http://localhost:3009',  // Local development
  'http://localhost:3000',  // Alternative local port
  'https://two025unibet-kardikeskus.onrender.com'  // Your render.com backend
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('CORS blocked request from:', origin);
      // For debugging, allow all origins but log blocked ones
      return callback(null, true);
      
      // Uncomment below to actually block disallowed origins
      // const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      // return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add CORS preflight handling for all routes
app.options('*', cors());

// Add specific CORS headers to all responses for debugging
app.use((req, res, next) => {
  // Log the origin for debugging
  console.log('Request origin:', req.headers.origin);
  
  // For now, still allow all origins but with proper headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
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
