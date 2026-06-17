import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

export function parseDbDate(dateString: any): Date | null {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  let date = new Date(dateString);
  if (typeof dateString === 'string' && !dateString.includes('T') && !dateString.endsWith('Z')) {
    const formatted = dateString.replace(' ', 'T') + 'Z';
    const parsedDate = new Date(formatted);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
    }
  }
  return date;
}

export function isUserOnline(lastSeenStr: any): boolean {
  const lastSeen = parseDbDate(lastSeenStr);
  if (!lastSeen) return false;
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  return diffMs >= 0 && diffMs < 15000; // 15 seconds
}


// Fetch or create a conversation
export async function createOrGetConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { recipientId } = req.body;
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    if (userId === Number(recipientId)) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    // Sort user IDs to enforce user1_id < user2_id
    const user1 = Math.min(userId, Number(recipientId));
    const user2 = Math.max(userId, Number(recipientId));

    // Check if exists
    const existing = await query(
      'SELECT * FROM conversations WHERE user1_id = $1 AND user2_id = $2',
      [user1, user2]
    );

    if (existing.length > 0) {
      return res.json({ conversation: existing[0] });
    }

    // Create new
    const created = await query(
      'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING *',
      [user1, user2]
    );

    return res.status(201).json({ conversation: created[0] });
  } catch (err: any) {
    console.error('Create/get conversation error:', err.message);
    res.status(500).json({ message: 'Server error creating conversation' });
  }
}

// Get all conversations with last message and unread count
export async function getConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Retrieve conversation records involving the current user
    const list = await query(
      'SELECT * FROM conversations WHERE user1_id = $1 OR user2_id = $2 ORDER BY created_at DESC',
      [userId, userId]
    );

    const conversations = [];

    for (const c of list) {
      const recipientId = c.user1_id === userId ? c.user2_id : c.user1_id;

      // Get recipient info
      const recipients = await query(
        `SELECT id, username, last_seen, 
         CASE WHEN profile_picture IS NOT NULL AND profile_picture != '' THEN profile_picture ELSE COALESCE(avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || username) END AS profile_picture 
         FROM users WHERE id = $1`,
        [recipientId]
      );

      if (recipients.length === 0) continue;
      const recipient = {
        id: recipients[0].id,
        username: recipients[0].username,
        profile_picture: recipients[0].profile_picture,
        last_seen: recipients[0].last_seen,
        is_online: isUserOnline(recipients[0].last_seen)
      };

      // Get last message
      const lastMessages = await query(
        'SELECT message_text, created_at, sender_id FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
        [c.id]
      );
      const lastMessage = lastMessages.length > 0 ? lastMessages[0] : undefined;

      // Get unread count (messages sent by recipient to this user that are not read)
      const unread = await query(
        'SELECT COUNT(*) AS count FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND is_read = 0',
        [c.id, recipientId]
      );
      // sqlite returns { "count": X }, postgres returns { "count": "X" }
      const unreadCount = unread.length > 0 ? Number(unread[0].count) : 0;

      conversations.push({
        id: c.id,
        user1_id: c.user1_id,
        user2_id: c.user2_id,
        recipient,
        lastMessage,
        unreadCount,
        created_at: c.created_at
      });
    }

    // Sort by last message created_at, fallback to conversation created_at
    conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
      return timeB - timeA;
    });

    res.json({ conversations });
  } catch (err: any) {
    console.error('Get conversations error:', err.message);
    res.status(500).json({ message: 'Server error retrieving conversations' });
  }
}

// Get message history in conversation
export async function getConversationMessages(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;

    // Verify user is in conversation
    const conv = await query(
      'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $3)',
      [id, userId, userId]
    );

    if (conv.length === 0) {
      return res.status(403).json({ message: 'Unauthorized access to this conversation' });
    }

    // Retrieve messages joined with users to get latest username and profile picture
    const messages = await query(
      `SELECT m.*, u.username AS sender_username, 
       CASE WHEN u.profile_picture IS NOT NULL AND u.profile_picture != '' THEN u.profile_picture ELSE COALESCE(u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) END AS sender_profile_picture 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.conversation_id = $1 
       ORDER BY m.created_at ASC`,
      [id]
    );

    // Mark messages sent by recipient as read
    const recipientId = conv[0].user1_id === userId ? conv[0].user2_id : conv[0].user1_id;
    await query(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = $1 AND sender_id = $2 AND is_read = 0',
      [id, recipientId]
    );

    res.json({ messages });
  } catch (err: any) {
    console.error('Get conversation messages error:', err.message);
    res.status(500).json({ message: 'Server error retrieving messages' });
  }
}

