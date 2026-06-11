"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.query = query;
exports.getDbMode = getDbMode;
const pg_1 = require("pg");
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let pgPool = null;
let sqliteDb = null;
let isSQLite = false;
// Initialize Database connection
async function initDB() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        try {
            console.log('Attempting to connect to PostgreSQL...');
            pgPool = new pg_1.Pool({
                connectionString: dbUrl,
                // Suppress logs but verify connection
            });
            // Test the connection
            await pgPool.query('SELECT 1');
            console.log('Successfully connected to PostgreSQL database!');
            // Check if schema needs to be installed
            const tableCheck = await pgPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        );
      `);
            if (!tableCheck.rows[0].exists) {
                console.log('PostgreSQL tables not found. Running migrations and seeding...');
                await runPostgresSchema();
            }
            return;
        }
        catch (err) {
            console.error('PostgreSQL connection failed. Error:', err.message || err);
            console.log('Falling back to SQLite database...');
        }
    }
    else {
        console.log('No DATABASE_URL found in environment. Initializing SQLite fallback...');
    }
    // Fallback to SQLite
    isSQLite = true;
    const dbPath = path_1.default.resolve(__dirname, '../../travelverse.db');
    console.log(`Connecting to SQLite database at: ${dbPath}`);
    await new Promise((resolve, reject) => {
        sqliteDb = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                console.error('Failed to open SQLite database:', err.message);
                reject(err);
            }
            else {
                console.log('Connected to SQLite database successfully!');
                resolve();
            }
        });
    });
    // Check if users table exists in SQLite
    const tableCheck = await new Promise((resolve) => {
        sqliteDb?.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", [], (err, row) => {
            if (err || !row)
                resolve(false);
            else
                resolve(true);
        });
    });
    if (!tableCheck) {
        console.log('SQLite tables not found. Running migrations and seeding...');
        await runSQLiteSchema();
    }
}
// Execute PostgreSQL Schema Migration
async function runPostgresSchema() {
    if (!pgPool)
        return;
    try {
        const schemaPath = path_1.default.resolve(__dirname, './schema_postgres.sql');
        const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
        await pgPool.query(sql);
        console.log('PostgreSQL schema applied and database seeded successfully!');
    }
    catch (err) {
        console.error('Error applying PostgreSQL schema:', err.message || err);
        throw err;
    }
}
// Execute SQLite Schema Migration
async function runSQLiteSchema() {
    if (!sqliteDb)
        return;
    try {
        const schemaPath = path_1.default.resolve(__dirname, './schema_sqlite.sql');
        const sql = fs_1.default.readFileSync(schemaPath, 'utf8');
        // SQLite can run multiple queries via exec()
        await new Promise((resolve, reject) => {
            sqliteDb.exec(sql, (err) => {
                if (err) {
                    console.error('SQLite exec migration error:', err.message);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        console.log('SQLite schema applied and database seeded successfully!');
    }
    catch (err) {
        console.error('Error applying SQLite schema:', err.message || err);
        throw err;
    }
}
// General purpose database query function
async function query(text, params = []) {
    if (isSQLite) {
        if (!sqliteDb) {
            throw new Error('SQLite database not initialized');
        }
        // Convert PostgreSQL parameters ($1, $2, etc.) to SQLite (?)
        const sqliteText = text.replace(/\$[0-9]+/g, '?');
        return new Promise((resolve, reject) => {
            sqliteDb.all(sqliteText, params, (err, rows) => {
                if (err) {
                    console.error('SQLite query error:', err.message, '\nSQL:', sqliteText, '\nParams:', params);
                    reject(err);
                }
                else {
                    resolve(rows || []);
                }
            });
        });
    }
    else {
        if (!pgPool) {
            throw new Error('PostgreSQL database not initialized');
        }
        const res = await pgPool.query(text, params);
        return res.rows;
    }
}
function getDbMode() {
    return isSQLite ? 'sqlite' : 'postgres';
}
