import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

// Controller imports
import { register, login, getProfile, updateProfile } from '../controllers/authController';
import { 
  getTrips, getTripById, createTrip, updateTrip, deleteTrip, 
  addTripPhotos, getItineraries, createOrUpdateItinerary, createActivity 
} from '../controllers/tripController';
import { 
  createGroup, getGroups, getGroupDetails, inviteMember, 
  respondToInvitation, voteOnActivity, createGroupItinerary, createGroupActivity 
} from '../controllers/groupController';
import { addExpense, getExpenses, deleteExpense } from '../controllers/expenseController';
import { 
  createRecommendation, getRecommendations, toggleLike, addComment, getComments, 
  followUser, unfollowUser, getActivityFeed, searchEverything, getWishlist, 
  addToWishlist, removeFromWishlist, getNotifications, markNotificationRead 
} from '../controllers/socialController';
import { generateItinerary, askAssistant } from '../controllers/aiController';

const router = Router();

// --- AUTHENTICATION ROUTES ---
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authMiddleware, getProfile);
router.put('/auth/profile', authMiddleware, updateProfile);

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
router.post('/groups/invite', authMiddleware, inviteMember);
router.post('/groups/respond', authMiddleware, respondToInvitation);
router.post('/groups/itinerary', authMiddleware, createGroupItinerary);
router.post('/groups/activity', authMiddleware, createGroupActivity);
router.post('/groups/vote', authMiddleware, voteOnActivity);

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
router.get('/social/feed', authMiddleware, getActivityFeed);
router.get('/social/search', authMiddleware, searchEverything);
router.get('/social/wishlist', authMiddleware, getWishlist);
router.post('/social/wishlist', authMiddleware, addToWishlist);
router.delete('/social/wishlist/:id', authMiddleware, removeFromWishlist);
router.get('/social/notifications', authMiddleware, getNotifications);
router.put('/social/notifications/:id', authMiddleware, markNotificationRead);

// --- AI FEATURES ROUTES ---
router.post('/ai/itinerary', authMiddleware, generateItinerary);
router.post('/ai/assistant', authMiddleware, askAssistant);

export default router;
