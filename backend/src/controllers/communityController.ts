import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

// Categories checklist
const VALID_CATEGORIES = [
  'Trekking',
  'Backpacking',
  'Road Trips',
  'Solo Travel',
  'Adventure',
  'International Travel',
  'Photography',
  'Food Exploration'
];

// Helper to notify mentioned users
async function handleMentions(content: string, senderId: number, senderUsername: string, sourceDetails: { type: 'post' | 'comment', communityId: number, communityName: string, id: number }) {
  try {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return;

    // Extract unique usernames
    const usernames = Array.from(new Set(matches.map(m => m.substring(1))));

    for (const username of usernames) {
      if (username === senderUsername) continue;

      // Find user
      const userRes = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (userRes.length === 0) continue;
      const targetUserId = userRes[0].id;

      // Get sender details
      const senderRes = await query('SELECT COALESCE(profile_picture, avatar_url) as pic FROM users WHERE id = $1', [senderId]);
      const senderPic = senderRes[0]?.pic || '';

      const msg = sourceDetails.type === 'post'
        ? `${senderUsername} mentioned you in a post in "${sourceDetails.communityName}".`
        : `${senderUsername} mentioned you in a comment in "${sourceDetails.communityName}".`;

      await createNotification(targetUserId, 'mention', {
        message: msg,
        sender_id: senderId,
        sender_username: senderUsername,
        sender_profile_picture: senderPic,
        community_id: sourceDetails.communityId,
        community_name: sourceDetails.communityName,
        source_type: sourceDetails.type,
        source_id: sourceDetails.id
      });
    }
  } catch (err: any) {
    console.error('Error handling mentions:', err.message);
  }
}

// 1. Create Community
export async function createCommunity(req: AuthRequest, res: Response) {
  try {
    const creatorId = req.user?.id;
    const { name, description, category, destination, rules, requires_approval } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Community name and category are required' });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid community category' });
    }

    // Check if name is already taken
    const existing = await query('SELECT id FROM communities WHERE LOWER(name) = LOWER($1)', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A community with this name already exists' });
    }

    // Check for cover image file upload or fallback body URL
    let coverImage = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600';
    if (req.file) {
      coverImage = `http://localhost:5000/uploads/${req.file.filename}`;
    } else if (req.body.cover_image) {
      coverImage = req.body.cover_image;
    }

    const approvalRequired = requires_approval === 'true' || requires_approval === true ? 1 : 0;

    const commResult = await query(
      `INSERT INTO communities (name, cover_image, description, category, destination, rules, creator_id, requires_approval)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        name,
        coverImage,
        description || '',
        category,
        destination || '',
        rules || '',
        creatorId,
        approvalRequired
      ]
    );

    const community = commResult[0];

    // Automatically make creator the Admin and accepted member
    await query(
      'INSERT INTO community_members (community_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
      [community.id, creatorId, 'admin', 'accepted']
    );

    res.status(201).json({ community });
  } catch (err: any) {
    console.error('Create community error:', err.message);
    res.status(500).json({ message: 'Server error creating community' });
  }
}

// 2. Get Communities with Filter/Search/Membership details
export async function getCommunities(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { category, destination, search, my } = req.query;

    let sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'accepted') as member_count,
             u.username as creator_username,
             cm.role as user_role,
             cm.status as membership_status
      FROM communities c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = $1
      WHERE 1=1
    `;

    const params: any[] = [userId];
    let paramIdx = 2;

    if (my === 'true') {
      sql += ` AND cm.user_id = $1 AND cm.status = 'accepted'`;
    }

    if (category) {
      sql += ` AND c.category = $${paramIdx++}`;
      params.push(category);
    }

    if (destination) {
      sql += ` AND LOWER(c.destination) LIKE LOWER($${paramIdx++})`;
      params.push(`%${destination}%`);
    }

    if (search) {
      sql += ` AND (LOWER(c.name) LIKE LOWER($${paramIdx}) OR LOWER(c.description) LIKE LOWER($${paramIdx}))`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY c.name ASC';

    const communities = await query(sql, params);
    res.json({ communities });
  } catch (err: any) {
    console.error('Get communities error:', err.message);
    res.status(500).json({ message: 'Server error retrieving communities' });
  }
}

