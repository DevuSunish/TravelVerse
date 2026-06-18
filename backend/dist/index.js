"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const path_1 = __importDefault(require("path"));
const api_1 = __importDefault(require("./routes/api"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Serve uploaded profile pictures statically
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../uploads')));
// Enable CORS
app.use((0, cors_1.default)());
// Body parser
app.use(express_1.default.json());
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
app.use('/api', api_1.default);
// Global error handler middleware
app.use((err, req, res, next) => {
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
        await (0, db_1.initDB)();
        app.listen(PORT, () => {
            console.log(`===================================================`);
            console.log(` TravelVerse server is running on http://localhost:${PORT}`);
            console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
            console.log(`===================================================`);
        });
    }
    catch (error) {
        console.error('Failed to initialize database on startup:', error);
        process.exit(1);
    }
}
startServer();
