"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
// Controller imports
const authController_1 = require("../controllers/authController");
const tripController_1 = require("../controllers/tripController");
const groupController_1 = require("../controllers/groupController");
const expenseController_1 = require("../controllers/expenseController");
const socialController_1 = require("../controllers/socialController");
const aiController_1 = require("../controllers/aiController");
const router = (0, express_1.Router)();
// --- AUTHENTICATION ROUTES ---
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.get('/auth/profile', auth_1.authMiddleware, authController_1.getProfile);
router.put('/auth/profile', auth_1.authMiddleware, authController_1.updateProfile);
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
router.post('/groups/invite', auth_1.authMiddleware, groupController_1.inviteMember);
router.post('/groups/respond', auth_1.authMiddleware, groupController_1.respondToInvitation);
router.post('/groups/itinerary', auth_1.authMiddleware, groupController_1.createGroupItinerary);
router.post('/groups/activity', auth_1.authMiddleware, groupController_1.createGroupActivity);
router.post('/groups/vote', auth_1.authMiddleware, groupController_1.voteOnActivity);
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
// --- AI FEATURES ROUTES ---
router.post('/ai/itinerary', auth_1.authMiddleware, aiController_1.generateItinerary);
router.post('/ai/assistant', auth_1.authMiddleware, aiController_1.askAssistant);
exports.default = router;
