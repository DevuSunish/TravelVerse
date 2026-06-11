import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { getCountryCode } from './tripController';

// 1. Recommendations CRUD
export async function createRecommendation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { place_name, country, category, rating, review, tips, estimated_cost, how_to_reach, best_time_to_visit, photos } = req.body;

    if (!place_name || !country || !category || !rating || !review) {
      return res.status(400).json({ message: 'Missing required recommendation fields' });
    }

    const defaultPhoto = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=600';

    const rec = await query(
      `INSERT INTO recommendations (user_id, place_name, country, category, rating, review, tips, estimated_cost, how_to_reach, best_time_to_visit, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        userId,
        place_name,
        country,
        category,
        rating,
        review,
        tips || '',
        estimated_cost || null,
        how_to_reach || '',
        best_time_to_visit || '',
        photos || defaultPhoto
      ]
    );

    res.status(201).json({ recommendation: rec[0] });
  } catch (err: any) {
    console.error('Create recommendation error:', err.message);
    res.status(500).json({ message: 'Server error creating recommendation' });
  }
}

export async function getRecommendations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { category, country, search } = req.query;

    let recsQuery = `
      SELECT r.*, u.username, u.profile_picture,
             (SELECT COUNT(*) FROM likes WHERE recommendation_id = r.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE recommendation_id = r.id) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND recommendation_id = r.id) as is_liked
      FROM recommendations r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (category) {
      recsQuery += ` AND r.category = $${paramIndex++}`;
      params.push(category);
    }

    if (country) {
      recsQuery += ` AND LOWER(r.country) = LOWER($${paramIndex++})`;
      params.push(country);
    }

    if (search) {
      recsQuery += ` AND (LOWER(r.place_name) LIKE LOWER($${paramIndex}) OR LOWER(r.country) LIKE LOWER($${paramIndex}) OR LOWER(r.review) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    recsQuery += ' ORDER BY r.created_at DESC';

    const recommendations = await query(recsQuery, params);
    res.json({ recommendations });
  } catch (err: any) {
    console.error('Get recommendations error:', err.message);
    res.status(500).json({ message: 'Server error retrieving recommendations' });
  }
}

// 2. Comments & Likes
export async function toggleLike(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { trip_id, recommendation_id } = req.body;

    if (!trip_id && !recommendation_id) {
      return res.status(400).json({ message: 'Provide trip_id or recommendation_id' });
    }

    if (trip_id) {
      const existing = await query('SELECT id FROM likes WHERE user_id = $1 AND trip_id = $2', [userId, trip_id]);
      if (existing.length > 0) {
        await query('DELETE FROM likes WHERE user_id = $1 AND trip_id = $2', [userId, trip_id]);
        return res.json({ liked: false });
      } else {
        await query('INSERT INTO likes (user_id, trip_id) VALUES ($1, $2)', [userId, trip_id]);
        return res.json({ liked: true });
      }
    } else {
      const existing = await query('SELECT id FROM likes WHERE user_id = $1 AND recommendation_id = $2', [userId, recommendation_id]);
      if (existing.length > 0) {
        await query('DELETE FROM likes WHERE user_id = $1 AND recommendation_id = $2', [userId, recommendation_id]);
        return res.json({ liked: false });
      } else {
        await query('INSERT INTO likes (user_id, recommendation_id) VALUES ($1, $2)', [userId, recommendation_id]);
        return res.json({ liked: true });
      }
    }
  } catch (err: any) {
    console.error('Toggle like error:', err.message);
    res.status(500).json({ message: 'Server error toggling like' });
  }
}

export async function addComment(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { trip_id, recommendation_id, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const comment = await query(
      `INSERT INTO comments (user_id, trip_id, recommendation_id, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, trip_id || null, recommendation_id || null, content]
    );

    // Join user info for returning
    const commentWithUser = await query(
      `SELECT c.*, u.username, u.profile_picture 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = $1`,
      [comment[0].id]
    );

    res.status(201).json({ comment: commentWithUser[0] });
  } catch (err: any) {
    console.error('Add comment error:', err.message);
    res.status(500).json({ message: 'Server error adding comment' });
  }
}

