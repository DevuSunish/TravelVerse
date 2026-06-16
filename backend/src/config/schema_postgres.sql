-- Database schema for PostgreSQL

-- Drop tables if they exist (for migration purposes)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS travel_groups CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS countries_visited CASCADE;
DROP TABLE IF EXISTS trip_photos CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    home_country VARCHAR(100),
    profile_picture VARCHAR(255),
    avatar_url VARCHAR(255),
    cover_picture VARCHAR(255),
    travel_percentage DECIMAL(5,2) DEFAULT 0.00,
    countries_visited_count INT DEFAULT 0,
    trips_completed_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follows Table
CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    follower_id INT REFERENCES users(id) ON DELETE CASCADE,
    following_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

-- Trips Table
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    start_date DATE,
    end_date DATE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'past', -- 'past', 'planned', 'wishlist'
    cover_image VARCHAR(255),
    budget DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip Photos Table
CREATE TABLE trip_photos (
    id SERIAL PRIMARY KEY,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    photo_url VARCHAR(255) NOT NULL,
    caption VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Countries Visited Tracker
CREATE TABLE countries_visited (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3 code
    status VARCHAR(20) DEFAULT 'visited', -- 'visited', 'planned', 'wishlist'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, country_code)
);

-- Recommendations Table
CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    place_name VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Food', 'Nature', 'Beach', 'Adventure', 'Shopping', 'Historical', 'Other'
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review TEXT NOT NULL,
    tips TEXT,
    estimated_cost DECIMAL(10,2),
    how_to_reach TEXT,
    best_time_to_visit VARCHAR(100),
    photos TEXT, -- comma-separated URLs or JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments Table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    recommendation_id INT REFERENCES recommendations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Likes Table
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    recommendation_id INT REFERENCES recommendations(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, trip_id),
    UNIQUE(user_id, recommendation_id)
);

-- Wishlists Table (Attractions/Cities/Countries)
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'country', 'city', 'attraction'
    name VARCHAR(150) NOT NULL,
    country VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Travel Groups
