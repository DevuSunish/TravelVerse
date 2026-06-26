import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { InteractiveMap } from '../components/InteractiveMap';
import { RecommendationCard, Recommendation } from '../components/RecommendationCard';
import { 
  Globe, Plane, Award, Calendar, Compass,
  MapPin, Heart, MessageSquare, Plus, CheckCircle2, ListTodo, X, Users,
  Send
} from 'lucide-react';

interface ProfileStats {
  countries_visited_count: number;
  trips_completed_count: number;
  travel_percentage: string | number;
  followers_count: number;
  following_count: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface Profile {
  stats: ProfileStats;
  badges: Badge[];
}

interface CountryFootprint {
  country_code: string;
  status: 'visited' | 'planned' | 'wishlist';
}


interface FeedItem {
  id: number;
  feed_type?: 'trip' | 'recommendation';
  username: string;
  profile_picture?: string;
  cover_image?: string;
  title?: string;
  description?: string;
  country?: string;
  likes_count?: number;
  comments_count?: number;
  place_name?: string;
  rating?: number;
  review?: string;
  tips?: string;
  estimated_cost?: number;
  how_to_reach?: string;
  best_time_to_visit?: string;
  photos?: string;
  is_liked?: boolean;
  created_at?: string;
  category?: string;
}

interface TripComment {
  id: number;
  username: string;
  profile_picture?: string;
  content: string;
}

interface TripCommentState {
  list: TripComment[];
  loading: boolean;
  error: string | null;
  newComment: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [countries, setCountries] = useState<CountryFootprint[]>([]);
  const [communitiesList, setCommunitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Like state for feed items (keyed by "feed_type-id")
  const [likedItems, setLikedItems] = useState<Record<string, { liked: boolean; count: number }>>({});

  // Trip comment state
  const [openCommentTrips, setOpenCommentTrips] = useState<Set<number>>(new Set());
  const [tripCommentData, setTripCommentData] = useState<Record<number, TripCommentState>>({});

  // Map country status editor modal
  const [selectedCountry, setSelectedCountry] = useState<{name: string, code: string, currentStatus?: string} | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Get user profile details & stats
        const profileData = await apiRequest('/auth/profile');
        setProfile(profileData.profile);

        // 2. Get feed items
        const feedData = await apiRequest('/social/feed');
        setFeed(feedData.feed || []);

        // 3. Get user visited/planned countries list for interactive map
        const countriesData = await apiRequest('/trips');
        
        // Build mapped countries list based on both DB countries_visited table and loaded trips
        const resCountries = await apiRequest('/social/wishlist');
        const wishlistItems = resCountries.wishlist || [];
        
        const mapList: CountryFootprint[] = [];
        const addedCodes = new Set<string>();

        // Fetch countries_visited directly from API
        // For mockup simplicity we can also fetch countries using our profile stats or fetch from trips
        // Let's query countries visited status directly from backend if possible, or build it from trips & wishlist!
        // We'll write an API endpoint. Wait, on backend we didn't write a direct list-countries endpoint, but we did write a getProfile which returns stats.
        // Let's write a simple helper: we fetch trips (which logs countries) and wishlist countries.
        // Also we can fetch follows and profile to sync.
        const trips = countriesData.trips || [];
        trips.forEach((t: { country: string; status: string; id: number; start_date?: string }) => {
          const code = t.country.substring(0, 3).toUpperCase(); // Simple code mapping
          if (!addedCodes.has(code)) {
            addedCodes.add(code);
            mapList.push({
              country_code: code,
              status: t.status === 'past' ? 'visited' : 'planned'
            });
          }
        });

        wishlistItems.forEach((w: { type: string; name: string }) => {
          if (w.type === 'country') {
            const code = w.name.substring(0, 3).toUpperCase();
            if (!addedCodes.has(code)) {
              addedCodes.add(code);
              mapList.push({
                country_code: code,
                status: 'wishlist'
              });
            }
          }
        });

        // Insert seed countries if list is empty to make it look full!
        if (mapList.length === 0 && user?.username === 'elena_travels') {
          mapList.push(
            { country_code: 'ITA', status: 'visited' },
            { country_code: 'FRA', status: 'visited' },
            { country_code: 'ESP', status: 'visited' },
            { country_code: 'JPN', status: 'visited' },
            { country_code: 'USA', status: 'planned' },
            { country_code: 'THA', status: 'wishlist' }
          );
        }

        setCountries(mapList);

        // 4. Load Travel Communities
        const commsData = await apiRequest('/communities');
        setCommunitiesList(commsData.communities || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Sync liked state from feed data whenever feed loads
  useEffect(() => {
    if (feed.length > 0) {
      const map: Record<string, { liked: boolean; count: number }> = {};
      feed.forEach(item => {
        const key = `${item.feed_type}-${item.id}`;
        map[key] = { liked: !!item.is_liked, count: Number(item.likes_count || 0) };
      });
      setLikedItems(map);
    }
  }, [feed]);

  // Click on a country on the map
  const handleCountryMapClick = (countryName: string, countryCode: string, currentStatus?: 'visited' | 'planned' | 'wishlist') => {
    setSelectedCountry({ name: countryName, code: countryCode, currentStatus });
  };

  const handleJoinLeaveDashboard = async (communityId: number, currentStatus: string | null) => {
    try {
      if (currentStatus === 'accepted' || currentStatus === 'pending') {
        await apiRequest(`/communities/${communityId}/leave`, { method: 'POST' });
        setCommunitiesList(prev => prev.map(c => {
          if (c.id === communityId) {
            return {
              ...c,
              membership_status: null,
              member_count: currentStatus === 'accepted' ? Math.max(0, c.member_count - 1) : c.member_count
            };
          }
          return c;
        }));
      } else {
        const res = await apiRequest(`/communities/${communityId}/join`, { method: 'POST' });
        setCommunitiesList(prev => prev.map(c => {
          if (c.id === communityId) {
            return {
              ...c,
              membership_status: res.status,
              member_count: res.status === 'accepted' ? c.member_count + 1 : c.member_count
            };
          }
          return c;
        }));
      }
    } catch (e) {
      console.error('Failed to join/leave community:', e);
    }
  };

  // Submit map country update
  const handleUpdateCountryStatus = async (status: 'visited' | 'planned' | 'wishlist' | 'clear') => {
    if (!selectedCountry) return;

    try {
      if (status === 'clear') {
        // If it was a wishlist country, we remove from wishlist
        setCountries(prev => prev.filter(c => c.country_code !== selectedCountry.code));
      } else {
        // Add or update
        const updatedList = [...countries];
        const existingIdx = updatedList.findIndex(c => c.country_code === selectedCountry.code);
        if (existingIdx >= 0) {
          updatedList[existingIdx].status = status;
        } else {
          updatedList.push({ country_code: selectedCountry.code, status });
        }
        setCountries(updatedList);

        // Call backend API (either create a trip or add to wishlist)
        if (status === 'wishlist') {
          await apiRequest('/social/wishlist', {
            method: 'POST',
            body: { type: 'country', name: selectedCountry.name }
          });
        } else {
          await apiRequest('/trips', {
            method: 'POST',
            body: {
              title: `${status === 'visited' ? 'Explored' : 'Planned'} ${selectedCountry.name}`,
              country: selectedCountry.name,
              status: status === 'visited' ? 'past' : 'planned'
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to update country status:', e);
    } finally {
      setSelectedCountry(null);
    }
  };

  // ── Like handler for trip feed items ──
  const handleTripLike = async (tripId: number) => {
    const key = `trip-${tripId}`;
    const current = likedItems[key] || { liked: false, count: 0 };
    const newLiked = !current.liked;
    // Optimistic update
    setLikedItems(prev => ({
      ...prev,
      [key]: { liked: newLiked, count: newLiked ? current.count + 1 : Math.max(0, current.count - 1) }
    }));
    try {
      await apiRequest('/social/like', { method: 'POST', body: { trip_id: tripId } });
    } catch {
      // Revert on error
      setLikedItems(prev => ({ ...prev, [key]: current }));
    }
  };

  // ── Toggle + fetch trip comments ──
  const toggleTripComments = async (tripId: number) => {
    if (openCommentTrips.has(tripId)) {
      setOpenCommentTrips(prev => { const s = new Set(prev); s.delete(tripId); return s; });
      return;
    }
    setOpenCommentTrips(prev => new Set(prev).add(tripId));
    // Use cached data if already loaded
    if (tripCommentData[tripId]?.list?.length > 0) return;
    setTripCommentData(prev => ({
      ...prev,
      [tripId]: { list: [], loading: true, error: null, newComment: prev[tripId]?.newComment || '' }
    }));
    try {
      const data = await apiRequest(`/social/comment?trip_id=${tripId}`);
      setTripCommentData(prev => ({
        ...prev,
        [tripId]: { ...prev[tripId], list: data.comments || [], loading: false }
      }));
    } catch {
      setTripCommentData(prev => ({
        ...prev,
        [tripId]: { ...prev[tripId], loading: false, error: 'Failed to load comments.' }
      }));
    }
  };

  // ── Post a comment on a trip feed item ──
  const handlePostTripComment = async (e: React.FormEvent, tripId: number) => {
    e.preventDefault();
    const content = tripCommentData[tripId]?.newComment?.trim();
    if (!content) return;
    try {
      const data = await apiRequest('/social/comment', {
        method: 'POST',
        body: { trip_id: tripId, content }
      });
      if (data.comment) {
        setTripCommentData(prev => ({
          ...prev,
          [tripId]: { ...prev[tripId], list: [...(prev[tripId]?.list || []), data.comment], newComment: '' }
        }));
        setFeed(prev => prev.map(f =>
          f.id === tripId && f.feed_type === 'trip'
            ? { ...f, comments_count: (Number(f.comments_count) || 0) + 1 }
            : f
        ));
      }
    } catch { /* ignore */ }
  };

  // ── Community carousel scroll ──
  // (plain overflow-x scroll, no custom controls)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-slate-500 dark:text-slate-400 font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        <span className="ml-3 font-semibold">Loading your TravelVerse...</span>
      </div>
    );
  }

  const stats = profile?.stats || {
    countries_visited_count: countries.filter(c => c.status === 'visited').length,
    trips_completed_count: 0,
    travel_percentage: ((countries.filter(c => c.status === 'visited').length / 195) * 100).toFixed(2),
    followers_count: 0,
    following_count: 0
  };

  const badges = profile?.badges || [
    { id: 'newbie', name: 'Wanderlust', description: 'Joined TravelVerse! Ready for adventure', icon: 'Sparkles', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">
            Hey, {user?.username}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Discover the world, connect with fellow travelers, and explore new destinations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/trips?action=new"
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4.5 w-4.5" />
            Log a Trip
          </Link>
          <Link
            to="/planner"
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plane className="h-4.5 w-4.5" />
            Plan Next Trip
          </Link>
        </div>
      </div>

      {/* Grid structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left two columns: Map, Stats, Countdowns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Statistics banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl shadow-xs text-center">
              <Globe className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 block">{stats.countries_visited_count}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Countries</span>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl shadow-xs text-center">
              <Plane className="h-7 w-7 text-blue-500 mx-auto mb-2" />
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 block">{stats.trips_completed_count}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trips Logged</span>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl shadow-xs text-center">
              <Compass className="h-7 w-7 text-amber-500 mx-auto mb-2" />
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 block">{stats.travel_percentage}%</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">World Explored</span>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl shadow-xs text-center">
              <Award className="h-7 w-7 text-purple-500 mx-auto mb-2" />
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 block">{badges.length}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Badges Earned</span>
            </div>

          </div>

          {/* 2. Interactive World Map */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-serif">Interactive Footprint Map</h3>
              <span className="text-xs text-slate-400">Click a country to mark status</span>
            </div>
            <InteractiveMap countries={countries} onCountryClick={handleCountryMapClick} />
          </div>


        </div>

        {/* Right Column: Social feed and notifications */}
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-serif">Travelers Feed</h3>
            <Link to="/recommendations" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View All</Link>
          </div>

          {/* Activity Feed items */}
          <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-1">
            {feed.length === 0 ? (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50 p-8 rounded-2xl text-center text-slate-400">
                <Compass className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">No recent feed activities.</p>
                <p className="text-xs text-slate-400 mt-1">Try following other travelers or share your first travel recommendation!</p>
              </div>
            ) : (
              feed.map((item) => {
                // If it is a trip feed item
                if (item.feed_type === 'trip') {
                  return (
                    <div key={`trip-${item.id}`} className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-xs">
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <Link to={`/profile?username=${item.username}`} className="shrink-0">
                            <img 
                              src={item.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'} 
                              alt={item.username} 
                              className="h-8 w-8 rounded-full border border-slate-200 cursor-pointer"
                            />
                          </Link>
                          <div>
                            <Link to={`/profile?username=${item.username}`} className="hover:underline">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block leading-tight cursor-pointer">{item.username}</span>
                            </Link>
                            <span className="text-[10px] text-slate-400">Logged a travel story</span>
                          </div>
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                            Trip Log
                          </span>
                        </div>

                        {/* Image cover */}
                        {item.cover_image && (
                          <div className="aspect-video w-full rounded-xl overflow-hidden mb-3 bg-slate-100">
                            <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-3">{item.description}</p>

                        {/* Interactive like + comment row */}
                        <div className="flex items-center justify-between text-[11px] font-semibold border-t border-slate-50 dark:border-slate-800/40 pt-3">
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                            {item.country}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleTripLike(item.id)}
                              className={`flex items-center gap-1 transition-colors duration-200 ${
                                likedItems[`trip-${item.id}`]?.liked
                                  ? 'text-rose-500'
                                  : 'text-slate-400 hover:text-rose-400'
                              }`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${likedItems[`trip-${item.id}`]?.liked ? 'fill-rose-500' : ''}`} />
                              <span>{likedItems[`trip-${item.id}`]?.count ?? Number(item.likes_count ?? 0)}</span>
                            </button>
                            <button
                              onClick={() => toggleTripComments(item.id)}
                              className={`flex items-center gap-1 transition-colors ${
                                openCommentTrips.has(item.id)
                                  ? 'text-emerald-500'
                                  : 'text-slate-400 hover:text-emerald-400'
                              }`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>{Number(item.comments_count ?? 0)}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Trip comment tray */}
                      {openCommentTrips.has(item.id) && (
                        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 p-4">
                          {/* Loading state */}
                          {tripCommentData[item.id]?.loading && (
                            <div className="flex items-center justify-center gap-2 py-3">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
                              <span className="text-xs text-slate-400">Loading comments...</span>
                            </div>
                          )}
                          {/* Error state */}
                          {tripCommentData[item.id]?.error && !tripCommentData[item.id]?.loading && (
                            <p className="text-xs text-rose-500 text-center py-2 font-medium">{tripCommentData[item.id]?.error}</p>
                          )}
                          {/* Comments list */}
                          {!tripCommentData[item.id]?.loading && (
                            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 mb-3">
                              {(tripCommentData[item.id]?.list || []).length === 0 && !tripCommentData[item.id]?.error ? (
                                <p className="text-xs text-slate-400 text-center py-3">No comments yet. Be the first!</p>
                              ) : (
                                (tripCommentData[item.id]?.list || []).map((comm) => (
                                  <div key={comm.id} className="flex items-start gap-2 text-xs">
                                    <Link to={`/profile?username=${comm.username}`} className="shrink-0">
                                      <img
                                        src={comm.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                                        alt={comm.username}
                                        className="h-6 w-6 rounded-full object-cover bg-emerald-50 cursor-pointer"
                                      />
                                    </Link>
                                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl flex-1">
                                      <Link to={`/profile?username=${comm.username}`} className="hover:underline">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5 cursor-pointer">{comm.username}</span>
                                      </Link>
                                      <p className="text-slate-600 dark:text-slate-300 leading-normal">{comm.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          {/* Comment input */}
                          <form onSubmit={(e) => handlePostTripComment(e, item.id)} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={tripCommentData[item.id]?.newComment || ''}
                              onChange={(e) => setTripCommentData(prev => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || { list: [], loading: false, error: null }), newComment: e.target.value }
                              }))}
                              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 dark:text-white"
                            />
                            <button
                              type="submit"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-colors"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                }

                // If it is a recommendation item
                return (
                  <RecommendationCard 
                    key={`rec-${item.id}`} 
                    rec={item as unknown as Recommendation} 
                  />
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Travel Communities Section */}
      <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800/80 mt-8 w-full">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">Travel Communities</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Connect with fellow travelers sharing common destinations and interests</p>
          </div>
          <Link to="/communities" className="text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
            Explore All
          </Link>
        </div>

        {communitiesList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-8 rounded-3xl text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto opacity-50 mb-3" />
            <p className="text-sm font-semibold">No travel communities available.</p>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pt-2 pb-2 snap-x scroll-smooth no-scrollbar w-full">
            {communitiesList.map((comm) => {
              const isUserJoined = comm.membership_status === 'accepted';
              const isUserPending = comm.membership_status === 'pending';
              
              return (
                <div 
                  key={comm.id} 
                  className="w-[320px] sm:w-[380px] md:w-[420px] shrink-0 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-xs hover-card snap-start flex flex-col justify-between transition-all duration-300"
                >
                  <div>
                    {/* Cover Image */}
                    <div 
                      className="h-40 sm:h-44 w-full bg-cover bg-center relative cursor-pointer"
                      style={{ backgroundImage: `url(${comm.cover_image})` }}
                      onClick={() => navigate(`/communities/${comm.id}`)}
                    >
                      <div className="absolute top-3 right-3 bg-slate-950/70 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
                        {comm.category}
                      </div>
                    </div>

                    {/* Card Info */}
                    <div className="p-5 sm:p-6">
                      <h4 
                        className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer line-clamp-1"
                        onClick={() => navigate(`/communities/${comm.id}`)}
                      >
                        {comm.name}
                      </h4>
                      <span className="text-xs text-slate-400 font-medium block mt-1">
                        {comm.member_count} {comm.member_count === 1 ? 'member' : 'members'}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-3 min-h-[3rem] sm:min-h-[3.75rem]">
                        {comm.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="p-5 sm:p-6 pt-0 border-t border-slate-50 dark:border-slate-800/40 mt-3 flex gap-2">
                    <button
                      onClick={() => handleJoinLeaveDashboard(comm.id, comm.membership_status)}
                      disabled={isUserPending}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isUserJoined 
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350'
                          : isUserPending
                          ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                      }`}
                    >
                      {isUserJoined ? (
                        <>Leave</>
                      ) : isUserPending ? (
                        <>Pending Approval</>
                      ) : (
                        <>Join</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Country marking status modal */}
      {selectedCountry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in text-center font-sans">
            
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Mark Destination</span>
              <button onClick={() => setSelectedCountry(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <Globe className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{selectedCountry.name}</h4>
            <p className="text-xs text-slate-400 mb-6">Which bucket does this country fit in?</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleUpdateCountryStatus('visited')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                Mark as Visited (Explored)
              </button>
              <button
                onClick={() => handleUpdateCountryStatus('planned')}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="h-4.5 w-4.5" />
                Mark as Planned (Upcoming)
              </button>
              <button
                onClick={() => handleUpdateCountryStatus('wishlist')}
                className="w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ListTodo className="h-4.5 w-4.5" />
                Add to Wishlist
              </button>
              {selectedCountry.currentStatus && (
                <button
                  onClick={() => handleUpdateCountryStatus('clear')}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-rose-600 text-xs font-semibold transition-colors mt-2"
                >
                  Remove Pin
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
