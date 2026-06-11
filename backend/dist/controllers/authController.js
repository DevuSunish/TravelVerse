"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeytravelverse2026_change_me_in_production';
// Helpers to calculate badges dynamically
function calculateBadges(stats) {
    const badges = [];
    if (stats.tripsCount >= 1) {
        badges.push({ id: 'first_trip', name: 'First Steps', description: 'Completed your first trip registration', icon: 'Footprints', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' });
    }
    if (stats.countriesCount >= 3) {
        badges.push({ id: 'explorer', name: 'Explorer', description: 'Visited 3 or more countries', icon: 'Compass', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' });
    }
    if (stats.countriesCount >= 10) {
        badges.push({ id: 'globetrotter', name: 'Globetrotter', description: 'Visited 10 or more countries', icon: 'Globe', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' });
    }
    if (stats.recsCount >= 3) {
        badges.push({ id: 'local_guide', name: 'Local Guide', description: 'Shared 3 or more travel recommendations', icon: 'MapPin', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' });
    }
    if (stats.tripsCount >= 10) {
        badges.push({ id: 'nomad', name: 'Nomad', description: 'Logged 10 or more trips', icon: 'Compass', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' });
    }
    // Default badge if none
    if (badges.length === 0) {
        badges.push({ id: 'newbie', name: 'Wanderlust', description: 'Joined TravelVerse! Ready for adventure', icon: 'Sparkles', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' });
    }
    return badges;
}
async function register(req, res) {
    try {
        const { username, email, password, home_country } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        // Check if user exists
        const userExists = await (0, db_1.query)('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userExists.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Default profile picture
        const defaultPic = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;
        // Create user
        const newUser = await (0, db_1.query)(`INSERT INTO users (username, email, password_hash, home_country, profile_picture) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email`, [username, email, passwordHash, home_country || 'Unknown', defaultPic]);
        const user = newUser[0];
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, {
            expiresIn: '7d',
        });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                profile_picture: defaultPic,
                home_country: home_country || 'Unknown'
            },
        });
    }
    catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ message: 'Server error during registration' });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        // Find user
        const users = await (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const user = users[0];
        // Check password
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, {
            expiresIn: '7d',
        });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                home_country: user.home_country,
                profile_picture: user.profile_picture,
            },
        });
    }
    catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Server error during login' });
    }
}
async function getProfile(req, res) {
    try {
        const userId = req.user?.id;
        // Find target user by username if provided in query, otherwise current logged in user
        const usernameParam = req.query.username;
        let user;
        if (usernameParam) {
            const users = await (0, db_1.query)('SELECT id, username, email, bio, home_country, profile_picture FROM users WHERE username = $1', [usernameParam]);
            if (users.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            user = users[0];
        }
        else {
            const users = await (0, db_1.query)('SELECT id, username, email, bio, home_country, profile_picture FROM users WHERE id = $1', [userId]);
            if (users.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            user = users[0];
        }
        // Calculate actual stats dynamically
        const tripsCountRes = await (0, db_1.query)('SELECT COUNT(*) as count FROM trips WHERE user_id = $1 AND status = \'past\'', [user.id]);
        const countriesCountRes = await (0, db_1.query)('SELECT COUNT(DISTINCT country_code) as count FROM countries_visited WHERE user_id = $1 AND status = \'visited\'', [user.id]);
        const recsCountRes = await (0, db_1.query)('SELECT COUNT(*) as count FROM recommendations WHERE user_id = $1', [user.id]);
        const tripsCount = parseInt(tripsCountRes[0]?.count || '0');
        const countriesCount = parseInt(countriesCountRes[0]?.count || '0');
        const recsCount = parseInt(recsCountRes[0]?.count || '0');
        // Total countries in the world (approx 195)
        const travelPercentage = parseFloat(((countriesCount / 195) * 100).toFixed(2));
        // Dynamic Badges
        const badges = calculateBadges({ countriesCount, tripsCount, recsCount });
        // Social follow counts
        const followersRes = await (0, db_1.query)('SELECT COUNT(*) as count FROM follows WHERE following_id = $1', [user.id]);
        const followingRes = await (0, db_1.query)('SELECT COUNT(*) as count FROM follows WHERE follower_id = $1', [user.id]);
        // Check if the current user is following this user
        let isFollowing = false;
        if (userId && userId !== user.id) {
            const followCheck = await (0, db_1.query)('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [userId, user.id]);
            isFollowing = followCheck.length > 0;
        }
        res.json({
            profile: {
                id: user.id,
                username: user.username,
                bio: user.bio,
                home_country: user.home_country,
                profile_picture: user.profile_picture,
                stats: {
                    countries_visited_count: countriesCount,
                    trips_completed_count: tripsCount,
                    travel_percentage: travelPercentage,
                    recommendations_count: recsCount,
                    followers_count: parseInt(followersRes[0]?.count || '0'),
                    following_count: parseInt(followingRes[0]?.count || '0')
                },
                badges,
                is_following: isFollowing
            }
        });
    }
    catch (err) {
        console.error('Get profile error:', err.message);
        res.status(500).json({ message: 'Server error retrieving profile' });
    }
}
async function updateProfile(req, res) {
    try {
        const userId = req.user?.id;
        const { bio, home_country, profile_picture } = req.body;
        // Build update query dynamically
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (bio !== undefined) {
            fields.push(`bio = $${paramIndex++}`);
            values.push(bio);
        }
        if (home_country !== undefined) {
            fields.push(`home_country = $${paramIndex++}`);
            values.push(home_country);
        }
        if (profile_picture !== undefined) {
            fields.push(`profile_picture = $${paramIndex++}`);
            values.push(profile_picture);
        }
        if (fields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        values.push(userId);
        const updateQuery = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, username, email, bio, home_country, profile_picture`;
        const updatedUser = await (0, db_1.query)(updateQuery, values);
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser[0],
        });
    }
    catch (err) {
        console.error('Update profile error:', err.message);
        res.status(500).json({ message: 'Server error updating profile' });
    }
}
