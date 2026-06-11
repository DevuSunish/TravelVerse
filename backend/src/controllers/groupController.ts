import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export async function createGroup(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Insert group
    const groups = await query(
      'INSERT INTO travel_groups (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    const group = groups[0];

    // Add creator as Admin
    await query(
      'INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
      [group.id, userId, 'admin', 'accepted']
    );

    res.status(201).json({ group });
  } catch (err: any) {
    console.error('Create group error:', err.message);
    res.status(500).json({ message: 'Server error creating group' });
  }
}

export async function getGroups(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    // Get active groups
    const activeGroups = await query(
      `SELECT g.*, m.role, m.status 
       FROM travel_groups g
       JOIN group_members m ON g.id = m.group_id
       WHERE m.user_id = $1 AND m.status = 'accepted'
       ORDER BY g.created_at DESC`,
      [userId]
    );

    // Get pending invitations
    const pendingInvites = await query(
      `SELECT g.*, m.role, m.status 
       FROM travel_groups g
       JOIN group_members m ON g.id = m.group_id
       WHERE m.user_id = $1 AND m.status = 'pending'
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.json({ groups: activeGroups, invitations: pendingInvites });
  } catch (err: any) {
    console.error('Get groups error:', err.message);
    res.status(500).json({ message: 'Server error retrieving groups' });
  }
}

export async function inviteMember(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { groupId, usernameToInvite } = req.body;

    // Verify current user is admin/member of group
    const membership = await query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [groupId, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ message: 'Unauthorized to invite members to this group' });
    }

    // Find the user to invite
    const users = await query('SELECT id FROM users WHERE username = $1', [usernameToInvite]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User to invite not found' });
    }
    const inviteeId = users[0].id;

    // Check if user is already a member
    const existing = await query(
      'SELECT status FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, inviteeId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: `User already has member status: ${existing[0].status}` });
    }

    // Add invitation
    await query(
      'INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
      [groupId, inviteeId, 'member', 'pending']
    );

    // Create a notification for the invited user
    await query(
      'INSERT INTO notifications (user_id, type, content) VALUES ($1, $2, $3)',
      [inviteeId, 'group_invite', `You have been invited to join the travel group by ${req.user?.username}.`]
    );

    res.json({ message: 'Invitation sent successfully' });
  } catch (err: any) {
    console.error('Invite member error:', err.message);
    res.status(500).json({ message: 'Server error sending invitation' });
  }
}

export async function respondToInvitation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { groupId, accept } = req.body; // boolean

    const status = accept ? 'accepted' : 'declined';

    const check = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'pending\'',
      [groupId, userId]
    );
    if (check.length === 0) {
      return res.status(404).json({ message: 'No pending invitation found for this group' });
    }

    if (accept) {
      await query(
        'UPDATE group_members SET status = \'accepted\' WHERE group_id = $1 AND user_id = $2',
        [groupId, userId]
      );
    } else {
      await query(
        'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, userId]
      );
    }

    res.json({ message: `Invitation ${status} successfully` });
  } catch (err: any) {
    console.error('Respond invitation error:', err.message);
    res.status(500).json({ message: 'Server error responding to invitation' });
  }
}

export async function getGroupDetails(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Verify membership
    const membership = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [id, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ message: 'Unauthorized to view this group details' });
    }

    // Get group info
    const groups = await query('SELECT * FROM travel_groups WHERE id = $1', [id]);
    const group = groups[0];

    // Get members
    const members = await query(
      `SELECT u.id, u.username, u.profile_picture, u.home_country, m.role, m.status 
       FROM users u
       JOIN group_members m ON u.id = m.user_id
       WHERE m.group_id = $1`,
      [id]
    );

    // Get group itineraries
    const itineraries = await query(
      'SELECT * FROM itineraries WHERE group_id = $1 ORDER BY day_number ASC',
      [id]
    );

    // Get group activities
    const activities = await query(
      'SELECT * FROM activities WHERE group_id = $1 ORDER BY start_time ASC',
      [id]
    );

    // Get group expenses
    const expenses = await query(
      `SELECT e.*, u.username as paid_by_username 
       FROM expenses e
       JOIN users u ON e.paid_by_user_id = u.id
       WHERE e.group_id = $1 ORDER BY e.created_at DESC`,
      [id]
    );

    res.json({
      group,
      members,
      itineraries,
      activities,
      expenses
    });
  } catch (err: any) {
    console.error('Get group details error:', err.message);
    res.status(500).json({ message: 'Server error retrieving group details' });
  }
}

export async function voteOnActivity(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { activityId } = req.body;

    // Increment votes
    const updated = await query(
      'UPDATE activities SET votes_count = votes_count + 1 WHERE id = $1 RETURNING *',
      [activityId]
    );

    if (updated.length === 0) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    res.json({ activity: updated[0] });
  } catch (err: any) {
    console.error('Vote activity error:', err.message);
    res.status(500).json({ message: 'Server error casting vote' });
  }
}

export async function createGroupItinerary(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { groupId, day_number, date, notes } = req.body;

    // Check membership
    const membership = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [groupId, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const check = await query('SELECT id FROM itineraries WHERE group_id = $1 AND day_number = $2', [groupId, day_number]);
    let itinerary;
    if (check.length > 0) {
      itinerary = await query(
        'UPDATE itineraries SET date = $1, notes = $2 WHERE group_id = $3 AND day_number = $4 RETURNING *',
        [date, notes, groupId, day_number]
      );
    } else {
      itinerary = await query(
        'INSERT INTO itineraries (group_id, day_number, date, notes) VALUES ($1, $2, $3, $4) RETURNING *',
        [groupId, day_number, date, notes]
      );
    }

    res.json({ itinerary: itinerary[0] });
  } catch (err: any) {
    console.error('Create group itinerary error:', err.message);
    res.status(500).json({ message: 'Server error saving group itinerary' });
  }
}

export async function createGroupActivity(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { groupId, title, description, start_time, end_time, cost } = req.body;

    const membership = await query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'',
      [groupId, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const activity = await query(
      `INSERT INTO activities (group_id, title, description, start_time, end_time, cost, votes_count)
       VALUES ($1, $2, $3, $4, $5, $6, 0) RETURNING *`,
      [groupId, title, description || '', start_time || null, end_time || null, cost || 0.00]
    );

    res.status(201).json({ activity: activity[0] });
  } catch (err: any) {
    console.error('Create group activity error:', err.message);
    res.status(500).json({ message: 'Server error adding group activity' });
  }
}
