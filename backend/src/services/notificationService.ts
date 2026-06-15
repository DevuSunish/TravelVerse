import { query } from '../config/db';

export async function createNotification(userId: number, type: string, contentJson: object) {
  try {
    const content = JSON.stringify(contentJson);
    await query(
      'INSERT INTO notifications (user_id, type, content) VALUES ($1, $2, $3)',
      [userId, type, content]
    );
  } catch (err: any) {
    console.error('Error creating notification:', err.message);
  }
}

export async function notifyGroupMembers(groupId: number, senderId: number, message: string, extraData: any = {}) {
  try {
    // Get all accepted members in group who are NOT the sender
    const members = await query(
      'SELECT user_id FROM group_members WHERE group_id = $1 AND status = \'accepted\' AND user_id != $2',
      [groupId, senderId]
    );
    if (members.length === 0) return;

    // Get group name
    const group = await query('SELECT name FROM travel_groups WHERE id = $1', [groupId]);
    const groupName = group[0]?.name || 'a travel group';

    // Get sender username and profile picture
    const sender = await query('SELECT username, profile_picture FROM users WHERE id = $1', [senderId]);
    const senderUsername = sender[0]?.username || 'A traveler';
    const senderPic = sender[0]?.profile_picture || '';

    const content = {
      message,
      sender_id: senderId,
      sender_username: senderUsername,
      sender_profile_picture: senderPic,
      group_id: groupId,
      group_name: groupName,
      ...extraData
    };

    for (const member of members) {
      await createNotification(member.user_id, 'collab', content);
    }
  } catch (err: any) {
    console.error('Error notifying group members:', err.message);
  }
}