// 3. Get Single Community Profile details
export async function getCommunityDetails(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const communityId = parseInt(req.params.id);

    if (isNaN(communityId)) {
      return res.status(400).json({ message: 'Invalid community ID' });
    }

    const comms = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'accepted') as member_count,
              u.username as creator_username,
              cm.role as user_role,
              cm.status as membership_status
       FROM communities c
       LEFT JOIN users u ON c.creator_id = u.id
       LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = $1
       WHERE c.id = $2`,
      [userId, communityId]
    );

    if (comms.length === 0) {
      return res.status(404).json({ message: 'Community not found' });
    }

    res.json({ community: comms[0] });
  } catch (err: any) {
    console.error('Get community details error:', err.message);
    res.status(500).json({ message: 'Server error retrieving community details' });
  }
}

// 4. Join Community
export async function joinCommunity(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const communityId = parseInt(req.params.id);

    const community = await query('SELECT creator_id, name, requires_approval FROM communities WHERE id = $1', [communityId]);
    if (community.length === 0) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const existing = await query('SELECT status FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Already requested or joined. Status: ${existing[0].status}` });
    }

    const approvalRequired = Boolean(community[0].requires_approval === 1 || community[0].requires_approval === true);
    const status = approvalRequired ? 'pending' : 'accepted';

    await query(
      'INSERT INTO community_members (community_id, user_id, status) VALUES ($1, $2, $3)',
      [communityId, userId, status]
    );

    // If approval required, notify Admin
    if (approvalRequired && community[0].creator_id) {
      const senderRes = await query('SELECT COALESCE(profile_picture, avatar_url) as pic FROM users WHERE id = $1', [userId]);
      const senderPic = senderRes[0]?.pic || '';

      await createNotification(community[0].creator_id, 'community', {
        message: `${req.user?.username} requested to join your community "${community[0].name}".`,
        sender_id: userId,
        sender_username: req.user?.username,
        sender_profile_picture: senderPic,
        community_id: communityId,
        community_name: community[0].name,
        action_required: true
      });
    }

    res.json({ status, message: approvalRequired ? 'Join request sent to admin' : 'Successfully joined community' });
  } catch (err: any) {
    console.error('Join community error:', err.message);
    res.status(500).json({ message: 'Server error joining community' });
  }
}

// 5. Leave Community
export async function leaveCommunity(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const communityId = parseInt(req.params.id);

    const mem = await query('SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
    if (mem.length === 0) {
      return res.status(400).json({ message: 'You are not a member of this community' });
    }

    if (mem[0].role === 'admin') {
      // Creator leaves: Check if they are the only admin and if they can pass admin status or just let them leave
      // For simplicity, we delete but notify they were the admin.
    }

    await query('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
    res.json({ message: 'Successfully left community' });
  } catch (err: any) {
    console.error('Leave community error:', err.message);
    res.status(500).json({ message: 'Server error leaving community' });
  }
}

// 6. Get Pending Join Requests (Admin Only)
export async function getCommunityRequests(req: AuthRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    const communityId = parseInt(req.params.id);

    const adminCheck = await query(
      `SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2 AND role = 'admin' AND status = 'accepted'`,
      [communityId, adminId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ message: 'Only community admins can view requests' });
    }

    const requests = await query(
      `SELECT cm.*, u.username, COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1 AND cm.status = 'pending'`,
      [communityId]
    );

    res.json({ requests });
  } catch (err: any) {
    console.error('Get requests error:', err.message);
    res.status(500).json({ message: 'Server error retrieving requests' });
  }
}

