require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const extractRouter = require('./routes/extract');
const generateRouter = require('./routes/generate');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
// CORS configuration - allow all origins (for Vercel deployments)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel deployments and localhost
    if (
      origin.includes('vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory (only if not in Vercel)
// Vercel uses /tmp for temporary files
if (process.env.VERCEL !== '1') {
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Warning: Could not create uploads directory:', err.message);
  }
}

// Routes
app.use('/api/extract', extractRouter);
app.use('/api/generate', generateRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lorey API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Export for Vercel serverless functions
// Vercel expects a handler function
module.exports = (req, res) => app(req, res);

// Only listen if running locally (not in Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Lorey API server running on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please:`);
      console.error(`   1. Close the other application using port ${PORT}`);
      console.error(`   2. Or change SERVER_PORT in .env file`);
      console.error(`   3. Or kill the process: netstat -ano | findstr :${PORT}`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}
