import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, API_BASE_URL } from '../services/api';
import { 
  Calendar, MapPin, Image as ImageIcon, 
  Clock, Save, Trash2, ArrowLeft,
  Utensils, Compass, Hotel, Landmark, Car, HelpCircle,
  Upload, X
} from 'lucide-react';

interface Itinerary {
  id: number;
  day_number: number;
  date?: string;
  notes?: string;
}

interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
}

interface Photo {
  id: number;
  photo_url: string;
  caption?: string;
}

interface Trip {
  id: number;
  title: string;
  city?: string;
  country: string;
  start_date?: string;
  end_date?: string;
  budget: number;
  cover_image?: string;
  itineraries: Itinerary[];
  expenses: Expense[];
  photos: Photo[];
}

export const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tab selector
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'photos'>('itinerary');

  // Interactive Itinerary Form
  const [selectedDay, setSelectedDay] = useState<Itinerary | null>(null);
  const [itineraryNotes, setItineraryNotes] = useState('');
  const [savingItinerary, setSavingItinerary] = useState(false);

  // Expense Form
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expCategory, setExpCategory] = useState('Food');
  const [addingExpense, setAddingExpense] = useState(false);

  // Photo Form
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);

  // Direct upload states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/profile/upload`, {
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
        setPhotoUrl(data.url);
      } else {
        setUploadError(data?.message || 'Failed to upload photo.');
        setPreviewUrl(null);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload photo.');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  // Load details
  const loadTripDetails = async () => {
    try {
      const data = await apiRequest(`/trips/${id}`);
      setTrip(data.trip);
      if (data.trip?.itineraries?.length > 0) {
        setSelectedDay(data.trip.itineraries[0]);
        setItineraryNotes(data.trip.itineraries[0].notes || '');
      }
    } catch (err) {
      console.error('Failed to load trip details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTripDetails();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDaySelect = (day: Itinerary) => {
    setSelectedDay(day);
    setItineraryNotes(day.notes || '');
  };

  // Itinerary save
  const handleSaveItinerary = async () => {
    if (!selectedDay || !trip) return;
    setSavingItinerary(true);
    try {
      await apiRequest('/trips/itinerary', {
        method: 'POST',
        body: {
          trip_id: Number(id),
          day_number: selectedDay.day_number,
          date: selectedDay.date,
          notes: itineraryNotes
        }
      });
      // Refresh local data
      const updatedItineraryList = trip.itineraries.map((it: Itinerary) => {
        if (it.day_number === selectedDay.day_number) {
          return { ...it, notes: itineraryNotes };
        }
        return it;
      });
      setTrip({ ...trip, itineraries: updatedItineraryList });
      // Update selected
      setSelectedDay({ ...selectedDay, notes: itineraryNotes });
    } catch (err) {
      console.error('Failed to save itinerary notes:', err);
    } finally {
      setSavingItinerary(false);
    }
  };

  // Expense save
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !expDesc || !expCategory || !trip) return;
    setAddingExpense(true);

    try {
      const data = await apiRequest('/expenses', {
        method: 'POST',
        body: {
          trip_id: Number(id),
          amount: parseFloat(expAmount),
          description: expDesc,
          category: expCategory
        }
      });
      if (data.expense) {
        setTrip({
          ...trip,
          expenses: [data.expense, ...(trip.expenses || [])]
        });
        setExpAmount('');
        setExpDesc('');
        setExpCategory('Food');
      }
    } catch (err) {
      console.error('Add expense failed:', err);
    } finally {
      setAddingExpense(false);
    }
  };

  // Expense delete
  const handleDeleteExpense = async (expId: number) => {
    if (!window.confirm('Delete this expense?') || !trip) return;
    try {
      await apiRequest(`/expenses/${expId}`, { method: 'DELETE' });
      setTrip({
        ...trip,
        expenses: trip.expenses.filter((e: Expense) => e.id !== expId)
      });
    } catch (err) {
      console.error('Delete expense failed:', err);
    }
  };

  // Photo save
  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl || !trip) return;
    setAddingPhoto(true);

    try {
      const data = await apiRequest('/trips/photos', {
        method: 'POST',
        body: {
          trip_id: Number(id),
          photo_url: photoUrl,
          caption: photoCaption
        }
      });
      if (data.photo) {
        setTrip({
          ...trip,
          photos: [...(trip.photos || []), data.photo]
        });
        setPhotoUrl('');
        setPhotoCaption('');
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
      }
    } catch (err) {
      console.error('Add photo failed:', err);
    } finally {
      setAddingPhoto(false);
    }
  };

  // Computations
  const getExpenseMetrics = () => {
    const expensesList = trip?.expenses || [];
    let totalSpent = 0;
    const categories: { [cat: string]: number } = {
      'Food': 0, 'Lodging': 0, 'Transport': 0, 'Activities': 0, 'Shopping': 0, 'Other': 0
    };

    expensesList.forEach((exp: Expense) => {
      const val = typeof exp.amount === 'number' ? exp.amount : parseFloat((exp.amount as string) || '0');
      totalSpent += val;
      if (categories[exp.category] !== undefined) {
        categories[exp.category] += val;
      } else {
        categories['Other'] += val;
      }
    });

    return { totalSpent, categories };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-slate-500 font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20 font-sans">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Trip not found</h3>
        <Link to="/trips" className="text-emerald-500 font-bold hover:underline mt-2 inline-block">Back to trips list</Link>
      </div>
    );
  }

  const { totalSpent, categories } = getExpenseMetrics();
  const budgetRatio = trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;

  // Icon mapping for categories
  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'Food': Utensils,
    'Lodging': Hotel,
    'Transport': Car,
    'Activities': Compass,
    'Shopping': Landmark,
    'Other': HelpCircle
  };

  const categoryColors: { [key: string]: string } = {
    'Food': 'bg-rose-500',
    'Lodging': 'bg-indigo-500',
    'Transport': 'bg-blue-500',
    'Activities': 'bg-emerald-500',
    'Shopping': 'bg-amber-500',
    'Other': 'bg-slate-500'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Back button */}
      <Link to="/trips" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors mb-6">
        <ArrowLeft className="h-4.5 w-4.5" />
        Back to Trips
      </Link>

      {/* Hero Header Banner */}
      <div className="relative h-[250px] sm:h-[350px] rounded-3xl overflow-hidden bg-slate-900 shadow-md mb-8">
        <img
          src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200'}
          alt={trip.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        
        {/* Banner Details */}
        <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <MapPin className="h-4 w-4" />
              <span>{trip.city ? `${trip.city}, ` : ''}{trip.country}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight leading-none">
              {trip.title}
            </h1>
            <p className="text-slate-300 font-medium text-xs sm:text-sm mt-2 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {trip.start_date ? `${new Date(trip.start_date).toLocaleDateString()} - ${trip.end_date ? new Date(trip.end_date).toLocaleDateString() : ''}` : 'Flexible'}
            </p>
          </div>

          {/* Budget quick info */}
          <div className="flex gap-4 text-xs font-bold shrink-0">
            <div className="bg-white/10 border border-white/20 p-3 rounded-xl min-w-[90px] text-center backdrop-blur-xs">
              <span className="text-slate-300 uppercase text-[9px] block mb-0.5">Budget</span>
              <span className="text-base font-black">${Math.round(trip.budget)}</span>
            </div>
            <div className="bg-white/10 border border-white/20 p-3 rounded-xl min-w-[90px] text-center backdrop-blur-xs">
              <span className="text-slate-300 uppercase text-[9px] block mb-0.5">Spent</span>
              <span className={`text-base font-black ${totalSpent > trip.budget ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${Math.round(totalSpent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`pb-4 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'itinerary'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Daily Itinerary
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-4 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Expense Planner
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`pb-4 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'photos'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Photo Gallery ({trip.photos?.length || 0})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ITINERARY TAB PANEL */}
        {activeTab === 'itinerary' && (
          <>
            {/* Days Left Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Trip Schedule</h3>
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                {trip.itineraries?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No dates scheduled. Update start and end dates to generate days!</p>
                ) : (
                  trip.itineraries.map((day: Itinerary) => (
                    <button
                      key={day.id}
                      onClick={() => handleDaySelect(day)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        selectedDay?.day_number === day.day_number
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                          : 'bg-white border-slate-100 dark:bg-slate-950 dark:border-slate-850 hover:bg-slate-50 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>Day {day.day_number}</span>
                      <span className="text-[10px] text-slate-400">{day.date ? new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Selected Day Details Panel */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs">
              {selectedDay ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100">Day {selectedDay.day_number} Plan</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedDay.date ? new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
                    </div>
                    
                    <button
                      onClick={handleSaveItinerary}
                      disabled={savingItinerary}
                      className="px-4.5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      {savingItinerary ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>

                  {/* Notes text area */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Day Schedule & Notes</label>
                    <textarea
                      value={itineraryNotes}
                      onChange={(e) => setItineraryNotes(e.target.value)}
                      placeholder="Write your day schedule, tourist stops, directions, ticket confirmation numbers..."
                      rows={12}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-4 text-sm dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-relaxed font-sans"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-450">
                  <Clock className="h-10 w-10 mx-auto text-slate-350 mb-2" />
                  <p className="text-sm font-semibold">Select a schedule day to write logs</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* EXPENSES TAB PANEL */}
        {activeTab === 'expenses' && (
          <>
            {/* Category Breakdown list (Progress Bars) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Budget Breakdown</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Distribution by category</p>
              </div>

              {/* Progress Bar of total budget */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Budget Consumed</span>
                  <span className={budgetRatio > 100 ? 'text-rose-500' : 'text-emerald-500'}>
                    {budgetRatio.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${budgetRatio > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, budgetRatio)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                  <span>Spent: ${Math.round(totalSpent)}</span>
                  <span>Limit: ${Math.round(trip.budget)}</span>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* Individual Category List */}
              <div className="space-y-4">
                {Object.keys(categories).map((cat) => {
                  const amt = categories[cat];
                  const ratio = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                  const Icon = categoryIcons[cat];
                  const barColor = categoryColors[cat];

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          <span className={`p-1 rounded-md text-white ${barColor}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          {cat}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ${Math.round(amt)} <span className="text-[10px] text-slate-400 font-normal">({ratio.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add & List panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Add Expense Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Add Expense</h3>
                <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Dinner at local bistro"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                    />
                  </div>
                  
                  <div className="w-full sm:w-[120px]">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        required
                        placeholder="45"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-6 pr-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="w-full sm:w-[130px]">
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                    >
                      <option value="Food">Dining (Food)</option>
                      <option value="Lodging">Lodging</option>
                      <option value="Transport">Transit</option>
                      <option value="Activities">Activities</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={addingExpense}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Expense entries list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Expense Ledger</h3>
                
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {trip.expenses?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No expenses logged yet. Save receipts above!</p>
                  ) : (
                    trip.expenses.map((exp: Expense) => {
                      const CatIcon = categoryIcons[exp.category] || HelpCircle;
                      const catColor = categoryColors[exp.category];

                      return (
                        <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className={`p-1.5 rounded-lg text-white ${catColor}`}>
                              <CatIcon className="h-4 w-4" />
                            </span>
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-200 block leading-tight">{exp.description}</span>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wide">{exp.category}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">${exp.amount}</span>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          </>
        )}

        {/* PHOTOS TAB PANEL */}
        {activeTab === 'photos' && (
          <>
            {/* Add Photo Form Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Upload Memories</h3>
              <p className="text-xs text-slate-450 mb-5">Drag and drop or select an image file to publish on your gallery wall.</p>

              {uploadError && (
                <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-600 text-xs font-semibold">
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleAddPhoto} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Image File</label>
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 transition-all min-h-[120px] ${
                      dragActive 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    {previewUrl || photoUrl ? (
                      <div className="relative w-full h-[120px] rounded-xl overflow-hidden group">
                        <img 
                          src={previewUrl || photoUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Uploading...</span>
                          </div>
                        )}
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoUrl('');
                              setPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full py-2 text-center">
                        <Upload className="h-6 w-6 text-slate-400 dark:text-slate-600 mb-1" />
                        <p className="text-xs text-slate-650 dark:text-slate-400 font-medium">
                          Drag and drop your image, or <span className="text-emerald-500 font-bold hover:underline">browse</span>
                        </p>
                        <p className="text-[8px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">PNG, JPG, GIF up to 5MB</p>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileChange(e.target.files[0]);
                            }
                          }}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-450">Caption (Optional)</label>
                  <input
                    type="text"
                    placeholder="Sunset overlooking the ocean"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingPhoto || uploading || !photoUrl}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {addingPhoto ? 'Publishing...' : uploading ? 'Uploading image...' : 'Add Image to Gallery'}
                </button>
              </form>
            </div>

            {/* Photos Grid Display */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Trip Gallery</h3>
              
              {trip.photos?.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <ImageIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No pictures logged for this trip</p>
                  <p className="text-xs text-slate-450 mt-1">Upload images in the side tray to catalog photo memories.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {trip.photos.map((ph: Photo) => (
                    <div key={ph.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-150">
                      <img
                        src={ph.photo_url}
                        alt={ph.caption}
                        className="w-full h-full object-cover"
                      />
                      {ph.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white p-2 text-[10px] font-medium leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                          {ph.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </>
        )}

      </div>

    </div>
  );
};
export default TripDetails;
