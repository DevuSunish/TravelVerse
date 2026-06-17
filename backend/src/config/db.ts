import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;
let isSQLite = false;

// Initialize Database connection
export async function initDB() {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    try {
      console.log('Attempting to connect to PostgreSQL...');
      pgPool = new Pool({
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
      await runMigrations();
      return;
    } catch (err: any) {
      console.error('PostgreSQL connection failed. Error:', err.message || err);
      console.log('Falling back to SQLite database...');
    }
  } else {
    console.log('No DATABASE_URL found in environment. Initializing SQLite fallback...');
  }

  // Fallback to SQLite
  isSQLite = true;
  const dbPath = path.resolve(__dirname, '../../travelverse.db');
  console.log(`Connecting to SQLite database at: ${dbPath}`);
  
  await new Promise<void>((resolve, reject) => {
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database:', err.message);
        reject(err);
      } else {
        console.log('Connected to SQLite database successfully!');
        resolve();
      }
    });
  });

  // Check if users table exists in SQLite
  const tableCheck = await new Promise<boolean>((resolve) => {
    sqliteDb?.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      [],
      (err, row) => {
        if (err || !row) resolve(false);
        else resolve(true);
      }
    );
  });

  if (!tableCheck) {
    console.log('SQLite tables not found. Running migrations and seeding...');
    await runSQLiteSchema();
  }
  await runMigrations();
}

// Execute migration to add avatar_url and cover_picture columns
async function runMigrations() {
  try {
    if (isSQLite) {
      await query('ALTER TABLE users ADD COLUMN avatar_url TEXT');
    } else {
      await query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)');
    }
    console.log('Successfully added avatar_url column to users table');
  } catch (err: any) {
    // Suppress error if the column already exists
    console.log('Database column check (avatar_url):', err.message);
  }

  try {
    if (isSQLite) {
      await query('ALTER TABLE users ADD COLUMN cover_picture TEXT');
    } else {
      await query('ALTER TABLE users ADD COLUMN cover_picture VARCHAR(255)');
    }
    console.log('Successfully added cover_picture column to users table');
  } catch (err: any) {
    // Suppress error if the column already exists
    console.log('Database column check (cover_picture):', err.message);
  }

  try {
    if (isSQLite) {
      await query('ALTER TABLE travel_groups ADD COLUMN cover_image TEXT');
    } else {
      await query('ALTER TABLE travel_groups ADD COLUMN cover_image VARCHAR(255)');
    }
    console.log('Successfully added cover_image column to travel_groups table');
  } catch (err: any) {
    console.log('Database column check (travel_groups.cover_image):', err.message);
  }

  try {
    if (isSQLite) {
      await query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user1_id, user2_id)
        )
      `);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          user1_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user2_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user1_id, user2_id)
        )
      `);
    }
    console.log('Checked/created conversations table');
  } catch (err: any) {
    console.error('Failed to migrate conversations table:', err.message);
  }

  try {
    if (isSQLite) {
      await query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
          group_id INTEGER REFERENCES travel_groups(id) ON DELETE CASCADE,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message_text TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          attachment_url TEXT,
          is_read BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
          group_id INT REFERENCES travel_groups(id) ON DELETE CASCADE,
          sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message_text TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'text',
          attachment_url VARCHAR(255),
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    console.log('Checked/created messages table');
  } catch (err: any) {
    console.error('Failed to migrate messages table:', err.message);
  }

  try {
    if (isSQLite) {
      await query('ALTER TABLE users ADD COLUMN last_seen TEXT');
    } else {
      await query('ALTER TABLE users ADD COLUMN last_seen TIMESTAMP');
    }
    console.log('Successfully added last_seen column to users table');
  } catch (err: any) {
    console.log('Database column check (last_seen):', err.message);
  }
}

// Execute PostgreSQL Schema Migration
async function runPostgresSchema() {
  if (!pgPool) return;
  try {
    const schemaPath = path.resolve(__dirname, './schema_postgres.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pgPool.query(sql);
    console.log('PostgreSQL schema applied and database seeded successfully!');
  } catch (err: any) {
    console.error('Error applying PostgreSQL schema:', err.message || err);
    throw err;
  }
}

// Execute SQLite Schema Migration
async function runSQLiteSchema() {
  if (!sqliteDb) return;
  try {
    const schemaPath = path.resolve(__dirname, './schema_sqlite.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // SQLite can run multiple queries via exec()
    await new Promise<void>((resolve, reject) => {
      sqliteDb!.exec(sql, (err) => {
        if (err) {
          console.error('SQLite exec migration error:', err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    console.log('SQLite schema applied and database seeded successfully!');
  } catch (err: any) {
    console.error('Error applying SQLite schema:', err.message || err);
    throw err;
  }
}

// General purpose database query function
export async function query(text: string, params: any[] = []): Promise<any[]> {
  if (isSQLite) {
    if (!sqliteDb) {
      throw new Error('SQLite database not initialized');
    }
    
    // Convert PostgreSQL parameters ($1, $2, etc.) to SQLite (?)
    const sqliteText = text.replace(/\$[0-9]+/g, '?');
    
    return new Promise<any[]>((resolve, reject) => {
      sqliteDb!.all(sqliteText, params, (err, rows) => {
        if (err) {
          console.error('SQLite query error:', err.message, '\nSQL:', sqliteText, '\nParams:', params);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  } else {
    if (!pgPool) {
      throw new Error('PostgreSQL database not initialized');
    }
    
    const res = await pgPool.query(text, params);
    return res.rows;
  }
}

export function getDbMode(): 'postgres' | 'sqlite' {
  return isSQLite ? 'sqlite' : 'postgres';
}
