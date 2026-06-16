import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './config/db';
import path from 'path';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Serve uploaded profile pictures statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());

// Request logger for debugging API requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Basic Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to TravelVerse API Server',
    status: 'Running',
    time: new Date().toISOString()
  });
});

// API routes mapping
app.use('/api', apiRoutes);

// Global error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'An unexpected error occurred on the server'
  });
});

// Database initialization & server start
async function startServer() {
  try {
    // Initialize database (Postgres or SQLite fallback)
    await initDB();
    
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(` TravelVerse server is running on http://localhost:${PORT}`);
      console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to initialize database on startup:', error);
    process.exit(1);
  }
}

startServer();
