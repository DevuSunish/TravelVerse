"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroup = createGroup;
exports.getGroups = getGroups;
exports.inviteMember = inviteMember;
exports.respondToInvitation = respondToInvitation;
exports.getGroupDetails = getGroupDetails;
exports.voteOnActivity = voteOnActivity;
exports.createGroupItinerary = createGroupItinerary;
exports.createGroupActivity = createGroupActivity;
exports.updateGroup = updateGroup;
exports.removeGroupMember = removeGroupMember;
exports.leaveGroup = leaveGroup;
const db_1 = require("../config/db");
const notificationService_1 = require("../services/notificationService");
const chatController_1 = require("./chatController");
async function createGroup(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { name, description, cover_image, members } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        // Insert group
        const groups = await (0, db_1.query)('INSERT INTO travel_groups (name, description, cover_image) VALUES ($1, $2, $3) RETURNING *', [name, description || '', cover_image || null]);
        const group = groups[0];
        // Add creator as Admin
        await (0, db_1.query)('INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)', [group.id, userId, 'admin', 'accepted']);
        // Invite members if provided
        if (Array.isArray(members) && members.length > 0) {
            const creatorInfo = await (0, db_1.query)('SELECT username, CASE WHEN profile_picture IS NOT NULL AND profile_picture != \'\' THEN profile_picture ELSE COALESCE(avatar_url, \'https://api.dicebear.com/7.x/adventurer/svg?seed=\' || username) END AS profile_picture FROM users WHERE id = $1', [userId]);
            const creatorUsername = creatorInfo[0]?.username || req.user?.username;
            const creatorPic = creatorInfo[0]?.profile_picture || '';
            for (const usernameToInvite of members) {
                if (!usernameToInvite || usernameToInvite.trim() === creatorUsername)
                    continue;
                // Find the user to invite
                const users = await (0, db_1.query)('SELECT id FROM users WHERE username = $1', [usernameToInvite.trim()]);
                if (users.length === 0)
                    continue;
                const inviteeId = users[0].id;
                // Check if already member
                const existing = await (0, db_1.query)('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [group.id, inviteeId]);
                if (existing.length > 0)
                    continue;
                // Add invitation
                await (0, db_1.query)('INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)', [group.id, inviteeId, 'member', 'pending']);
                // Notify invitee
                const content = {
                    message: `${creatorUsername} invited you to join the travel group "${name}".`,
                    sender_id: userId,
                    sender_username: creatorUsername,
                    sender_profile_picture: creatorPic,
                    group_id: group.id,
                    group_name: name,
                    inviter_id: userId,
                    inviter_username: creatorUsername
                };
                await (0, notificationService_1.createNotification)(inviteeId, 'group_invite', content);
            }
        }
        res.status(201).json({ group });
    }
    catch (err) {
        console.error('Create group error:', err.message);
        res.status(500).json({ message: 'Server error creating group' });
    }
}
async function getGroups(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Get active groups
        const activeGroups = await (0, db_1.query)(`SELECT g.*, m.role, m.status 
       FROM travel_groups g
       JOIN group_members m ON g.id = m.group_id
       WHERE m.user_id = $1 AND m.status = 'accepted'
       ORDER BY g.created_at DESC`, [userId]);
        // Get pending invitations
        const pendingInvites = await (0, db_1.query)(`SELECT g.*, m.role, m.status 
       FROM travel_groups g
       JOIN group_members m ON g.id = m.group_id
       WHERE m.user_id = $1 AND m.status = 'pending'
       ORDER BY g.created_at DESC`, [userId]);
        res.json({ groups: activeGroups, invitations: pendingInvites });
    }
    catch (err) {
        console.error('Get groups error:', err.message);
        res.status(500).json({ message: 'Server error retrieving groups' });
    }
}
async function inviteMember(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { groupId, usernameToInvite } = req.body;
        // Verify current user is admin/member of group
        const membership = await (0, db_1.query)('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [groupId, userId]);
        if (membership.length === 0) {
            return res.status(403).json({ message: 'Unauthorized to invite members to this group' });
        }
        // Find the user to invite
        const users = await (0, db_1.query)('SELECT id FROM users WHERE username = $1', [usernameToInvite]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User to invite not found' });
        }
        const inviteeId = users[0].id;
        // Check if user is already a member
        const existing = await (0, db_1.query)('SELECT status FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, inviteeId]);
        if (existing.length > 0) {
            return res.status(400).json({ message: `User already has member status: ${existing[0].status}` });
        }
        // Add invitation
        await (0, db_1.query)('INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)', [groupId, inviteeId, 'member', 'pending']);
        // Create a notification for the invited user
        const inviter = await (0, db_1.query)('SELECT username, CASE WHEN profile_picture IS NOT NULL AND profile_picture != \'\' THEN profile_picture ELSE COALESCE(avatar_url, \'https://api.dicebear.com/7.x/adventurer/svg?seed=\' || username) END AS profile_picture FROM users WHERE id = $1', [userId]);
        const inviterUsername = inviter[0]?.username || req.user?.username;
        const inviterPic = inviter[0]?.profile_picture || '';
        const group = await (0, db_1.query)('SELECT name FROM travel_groups WHERE id = $1', [groupId]);
        const groupName = group[0]?.name || 'a travel group';
        const content = {
            message: `${inviterUsername} invited you to join the travel group "${groupName}".`,
            sender_id: userId,
            sender_username: inviterUsername,
            sender_profile_picture: inviterPic,
            group_id: groupId,
            group_name: groupName,
            inviter_id: userId,
            inviter_username: inviterUsername
        };
        await (0, notificationService_1.createNotification)(inviteeId, 'group_invite', content);
        res.json({ message: 'Invitation sent successfully' });
    }
    catch (err) {
        console.error('Invite member error:', err.message);
        res.status(500).json({ message: 'Server error sending invitation' });
    }
}
async function respondToInvitation(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { groupId, accept } = req.body; // boolean
        const status = accept ? 'accepted' : 'declined';
        const check = await (0, db_1.query)('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'pending\'', [groupId, userId]);
        if (check.length === 0) {
            return res.status(404).json({ message: 'No pending invitation found for this group' });
        }
        // Find the invitation notification to get the inviter_id and mark it as read
        let inviterId = null;
        let groupName = 'a travel group';
        try {
            const inviteNotif = await (0, db_1.query)(`SELECT id, content FROM notifications WHERE user_id = $1 AND type = 'group_invite' AND content LIKE $2 ORDER BY created_at DESC LIMIT 1`, [userId, `%"group_id":${groupId}%`]);
            if (inviteNotif.length > 0) {
                const notifData = JSON.parse(inviteNotif[0].content);
                inviterId = notifData.inviter_id || notifData.sender_id;
                groupName = notifData.group_name || 'a travel group';
                await (0, db_1.query)('UPDATE notifications SET is_read = TRUE WHERE id = $1', [inviteNotif[0].id]);
            }
        }
        catch (e) {
            console.warn('Could not retrieve inviter from notification:', e);
        }
        if (!inviterId) {
            const groupOwner = await (0, db_1.query)('SELECT user_id FROM group_members WHERE group_id = $1 AND role = \'admin\' LIMIT 1', [groupId]);
            if (groupOwner.length > 0) {
                inviterId = groupOwner[0].user_id;
            }
        }
        const responder = await (0, db_1.query)('SELECT username, CASE WHEN profile_picture IS NOT NULL AND profile_picture != \'\' THEN profile_picture ELSE COALESCE(avatar_url, \'https://api.dicebear.com/7.x/adventurer/svg?seed=\' || username) END AS profile_picture FROM users WHERE id = $1', [userId]);
        const responderUsername = responder[0]?.username || req.user?.username;
        const responderPic = responder[0]?.profile_picture || '';
        if (accept) {
            await (0, db_1.query)('UPDATE group_members SET status = \'accepted\' WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
            // Trigger accept notification to inviter
            if (inviterId && inviterId !== userId) {
                await (0, notificationService_1.createNotification)(inviterId, 'group_accept', {
                    message: `${responderUsername} accepted your invitation to join "${groupName}".`,
                    sender_id: userId,
                    sender_username: responderUsername,
                    sender_profile_picture: responderPic,
                    group_id: groupId,
                    group_name: groupName
                });
            }
            // Also trigger a notification to other existing group members that a new member joined
            await (0, notificationService_1.notifyGroupMembers)(groupId, userId, `${responderUsername} joined the travel group "${groupName}".`, { action: 'join' });
        }
        else {
            await (0, db_1.query)('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
            // Trigger decline notification to inviter
            if (inviterId && inviterId !== userId) {
                await (0, notificationService_1.createNotification)(inviterId, 'group_decline', {
                    message: `${responderUsername} declined your invitation to join "${groupName}".`,
                    sender_id: userId,
                    sender_username: responderUsername,
                    sender_profile_picture: responderPic,
                    group_id: groupId,
                    group_name: groupName
                });
            }
        }
        res.json({ message: `Invitation ${status} successfully` });
    }
    catch (err) {
        console.error('Respond invitation error:', err.message);
        res.status(500).json({ message: 'Server error responding to invitation' });
    }
}
async function getGroupDetails(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        // Verify membership
        const membership = await (0, db_1.query)('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [id, userId]);
        if (membership.length === 0) {
            return res.status(403).json({ message: 'Unauthorized to view this group details' });
        }
        // Get group info
        const groups = await (0, db_1.query)('SELECT * FROM travel_groups WHERE id = $1', [id]);
        const group = groups[0];
        // Get members
        const rawMembers = await (0, db_1.query)(`SELECT u.id, u.username, u.last_seen, CASE WHEN u.profile_picture IS NOT NULL AND u.profile_picture != '' THEN u.profile_picture ELSE COALESCE(u.avatar_url, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || u.username) END AS profile_picture, u.home_country, m.role, m.status 
       FROM users u
       JOIN group_members m ON u.id = m.user_id
       WHERE m.group_id = $1`, [id]);
        const members = rawMembers.map((m) => ({
            ...m,
            is_online: (0, chatController_1.isUserOnline)(m.last_seen)
        }));
        // Get group itineraries
        const itineraries = await (0, db_1.query)('SELECT * FROM itineraries WHERE group_id = $1 ORDER BY day_number ASC', [id]);
        // Get group activities
        const activities = await (0, db_1.query)('SELECT * FROM activities WHERE group_id = $1 ORDER BY start_time ASC', [id]);
        // Get group expenses
        const expenses = await (0, db_1.query)(`SELECT e.*, u.username as paid_by_username 
       FROM expenses e
       JOIN users u ON e.paid_by_user_id = u.id
       WHERE e.group_id = $1 ORDER BY e.created_at DESC`, [id]);
        res.json({
            group,
            members,
            itineraries,
            activities,
            expenses
        });
    }
    catch (err) {
        console.error('Get group details error:', err.message);
        res.status(500).json({ message: 'Server error retrieving group details' });
    }
}
async function voteOnActivity(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { activityId } = req.body;
        // Verify membership / ownership
        const activityInfo = await (0, db_1.query)('SELECT group_id, trip_id FROM activities WHERE id = $1', [activityId]);
        if (activityInfo.length === 0) {
            return res.status(404).json({ message: 'Activity not found' });
        }
        const { group_id: groupId, trip_id: tripId } = activityInfo[0];
        if (groupId) {
            const membership = await (0, db_1.query)('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [groupId, userId]);
            if (membership.length === 0) {
                return res.status(403).json({ message: 'Unauthorized to vote on this activity' });
            }
        }
        else if (tripId) {
            const tripCheck = await (0, db_1.query)('SELECT 1 FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId]);
            if (tripCheck.length === 0) {
                return res.status(403).json({ message: 'Unauthorized to vote on this activity' });
            }
        }
        // Increment votes
        const updated = await (0, db_1.query)('UPDATE activities SET votes_count = votes_count + 1 WHERE id = $1 RETURNING *', [activityId]);
        if (groupId) {
            const user = await (0, db_1.query)('SELECT username FROM users WHERE id = $1', [userId]);
            const username = user[0]?.username || 'A traveler';
            (0, notificationService_1.notifyGroupMembers)(groupId, userId, `${username} voted on activity "${updated[0].title}".`, { activity_id: activityId, activity_title: updated[0].title }).catch(e => console.error('Failed to notify group members:', e.message));
        }
        res.json({ activity: updated[0] });
    }
    catch (err) {
        console.error('Vote activity error:', err.message);
        res.status(500).json({ message: 'Server error casting vote' });
    }
}
async function createGroupItinerary(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { groupId, day_number, date, notes } = req.body;
        // Check membership
        const membership = await (0, db_1.query)('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [groupId, userId]);
        if (membership.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const check = await (0, db_1.query)('SELECT id FROM itineraries WHERE group_id = $1 AND day_number = $2', [groupId, day_number]);
        let itinerary;
        if (check.length > 0) {
            itinerary = await (0, db_1.query)('UPDATE itineraries SET date = $1, notes = $2 WHERE group_id = $3 AND day_number = $4 RETURNING *', [date, notes, groupId, day_number]);
        }
        else {
            itinerary = await (0, db_1.query)('INSERT INTO itineraries (group_id, day_number, date, notes) VALUES ($1, $2, $3, $4) RETURNING *', [groupId, day_number, date, notes]);
        }
        const user = await (0, db_1.query)('SELECT username FROM users WHERE id = $1', [userId]);
        const username = user[0]?.username || 'A traveler';
        (0, notificationService_1.notifyGroupMembers)(groupId, userId, `${username} updated the itinerary for Day ${day_number}.`, { day_number }).catch(e => console.error('Failed to notify group members:', e.message));
        res.json({ itinerary: itinerary[0] });
    }
    catch (err) {
        console.error('Create group itinerary error:', err.message);
        res.status(500).json({ message: 'Server error saving group itinerary' });
    }
}
async function createGroupActivity(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { groupId, title, description, start_time, end_time, cost } = req.body;
        const membership = await (0, db_1.query)('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [groupId, userId]);
        if (membership.length === 0) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const activity = await (0, db_1.query)(`INSERT INTO activities (group_id, title, description, start_time, end_time, cost, votes_count)
       VALUES ($1, $2, $3, $4, $5, $6, 0) RETURNING *`, [groupId, title, description || '', start_time || null, end_time || null, cost || 0.00]);
        const user = await (0, db_1.query)('SELECT username FROM users WHERE id = $1', [userId]);
        const username = user[0]?.username || 'A traveler';
        (0, notificationService_1.notifyGroupMembers)(groupId, userId, `${username} proposed a new activity "${activity[0].title}".`, { activity_id: activity[0].id, activity_title: activity[0].title }).catch(e => console.error('Failed to notify group members:', e.message));
        res.status(201).json({ activity: activity[0] });
    }
    catch (err) {
        console.error('Create group activity error:', err.message);
        res.status(500).json({ message: 'Server error adding group activity' });
    }
}
async function updateGroup(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const { name, description, cover_image } = req.body;
        // Verify current user is admin of group
        const membership = await (0, db_1.query)('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [id, userId]);
        if (membership.length === 0 || membership[0].role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can modify group settings' });
        }
        // Update group info
        const updated = await (0, db_1.query)('UPDATE travel_groups SET name = COALESCE($1, name), description = COALESCE($2, description), cover_image = COALESCE($3, cover_image), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *', [name, description, cover_image, id]);
        if (updated.length === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }
        res.json({ group: updated[0] });
    }
    catch (err) {
        console.error('Update group error:', err.message);
        res.status(500).json({ message: 'Server error updating group' });
    }
}
async function removeGroupMember(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { groupId, memberUserId } = req.params;
        // Verify requesting user is admin of the group
        const requesterMembership = await (0, db_1.query)('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [groupId, userId]);
        if (requesterMembership.length === 0 || requesterMembership[0].role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }
        if (Number(memberUserId) === userId) {
            return res.status(400).json({ message: 'Admins cannot remove themselves' });
        }
        // Delete member
        await (0, db_1.query)('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, memberUserId]);
        // Notify other members
        const removedUser = await (0, db_1.query)('SELECT username FROM users WHERE id = $1', [memberUserId]);
        const removedUsername = removedUser[0]?.username || 'A traveler';
        const groupInfo = await (0, db_1.query)('SELECT name FROM travel_groups WHERE id = $1', [groupId]);
        const groupName = groupInfo[0]?.name || 'the group';
        (0, notificationService_1.notifyGroupMembers)(Number(groupId), userId, `${removedUsername} was removed from "${groupName}" by admin.`, { action: 'remove', removed_user_id: memberUserId }).catch(e => console.error('Failed to notify group members:', e.message));
        res.json({ message: 'Member removed successfully' });
    }
    catch (err) {
        console.error('Remove member error:', err.message);
        res.status(500).json({ message: 'Server error removing member' });
    }
}
// Leave group
async function leaveGroup(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { groupId } = req.params;
        // Check membership and role
        const membership = await (0, db_1.query)('SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = \'accepted\'', [groupId, userId]);
        if (membership.length === 0) {
            return res.status(404).json({ message: 'You are not an active member of this group' });
        }
        const role = membership[0].role;
        if (role === 'admin') {
            // Check if there are other admins in the group
            const otherAdmins = await (0, db_1.query)('SELECT 1 FROM group_members WHERE group_id = $1 AND role = \'admin\' AND user_id != $2 AND status = \'accepted\'', [groupId, userId]);
            if (otherAdmins.length === 0) {
                return res.status(400).json({
                    message: 'As the group owner/admin, you cannot leave the group. Please promote another member to admin first or delete the group.'
                });
            }
        }
        // Delete the member record
        await (0, db_1.query)('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
        // Notify other members that the user left
        const userResult = await (0, db_1.query)('SELECT username FROM users WHERE id = $1', [userId]);
        const username = userResult[0]?.username || 'A traveler';
        const groupResult = await (0, db_1.query)('SELECT name FROM travel_groups WHERE id = $1', [groupId]);
        const groupName = groupResult[0]?.name || 'the group';
        (0, notificationService_1.notifyGroupMembers)(Number(groupId), userId, `${username} has left the group "${groupName}".`, { action: 'leave', user_id: userId }).catch(e => console.error('Failed to notify group members:', e.message));
        res.json({ message: 'Successfully left the group' });
    }
    catch (err) {
        console.error('Leave group error:', err.message);
        res.status(500).json({ message: 'Server error leaving group' });
    }
}