// 7. Handle Join Request (Approve/Decline)
export async function handleJoinRequest(req: AuthRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    const communityId = parseInt(req.params.id);
    const { userId, action } = req.body; // action: 'approve' or 'decline'

    if (!userId || !action) {
      return res.status(400).json({ message: 'Missing userId or action' });
    }

    const adminCheck = await query(
      `SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2 AND role = 'admin' AND status = 'accepted'`,
      [communityId, adminId]
    );

    if (adminCheck.length === 0) {
      return res.status(403).json({ message: 'Only community admins can approve/decline requests' });
    }

    const community = await query('SELECT name FROM communities WHERE id = $1', [communityId]);
    const communityName = community[0]?.name || 'the community';

    if (action === 'approve') {
      await query(
        `UPDATE community_members SET status = 'accepted' WHERE community_id = $1 AND user_id = $2`,
        [communityId, userId]
      );

      // Notify user
      await createNotification(userId, 'community', {
        message: `Your request to join "${communityName}" has been approved! 🎉`,
        community_id: communityId,
        community_name: communityName
      });

      res.json({ message: 'Request approved successfully' });
    } else {
      await query(
        `DELETE FROM community_members WHERE community_id = $1 AND user_id = $2 AND status = 'pending'`,
        [communityId, userId]
      );

      // Notify user
      await createNotification(userId, 'community', {
        message: `Your request to join "${communityName}" was declined.`,
        community_id: communityId,
        community_name: communityName
      });

      res.json({ message: 'Request declined successfully' });
    }
  } catch (err: any) {
    console.error('Handle request error:', err.message);
    res.status(500).json({ message: 'Server error handling request' });
  }
}

// 8. Get Community Feed Posts
export async function getCommunityPosts(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const communityId = parseInt(req.params.id);

    // Verify user is an accepted member
    const memberCheck = await query(
      'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [communityId, userId]
    );
    if (memberCheck.length === 0) {
      return res.status(403).json({ message: 'Only community members can view the feed' });
    }

    const posts = await query(
      `SELECT cp.*, u.username,
              COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture,
              (SELECT COUNT(*) FROM community_likes WHERE post_id = cp.id) as likes_count,
              (SELECT COUNT(*) FROM community_comments WHERE post_id = cp.id) as comments_count,
              EXISTS(SELECT 1 FROM community_likes WHERE post_id = cp.id AND user_id = $1) as is_liked
       FROM community_posts cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.community_id = $2
       ORDER BY cp.created_at DESC`,
      [userId, communityId]
    );

    res.json({ posts });
  } catch (err: any) {
    console.error('Get community posts error:', err.message);
    res.status(500).json({ message: 'Server error retrieving feed' });
  }
}

