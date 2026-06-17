import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

// Controller imports
import { register, login, getProfile, updateProfile, uploadProfilePicture } from '../controllers/authController';
import { upload } from '../middleware/upload';
import { 
  getTrips, getTripById, createTrip, updateTrip, deleteTrip, 
  addTripPhotos, getItineraries, createOrUpdateItinerary, createActivity 
} from '../controllers/tripController';
import { 
  createGroup, getGroups, getGroupDetails, inviteMember, 
  respondToInvitation, voteOnActivity, createGroupItinerary, createGroupActivity,
  updateGroup, removeGroupMember, leaveGroup
} from '../controllers/groupController';
import {
  createOrGetConversation, getConversations, getConversationMessages,
  sendConversationMessage, getGroupMessages, sendGroupMessage, unsendMessage,
  getUnreadChatCount
} from '../controllers/chatController';
import { addExpense, getExpenses, deleteExpense } from '../controllers/expenseController';
import { 
  createRecommendation, getRecommendations, toggleLike, addComment, getComments, 
  followUser, unfollowUser, getActivityFeed, searchEverything, getWishlist, 
  addToWishlist, removeFromWishlist, getNotifications, markNotificationRead,
  markAllNotificationsRead, deleteNotification, deleteAllNotifications,
  checkFollowStatus, getFollowersCount, getFollowingCount,
  getFollowersList, getFollowingList
} from '../controllers/socialController';
import { generateItinerary, askAssistant } from '../controllers/aiController';

const router = Router();

// --- AUTHENTICATION ROUTES ---
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authMiddleware, getProfile);
router.put('/auth/profile', authMiddleware, updateProfile);
router.post('/auth/profile/upload', authMiddleware, upload.single('profilePicture'), uploadProfilePicture);

// --- TRIPS ROUTES ---
router.get('/trips', authMiddleware, getTrips);
router.get('/trips/:id', authMiddleware, getTripById);
router.post('/trips', authMiddleware, createTrip);
router.put('/trips/:id', authMiddleware, updateTrip);
router.delete('/trips/:id', authMiddleware, deleteTrip);
router.post('/trips/photos', authMiddleware, addTripPhotos);
router.get('/trips/:tripId/itineraries', authMiddleware, getItineraries);
router.post('/trips/itinerary', authMiddleware, createOrUpdateItinerary);
router.post('/trips/activity', authMiddleware, createActivity);

// --- GROUP TRAVEL PLANNING ROUTES ---
router.post('/groups', authMiddleware, createGroup);
router.get('/groups', authMiddleware, getGroups);
router.get('/groups/:id', authMiddleware, getGroupDetails);
router.put('/groups/:id', authMiddleware, updateGroup);
router.post('/groups/:groupId/leave', authMiddleware, leaveGroup);
router.delete('/groups/:groupId/members/:memberUserId', authMiddleware, removeGroupMember);
router.post('/groups/invite', authMiddleware, inviteMember);
router.post('/groups/respond', authMiddleware, respondToInvitation);
router.post('/groups/itinerary', authMiddleware, createGroupItinerary);
router.post('/groups/activity', authMiddleware, createGroupActivity);
router.post('/groups/vote', authMiddleware, voteOnActivity);

// --- CHAT / MESSAGING ROUTES ---
router.post('/chat/conversations', authMiddleware, createOrGetConversation);
router.get('/chat/conversations', authMiddleware, getConversations);
router.get('/chat/unread-count', authMiddleware, getUnreadChatCount);
router.get('/chat/conversations/:id/messages', authMiddleware, getConversationMessages);
router.post('/chat/conversations/:id/messages', authMiddleware, sendConversationMessage);
router.get('/groups/:id/messages', authMiddleware, getGroupMessages);
router.post('/groups/:id/messages', authMiddleware, sendGroupMessage);
router.post('/chat/messages/:id/unsend', authMiddleware, unsendMessage);

// --- EXPENSE PLANNING ROUTES ---
router.post('/expenses', authMiddleware, addExpense);
router.get('/expenses', authMiddleware, getExpenses);
router.delete('/expenses/:id', authMiddleware, deleteExpense);

// --- SOCIAL & RECOMMENDATION ROUTES ---
router.post('/recommendations', authMiddleware, createRecommendation);
router.get('/recommendations', authMiddleware, getRecommendations);
router.post('/social/like', authMiddleware, toggleLike);
router.post('/social/comment', authMiddleware, addComment);
router.get('/social/comment', authMiddleware, getComments);
router.post('/social/follow', authMiddleware, followUser);
router.post('/social/unfollow', authMiddleware, unfollowUser);
router.get('/social/follow/status/:userId', authMiddleware, checkFollowStatus);
router.get('/social/followers/count/:userId', authMiddleware, getFollowersCount);
router.get('/social/following/count/:userId', authMiddleware, getFollowingCount);
router.get('/social/followers/list/:userId', authMiddleware, getFollowersList);
router.get('/social/following/list/:userId', authMiddleware, getFollowingList);
router.get('/social/feed', authMiddleware, getActivityFeed);
router.get('/social/search', authMiddleware, searchEverything);
router.get('/social/wishlist', authMiddleware, getWishlist);
router.post('/social/wishlist', authMiddleware, addToWishlist);
router.delete('/social/wishlist/:id', authMiddleware, removeFromWishlist);
router.get('/social/notifications', authMiddleware, getNotifications);
router.put('/social/notifications/read-all', authMiddleware, markAllNotificationsRead);
router.put('/social/notifications/:id', authMiddleware, markNotificationRead);
router.delete('/social/notifications/:id', authMiddleware, deleteNotification);
router.delete('/social/notifications', authMiddleware, deleteAllNotifications);

// --- AI FEATURES ROUTES ---
router.post('/ai/itinerary', authMiddleware, generateItinerary);
router.post('/ai/assistant', authMiddleware, askAssistant);

export default router;
