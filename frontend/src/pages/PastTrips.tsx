import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { TripCard, Trip } from '../components/TripCard';
import { LeafletMap } from '../components/LeafletMap';
import { 
  Plus, Calendar, MapPin, Grid, List, Map, 
  Image as ImageIcon, DollarSign, X, Check, FileText, Compass
} from 'lucide-react';

export const PastTrips: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAction = searchParams.get('action') === 'new';

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'gallery' | 'map'>('timeline');

  // Form states
  const [showForm, setShowForm] = useState(initialAction);
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'past' | 'planned' | 'wishlist'>('past');
  const [coverImage, setCoverImage] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/trips');
      setTrips(data.trips || []);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Update showForm state if query parameter changes
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleCloseForm = () => {
    setShowForm(false);
    // remove action query param
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('action');
    setSearchParams(newParams);
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!title || !country) {
      setError('Title and Country are required.');
      setSubmitting(false);
      return;
    }

    try {
      const body = {
        title,
        country,
        city,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        description,
        status,
        cover_image: coverImage || undefined,
        budget: budget ? parseFloat(budget) : undefined
      };

      const res = await apiRequest('/trips', {
        method: 'POST',
        body
      });

      if (res.trip) {
        // Reset form
        setTitle('');
        setCountry('');
        setCity('');
        setStartDate('');
        setEndDate('');
        setDescription('');
        setStatus('past');
        setCoverImage('');
        setBudget('');
        handleCloseForm();
        fetchTrips();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log trip. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrip = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this trip log? All associated daily plans and expenses will be deleted.')) return;
    try {
      await apiRequest(`/trips/${id}`, { method: 'DELETE' });
      setTrips(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  // Compile coordinates list for Leaflet view
  const mapLocations = trips
    .filter(t => t.status === 'past') // Only pin actual visited trips
    .map(t => {
      // For demo mock locations, if lat/lng are missing we can assign standard coordinates based on country codes
      // Let's create standard centers for popular countries:
      const locationsCenter: { [key: string]: { lat: number; lng: number } } = {
        'FRA': { lat: 46.2276, lng: 2.2137 },
        'ESP': { lat: 40.4637, lng: -3.7492 },
        'USA': { lat: 37.0902, lng: -95.7129 },
        'ITA': { lat: 41.8719, lng: 12.5674 },
        'JPN': { lat: 36.2048, lng: 138.2529 },
        'GBR': { lat: 55.3781, lng: -3.4360 },
        'DEU': { lat: 51.1657, lng: 10.4515 },
        'CAN': { lat: 56.1304, lng: -106.3468 },
        'MEX': { lat: 23.6345, lng: -102.5528 },
        'THA': { lat: 15.8700, lng: 100.9925 },
        'PER': { lat: -9.1900, lng: -75.0152 }
      };

      const code = t.country.substring(0, 3).toUpperCase();
      const coord = locationsCenter[code] || { lat: 30 + Math.random() * 20, lng: -30 + Math.random() * 60 };
      
      return {
        id: t.id,
        name: t.city ? `${t.city}, ${t.country}` : t.country,
        lat: coord.lat,
        lng: coord.lng,
        description: t.title
      };
    });

  // Extract all photos from trips
  const galleryPhotos: { id: number, tripId: number, url: string, caption: string, title: string }[] = [];
  trips.forEach((t) => {
    if (t.photos && t.photos.length > 0) {
      t.photos.forEach((ph: any) => {
        galleryPhotos.push({
          id: ph.id,
          tripId: t.id,
          url: ph.photo_url,
          caption: ph.caption || '',
          title: t.title
        });
      });
    } else if (t.status === 'past') {
      // Fallback: use cover image as gallery item
      galleryPhotos.push({
        id: Math.random(),
        tripId: t.id,
        url: t.cover_image,
        caption: t.city ? `${t.city}, ${t.country}` : t.country,
        title: t.title
      });
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">Documented Journeys</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review your timeline, explore map coordinates, and see your gallery walls.</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Add Trip Log
        </button>
      </div>

      {/* View Toggle Bar */}
      <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800/40 p-1 rounded-xl max-w-sm mb-8 text-xs font-semibold">
        <button
          onClick={() => setViewMode('timeline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
            viewMode === 'timeline'
              ? 'bg-white dark:bg-slate-850 shadow-xs text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <List className="h-4.5 w-4.5" />
          Timeline View
        </button>
        <button
          onClick={() => setViewMode('gallery')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
            viewMode === 'gallery'
              ? 'bg-white dark:bg-slate-850 shadow-xs text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Grid className="h-4.5 w-4.5" />
          Gallery Wall
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all ${
            viewMode === 'map'
              ? 'bg-white dark:bg-slate-850 shadow-xs text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Map className="h-4.5 w-4.5" />
          Pin Routes
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh] text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-16 rounded-3xl text-center text-slate-400 max-w-2xl mx-auto shadow-xs">
          <Compass className="h-16 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-serif text-xl font-bold text-slate-800 dark:text-white mb-2">No trips logged yet</h3>
          <p className="text-sm text-slate-500 mb-6">Create a trip log to document your stories, expenses, and photos on the world map!</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs"
          >
            Create Your First Log
          </button>
        </div>
      ) : (
        <>
          {/* Timeline Layout */}
          {viewMode === 'timeline' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
              ))}
            </div>
          )}

          {/* Gallery view */}
          {viewMode === 'gallery' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
              {galleryPhotos.map((photo, idx) => (
                <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden shadow-xs bg-slate-100 dark:bg-slate-800">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/45 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">{photo.title}</span>
                    <p className="text-xs font-bold text-white leading-normal mt-0.5 line-clamp-1">{photo.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Map View */}
          {viewMode === 'map' && (
            <div className="h-[60vh] w-full animate-fade-in">
              <LeafletMap locations={mapLocations} />
            </div>
          )}
        </>
      )}

      {/* Floating Create Trip Form Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in font-sans">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">Create Travel Log</h3>
              <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Trip Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Autumn in Paris"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Trip Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  >
                    <option value="past">Completed Trip (Past)</option>
                    <option value="planned">Upcoming Trip (Planned)</option>
                    <option value="wishlist">Bucket List (Wishlist)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Country</label>
                  <input
                    type="text"
                    required
                    placeholder="France"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">City (Optional)</label>
                  <input
                    type="text"
                    placeholder="Paris"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Cover Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Total Budget (USD)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Description / Memories</label>
                <textarea
                  placeholder="Tell your story. What was the best part of this adventure?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Logging...' : 'Save Log Entry'}
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
export default PastTrips;