// Send message in conversation
export async function sendConversationMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    const { message_text } = req.body;

    if (!message_text) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    // Verify user is in conversation
    const conv = await query(
      'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $3)',
      [id, userId, userId]
    );

    if (conv.length === 0) {
      return res.status(403).json({ message: 'Unauthorized to post to this conversation' });
    }

    // Create message
    const inserted = await query(
      'INSERT INTO messages (conversation_id, sender_id, message_text, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, message_text, 'text']
    );
    const message = inserted[0];

    // Recipient user ID
    const recipientId = conv[0].user1_id === userId ? conv[0].user2_id : conv[0].user1_id;

    // Send notification
    const sender = await query(
      `SELECT username, CASE WHEN profile_picture IS NOT NULL AND profile_picture != '' THEN profile_picture ELSE COALESCE(avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || username) END AS profile_picture 
       FROM users WHERE id = $1`,
      [userId]
    );
    const senderName = sender[0]?.username || 'A traveler';
    const senderPic = sender[0]?.profile_picture || '';

    const content = {
      message: `${senderName}: ${message_text.substring(0, 50)}${message_text.length > 50 ? '...' : ''}`,
      sender_id: userId,
      sender_username: senderName,
      sender_profile_picture: senderPic,
      conversation_id: Number(id),
      message_text: message_text
    };

    // await createNotification(recipientId, 'direct_message', content);

    res.status(201).json({ message });
  } catch (err: any) {
    console.error('Send direct message error:', err.message);
    res.status(500).json({ message: 'Server error sending message' });
  }
}

// Get message history in group chat
export async function getGroupMessages(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;

    // Verify accepted member of group
    const membership = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [id, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'Unauthorized to view group messages' });
    }

    // Retrieve messages
    const messages = await query(
      `SELECT m.*, u.username AS sender_username, 
       CASE WHEN u.profile_picture IS NOT NULL AND u.profile_picture != '' THEN u.profile_picture ELSE COALESCE(u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) END AS sender_profile_picture 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.group_id = $1 
       ORDER BY m.created_at ASC`,
      [id]
    );

    res.json({ messages });
  } catch (err: any) {
    console.error('Get group messages error:', err.message);
    res.status(500).json({ message: 'Server error retrieving group messages' });
  }
}

// Send message in group chat
export async function sendGroupMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    const { message_text } = req.body;

    if (!message_text) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    // Verify membership
    const membership = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [id, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ message: 'Unauthorized to post to this group' });
    }

    // Create message
    const inserted = await query(
      'INSERT INTO messages (group_id, sender_id, message_text, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, message_text, 'text']
    );
    const message = inserted[0];

    // Notify other accepted group members
    const sender = await query(
      `SELECT username, CASE WHEN profile_picture IS NOT NULL AND profile_picture != '' THEN profile_picture ELSE COALESCE(avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || username) END AS profile_picture 
       FROM users WHERE id = $1`,
      [userId]
    );
    const senderName = sender[0]?.username || 'A traveler';
    const senderPic = sender[0]?.profile_picture || '';

    const group = await query('SELECT name FROM travel_groups WHERE id = $1', [id]);
    const groupName = group[0]?.name || 'travel group';

    const members = await query(
      'SELECT user_id FROM group_members WHERE group_id = $1 AND status = \'accepted\' AND user_id != $2',
      [id, userId]
    );

    const content = {
      message: `[${groupName}] ${senderName}: ${message_text.substring(0, 40)}${message_text.length > 40 ? '...' : ''}`,
      sender_id: userId,
      sender_username: senderName,
      sender_profile_picture: senderPic,
      group_id: Number(id),
      group_name: groupName,
      message_text: message_text
    };

    /* for (const m of members) {
      await createNotification(m.user_id, 'group_message', content);
    } */

    res.status(201).json({ message: message });
  } catch (err: any) {
    console.error('Send group message error:', err.message);
    res.status(500).json({ message: 'Server error sending group message' });
  }
}

// Unsend message
export async function unsendMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;

    // Find the message
    const messageResult = await query('SELECT * FROM messages WHERE id = $1', [id]);
    if (messageResult.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }
    const message = messageResult[0];

    // Only the sender can unsend
    if (message.sender_id !== userId) {
      return res.status(403).json({ message: 'You can only unsend your own messages' });
    }

    // Update message text and type to placeholder
    await query(
      "UPDATE messages SET message_text = 'This message was unsent.', message_type = 'unsent' WHERE id = $1",
      [id]
    );

    res.json({ message: { ...message, message_text: 'This message was unsent.', message_type: 'unsent' } });
  } catch (err: any) {
    console.error('Unsend message error:', err.message);
    res.status(500).json({ message: 'Server error unsending message' });
  }
}

// Get count of unread chats
export async function getUnreadChatCount(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await query(
      `SELECT COUNT(*) AS count FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE (c.user1_id = $1 OR c.user2_id = $2)
         AND m.sender_id != $3
         AND m.is_read = 0`,
      [userId, userId, userId]
    );

    const count = result.length > 0 ? Number(result[0].count) : 0;
    return res.json({ count });
  } catch (err: any) {
    console.error('Get unread chat count error:', err.message);
    res.status(500).json({ message: 'Server error retrieving unread count' });
  }
}