CREATE TABLE travel_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Members
CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES travel_groups(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Activities (For itineraries and group voting)
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    group_id INT REFERENCES travel_groups(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    cost DECIMAL(10,2) DEFAULT 0.00,
    votes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itineraries (Day wise details)
CREATE TABLE itineraries (
    id SERIAL PRIMARY KEY,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    group_id INT REFERENCES travel_groups(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    group_id INT REFERENCES travel_groups(id) ON DELETE CASCADE,
    paid_by_user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Food', 'Lodging', 'Transport', 'Activities', 'Shopping', 'Other'
    split_details TEXT, -- JSON structure listing shares for group members
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'follow', 'like', 'comment', 'group_invite', 'expense'
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Default User password is 'password123' bcrypt hash)
-- Hash: $2a$10$tZ2y10Zt9qO1v/Z0xU678uqR4XG97b7J7f3pS7w5W9.i9dZp1Qz2u
INSERT INTO users (username, email, password_hash, bio, home_country, profile_picture, travel_percentage, countries_visited_count, trips_completed_count) VALUES
('elena_travels', 'elena@travelverse.com', '$2a$10$tZ2y10Zt9qO1v/Z0xU678uqR4XG97b7J7f3pS7w5W9.i9dZp1Qz2u', 'Wanderer & photographer. Searching for the best sunsets in the world.', 'Italy', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400', 7.50, 15, 22),
('marco_polo_2.0', 'marco@travelverse.com', '$2a$10$tZ2y10Zt9qO1v/Z0xU678uqR4XG97b7J7f3pS7w5W9.i9dZp1Qz2u', 'Adventure seeker. Hiking and diving my way around the globe.', 'United States', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400', 5.00, 10, 14),
('sophia_backpacks', 'sophia@travelverse.com', '$2a$10$tZ2y10Zt9qO1v/Z0xU678uqR4XG97b7J7f3pS7w5W9.i9dZp1Qz2u', 'Budget traveler. Sharing tips on how to travel the world for cheap!', 'United Kingdom', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400', 4.00, 8, 9);

-- Seed Countries Visited
INSERT INTO countries_visited (user_id, country_code, status) VALUES
(1, 'ITA', 'visited'),
(1, 'FRA', 'visited'),
(1, 'ESP', 'visited'),
(1, 'JPN', 'visited'),
(1, 'DEU', 'visited'),
(1, 'USA', 'planned'),
(1, 'THA', 'wishlist'),
(2, 'USA', 'visited'),
(2, 'CAN', 'visited'),
(2, 'MEX', 'visited'),
(2, 'CRC', 'visited'),
(2, 'JPN', 'planned'),
(3, 'GBR', 'visited'),
(3, 'FRA', 'visited'),
(3, 'ESP', 'visited'),
(3, 'ITA', 'visited');

-- Seed Trips
INSERT INTO trips (user_id, title, country, city, start_date, end_date, description, status, cover_image, budget) VALUES
(1, 'Chasing Cherry Blossoms in Tokyo', 'Japan', 'Tokyo', '2025-04-01', '2025-04-10', 'A wonderful spring trip to Japan. Walked around Shinjuku Gyoen, explored Shibuya, and ate delicious sushi in Tsukiji.', 'past', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=1200', 3000.00),
(1, 'Exploring the Historic Streets of Paris', 'France', 'Paris', '2024-09-15', '2024-09-22', 'A classic getaway. Visited the Louvre, took a night cruise down the Seine, and enjoyed warm croissants every morning.', 'past', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1200', 2500.00),
(2, 'Hiking the Andes & Machu Picchu', 'Peru', 'Cusco', '2026-08-10', '2026-08-20', 'Upcoming adventure group trip to hike the Inca Trail and explore the sacred valley.', 'planned', 'https://images.unsplash.com/photo-1587590227264-0ac64ce63ce8?auto=format&fit=crop&q=80&w=1200', 1800.00);

-- Seed Trip Photos
INSERT INTO trip_photos (trip_id, photo_url, caption) VALUES
(1, 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=600', 'Shibuya Crossing at night'),
(1, 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&q=80&w=600', 'Cherry blossoms in full bloom'),
(2, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=600', 'Eiffel Tower view from Trocadero');

-- Seed Recommendations
INSERT INTO recommendations (user_id, place_name, country, category, rating, review, tips, estimated_cost, how_to_reach, best_time_to_visit, photos) VALUES
(1, 'Ichiran Ramen Shibuya', 'Japan', 'Food', 5, 'The best tonkotsu ramen I have ever had. The individual booths create an amazing focused dining experience.', 'Go around 3:00 PM to avoid the massive lunch lines!', 15.00, 'Just a 3-minute walk from Shibuya Station Hachiko exit.', 'Year-round', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=600'),
(2, 'Playa Manuel Antonio', 'Costa Rica', 'Beach', 5, 'Breathtaking beach inside the National Park. Crystal clear water, white sand, and wild monkeys swinging in the trees behind you!', 'Pay for park entry in advance online. Watch your bags—monkeys will open them looking for food!', 20.00, 'Bus from San Jose to Quepos, then local shuttle to the park.', 'December to April (Dry season)', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=600');

-- Seed Wishlists
INSERT INTO wishlists (user_id, type, name, country, notes) VALUES
(1, 'country', 'Iceland', 'Iceland', 'Want to see the Northern Lights and drive the Ring Road'),
(1, 'attraction', 'Taj Mahal', 'India', 'Beautiful marble mausoleum in Agra'),
(2, 'city', 'Kyoto', 'Japan', 'Historic temples and bamboo forests');

-- Seed Follows
INSERT INTO follows (follower_id, following_id) VALUES
(1, 2),
(2, 1),
(3, 1);
