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

  // --- TRAVEL COMMUNITIES SCHEMA & MIGRATION ---
  try {
    if (isSQLite) {
      await query(`
        CREATE TABLE IF NOT EXISTS communities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          cover_image TEXT,
          description TEXT,
          category TEXT NOT NULL,
          destination TEXT,
          rules TEXT,
          creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          requires_approval BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          status TEXT DEFAULT 'accepted',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(community_id, user_id)
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title TEXT,
          content TEXT NOT NULL,
          photo_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        )
      `);
      
      const existing = await query('SELECT count(*) as count FROM communities');
      if (existing[0]?.count === 0) {
        console.log('Seeding initial SQLite communities...');
        await query(`
          INSERT INTO communities (name, cover_image, description, category, destination, rules, creator_id, requires_approval) VALUES
          ('Annapurna Base Camp Trek', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=600', 'Connect with fellow trekkers planning or sharing their experiences about the legendary Annapurna Base Camp route in Nepal.', 'Trekking', 'Nepal', '1. Share trekking tips and advice.\n2. Respect local culture and environment.\n3. No spam.', 1, 0),
          ('Kerala Backpackers', 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=600', 'Explore the backwaters, beaches, and hill stations of God''s Own Country on a budget.', 'Backpacking', 'India', '1. Budget travel tips only.\n2. Be helpful and kind.', 1, 0),
          ('Solo Travelers India', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=600', 'A community for solo wanderers exploring the diverse landscapes of India.', 'Solo Travel', 'India', '1. Share safety advice.\n2. Solo meetups allowed.', 1, 0),
          ('Coorg Explorers', 'https://images.unsplash.com/photo-1590050752117-238cb0612b1b?auto=format&fit=crop&q=80&w=600', 'Discover the coffee plantations, waterfalls, and misty hills of Coorg.', 'Adventure', 'India', '1. Keep Coorg clean.', 1, 0),
          ('Weekend Trekkers Bangalore', 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=600', 'Join day hikes, night treks, and outdoor excursions around Bangalore.', 'Trekking', 'India', '1. Organize group treks responsibly.', 1, 0),
          ('Ladakh Riders', 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=600', 'Share route maps, road conditions, and stories of biking through the cold desert of Ladakh.', 'Road Trips', 'India', '1. Prioritize rider safety.', 1, 0),
          ('Goa Travelers', 'https://images.unsplash.com/photo-1506461883276-594a12b11db3?auto=format&fit=crop&q=80&w=600', 'Beaches, parties, architecture, and food in the vibrant state of Goa.', 'Backpacking', 'India', '1. No commercial promotions.', 1, 0)
        `);
        await query(`
          INSERT INTO community_members (community_id, user_id, role, status) VALUES
          (1, 1, 'admin', 'accepted'), (1, 2, 'member', 'accepted'), (1, 3, 'member', 'accepted'),
          (2, 1, 'admin', 'accepted'), (2, 3, 'member', 'accepted'),
          (3, 1, 'admin', 'accepted'), (3, 2, 'member', 'accepted'),
          (4, 1, 'admin', 'accepted'), (5, 1, 'admin', 'accepted'),
          (6, 1, 'admin', 'accepted'), (7, 1, 'admin', 'accepted')
        `);
        await query(`
          INSERT INTO community_posts (community_id, user_id, title, content, photo_url) VALUES
          (1, 2, 'Best time to trek Annapurna Base Camp?', 'I am planning a trip next year and want to know the best month for dry weather and clear mountain views. Anyone been there recently?', NULL)
        `);
        await query(`
          INSERT INTO community_comments (post_id, user_id, content) VALUES
          (1, 1, 'September to November is fantastic! Crystal clear skies and moderate temperatures.'),
          (1, 3, 'Agreed, though spring (March-May) is also beautiful with all the rhododendrons in bloom!')
        `);
        await query(`
          INSERT INTO community_likes (post_id, user_id) VALUES
          (1, 1), (1, 3)
        `);
      }
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS communities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(150) UNIQUE NOT NULL,
          cover_image VARCHAR(255),
          description TEXT,
          category VARCHAR(100) NOT NULL,
          destination VARCHAR(150),
          rules TEXT,
          creator_id INT REFERENCES users(id) ON DELETE SET NULL,
          requires_approval BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_members (
          id SERIAL PRIMARY KEY,
          community_id INT REFERENCES communities(id) ON DELETE CASCADE,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member',
          status VARCHAR(50) DEFAULT 'accepted',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(community_id, user_id)
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_posts (
          id SERIAL PRIMARY KEY,
          community_id INT REFERENCES communities(id) ON DELETE CASCADE,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(150),
          content TEXT NOT NULL,
          photo_url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_comments (
          id SERIAL PRIMARY KEY,
          post_id INT REFERENCES community_posts(id) ON DELETE CASCADE,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS community_likes (
          id SERIAL PRIMARY KEY,
          post_id INT REFERENCES community_posts(id) ON DELETE CASCADE,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        )
      `);
      
      const existing = await query('SELECT count(*) as count FROM communities');
      if (parseInt(existing[0]?.count || '0') === 0) {
        console.log('Seeding initial Postgres communities...');
        await query(`
          INSERT INTO communities (name, cover_image, description, category, destination, rules, creator_id, requires_approval) VALUES
          ('Annapurna Base Camp Trek', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=600', 'Connect with fellow trekkers planning or sharing their experiences about the legendary Annapurna Base Camp route in Nepal.', 'Trekking', 'Nepal', '1. Share trekking tips and advice.\n2. Respect local culture and environment.\n3. No spam.', 1, FALSE),
          ('Kerala Backpackers', 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=600', 'Explore the backwaters, beaches, and hill stations of God''s Own Country on a budget.', 'Backpacking', 'India', '1. Budget travel tips only.\n2. Be helpful and kind.', 1, FALSE),
          ('Solo Travelers India', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=600', 'A community for solo wanderers exploring the diverse landscapes of India.', 'Solo Travel', 'India', '1. Share safety advice.\n2. Solo meetups allowed.', 1, FALSE),
          ('Coorg Explorers', 'https://images.unsplash.com/photo-1590050752117-238cb0612b1b?auto=format&fit=crop&q=80&w=600', 'Discover the coffee plantations, waterfalls, and misty hills of Coorg.', 'Adventure', 'India', '1. Keep Coorg clean.', 1, FALSE),
          ('Weekend Trekkers Bangalore', 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=600', 'Join day hikes, night treks, and outdoor excursions around Bangalore.', 'Trekking', 'India', '1. Organize group treks responsibly.', 1, FALSE),
          ('Ladakh Riders', 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=600', 'Share route maps, road conditions, and stories of biking through the cold desert of Ladakh.', 'Road Trips', 'India', '1. Prioritize rider safety.', 1, FALSE),
          ('Goa Travelers', 'https://images.unsplash.com/photo-1506461883276-594a12b11db3?auto=format&fit=crop&q=80&w=600', 'Beaches, parties, architecture, and food in the vibrant state of Goa.', 'Backpacking', 'India', '1. No commercial promotions.', 1, FALSE)
        `);
        await query(`
          INSERT INTO community_members (community_id, user_id, role, status) VALUES
          (1, 1, 'admin', 'accepted'), (1, 2, 'member', 'accepted'), (1, 3, 'member', 'accepted'),
          (2, 1, 'admin', 'accepted'), (2, 3, 'member', 'accepted'),
          (3, 1, 'admin', 'accepted'), (3, 2, 'member', 'accepted'),
          (4, 1, 'admin', 'accepted'), (5, 1, 'admin', 'accepted'),
          (6, 1, 'admin', 'accepted'), (7, 1, 'admin', 'accepted')
        `);
        await query(`
          INSERT INTO community_posts (community_id, user_id, title, content, photo_url) VALUES
          (1, 2, 'Best time to trek Annapurna Base Camp?', 'I am planning a trip next year and want to know the best month for dry weather and clear mountain views. Anyone been there recently?', NULL)
        `);
        await query(`
          INSERT INTO community_comments (post_id, user_id, content) VALUES
          (1, 1, 'September to November is fantastic! Crystal clear skies and moderate temperatures.'),
          (1, 3, 'Agreed, though spring (March-May) is also beautiful with all the rhododendrons in bloom!')
        `);
        await query(`
          INSERT INTO community_likes (post_id, user_id) VALUES
          (1, 1), (1, 3)
        `);
      }
    }
    console.log('Checked/created community tables & seeded initial data successfully');
  } catch (err: any) {
    console.error('Failed to migrate community tables:', err.message);
  }

  // --- NOTIFICATION METADATA MIGRATION ---
  const newNotifCols = [
    { name: 'notification_type', pgType: 'VARCHAR(50)', slType: 'TEXT' },
    { name: 'target_id', pgType: 'INT', slType: 'INTEGER' },
    { name: 'target_user_id', pgType: 'INT', slType: 'INTEGER' },
    { name: 'target_post_id', pgType: 'INT', slType: 'INTEGER' },
    { name: 'target_community_id', pgType: 'INT', slType: 'INTEGER' },
    { name: 'target_chat_id', pgType: 'INT', slType: 'INTEGER' }
  ];

  for (const col of newNotifCols) {
    try {
      const type = isSQLite ? col.slType : col.pgType;
      await query(`ALTER TABLE notifications ADD COLUMN ${col.name} ${type}`);
      console.log(`Successfully migrated/added column ${col.name} to notifications table`);
    } catch (err: any) {
      console.log(`Database column check (notifications.${col.name}):`, err.message);
    }
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
