import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { RecommendationCard, Recommendation } from '../components/RecommendationCard';
import { 
  Search, Plus, X, Star, Compass, AlertCircle
} from 'lucide-react';

export const RecommendationsFeed: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('Food');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [tips, setTips] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [howToReach, setHowToReach] = useState('');
  const [bestTimeToVisit, setBestTimeToVisit] = useState('');
  const [photos, setPhotos] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesList = ['Food', 'Nature', 'Beach', 'Adventure', 'Shopping', 'Historical', 'Other'];

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let queryUrl = '/recommendations';
      const params: string[] = [];
      
      if (selectedCategory) {
        params.push(`category=${selectedCategory}`);
      }
      if (search) {
        params.push(`search=${encodeURIComponent(search)}`);
      }
      if (params.length > 0) {
        queryUrl += `?${params.join('&')}`;
      }

      const data = await apiRequest(queryUrl);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchRecommendations();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory]);

  const handleCreateRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!placeName || !country || !review || !rating) {
      setError('Please fill in place name, country, rating, and review.');
      setSubmitting(true);
      return;
    }

    try {
      const body = {
        place_name: placeName,
        country,
        category,
        rating,
        review,
        tips: tips || undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        how_to_reach: howToReach || undefined,
        best_time_to_visit: bestTimeToVisit || undefined,
        photos: photos || undefined
      };

      await apiRequest('/recommendations', {
        method: 'POST',
        body
      });

      // Clear states
      setPlaceName('');
      setCountry('');
      setCategory('Food');
      setRating(5);
      setReview('');
      setTips('');
      setEstimatedCost('');
      setHowToReach('');
      setBestTimeToVisit('');
      setPhotos('');
      setShowForm(false);
      fetchRecommendations();
    } catch (err: unknown) {
      const errorObject = err as { message?: string };
      setError(errorObject.message || 'Failed to submit recommendation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeToggle = (id: number, nowLiked: boolean) => {
    // Sync recommendations counts locally
    setRecommendations(prev => 
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            is_liked: nowLiked,
            likes_count: nowLiked ? Number(r.likes_count) + 1 : Math.max(0, Number(r.likes_count) - 1)
          };
        }
        return r;
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">Discovery & Recommendations</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Discover hidden gems, local foods, beach getaways, and adventure trails.</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Share Recommendation
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search attractions, cities, or food places..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-white placeholder-slate-450 text-sm focus:outline-none transition-colors"
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-950'
                : 'bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800'
            }`}
          >
            All Categories
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Feed List */}
      {loading ? (
        <div className="flex justify-center items-center h-[40vh] text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-16 rounded-3xl text-center text-slate-400 max-w-2xl mx-auto shadow-xs">
          <Compass className="h-14 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-white mb-2">No recommendations found</h3>
          <p className="text-xs text-slate-500">Try tweaking your search keywords or be the first to share a recommendation for this category!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
          {recommendations.map((rec) => (
            <RecommendationCard 
              key={rec.id} 
              rec={rec} 
              onLikeToggle={handleLikeToggle}
            />
          ))}
        </div>
      )}

      {/* Share Recommendation overlay Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in font-sans">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">Share Attraction</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-50 border border-rose-205 p-3 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateRecommendation} className="space-y-4 text-xs font-semibold">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Place Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Eiffel Tower"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Country</label>
                  <input
                    type="text"
                    required
                    placeholder="France"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Rating (1-5 Stars)</label>
                  <div className="flex items-center gap-1 h-9">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i + 1)}
                        className="p-1 focus:outline-none"
                      >
                        <Star className={`h-5 w-5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Est. Cost (USD)</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">How to Reach</label>
                  <input
                    type="text"
                    placeholder="Metro Line 6, Bir-Hakeim Station"
                    value={howToReach}
                    onChange={(e) => setHowToReach(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Best Time to Visit</label>
                  <input
                    type="text"
                    placeholder="Sunset hours, or Spring season"
                    value={bestTimeToVisit}
                    onChange={(e) => setBestTimeToVisit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-450">Photo URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={photos}
                  onChange={(e) => setPhotos(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-450">Review Description</label>
                <textarea
                  required
                  placeholder="Write your review here. What did you like? What was the experience like?"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-450">Travel Tips / Secrets</label>
                <input
                  type="text"
                  placeholder="Pre-book online tickets to avoid 2-hour queue!"
                  value={tips}
                  onChange={(e) => setTips(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Post Recommendation'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
export default RecommendationsFeed;