// 9. Create Community Post
export async function createCommunityPost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const communityId = parseInt(req.params.id);
    const { title, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    // Verify user is a member
    const memberCheck = await query(
      'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [communityId, userId]
    );
    if (memberCheck.length === 0) {
      return res.status(403).json({ message: 'Only community members can post' });
    }

    // Photo check (upload or url text)
    let photoUrl = null;
    if (req.file) {
      photoUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    } else if (req.body.photo_url) {
      photoUrl = req.body.photo_url;
    }

    const postRes = await query(
      `INSERT INTO community_posts (community_id, user_id, title, content, photo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [communityId, userId, title || '', content, photoUrl]
    );

    const post = postRes[0];

    // Get community details for mentions
    const community = await query('SELECT name FROM communities WHERE id = $1', [communityId]);
    const communityName = community[0]?.name || 'the community';

    // Parse and handle mentions
    if (req.user?.username) {
      await handleMentions(content, userId!, req.user.username, {
        type: 'post',
        communityId,
        communityName,
        id: post.id
      });
    }

    // Get return post item with author details
    const formattedPost = await query(
      `SELECT cp.*, u.username,
              COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture,
              0 as likes_count,
              0 as comments_count,
              0 as is_liked
       FROM community_posts cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.id = $1`,
      [post.id]
    );

    res.status(201).json({ post: formattedPost[0] });
  } catch (err: any) {
    console.error('Create community post error:', err.message);
    res.status(500).json({ message: 'Server error creating post' });
  }
}

// 10. Toggle Community Post Like
export async function toggleCommunityPostLike(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const postId = parseInt(req.params.postId);

    // Verify post exists
    const post = await query(
      'SELECT cp.*, c.name as community_name FROM community_posts cp JOIN communities c ON cp.community_id = c.id WHERE cp.id = $1',
      [postId]
    );
    if (post.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existing = await query('SELECT id FROM community_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);

    if (existing.length > 0) {
      await query('DELETE FROM community_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      res.json({ liked: false });
    } else {
      await query('INSERT INTO community_likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);

      // Notify author
      if (post[0].user_id !== userId) {
        const senderRes = await query('SELECT COALESCE(profile_picture, avatar_url) as pic FROM users WHERE id = $1', [userId]);
        const senderPic = senderRes[0]?.pic || '';

        await createNotification(post[0].user_id, 'community', {
          message: `${req.user?.username} liked your post in "${post[0].community_name}".`,
          sender_id: userId,
          sender_username: req.user?.username,
          sender_profile_picture: senderPic,
          community_id: post[0].community_id,
          community_name: post[0].community_name,
          post_id: postId
        });
      }

      res.json({ liked: true });
    }
  } catch (err: any) {
    console.error('Toggle post like error:', err.message);
    res.status(500).json({ message: 'Server error toggling like' });
  }
}

// 11. Add Post Comment
export async function addCommunityPostComment(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const postId = parseInt(req.params.postId);
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await query(
      'SELECT cp.*, c.name as community_name FROM community_posts cp JOIN communities c ON cp.community_id = c.id WHERE cp.id = $1',
      [postId]
    );
    if (post.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const commentRes = await query(
      `INSERT INTO community_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [postId, userId, content]
    );
    const comment = commentRes[0];

    // Notify post owner
    if (post[0].user_id !== userId) {
      const senderRes = await query('SELECT COALESCE(profile_picture, avatar_url) as pic FROM users WHERE id = $1', [userId]);
      const senderPic = senderRes[0]?.pic || '';

      await createNotification(post[0].user_id, 'community', {
        message: `${req.user?.username} commented on your post in "${post[0].community_name}": "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
        sender_id: userId,
        sender_username: req.user?.username,
        sender_profile_picture: senderPic,
        community_id: post[0].community_id,
        community_name: post[0].community_name,
        post_id: postId,
        comment_id: comment.id
      });
    }

    // Parse and handle mentions
    if (req.user?.username) {
      await handleMentions(content, userId!, req.user.username, {
        type: 'comment',
        communityId: post[0].community_id,
        communityName: post[0].community_name,
        id: comment.id
      });
    }

    // Return comment with user details
    const formattedComment = await query(
      `SELECT cc.*, u.username,
              COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture
       FROM community_comments cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.id = $1`,
      [comment.id]
    );

    res.status(201).json({ comment: formattedComment[0] });
  } catch (err: any) {
    console.error('Add post comment error:', err.message);
    res.status(500).json({ message: 'Server error adding comment' });
  }
}

// 12. Get Post Comments
export async function getCommunityPostComments(req: AuthRequest, res: Response) {
  try {
    const postId = parseInt(req.params.postId);

    const comments = await query(
      `SELECT cc.*, u.username,
              COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture
       FROM community_comments cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.post_id = $1
       ORDER BY cc.created_at ASC`,
      [postId]
    );

    res.json({ comments });
  } catch (err: any) {
    console.error('Get comments error:', err.message);
    res.status(500).json({ message: 'Server error retrieving comments' });
  }
}

// 13. Get Community Members
export async function getCommunityMembers(req: AuthRequest, res: Response) {
  try {
    const communityId = parseInt(req.params.id);

    const members = await query(
      `SELECT cm.role, cm.status, cm.created_at, u.id as user_id, u.username,
              COALESCE(u.profile_picture, u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) AS profile_picture,
              u.bio
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1 AND cm.status = 'accepted'
       ORDER BY cm.role DESC, cm.created_at ASC`,
      [communityId]
    );

    res.json({ members });
  } catch (err: any) {
    console.error('Get members error:', err.message);
    res.status(500).json({ message: 'Server error retrieving members' });
  }
}

// 14. Get Community Photo Gallery
export async function getCommunityPhotos(req: AuthRequest, res: Response) {
  try {
    const communityId = parseInt(req.params.id);

    const photos = await query(
      `SELECT cp.id as post_id, cp.photo_url, cp.content as caption, cp.created_at, cp.user_id, u.username
       FROM community_posts cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.community_id = $1 AND cp.photo_url IS NOT NULL AND cp.photo_url != ''
       ORDER BY cp.created_at DESC`,
      [communityId]
    );

    res.json({ photos });
  } catch (err: any) {
    console.error('Get community photos error:', err.message);
    res.status(500).json({ message: 'Server error retrieving community photos' });
  }
}
