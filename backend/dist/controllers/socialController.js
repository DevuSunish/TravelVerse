"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRecommendation = createRecommendation;
exports.getRecommendations = getRecommendations;
exports.toggleLike = toggleLike;
exports.addComment = addComment;
exports.getComments = getComments;
exports.followUser = followUser;
exports.unfollowUser = unfollowUser;
exports.getActivityFeed = getActivityFeed;
exports.searchEverything = searchEverything;
exports.getWishlist = getWishlist;
exports.addToWishlist = addToWishlist;
exports.removeFromWishlist = removeFromWishlist;
exports.getNotifications = getNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.deleteNotification = deleteNotification;
exports.deleteAllNotifications = deleteAllNotifications;
exports.checkFollowStatus = checkFollowStatus;
exports.getFollowersCount = getFollowersCount;
exports.getFollowingCount = getFollowingCount;
exports.getFollowersList = getFollowersList;
exports.getFollowingList = getFollowingList;
const db_1 = require("../config/db");
const tripController_1 = require("./tripController");
const notificationService_1 = require("../services/notificationService");
// 1. Recommendations CRUD
async function createRecommendation(req, res) {
    try {
        const userId = req.user?.id;
        const { place_name, country, category, rating, review, tips, estimated_cost, how_to_reach, best_time_to_visit, photos } = req.body;
        if (!place_name || !country || !category || !rating || !review) {
            return res.status(400).json({ message: 'Missing required recommendation fields' });
        }
        const defaultPhoto = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=600';
        const rec = await (0, db_1.query)(`INSERT INTO recommendations (user_id, place_name, country, category, rating, review, tips, estimated_cost, how_to_reach, best_time_to_visit, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, [
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
        ]);
        res.status(201).json({ recommendation: rec[0] });
    }
    catch (err) {
        console.error('Create recommendation error:', err.message);
        res.status(500).json({ message: 'Server error creating recommendation' });
    }
}
async function getRecommendations(req, res) {
    try {
        const userId = req.user?.id;
        const { category, country, search, username } = req.query;
        let recsQuery = `
      SELECT r.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture,
             (SELECT COUNT(*) FROM likes WHERE recommendation_id = r.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE recommendation_id = r.id) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND recommendation_id = r.id) as is_liked
      FROM recommendations r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
        const params = [userId];
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
        if (username) {
            recsQuery += ` AND u.username = $${paramIndex++}`;
            params.push(username);
        }
        recsQuery += ' ORDER BY r.created_at DESC';
        const recommendations = await (0, db_1.query)(recsQuery, params);
        res.json({ recommendations });
    }
    catch (err) {
        console.error('Get recommendations error:', err.message);
        res.status(500).json({ message: 'Server error retrieving recommendations' });
    }
}
// 2. Comments & Likes
async function toggleLike(req, res) {
    try {
        const userId = req.user?.id;
        const { trip_id, recommendation_id } = req.body;
        if (!trip_id && !recommendation_id) {
            return res.status(400).json({ message: 'Provide trip_id or recommendation_id' });
        }
        if (trip_id) {
            const existing = await (0, db_1.query)('SELECT id FROM likes WHERE user_id = $1 AND trip_id = $2', [userId, trip_id]);
            if (existing.length > 0) {
                await (0, db_1.query)('DELETE FROM likes WHERE user_id = $1 AND trip_id = $2', [userId, trip_id]);
                return res.json({ liked: false });
            }
            else {
                await (0, db_1.query)('INSERT INTO likes (user_id, trip_id) VALUES ($1, $2)', [userId, trip_id]);
                // Notify owner
                const trip = await (0, db_1.query)('SELECT user_id, title FROM trips WHERE id = $1', [trip_id]);
                if (trip.length > 0 && trip[0].user_id !== userId) {
                    const sender = await (0, db_1.query)('SELECT username, COALESCE(profile_picture, avatar_url, \'https://api.dicebear.com/7.x/adventurer/svg?seed=\' || username) AS profile_picture FROM users WHERE id = $1', [userId]);
                    const senderUsername = sender[0]?.username || req.user?.username;
                    const senderPic = sender[0]?.profile_picture || '';
                    await (0, notificationService_1.createNotification)(trip[0].user_id, 'like', {
                        message: `${senderUsername} liked your trip "${trip[0].title}".`,
                        sender_id: userId,
                        sender_username: senderUsername,
                        sender_profile_picture: senderPic,
                        trip_id,
                        trip_title: trip[0].title
                    });
                }
                return res.json({ liked: true });
            }
        }
        else {
            const existing = await (0, db_1.query)('SELECT id FROM likes WHERE user_id = $1 AND recommendation_id = $2', [userId, recommendation_id]);
            if (existing.length > 0) {
                await (0, db_1.query)('DELETE FROM likes WHERE user_id = $1 AND recommendation_id = $2', [userId, recommendation_id]);
                return res.json({ liked: false });
            }
            else {
                await (0, db_1.query)('INSERT INTO likes (user_id, recommendation_id) VALUES ($1, $2)', [userId, recommendation_id]);
                // Notify owner
                const rec = await (0, db_1.query)('SELECT user_id, place_name AS title FROM recommendations WHERE id = $1', [recommendation_id]);
                if (rec.length > 0 && rec[0].user_id !== userId) {
                    const sender = await (0, db_1.query)('SELECT username, COALESCE(profile_picture, avatar_url, \'https://api.dicebear.com/7.x/adventurer/svg?seed=\' || username) AS profile_picture FROM users WHERE id = $1', [userId]);
                    const senderUsername = sender[0]?.username || req.user?.username;
                    const senderPic = sender[0]?.profile_picture || '';
                    await (0, notificationService_1.createNotification)(rec[0].user_id, 'like', {
                        message: `${senderUsername} liked your recommendation "${rec[0].title}".`,
                        sender_id: userId,
                        sender_username: senderUsername,
                        sender_profile_picture: senderPic,
                        recommendation_id,
                        recommendation_title: rec[0].title
                    });
                }
                return res.json({ liked: true });
            }
        }
    }
    catch (err) {
        console.error('Toggle like error:', err.message);
        res.status(500).json({ message: 'Server error toggling like' });
    }
}
async function addComment(req, res) {
    try {
        const userId = req.user?.id;
        const { trip_id, recommendation_id, content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Comment content is required' });
        }
        const comment = await (0, db_1.query)(`INSERT INTO comments (user_id, trip_id, recommendation_id, content)
       VALUES ($1, $2, $3, $4) RETURNING *`, [userId, trip_id || null, recommendation_id || null, content]);
        // Join user info for returning
        const commentWithUser = await (0, db_1.query)(`SELECT c.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = $1`, [comment[0].id]);
        // Notify owner
        const sender = await (0, db_1.query)('SELECT username, COALESCE(profile_picture, avatar_url, \'https://api.dicebear.com/7.x/adventurer/svg?seed=\' || username) AS profile_picture FROM users WHERE id = $1', [userId]);
        const senderUsername = sender[0]?.username || req.user?.username;
        const senderPic = sender[0]?.profile_picture || '';
        if (trip_id) {
            const trip = await (0, db_1.query)('SELECT user_id, title FROM trips WHERE id = $1', [trip_id]);
            if (trip.length > 0 && trip[0].user_id !== userId) {
                await (0, notificationService_1.createNotification)(trip[0].user_id, 'comment', {
                    message: `${senderUsername} commented on your trip "${trip[0].title}": "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
                    sender_id: userId,
                    sender_username: senderUsername,
                    sender_profile_picture: senderPic,
                    trip_id,
                    trip_title: trip[0].title,
                    comment_content: content
                });
            }
        }
        else if (recommendation_id) {
            const rec = await (0, db_1.query)('SELECT user_id, place_name AS title FROM recommendations WHERE id = $1', [recommendation_id]);
            if (rec.length > 0 && rec[0].user_id !== userId) {
                await (0, notificationService_1.createNotification)(rec[0].user_id, 'comment', {
                    message: `${senderUsername} commented on your recommendation "${rec[0].title}": "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
                    sender_id: userId,
                    sender_username: senderUsername,
                    sender_profile_picture: senderPic,
                    recommendation_id,
                    recommendation_title: rec[0].title,
                    comment_content: content
                });
            }
        }
        res.status(201).json({ comment: commentWithUser[0] });
    }
    catch (err) {
        console.error('Add comment error:', err.message);
        res.status(500).json({ message: 'Server error adding comment' });
    }
}
async function getComments(req, res) {
    try {
        const { trip_id, recommendation_id } = req.query;
        let commentsQuery = `
      SELECT c.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
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
        const comments = await (0, db_1.query)(commentsQuery, params);
        res.json({ comments });
    }
    catch (err) {
        console.error('Get comments error:', err.message);
        res.status(500).json({ message: 'Server error retrieving comments' });
    }
}
// 3. Follow system
async function followUser(req, res) {
    try {
        const followerId = req.user?.id;
        const { userIdToFollow } = req.body;
        if (followerId === parseInt(userIdToFollow)) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }
        const check = await (0, db_1.query)('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, userIdToFollow]);
        if (check.length > 0) {
            return res.status(400).json({ message: 'Already following this user' });
        }
        await (0, db_1.query)('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [followerId, userIdToFollow]);
        // Add notification
        const sender = await (0, db_1.query)('SELECT username, COALESCE(profile_picture, avatar_url, \'https://api.dicebear.com/7.x/adventurer/svg?seed=\' || username) AS profile_picture FROM users WHERE id = $1', [followerId]);
        const senderUsername = sender[0]?.username || req.user?.username;
        const senderPic = sender[0]?.profile_picture || '';
        await (0, notificationService_1.createNotification)(userIdToFollow, 'follow', {
            message: `${senderUsername} started following you.`,
            sender_id: followerId,
            sender_username: senderUsername,
            sender_profile_picture: senderPic
        });
        res.json({ followed: true });
    }
    catch (err) {
        console.error('Follow error:', err.message);
        res.status(500).json({ message: 'Server error following user' });
    }
}
async function unfollowUser(req, res) {
    try {
        const followerId = req.user?.id;
        const { userIdToUnfollow } = req.body;
        await (0, db_1.query)('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, userIdToUnfollow]);
        // Clean up follow notification created by this follow relationship
        const targetUserId = parseInt(userIdToUnfollow);
        if (followerId && !isNaN(targetUserId)) {
            const likePattern = `%"sender_id":${followerId}%`;
            await (0, db_1.query)("DELETE FROM notifications WHERE user_id = $1 AND type = 'follow' AND content LIKE $2", [targetUserId, likePattern]);
        }
        res.json({ followed: false });
    }
    catch (err) {
        console.error('Unfollow error:', err.message);
        res.status(500).json({ message: 'Server error unfollowing user' });
    }
}
// 4. Social Feed
async function getActivityFeed(req, res) {
    try {
        const userId = req.user?.id;
        // Get followed users ids
        const following = await (0, db_1.query)('SELECT following_id FROM follows WHERE follower_id = $1', [userId]);
        const followingIds = following.map((f) => f.following_id);
        let feedTrips;
        let feedRecs;
        if (followingIds.length > 0) {
            // Fetch followed users trips and recommendations
            const placeholders = followingIds.map((_, i) => `$${i + 1}`).join(',');
            feedTrips = await (0, db_1.query)(`SELECT t.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture, 'trip' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE trip_id = t.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE trip_id = t.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $${followingIds.length + 1} AND trip_id = t.id) as is_liked
         FROM trips t
         JOIN users u ON t.user_id = u.id
         WHERE t.user_id IN (${placeholders}) AND t.status = 'past'
         ORDER BY t.created_at DESC LIMIT 10`, [...followingIds, userId]);
            feedRecs = await (0, db_1.query)(`SELECT r.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture, 'recommendation' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE recommendation_id = r.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE recommendation_id = r.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $${followingIds.length + 1} AND recommendation_id = r.id) as is_liked
         FROM recommendations r
         JOIN users u ON r.user_id = u.id
         WHERE r.user_id IN (${placeholders})
         ORDER BY r.created_at DESC LIMIT 10`, [...followingIds, userId]);
        }
        else {
            // Fallback: Show general public feed (all users, sorted by date)
            feedTrips = await (0, db_1.query)(`SELECT t.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture, 'trip' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE trip_id = t.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE trip_id = t.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND trip_id = t.id) as is_liked
         FROM trips t
         JOIN users u ON t.user_id = u.id
         WHERE t.status = 'past'
         ORDER BY t.created_at DESC LIMIT 10`, [userId]);
            feedRecs = await (0, db_1.query)(`SELECT r.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture, 'recommendation' as feed_type,
                (SELECT COUNT(*) FROM likes WHERE recommendation_id = r.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE recommendation_id = r.id) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND recommendation_id = r.id) as is_liked
         FROM recommendations r
         JOIN users u ON r.user_id = u.id
         ORDER BY r.created_at DESC LIMIT 10`, [userId]);
        }
        // Combine and sort feed
        const combinedFeed = [...feedTrips, ...feedRecs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        res.json({ feed: combinedFeed.slice(0, 15) });
    }
    catch (err) {
        console.error('Get feed error:', err.message);
        res.status(500).json({ message: 'Server error retrieving feed' });
    }
}
// 5. Global Search
async function searchEverything(req, res) {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        const searchQuery = `%${q}%`;
        // Search travelers
        const travelers = await (0, db_1.query)(`SELECT id, username, COALESCE(profile_picture, avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || username) AS profile_picture, home_country, bio 
       FROM users 
       WHERE LOWER(username) LIKE LOWER($1) OR LOWER(home_country) LIKE LOWER($1) LIMIT 10`, [searchQuery]);
        // Search destinations/trips
        const destinations = await (0, db_1.query)(`SELECT t.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture
       FROM trips t
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'past' AND (LOWER(t.country) LIKE LOWER($1) OR LOWER(t.city) LIKE LOWER($1))
       LIMIT 10`, [searchQuery]);
        res.json({ travelers, destinations });
    }
    catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ message: 'Server error executing search' });
    }
}
// 6. Travel Wishlist
async function getWishlist(req, res) {
    try {
        const userId = req.user?.id;
        const wishlist = await (0, db_1.query)('SELECT * FROM wishlists WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json({ wishlist });
    }
    catch (err) {
        console.error('Get wishlist error:', err.message);
        res.status(500).json({ message: 'Server error retrieving wishlist' });
    }
}
async function addToWishlist(req, res) {
    try {
        const userId = req.user?.id;
        const { type, name, country, notes } = req.body; // type: 'country', 'city', 'attraction'
        if (!type || !name) {
            return res.status(400).json({ message: 'Type and Name are required' });
        }
        const item = await (0, db_1.query)('INSERT INTO wishlists (user_id, type, name, country, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userId, type, name, country || '', notes || '']);
        // Sync to countries_visited if it is a wishlist country
        if (type === 'country') {
            const code = (0, tripController_1.getCountryCode)(name);
            try {
                await (0, db_1.query)(`INSERT INTO countries_visited (user_id, country_code, status) VALUES ($1, $2, 'wishlist')
           ON CONFLICT (user_id, country_code) DO UPDATE SET status = 'wishlist'`, [userId, code]);
            }
            catch (e) {
                // SQLite conflict ignore
                try {
                    const exist = await (0, db_1.query)('SELECT id FROM countries_visited WHERE user_id = $1 AND country_code = $2', [userId, code]);
                    if (exist.length === 0) {
                        await (0, db_1.query)('INSERT INTO countries_visited (user_id, country_code, status) VALUES ($1, $2, \'wishlist\')', [userId, code]);
                    }
                }
                catch (err) { }
            }
        }
        res.status(201).json({ item: item[0] });
    }
    catch (err) {
        console.error('Add wishlist error:', err.message);
        res.status(500).json({ message: 'Server error adding to wishlist' });
    }
}
async function removeFromWishlist(req, res) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const item = await (0, db_1.query)('SELECT * FROM wishlists WHERE id = $1 AND user_id = $2', [id, userId]);
        if (item.length === 0) {
            return res.status(404).json({ message: 'Item not found in wishlist' });
        }
        await (0, db_1.query)('DELETE FROM wishlists WHERE id = $1', [id]);
        // Also remove from map if it was a country wishlist
        if (item[0].type === 'country') {
            const code = (0, tripController_1.getCountryCode)(item[0].name);
            await (0, db_1.query)('DELETE FROM countries_visited WHERE user_id = $1 AND country_code = $2 AND status = \'wishlist\'', [userId, code]);
        }
        res.json({ message: 'Item removed from wishlist successfully' });
    }
    catch (err) {
        console.error('Remove wishlist error:', err.message);
        res.status(500).json({ message: 'Server error removing from wishlist' });
    }
}
// 7. Get Notifications
async function getNotifications(req, res) {
    try {
        const userId = req.user?.id;
        const notifications = await (0, db_1.query)('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
        const formattedNotifications = notifications.map(notif => ({
            ...notif,
            createdAt: notif.created_at
        }));
        res.json({ notifications: formattedNotifications });
    }
    catch (err) {
        console.error('Get notifications error:', err.message);
        res.status(500).json({ message: 'Server error retrieving notifications' });
    }
}
async function markNotificationRead(req, res) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        await (0, db_1.query)('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
        res.json({ message: 'Notification marked as read' });
    }
    catch (err) {
        console.error('Read notification error:', err.message);
        res.status(500).json({ message: 'Server error marking notification read' });
    }
}
async function markAllNotificationsRead(req, res) {
    try {
        const userId = req.user?.id;
        await (0, db_1.query)('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (err) {
        console.error('Mark all read error:', err.message);
        res.status(500).json({ message: 'Server error marking all notifications read' });
    }
}
async function deleteNotification(req, res) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        await (0, db_1.query)('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
        res.json({ message: 'Notification deleted' });
    }
    catch (err) {
        console.error('Delete notification error:', err.message);
        res.status(500).json({ message: 'Server error deleting notification' });
    }
}
async function deleteAllNotifications(req, res) {
    try {
        const userId = req.user?.id;
        await (0, db_1.query)('DELETE FROM notifications WHERE user_id = $1', [userId]);
        res.json({ message: 'All notifications cleared' });
    }
    catch (err) {
        console.error('Clear notifications error:', err.message);
        res.status(500).json({ message: 'Server error clearing notifications' });
    }
}
async function checkFollowStatus(req, res) {
    try {
        const followerId = req.user?.id;
        const { userId } = req.params;
        const check = await (0, db_1.query)('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, userId]);
        res.json({ isFollowing: check.length > 0 });
    }
    catch (err) {
        console.error('Check follow status error:', err.message);
        res.status(500).json({ message: 'Server error checking follow status' });
    }
}
async function getFollowersCount(req, res) {
    try {
        const { userId } = req.params;
        const countRes = await (0, db_1.query)('SELECT COUNT(*) as count FROM follows WHERE following_id = $1', [userId]);
        res.json({ count: parseInt(countRes[0]?.count || '0') });
    }
    catch (err) {
        console.error('Get followers count error:', err.message);
        res.status(500).json({ message: 'Server error retrieving followers count' });
    }
}
async function getFollowingCount(req, res) {
    try {
        const { userId } = req.params;
        const countRes = await (0, db_1.query)('SELECT COUNT(*) as count FROM follows WHERE follower_id = $1', [userId]);
        res.json({ count: parseInt(countRes[0]?.count || '0') });
    }
    catch (err) {
        console.error('Get following count error:', err.message);
        res.status(500).json({ message: 'Server error retrieving following count' });
    }
}
async function getFollowersList(req, res) {
    try {
        const { userId } = req.params;
        const followers = await (0, db_1.query)(`SELECT u.id, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture, u.home_country, u.bio
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1`, [userId]);
        res.json({ followers });
    }
    catch (err) {
        console.error('Get followers list error:', err.message);
        res.status(500).json({ message: 'Server error retrieving followers list' });
    }
}
async function getFollowingList(req, res) {
    try {
        const { userId } = req.params;
        const following = await (0, db_1.query)(`SELECT u.id, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture, u.home_country, u.bio
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1`, [userId]);
        res.json({ following });
    }
    catch (err) {
        console.error('Get following list error:', err.message);
        res.status(500).json({ message: 'Server error retrieving following list' });
    }
}
