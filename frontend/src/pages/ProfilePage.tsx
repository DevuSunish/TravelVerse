import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { TripCard } from '../components/TripCard';
import { 
  Globe, Compass, Award, MapPin, UserPlus, UserMinus, 
  Map, CheckSquare, Square, ChevronRight 
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const usernameParam = searchParams.get('username') || currentUser?.username;

  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // List of countries to check off (top 20 popular destinations)
  const popularCountries = [
    { name: 'France', code: 'FRA' },
    { name: 'Spain', code: 'ESP' },
    { name: 'United States', code: 'USA' },
    { name: 'Italy', code: 'ITA' },
    { name: 'Japan', code: 'JPN' },
    { name: 'United Kingdom', code: 'GBR' },
    { name: 'Germany', code: 'DEU' },
    { name: 'Canada', code: 'CAN' },
    { name: 'Mexico', code: 'MEX' },
    { name: 'Thailand', code: 'THA' },
    { name: 'Greece', code: 'GRC' },
    { name: 'Iceland', code: 'ISL' },
    { name: 'Australia', code: 'AUS' },
    { name: 'Brazil', code: 'BRA' },
    { name: 'India', code: 'IND' }
  ];

  const [userVisitedCodes, setUserVisitedCodes] = useState<string[]>([]);

  useEffect(() => {
    async function loadProfile() {
      if (!usernameParam) return;
      setLoading(true);
      try {
        // Fetch profile
        const profileData = await apiRequest(`/auth/profile?username=${usernameParam}`);
        setProfile(profileData.profile);
        setIsFollowing(profileData.profile.is_following);

        // Fetch user trips
        const tripsData = await apiRequest(`/trips`);
        // Filter trips belonging to this profile's user
        const targetUserId = profileData.profile.id;
        const filteredTrips = (tripsData.trips || []).filter((t: any) => t.user_id === targetUserId);
        setTrips(filteredTrips);

        // Set checked off country codes
        // Fetch user countries visited status
        // Simply pull them from user trips in this profile view
        const codes = filteredTrips.filter((t: any) => t.status === 'past').map((t: any) => t.country.substring(0, 3).toUpperCase());
        setUserVisitedCodes(Array.from(new Set(codes)));
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [usernameParam]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      const followState = isFollowing;
      setIsFollowing(!followState);
      
      if (followState) {
        // Unfollow
        await apiRequest('/social/unfollow', {
          method: 'POST',
          body: { userIdToUnfollow: profile.id }
        });
        profile.stats.followers_count = Math.max(0, profile.stats.followers_count - 1);
      } else {
        // Follow
        await apiRequest('/social/follow', {
          method: 'POST',
          body: { userIdToFollow: profile.id }
        });
        profile.stats.followers_count = profile.stats.followers_count + 1;
      }
    } catch (err) {
      // Revert state
      setIsFollowing(profile.is_following);
    }
  };

  // Toggle visited country directly from profile check list
  const handleCountryCheckToggle = async (countryName: string, code: string) => {
    const isOwner = currentUser?.username === profile?.username;
    if (!isOwner) return; // Only allow own profile modifications

    const isVisited = userVisitedCodes.includes(code);
    try {
      if (isVisited) {
        // If already marked, let's delete the corresponding trip
        setUserVisitedCodes(prev => prev.filter(c => c !== code));
        // We'll filter trips locally as well
        setTrips(prev => prev.filter(t => !(t.country.toLowerCase() === countryName.toLowerCase() && t.status === 'past')));
      } else {
        setUserVisitedCodes(prev => [...prev, code]);
        
        // Add trip to backend representing country check
        const newTrip = await apiRequest('/trips', {
          method: 'POST',
          body: {
            title: `Explored ${countryName}`,
            country: countryName,
            status: 'past',
            description: `Checked off from travel list!`
          }
        });
        
        if (newTrip.trip) {
          setTrips(prev => [newTrip.trip, ...prev]);
        }
      }

      // Re-trigger stats update
      const freshProfile = await apiRequest(`/auth/profile?username=${currentUser?.username}`);
      setProfile(freshProfile.profile);
    } catch (err) {
      console.error('Toggle country checklist failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-slate-500 font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 font-sans">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Profile not found</h3>
        <Link to="/" className="text-emerald-500 font-bold hover:underline mt-2 inline-block">Return home</Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Profile Header card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-8 mb-10">
        
        {/* Profile Pic */}
        <div className="relative shrink-0">
          <img
            src={profile.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
            alt={profile.username}
            className="h-28 w-28 md:h-36 md:w-36 rounded-full object-cover bg-emerald-50 border-4 border-emerald-500/10 shadow-sm"
          />
        </div>

        {/* Bio, name, actions */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif leading-none">
                {profile.username}
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-1 text-xs text-slate-400 mt-2 font-semibold">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Base: {profile.home_country || 'Unknown'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              {!isOwnProfile ? (
                <button
                  onClick={handleFollowToggle}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer ${
                    isFollowing
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4.5 w-4.5" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4.5 w-4.5" />
                      Follow Traveler
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to="/settings"
                  className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>

          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            {profile.bio || 'Wanderlust explorer. No bio updated yet.'}
          </p>

          {/* Social Stats */}
          <div className="flex justify-center md:justify-start gap-6 text-sm text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100 mr-1">{profile.stats.followers_count}</span>
              followers
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100 mr-1">{profile.stats.following_count}</span>
              following
            </div>
          </div>
        </div>
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Badges & Countries Checklist */}
        <div className="space-y-8">
          
          {/* Achievements/Badges */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-serif mb-4 flex items-center gap-1.5">
              <Award className="h-5.5 w-5.5 text-amber-500" />
              Achievements
            </h3>
            <div className="grid grid-cols-1 gap-3.5">
              {profile.badges.map((badge: any) => (
                <div key={badge.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <div className={`p-2.5 rounded-xl shrink-0 ${badge.color || 'bg-slate-100 text-slate-600'}`}>
                    <Globe className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{badge.name}</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visited checklist tracker (Only interactive for profile owner) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-serif flex items-center gap-1.5">
                <Compass className="h-5.5 w-5.5 text-emerald-500" />
                Travel Checklist
              </h3>
              <span className="text-[10px] bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-bold px-2 py-0.5 rounded-md">
                {isOwnProfile ? 'Interactive' : 'Read-Only'}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">
              {isOwnProfile 
                ? 'Check off countries you have visited to add them to your map footprint.' 
                : 'Browse countries explored by this traveler.'
              }
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {popularCountries.map((c) => {
                const visited = userVisitedCodes.includes(c.code);
                return (
                  <button
                    key={c.code}
                    disabled={!isOwnProfile}
                    onClick={() => handleCountryCheckToggle(c.name, c.code)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border text-xs font-semibold transition-colors ${
                      visited
                        ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-white border-slate-100 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-850 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Globe className={`h-4.5 w-4.5 ${visited ? 'text-emerald-500' : 'text-slate-300'}`} />
                      {c.name}
                    </span>
                    {visited ? (
                      <CheckSquare className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="h-4.5 w-4.5 text-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 2 Columns: Trips Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif flex items-center gap-2">
              <Map className="h-5 w-5 text-emerald-500" />
              Trips Logged
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{trips.length} entries</span>
          </div>

          {trips.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-2xl text-center text-slate-450 shadow-xs">
              <Compass className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-sm">No trips documented yet.</p>
              {isOwnProfile && (
                <Link
                  to="/trips?action=new"
                  className="mt-4 inline-flex items-center gap-1.5 px-4.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs"
                >
                  Log Your First Trip
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default ProfilePage;
