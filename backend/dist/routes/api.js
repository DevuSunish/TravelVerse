"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
// Controller imports
const authController_1 = require("../controllers/authController");
const upload_1 = require("../middleware/upload");
const tripController_1 = require("../controllers/tripController");
const groupController_1 = require("../controllers/groupController");
const chatController_1 = require("../controllers/chatController");
const expenseController_1 = require("../controllers/expenseController");
const socialController_1 = require("../controllers/socialController");
const aiController_1 = require("../controllers/aiController");
const communityController_1 = require("../controllers/communityController");
const router = (0, express_1.Router)();
// --- AUTHENTICATION ROUTES ---
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.get('/auth/profile', auth_1.authMiddleware, authController_1.getProfile);
router.put('/auth/profile', auth_1.authMiddleware, authController_1.updateProfile);
router.post('/auth/profile/upload', auth_1.authMiddleware, upload_1.upload.single('profilePicture'), authController_1.uploadProfilePicture);
// --- TRIPS ROUTES ---
router.get('/trips', auth_1.authMiddleware, tripController_1.getTrips);
router.get('/trips/:id', auth_1.authMiddleware, tripController_1.getTripById);
router.post('/trips', auth_1.authMiddleware, tripController_1.createTrip);
router.put('/trips/:id', auth_1.authMiddleware, tripController_1.updateTrip);
router.delete('/trips/:id', auth_1.authMiddleware, tripController_1.deleteTrip);
router.post('/trips/photos', auth_1.authMiddleware, tripController_1.addTripPhotos);
router.get('/trips/:tripId/itineraries', auth_1.authMiddleware, tripController_1.getItineraries);
router.post('/trips/itinerary', auth_1.authMiddleware, tripController_1.createOrUpdateItinerary);
router.post('/trips/activity', auth_1.authMiddleware, tripController_1.createActivity);
// --- GROUP TRAVEL PLANNING ROUTES ---
router.post('/groups', auth_1.authMiddleware, groupController_1.createGroup);
router.get('/groups', auth_1.authMiddleware, groupController_1.getGroups);
router.get('/groups/:id', auth_1.authMiddleware, groupController_1.getGroupDetails);
router.put('/groups/:id', auth_1.authMiddleware, groupController_1.updateGroup);
router.post('/groups/:groupId/leave', auth_1.authMiddleware, groupController_1.leaveGroup);
router.delete('/groups/:groupId/members/:memberUserId', auth_1.authMiddleware, groupController_1.removeGroupMember);
router.post('/groups/invite', auth_1.authMiddleware, groupController_1.inviteMember);
router.post('/groups/respond', auth_1.authMiddleware, groupController_1.respondToInvitation);
router.post('/groups/itinerary', auth_1.authMiddleware, groupController_1.createGroupItinerary);
router.post('/groups/activity', auth_1.authMiddleware, groupController_1.createGroupActivity);
router.post('/groups/vote', auth_1.authMiddleware, groupController_1.voteOnActivity);
// --- CHAT / MESSAGING ROUTES ---
router.post('/chat/conversations', auth_1.authMiddleware, chatController_1.createOrGetConversation);
router.get('/chat/conversations', auth_1.authMiddleware, chatController_1.getConversations);
router.get('/chat/unread-count', auth_1.authMiddleware, chatController_1.getUnreadChatCount);
router.get('/chat/conversations/:id/messages', auth_1.authMiddleware, chatController_1.getConversationMessages);
router.post('/chat/conversations/:id/messages', auth_1.authMiddleware, chatController_1.sendConversationMessage);
router.get('/groups/:id/messages', auth_1.authMiddleware, chatController_1.getGroupMessages);
router.post('/groups/:id/messages', auth_1.authMiddleware, chatController_1.sendGroupMessage);
router.post('/chat/messages/:id/unsend', auth_1.authMiddleware, chatController_1.unsendMessage);
// --- EXPENSE PLANNING ROUTES ---
router.post('/expenses', auth_1.authMiddleware, expenseController_1.addExpense);
router.get('/expenses', auth_1.authMiddleware, expenseController_1.getExpenses);
router.delete('/expenses/:id', auth_1.authMiddleware, expenseController_1.deleteExpense);
// --- SOCIAL & RECOMMENDATION ROUTES ---
router.post('/recommendations', auth_1.authMiddleware, socialController_1.createRecommendation);
router.get('/recommendations', auth_1.authMiddleware, socialController_1.getRecommendations);
router.post('/social/like', auth_1.authMiddleware, socialController_1.toggleLike);
router.post('/social/comment', auth_1.authMiddleware, socialController_1.addComment);
router.get('/social/comment', auth_1.authMiddleware, socialController_1.getComments);
router.post('/social/follow', auth_1.authMiddleware, socialController_1.followUser);
router.post('/social/unfollow', auth_1.authMiddleware, socialController_1.unfollowUser);
router.get('/social/follow/status/:userId', auth_1.authMiddleware, socialController_1.checkFollowStatus);
router.get('/social/followers/count/:userId', auth_1.authMiddleware, socialController_1.getFollowersCount);
router.get('/social/following/count/:userId', auth_1.authMiddleware, socialController_1.getFollowingCount);
router.get('/social/followers/list/:userId', auth_1.authMiddleware, socialController_1.getFollowersList);
router.get('/social/following/list/:userId', auth_1.authMiddleware, socialController_1.getFollowingList);
router.get('/social/feed', auth_1.authMiddleware, socialController_1.getActivityFeed);
router.get('/social/search', auth_1.authMiddleware, socialController_1.searchEverything);
router.get('/social/wishlist', auth_1.authMiddleware, socialController_1.getWishlist);
router.post('/social/wishlist', auth_1.authMiddleware, socialController_1.addToWishlist);
router.delete('/social/wishlist/:id', auth_1.authMiddleware, socialController_1.removeFromWishlist);
router.get('/social/notifications', auth_1.authMiddleware, socialController_1.getNotifications);
router.put('/social/notifications/read-all', auth_1.authMiddleware, socialController_1.markAllNotificationsRead);
router.put('/social/notifications/:id', auth_1.authMiddleware, socialController_1.markNotificationRead);
router.delete('/social/notifications/:id', auth_1.authMiddleware, socialController_1.deleteNotification);
router.delete('/social/notifications', auth_1.authMiddleware, socialController_1.deleteAllNotifications);
// --- TRAVEL COMMUNITIES ROUTES ---
router.post('/communities', auth_1.authMiddleware, upload_1.upload.single('cover'), communityController_1.createCommunity);
router.get('/communities', auth_1.authMiddleware, communityController_1.getCommunities);
router.get('/communities/:id', auth_1.authMiddleware, communityController_1.getCommunityDetails);
router.post('/communities/:id/join', auth_1.authMiddleware, communityController_1.joinCommunity);
router.post('/communities/:id/leave', auth_1.authMiddleware, communityController_1.leaveCommunity);
router.get('/communities/:id/requests', auth_1.authMiddleware, communityController_1.getCommunityRequests);
router.post('/communities/:id/requests', auth_1.authMiddleware, communityController_1.handleJoinRequest);
router.get('/communities/:id/posts', auth_1.authMiddleware, communityController_1.getCommunityPosts);
router.post('/communities/:id/posts', auth_1.authMiddleware, upload_1.upload.single('photo'), communityController_1.createCommunityPost);
router.post('/communities/posts/:postId/like', auth_1.authMiddleware, communityController_1.toggleCommunityPostLike);
router.post('/communities/posts/:postId/comments', auth_1.authMiddleware, communityController_1.addCommunityPostComment);
router.get('/communities/posts/:postId/comments', auth_1.authMiddleware, communityController_1.getCommunityPostComments);
router.get('/communities/:id/members', auth_1.authMiddleware, communityController_1.getCommunityMembers);
router.get('/communities/:id/photos', auth_1.authMiddleware, communityController_1.getCommunityPhotos);
// --- AI FEATURES ROUTES ---
router.post('/ai/itinerary', auth_1.authMiddleware, aiController_1.generateItinerary);
router.post('/ai/assistant', auth_1.authMiddleware, aiController_1.askAssistant);
exports.default = router;