export async function getComments(req: AuthRequest, res: Response) {
  try {
    const { trip_id, recommendation_id } = req.query;

    let commentsQuery = `
      SELECT c.*, u.username, u.profile_picture 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let index = 1;

    if (trip_id) {
      commentsQuery += ` AND c.trip_id = $${index++}`;
      params.push(trip_id);
    }
    if (recommendation_id) {
      commentsQuery += ` AND c.recommendation_id = $${index++}`;
      params.push(recommendation_id);
    }

    commentsQuery += ' ORDER BY c.created_at ASC';
    const comments = await query(commentsQuery, params);

    res.json({ comments });
  } catch (err: any) {
    console.error('Get comments error:', err.message);
    res.status(500).json({ message: 'Server error retrieving comments' });
  }
}

// 3. Follow system
export async function followUser(req: AuthRequest, res: Response) {
  try {
    const followerId = req.user?.id;
    const { userIdToFollow } = req.body;

    if (followerId === parseInt(userIdToFollow)) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const check = await query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, userIdToFollow]);
    if (check.length > 0) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    await query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [followerId, userIdToFollow]);
    
    // Add notification
    await query(
      'INSERT INTO notifications (user_id, type, content) VALUES ($1, $2, $3)',
      [userIdToFollow, 'follow', `${req.user?.username} started following you.`]
    );

    res.json({ followed: true });
  } catch (err: any) {
    console.error('Follow error:', err.message);
    res.status(500).json({ message: 'Server error following user' });
  }
}

export async function unfollowUser(req: AuthRequest, res: Response) {
  try {
    const followerId = req.user?.id;
    const { userIdToUnfollow } = req.body;

    await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, userIdToUnfollow]);
    res.json({ followed: false });
  } catch (err: any) {
    console.error('Unfollow error:', err.message);
    res.status(500).json({ message: 'Server error unfollowing user' });
  }
}

// 4. Social Feed
export async function getActivityFeed(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    // Get followed users ids
    const following = await query('SELECT following_id FROM follows WHERE follower_id = $1', [userId]);
    const followingIds = following.map((f) => f.following_id);

    let feedTrips;
    let feedRecs;

    if (followingIds.length > 0) {
      // Fetch followed users trips and recommendations
      const placeholders = followingIds.map((_, i) => `$${i + 1}`).join(',');
      
      feedTrips = await query(
        `SELECT t.*, u.username, u.profile_picture, 'trip' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE trip_id = t.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE trip_id = t.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $${followingIds.length + 1} AND trip_id = t.id) as is_liked
         FROM trips t
         JOIN users u ON t.user_id = u.id
         WHERE t.user_id IN (${placeholders}) AND t.status = 'past'
         ORDER BY t.created_at DESC LIMIT 10`,
        [...followingIds, userId]
      );

      feedRecs = await query(
        `SELECT r.*, u.username, u.profile_picture, 'recommendation' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE recommendation_id = r.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE recommendation_id = r.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $${followingIds.length + 1} AND recommendation_id = r.id) as is_liked
         FROM recommendations r
         JOIN users u ON r.user_id = u.id
         WHERE r.user_id IN (${placeholders})
         ORDER BY r.created_at DESC LIMIT 10`,
        [...followingIds, userId]
      );
    } else {
      // Fallback: Show general public feed (all users, sorted by date)
      feedTrips = await query(
        `SELECT t.*, u.username, u.profile_picture, 'trip' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE trip_id = t.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE trip_id = t.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND trip_id = t.id) as is_liked
         FROM trips t
         JOIN users u ON t.user_id = u.id
         WHERE t.status = 'past'
         ORDER BY t.created_at DESC LIMIT 10`,
        [userId]
      );

      feedRecs = await query(
        `SELECT r.*, u.username, u.profile_picture, 'recommendation' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE recommendation_id = r.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE recommendation_id = r.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND recommendation_id = r.id) as is_liked
         FROM recommendations r
         JOIN users u ON r.user_id = u.id
         ORDER BY r.created_at DESC LIMIT 10`,
        [userId]
      );
    }

    // Combine and sort feed
    const combinedFeed = [...feedTrips, ...feedRecs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({ feed: combinedFeed.slice(0, 15) });
  } catch (err: any) {
    console.error('Get feed error:', err.message);
    res.status(500).json({ message: 'Server error retrieving feed' });
  }
}

// 5. Global Search
export async function searchEverything(req: AuthRequest, res: Response) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = `%${q}%`;

    // Search travelers
    const travelers = await query(
      `SELECT id, username, profile_picture, home_country, bio 
       FROM users 
       WHERE LOWER(username) LIKE LOWER($1) OR LOWER(home_country) LIKE LOWER($1) LIMIT 10`,
      [searchQuery]
    );

    // Search destinations/trips
    const destinations = await query(
      `SELECT t.*, u.username, u.profile_picture
       FROM trips t
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'past' AND (LOWER(t.country) LIKE LOWER($1) OR LOWER(t.city) LIKE LOWER($1))
       LIMIT 10`,
      [searchQuery]
    );

    res.json({ travelers, destinations });
  } catch (err: any) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: 'Server error executing search' });
  }
}

// 6. Travel Wishlist
export async function getWishlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const wishlist = await query('SELECT * FROM wishlists WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json({ wishlist });
  } catch (err: any) {
    console.error('Get wishlist error:', err.message);
    res.status(500).json({ message: 'Server error retrieving wishlist' });
  }
}

export async function addToWishlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { type, name, country, notes } = req.body; // type: 'country', 'city', 'attraction'

    if (!type || !name) {
      return res.status(400).json({ message: 'Type and Name are required' });
    }

    const item = await query(
      'INSERT INTO wishlists (user_id, type, name, country, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, type, name, country || '', notes || '']
    );

    // Sync to countries_visited if it is a wishlist country
    if (type === 'country') {
      const code = getCountryCode(name);
      try {
        await query(
          `INSERT INTO countries_visited (user_id, country_code, status) VALUES ($1, $2, 'wishlist')
           ON CONFLICT (user_id, country_code) DO UPDATE SET status = 'wishlist'`,
          [userId, code]
        );
      } catch (e) {
        // SQLite conflict ignore
        try {
          const exist = await query('SELECT id FROM countries_visited WHERE user_id = $1 AND country_code = $2', [userId, code]);
          if (exist.length === 0) {
            await query('INSERT INTO countries_visited (user_id, country_code, status) VALUES ($1, $2, \'wishlist\')', [userId, code]);
          }
        } catch (err) {}
      }
    }

    res.status(201).json({ item: item[0] });
  } catch (err: any) {
    console.error('Add wishlist error:', err.message);
    res.status(500).json({ message: 'Server error adding to wishlist' });
  }
}

export async function removeFromWishlist(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const item = await query('SELECT * FROM wishlists WHERE id = $1 AND user_id = $2', [id, userId]);
    if (item.length === 0) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    await query('DELETE FROM wishlists WHERE id = $1', [id]);

    // Also remove from map if it was a country wishlist
    if (item[0].type === 'country') {
      const code = getCountryCode(item[0].name);
      await query('DELETE FROM countries_visited WHERE user_id = $1 AND country_code = $2 AND status = \'wishlist\'', [userId, code]);
    }

    res.json({ message: 'Item removed from wishlist successfully' });
  } catch (err: any) {
    console.error('Remove wishlist error:', err.message);
    res.status(500).json({ message: 'Server error removing from wishlist' });
  }
}

// 7. Get Notifications
export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const notifications = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [userId]);
    res.json({ notifications });
  } catch (err: any) {
    console.error('Get notifications error:', err.message);
    res.status(500).json({ message: 'Server error retrieving notifications' });
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    console.error('Read notification error:', err.message);
    res.status(500).json({ message: 'Server error marking notification read' });
  }
}
