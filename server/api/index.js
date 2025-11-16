// Fallback handler - redirects to Express app if api/ routes don't work
// This file ensures Vercel uses api/ folder structure
const express = require('express');
const app = express();

// Import routes
const extractRouter = require('../routes/extract');
const generateRouter = require('../routes/generate');

// Middleware
const cors = require('cors');
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      origin.includes('vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

module.exports = app;

