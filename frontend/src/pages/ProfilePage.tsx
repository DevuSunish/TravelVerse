import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { TripCard, Trip } from '../components/TripCard';
import { RecommendationCard, Recommendation } from '../components/RecommendationCard';
import { 
  Globe, Compass, Award, MapPin, UserPlus, UserMinus, 
  Map, CheckSquare, Square, ChevronRight, X 
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
  id: number;
  username: string;
  email: string;
  bio?: string;
  home_country?: string;
  profile_picture?: string;
  cover_picture?: string;
  is_following: boolean;
  stats: ProfileStats;
  badges: Badge[];
}

interface ProfileTrip extends Trip {
  user_id: number;
}

export const ProfilePage: React.FC = () => {
  const { user: currentUser, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const usernameParam = searchParams.get('username') || currentUser?.username;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<ProfileTrip[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'trips' | 'recommendations'>('trips');

  // Cover image preview / saving states
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);

  // Followers & Following list modals
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

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
        const tripsData = await apiRequest(`/trips?username=${usernameParam}`);
        const userTrips = tripsData.trips || [];
        setTrips(userTrips);

        // Fetch user recommendations
        const recsData = await apiRequest(`/recommendations?username=${usernameParam}`);
        setRecommendations(recsData.recommendations || []);

        // Set checked off country codes
        // Fetch user countries visited status
        // Simply pull them from user trips in this profile view
        const codes = userTrips.filter((t: ProfileTrip) => t.status === 'past').map((t: ProfileTrip) => t.country.substring(0, 3).toUpperCase());
        setUserVisitedCodes(Array.from(new Set(codes)));
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [usernameParam]);

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedCoverFile(file);
    const preview = URL.createObjectURL(file);
    setCoverPreviewUrl(preview);
  };

  const handleSaveCover = async () => {
    if (!selectedCoverFile) return;
    setSavingCover(true);

    const formData = new FormData();
    formData.append('profilePicture', selectedCoverFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      let data: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (response.ok && data?.url) {
        await updateUser({ cover_picture: data.url });
        setProfile(prev => {
          if (!prev) return null;
          return { ...prev, cover_picture: data.url };
        });
        if (coverPreviewUrl) {
          URL.revokeObjectURL(coverPreviewUrl);
        }
        setSelectedCoverFile(null);
        setCoverPreviewUrl(null);
      } else {
        alert(data?.message || 'Failed to upload cover image.');
      }
    } catch (err) {
      console.error('Cover upload error:', err);
      alert('Failed to upload cover image.');
    } finally {
      setSavingCover(false);
    }
  };

  const handleCancelCoverUpdate = () => {
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setSelectedCoverFile(null);
    setCoverPreviewUrl(null);
  };

  const handleRemoveCover = async () => {
    try {
      await updateUser({ cover_picture: '' });
      setProfile(prev => {
        if (!prev) return null;
        return { ...prev, cover_picture: '' };
      });
    } catch (err) {
      console.error('Failed to remove cover image:', err);
      alert('Failed to remove cover image.');
    }
  };

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
        setProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            stats: {
              ...prev.stats,
              followers_count: Math.max(0, prev.stats.followers_count - 1)
            }
          };
        });
      } else {
        // Follow
        await apiRequest('/social/follow', {
          method: 'POST',
          body: { userIdToFollow: profile.id }
        });
        setProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            stats: {
              ...prev.stats,
              followers_count: prev.stats.followers_count + 1
            }
          };
        });
      }
    } catch {
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

  const handleOpenFollowersModal = async () => {
    if (!profile) return;
    setShowFollowersModal(true);
    setLoadingList(true);
    try {
      const data = await apiRequest(`/social/followers/list/${profile.id}`);
      setFollowersList(data.followers || []);
    } catch (err) {
      console.error('Failed to fetch followers list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleOpenFollowingModal = async () => {
    if (!profile) return;
    setShowFollowingModal(true);
    setLoadingList(true);
    try {
      const data = await apiRequest(`/social/following/list/${profile.id}`);
      setFollowingList(data.following || []);
    } catch (err) {
      console.error('Failed to fetch following list:', err);
    } finally {
      setLoadingList(false);
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
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-xs mb-10">
        {/* Cover Image Banner */}
        <div className="relative h-48 md:h-64 w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 dark:from-emerald-950/40 dark:to-teal-950/40 border-b border-slate-100 dark:border-slate-800/80 group">
          {coverPreviewUrl ? (
            <img
              src={coverPreviewUrl}
              alt="Profile Cover Preview"
              className="h-full w-full object-cover opacity-85 border-2 border-emerald-500"
            />
          ) : profile.cover_picture ? (
            <img
              src={profile.cover_picture}
              alt="Profile Cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/30">
              <Compass className="h-16 w-16 text-emerald-500/20 dark:text-emerald-400/15 animate-spin-slow" />
            </div>
          )}

          {/* Action buttons - Only for profile owner */}
          {isOwnProfile && (
            <div className="absolute right-4 bottom-4 flex gap-2 z-20">
              {coverPreviewUrl ? (
                <>
                  <button
                    onClick={handleSaveCover}
                    disabled={savingCover}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-655 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    <span>{savingCover ? 'Saving...' : 'Save Cover'}</span>
                  </button>
                  <button
                    onClick={handleCancelCoverUpdate}
                    disabled={savingCover}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/75 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/75 backdrop-blur-xs text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{profile.cover_picture ? 'Change Cover' : 'Upload Cover'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileSelect}
                      className="hidden"
                    />
                  </label>
                  {profile.cover_picture && (
                    <button
                      onClick={handleRemoveCover}
                      className="flex items-center justify-center p-1.5 bg-black/60 hover:bg-rose-600/80 backdrop-blur-xs text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                      title="Remove Cover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Profile Details Area */}
        <div className="p-6 md:p-8 pt-0 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          {/* Profile Pic */}
          <div className="relative shrink-0 -mt-16 md:-mt-20 z-10">
            <img
              src={profile.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
              alt={profile.username}
              className="h-28 w-28 md:h-36 md:w-36 rounded-full object-cover bg-emerald-50 border-4 border-white dark:border-slate-900 shadow-md"
            />
          </div>

          {/* Bio, name, actions */}
          <div className="flex-1 text-center md:text-left space-y-4 pt-3 md:pt-4">
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
              <button 
                onClick={handleOpenFollowersModal}
                className="hover:underline focus:outline-none cursor-pointer flex items-center font-semibold"
              >
                <span className="font-bold text-slate-800 dark:text-slate-100 mr-1">{profile.stats.followers_count}</span>
                followers
              </button>
              <button 
                onClick={handleOpenFollowingModal}
                className="hover:underline focus:outline-none cursor-pointer flex items-center font-semibold"
              >
                <span className="font-bold text-slate-800 dark:text-slate-100 mr-1">{profile.stats.following_count}</span>
                following
              </button>
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
              {profile.badges.map((badge) => (
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

        {/* Right 2 Columns: Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex gap-6 text-sm font-semibold">
              <button
                onClick={() => setActiveSubTab('trips')}
                className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                  activeSubTab === 'trips'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Trips Logged ({trips.length})
              </button>
              <button
                onClick={() => setActiveSubTab('recommendations')}
                className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                  activeSubTab === 'recommendations'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Recommendations ({recommendations.length})
              </button>
            </div>
          </div>

          {activeSubTab === 'trips' ? (
            trips.length === 0 ? (
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
                  <TripCard key={trip.id} trip={trip} isOwner={isOwnProfile} />
                ))}
              </div>
            )
          ) : (
            recommendations.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-2xl text-center text-slate-450 shadow-xs">
                <Compass className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-sm">No recommendations shared yet.</p>
                {isOwnProfile && (
                  <Link
                    to="/recommendations"
                    className="mt-4 inline-flex items-center gap-1.5 px-4.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs"
                  >
                    Share a Recommendation
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
                {recommendations.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
              </div>
            )
          )}
        </div>

      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto animate-fade-in font-sans">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-serif text-slate-800 dark:text-slate-100">Followers</h3>
              <button onClick={() => setShowFollowersModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingList ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              </div>
            ) : followersList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No followers yet.</p>
            ) : (
              <div className="space-y-3">
                {followersList.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-colors">
                    <Link to={`/profile?username=${f.username}`} onClick={() => setShowFollowersModal(false)} className="shrink-0">
                      <img
                        src={f.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                        alt={f.username}
                        className="h-10 w-10 rounded-full object-cover bg-emerald-50 border border-emerald-100 dark:border-emerald-800 cursor-pointer"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile?username=${f.username}`} onClick={() => setShowFollowersModal(false)} className="hover:underline">
                        <span className="font-bold text-slate-850 dark:text-slate-150 text-sm block cursor-pointer truncate">{f.username}</span>
                      </Link>
                      {f.home_country && (
                        <span className="text-[10px] text-slate-400 block truncate">Base: {f.home_country}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto animate-fade-in font-sans">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-serif text-slate-800 dark:text-slate-100">Following</h3>
              <button onClick={() => setShowFollowingModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingList ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              </div>
            ) : followingList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Not following anyone yet.</p>
            ) : (
              <div className="space-y-3">
                {followingList.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-colors">
                    <Link to={`/profile?username=${f.username}`} onClick={() => setShowFollowingModal(false)} className="shrink-0">
                      <img
                        src={f.profile_picture || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
                        alt={f.username}
                        className="h-10 w-10 rounded-full object-cover bg-emerald-50 border border-emerald-100 dark:border-emerald-800 cursor-pointer"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile?username=${f.username}`} onClick={() => setShowFollowingModal(false)} className="hover:underline">
                        <span className="font-bold text-slate-850 dark:text-slate-150 text-sm block cursor-pointer truncate">{f.username}</span>
                      </Link>
                      {f.home_country && (
                        <span className="text-[10px] text-slate-400 block truncate">Base: {f.home_country}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default ProfilePage;
