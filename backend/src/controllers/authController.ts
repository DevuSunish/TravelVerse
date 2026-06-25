import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeytravelverse2026_change_me_in_production';

// Helpers to calculate badges dynamically
function calculateBadges(stats: { countriesCount: number; tripsCount: number; recsCount: number }) {
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

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password, home_country } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user exists
    const userExists = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default profile picture
    const defaultPic = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

    // Create user
    const newUser = await query(
      `INSERT INTO users (username, email, password_hash, home_country, avatar_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, avatar_url, cover_picture`,
      [username, email, passwordHash, home_country || 'Unknown', defaultPic]
    );

    const user = newUser[0];

    // Generate JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: defaultPic,
        avatar_url: defaultPic,
        uploaded_picture: null,
        cover_picture: null,
        home_country: home_country || 'Unknown'
      },
    });
  } catch (err: any) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user
    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d',
    });

    const resolvedProfilePic = user.profile_picture || user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`;

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        home_country: user.home_country,
        profile_picture: resolvedProfilePic,
        avatar_url: user.avatar_url,
        uploaded_picture: user.profile_picture,
        cover_picture: user.cover_picture
      },
    });
  } catch (err: any) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    // Find target user by username if provided in query, otherwise current logged in user
    const usernameParam = req.query.username;

    let user;
    if (usernameParam) {
      const users = await query('SELECT id, username, email, bio, home_country, profile_picture, avatar_url, cover_picture FROM users WHERE username = $1', [usernameParam]);
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      user = users[0];
    } else {
      const users = await query('SELECT id, username, email, bio, home_country, profile_picture, avatar_url, cover_picture FROM users WHERE id = $1', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      user = users[0];
    }

    // Calculate actual stats dynamically
    const tripsCountRes = await query('SELECT COUNT(*) as count FROM trips WHERE user_id = $1 AND status = \'past\'', [user.id]);
    const countriesCountRes = await query('SELECT COUNT(DISTINCT country_code) as count FROM countries_visited WHERE user_id = $1 AND status = \'visited\'', [user.id]);
    const recsCountRes = await query('SELECT COUNT(*) as count FROM recommendations WHERE user_id = $1', [user.id]);

    const tripsCount = parseInt(tripsCountRes[0]?.count || '0');
    const countriesCount = parseInt(countriesCountRes[0]?.count || '0');
    const recsCount = parseInt(recsCountRes[0]?.count || '0');

    // Total countries in the world (approx 195)
    const travelPercentage = parseFloat(((countriesCount / 195) * 100).toFixed(2));

    // Dynamic Badges
    const badges = calculateBadges({ countriesCount, tripsCount, recsCount });

    // Social follow counts
    const followersRes = await query('SELECT COUNT(*) as count FROM follows WHERE following_id = $1', [user.id]);
    const followingRes = await query('SELECT COUNT(*) as count FROM follows WHERE follower_id = $1', [user.id]);

    // Check if the current user is following this user
    let isFollowing = false;
    if (userId && userId !== user.id) {
      const followCheck = await query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [userId, user.id]);
      isFollowing = followCheck.length > 0;
    }

    const resolvedProfilePic = user.profile_picture || user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`;

    res.json({
      profile: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        home_country: user.home_country,
        profile_picture: resolvedProfilePic,
        avatar_url: user.avatar_url,
        uploaded_picture: user.profile_picture,
        cover_picture: user.cover_picture,
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
  } catch (err: any) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { bio, home_country, profile_picture, avatar_url, cover_picture } = req.body;

    // Build update query dynamically
    const fields: string[] = [];
    const values: any[] = [];
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
    if (avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }
    if (cover_picture !== undefined) {
      fields.push(`cover_picture = $${paramIndex++}`);
      values.push(cover_picture);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(userId);
    const updateQuery = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, username, email, bio, home_country, profile_picture, avatar_url, cover_picture`;

    const updatedUser = await query(updateQuery, values);
    const user = updatedUser[0];
    const resolvedProfilePic = user.profile_picture || user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`;

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        home_country: user.home_country,
        profile_picture: resolvedProfilePic,
        avatar_url: user.avatar_url,
        uploaded_picture: user.profile_picture,
        cover_picture: user.cover_picture
      },
    });
  } catch (err: any) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ message: 'Server error updating profile' });
  }
}

export async function uploadProfilePicture(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Construct public file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.json({
      message: 'File uploaded successfully',
      url: fileUrl
    });
  } catch (err: any) {
    console.error('Upload profile picture controller error:', err.message);
    res.status(500).json({ message: 'Server error uploading image' });
  }
}

export async function searchUsers(req: AuthRequest, res: Response) {
  try {
    const requestingUserId = req.user?.id;
    const rawQ = ((req.query.q as string) || '').trim();

    if (!rawQ) {
      return res.json({ users: [] });
    }

    // Wrap in % for LIKE partial match
    const pattern = `%${rawQ}%`;

    // Use unique parameter positions ($1, $2, $3, $4) so the SQLite adapter
    // (which converts $N → ?) creates the correct number of ? placeholders.
    // LOWER() on both sides gives case-insensitive search on both Postgres and SQLite.
    const results = await query(
      `SELECT id, username, bio, profile_picture, avatar_url
       FROM users
       WHERE id != $1
         AND (
           LOWER(username) LIKE LOWER($2)
           OR LOWER(COALESCE(bio, '')) LIKE LOWER($3)
         )
       ORDER BY
         CASE WHEN LOWER(username) LIKE LOWER($4) THEN 0 ELSE 1 END,
         username ASC
       LIMIT 10`,
      [requestingUserId, pattern, pattern, `${rawQ.toLowerCase()}%`]
    );

    const users = results.map((u: any) => ({
      id: u.id,
      username: u.username,
      bio: u.bio || null,
      profile_picture:
        u.profile_picture ||
        u.avatar_url ||
        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.username)}`
    }));

    console.log(`[Search] query="${rawQ}" → ${users.length} result(s) found`);
    res.json({ users });
  } catch (err: any) {
    console.error('[Search] searchUsers error:', err.message);
    res.status(500).json({ message: 'Server error during user search' });
  }
}

