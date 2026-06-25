import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { 
  Plus, Search, Compass, Map, Navigation, User, Sparkles, Globe, Camera, Utensils, X, MapPin, Check, ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Trekking', icon: Compass, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
  { name: 'Backpacking', icon: Map, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/20' },
  { name: 'Road Trips', icon: Navigation, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
  { name: 'Solo Travel', icon: User, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
  { name: 'Adventure', icon: Sparkles, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' },
  { name: 'International Travel', icon: Globe, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20' },
  { name: 'Photography', icon: Camera, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
  { name: 'Food Exploration', icon: Utensils, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' }
];

export const CommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'explore' | 'my'>('explore');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalCategory, setModalCategory] = useState(CATEGORIES[0].name);
  const [modalDestination, setModalDestination] = useState('');
  const [modalRules, setModalRules] = useState('');
  const [modalRequiresApproval, setModalRequiresApproval] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCommunitiesList = async () => {
    try {
      setLoading(true);
      const queryParams: string[] = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (destination) queryParams.push(`destination=${encodeURIComponent(destination)}`);
      if (selectedCategory) queryParams.push(`category=${encodeURIComponent(selectedCategory)}`);
      if (activeTab === 'my') queryParams.push('my=true');

      const url = `/communities?${queryParams.join('&')}`;
      const data = await apiRequest(url);
      setCommunities(data.communities || []);
    } catch (err) {
      console.error('Failed to retrieve communities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunitiesList();
  }, [activeTab, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCommunitiesList();
  };

  const handleJoinLeave = async (commId: number, currentStatus: string | null) => {
    try {
      if (currentStatus === 'accepted' || currentStatus === 'pending') {
        await apiRequest(`/communities/${commId}/leave`, { method: 'POST' });
        setCommunities(prev => prev.map(c => {
          if (c.id === commId) {
            return {
              ...c,
              membership_status: null,
              member_count: currentStatus === 'accepted' ? Math.max(0, c.member_count - 1) : c.member_count
            };
          }
          return c;
        }));
      } else {
        const res = await apiRequest(`/communities/${commId}/join`, { method: 'POST' });
        setCommunities(prev => prev.map(c => {
          if (c.id === commId) {
            return {
              ...c,
              membership_status: res.status,
              member_count: res.status === 'accepted' ? c.member_count + 1 : c.member_count
            };
          }
          return c;
        }));
      }
    } catch (e: any) {
      console.error('Join/Leave community failed:', e);
    }
  };

  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', modalName);
      formData.append('description', modalDescription);
      formData.append('category', modalCategory);
      formData.append('destination', modalDestination);
      formData.append('rules', modalRules);
      formData.append('requires_approval', modalRequiresApproval.toString());

      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const response = await fetch('http://localhost:5000/api/communities', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create community');
      }

      // Success
      setIsModalOpen(false);
      // Reset form
      setModalName('');
      setModalDescription('');
      setModalCategory(CATEGORIES[0].name);
      setModalDestination('');
      setModalRules('');
      setModalRequiresApproval(false);
      setCoverFile(null);
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
        setCoverPreviewUrl(null);
      }

      // Refresh list and navigate
      await fetchCommunitiesList();
      if (responseData.community?.id) {
        navigate(`/communities/${responseData.community.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while creating community');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">Travel Communities</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Join interest-based or destination-based communities to connect with fellow globetrotters.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Create Community
        </button>
      </div>

      {/* Discovery Search & Filter bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 shadow-xs mb-8 flex flex-col md:flex-row gap-4">
        
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search communities by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="w-full md:w-64 relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Filter by destination..."
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button 
          type="submit"
          className="px-6 py-3 bg-slate-850 hover:bg-slate-750 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
        >
          Apply Filters
        </button>

      </form>

      {/* Categories Horizontal Carousel */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">Filter by Category</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border ${
              selectedCategory === null 
                ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            All Categories
          </button>
          
          {CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            const isSelected = selectedCategory === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border ${
                  isSelected 
                    ? 'bg-emerald-550 border-emerald-550 text-white dark:bg-emerald-500 dark:border-emerald-550' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <IconComponent className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-slate-550 dark:text-slate-350'}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('explore')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'explore' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-450' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Explore Communities ({communities.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'my' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-450' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          My Communities
        </button>
      </div>

      {/* Communities Main Grid List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : communities.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-16 text-center text-slate-400 max-w-lg mx-auto">
          <Globe className="h-12 w-12 mx-auto text-slate-350 opacity-50 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-350">No communities found</h3>
          <p className="text-xs text-slate-450 mt-1.5">
            {activeTab === 'my' 
              ? "You haven't joined any communities yet! Switch to Explore Communities to discover some."
              : "We couldn't find any communities matching your search criteria. Try a different keyword or category."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((comm) => {
            const isUserJoined = comm.membership_status === 'accepted';
            const isUserPending = comm.membership_status === 'pending';

            return (
              <div 
                key={comm.id} 
                className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-xs hover-card flex flex-col justify-between"
              >
                <div>
                  {/* Cover image area */}
                  <div 
                    className="h-40 w-full bg-cover bg-center relative cursor-pointer"
                    style={{ backgroundImage: `url(${comm.cover_image})` }}
                    onClick={() => navigate(`/communities/${comm.id}`)}
                  >
                    <div className="absolute top-3 right-3 bg-slate-950/60 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      {comm.category}
                    </div>
                  </div>

                  {/* Info area */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 
                        className="text-base font-bold text-slate-800 dark:text-slate-100 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer line-clamp-1"
                        onClick={() => navigate(`/communities/${comm.id}`)}
                      >
                        {comm.name}
                      </h3>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 block mt-1">
                      {comm.member_count} {comm.member_count === 1 ? 'member' : 'members'}
                    </span>

                    {comm.destination && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-450 dark:text-slate-400 mt-2 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        <span>{comm.destination}</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-3 min-h-[3rem] leading-normal">
                      {comm.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Footer Join Action */}
                <div className="p-5 pt-0 border-t border-slate-50 dark:border-slate-800/40 mt-3 flex items-center justify-between gap-3">
                  <button
                    onClick={() => navigate(`/communities/${comm.id}`)}
                    className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    <span>View Feed</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleJoinLeave(comm.id, comm.membership_status)}
                    disabled={isUserPending}
                    className={`py-2 px-4 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                      isUserJoined 
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        : isUserPending
                        ? 'bg-amber-55/20 border border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                    }`}
                  >
                    {isUserJoined ? 'Leave' : isUserPending ? 'Pending' : 'Join'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Create Community Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 font-serif">Create a Travel Community</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold mb-4 leading-normal">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Community Name *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Bali Digital Nomads"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-200 border border-slate-250 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-200 border border-slate-250 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Destination (optional)
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Bali, Indonesia"
                    value={modalDestination}
                    onChange={(e) => setModalDestination(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-200 border border-slate-250 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Cover Image
                </label>

                {/* Upload-only zone with preview */}
                {coverFile && coverPreviewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20">
                    <img
                      src={coverPreviewUrl}
                      alt="Cover preview"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-between p-3">
                      <span className="text-white text-[10px] font-bold truncate max-w-[65%]">{coverFile.name}</span>
                      <div className="flex gap-1.5">
                        <label className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors">
                          <Camera className="h-3.5 w-3.5" />
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                                setCoverFile(file);
                                setCoverPreviewUrl(URL.createObjectURL(file));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                            setCoverFile(null);
                            setCoverPreviewUrl(null);
                          }}
                          className="flex items-center justify-center p-1.5 bg-black/50 hover:bg-rose-600/80 text-white rounded-lg transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-all bg-slate-50 dark:bg-slate-950 group">
                    <Camera className="h-7 w-7 text-slate-350 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Upload Cover Image
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, GIF up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                          setCoverFile(file);
                          setCoverPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Description *
                </label>
                <textarea 
                  required
                  placeholder="Describe your community..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-200 border border-slate-250 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Community Rules (optional)
                </label>
                <textarea 
                  placeholder="e.g. 1. Respect other travelers. 2. No spam or commercial posts."
                  value={modalRules}
                  onChange={(e) => setModalRules(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-855 dark:text-slate-200 border border-slate-250 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2.5 py-2">
                <input 
                  type="checkbox"
                  id="requiresApproval"
                  checked={modalRequiresApproval}
                  onChange={(e) => setModalRequiresApproval(e.target.checked)}
                  className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="requiresApproval" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                  Requires Admin Approval to Join (Private Request)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>Creating...</>
                  ) : (
                    <>Create Community</>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
