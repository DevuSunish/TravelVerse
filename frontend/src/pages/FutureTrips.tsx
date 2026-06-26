import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import {
  Plus, X, Calendar, Clock, MapPin, DollarSign, CheckSquare, Square,
  Trash2, ListTodo, Plane, Backpack, Target,
  FileText, ExternalLink, Loader2, Users, Briefcase, Star, Zap,
  CheckCircle2, AlertCircle, Save, ArrowLeft
} from 'lucide-react';
import { Trip } from '../components/TripCard';

// ─── Local Types ─────────────────────────────────────────────────────────────

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

type WorkspaceTab = 'checklist' | 'itinerary' | 'budget' | 'notes';

type TravelType = 'Solo' | 'Friends' | 'Family' | 'Adventure' | 'Business' | 'Romantic' | 'Backpacking';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysRemaining(startDate?: string): number | null {
  if (!startDate) return null;
  const diff = new Date(startDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
}

function formatDateShort(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTripDuration(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
}

// Planning status derived from checklist progress
function getPlanningStatus(ratio: number): { label: string; color: string; bg: string; dot: string } {
  if (ratio >= 100) return { label: 'All Set! ✓', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40', dot: 'bg-emerald-500' };
  if (ratio >= 71)  return { label: 'Ready to Go', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40', dot: 'bg-teal-500' };
  if (ratio >= 31)  return { label: 'Booked', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40', dot: 'bg-amber-500' };
  return { label: 'Planning', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40', dot: 'bg-blue-500' };
}

const DEFAULT_CHECKLIST: Omit<TodoItem, 'id'>[] = [
  { text: 'Confirm flight tickets', done: false },
  { text: 'Book accommodation', done: false },
  { text: 'Check passport validity (>6 months)', done: false },
  { text: 'Get travel insurance', done: false },
  { text: 'Exchange currency / set up travel card', done: false },
  { text: 'Pack essentials & clothing', done: false },
];

const TRAVEL_TYPES: TravelType[] = ['Solo', 'Friends', 'Family', 'Adventure', 'Business', 'Romantic', 'Backpacking'];

const TRAVEL_TYPE_ICONS: Record<TravelType, React.ReactNode> = {
  Solo: <Star className="h-3.5 w-3.5" />,
  Friends: <Users className="h-3.5 w-3.5" />,
  Family: <Users className="h-3.5 w-3.5" />,
  Adventure: <Zap className="h-3.5 w-3.5" />,
  Business: <Briefcase className="h-3.5 w-3.5" />,
  Romantic: <Star className="h-3.5 w-3.5" />,
  Backpacking: <Backpack className="h-3.5 w-3.5" />,
};

// ─── Create Trip Modal ────────────────────────────────────────────────────────

interface CreateTripModalProps {
  onClose: () => void;
  onCreate: (trip: Trip) => void;
}

const CreateTripModal: React.FC<CreateTripModalProps> = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    title: '',
    country: '',
    city: '',
    start_date: '',
    end_date: '',
    budget: '',
    travelType: 'Solo' as TravelType,
    notes: '',
    cover_image: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.country.trim()) {
      setError('Trip name and destination are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const description = `[${form.travelType}] ${form.notes}`.trim();
      const data = await apiRequest<{ trip: Trip }>('/trips', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          budget: parseFloat(form.budget) || 0,
          description,
          status: 'planned',
          cover_image: form.cover_image.trim() || undefined,
        },
      });
      onCreate(data.trip);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create trip. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 to-teal-500/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-sm">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Plan a New Trip</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Start organizing your next adventure</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Trip Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Trip Name *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Winter Escape to Goa"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              required
            />
          </div>

          {/* Destination row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Country / Destination *</label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="e.g. India"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">City / Region</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Goa"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Departure Date</label>
              <input
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Return Date</label>
              <input
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Budget + Travel Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Estimated Budget (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="budget"
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Travel Type</label>
              <select
                name="travelType"
                value={form.travelType}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                {TRAVEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Cover Photo URL <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              name="cover_image"
              value={form.cover_image}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Notes & Initial Ideas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Anything you want to remember — visa requirements, must-see places, accommodation ideas..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plane className="h-4 w-4" />}
              {submitting ? 'Creating...' : 'Create Trip Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Trip Workspace Panel ─────────────────────────────────────────────────────

interface TripWorkspaceProps {
  trip: Trip;
  onBack: () => void;
}

const TripWorkspace: React.FC<TripWorkspaceProps> = ({ trip, onBack }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('checklist');
  const [checklist, setChecklist] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const daysLeft = getDaysRemaining(trip.start_date);
  const duration = getTripDuration(trip.start_date, trip.end_date);

  // Extract notes from description (strip travel type prefix)
  const rawNotes = trip.description?.replace(/^\[.*?\]\s*/, '') || '';

  useEffect(() => {
    // Load checklist
    const saved = localStorage.getItem(`checklist_trip_${trip.id}`);
    if (saved) {
      setChecklist(JSON.parse(saved));
    } else {
      const defaults: TodoItem[] = DEFAULT_CHECKLIST.map((item, idx) => ({ ...item, id: idx + 1 }));
      setChecklist(defaults);
      localStorage.setItem(`checklist_trip_${trip.id}`, JSON.stringify(defaults));
    }
    setNotes(rawNotes);
    setNotesSaved(false);
  }, [trip.id]);

  const completedCount = checklist.filter(t => t.done).length;
  const progressRatio = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
  const planningStatus = getPlanningStatus(progressRatio);

  const saveChecklist = (updated: TodoItem[]) => {
    setChecklist(updated);
    localStorage.setItem(`checklist_trip_${trip.id}`, JSON.stringify(updated));
  };

  const handleToggle = (id: number) => saveChecklist(checklist.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const handleDeleteTodo = (id: number) => saveChecklist(checklist.filter(t => t.id !== id));
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    saveChecklist([...checklist, { id: Date.now(), text: newTodo.trim(), done: false }]);
    setNewTodo('');
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const travelType = trip.description?.match(/^\[(.*?)\]/)?.[1] || 'Solo';
      await apiRequest(`/trips/${trip.id}`, {
        method: 'PUT',
        body: {
          title: trip.title,
          country: trip.country,
          city: trip.city,
          start_date: trip.start_date,
          end_date: trip.end_date,
          description: `[${travelType}] ${notes}`,
          status: trip.status,
          cover_image: trip.cover_image,
          budget: trip.budget,
        },
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
    } catch {
      // fail silently
    } finally {
      setSavingNotes(false);
    }
  };

  const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'checklist', label: 'Checklist', icon: <ListTodo className="h-4 w-4" /> },
    { id: 'itinerary', label: 'Itinerary', icon: <Calendar className="h-4 w-4" /> },
    { id: 'budget', label: 'Budget', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="h-4 w-4" /> },
  ];

  // Extract travel type
  const travelType = trip.description?.match(/^\[(.*?)\]/)?.[1];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
      {/* Back breadcrumb */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to All Trips
        </button>
        <span className="text-slate-300 dark:text-slate-700 text-xs">›</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{trip.title}</span>
      </div>

      {/* Workspace Hero */}
      <div className="relative h-40 sm:h-48 overflow-hidden">
        <img
          src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200'}
          alt={trip.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

        {/* Header content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {travelType && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold backdrop-blur-xs border border-white/20">
                  {TRAVEL_TYPE_ICONS[travelType as TravelType]}
                  {travelType}
                </span>
              )}
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${planningStatus.bg} ${planningStatus.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${planningStatus.dot}`} />
                {planningStatus.label}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-serif leading-tight">{trip.title}</h2>
            <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {trip.city ? `${trip.city}, ` : ''}{trip.country}
            </p>
          </div>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            {daysLeft !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-md shrink-0 ${daysLeft <= 7 ? 'bg-rose-500' : daysLeft <= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                <Clock className="h-3.5 w-3.5" />
                {daysLeft > 0 ? `${daysLeft} days to go` : daysLeft === 0 ? 'Departing today!' : 'In progress'}
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 text-white text-xs font-bold backdrop-blur-xs shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {duration} day{duration > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preparation Progress Bar */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              Preparation Progress
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">{progressRatio}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progressRatio >= 100 ? 'bg-emerald-500' : progressRatio >= 71 ? 'bg-teal-500' : progressRatio >= 31 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressRatio}%` }}
            />
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{completedCount}/{checklist.length}</span>
          <p className="text-[10px] text-slate-400">tasks done</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer -mb-px ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5">

        {/* ── Checklist Tab ── */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Packing & Preparation</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Check off items as you prepare for your trip</p>
              </div>
              {completedCount === checklist.length && checklist.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" /> All done!
                </span>
              )}
            </div>

            {/* Add item form */}
            <form onSubmit={handleAddTodo} className="flex gap-2">
              <input
                type="text"
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                placeholder="Add checklist item…"
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0"
              >
                + Add
              </button>
            </form>

            {/* Checklist */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {checklist.map(todo => (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl border transition-all ${
                    todo.done
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <button
                    onClick={() => handleToggle(todo.id)}
                    className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                  >
                    {todo.done
                      ? <CheckSquare className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                      : <Square className="h-4.5 w-4.5 text-slate-350 dark:text-slate-500 shrink-0" />
                    }
                    <span className={`text-xs font-medium ${todo.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {todo.text}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 rounded-lg transition-colors cursor-pointer ml-2 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {checklist.length === 0 && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                  <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No checklist items yet. Add your first item above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Itinerary Tab ── */}
        {activeTab === 'itinerary' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Day-by-Day Itinerary</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Plan your daily activities, restaurants, and sightseeing</p>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center space-y-3">
              <Calendar className="h-10 w-10 mx-auto text-emerald-500 opacity-80" />
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {duration ? `${duration}-Day Itinerary` : 'Build your itinerary'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {trip.start_date
                    ? `${formatDateShort(trip.start_date)} → ${formatDateShort(trip.end_date)}`
                    : 'Set your trip dates to generate a day-by-day planner'
                  }
                </p>
              </div>
              <Link
                to={`/trips/${trip.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Full Itinerary Planner
              </Link>
            </div>
          </div>
        )}

        {/* ── Budget Tab ── */}
        {activeTab === 'budget' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Budget Overview</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Track your planned spend and manage expenses</p>
            </div>

            {/* Budget display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-800/60 dark:to-slate-800/20 border border-slate-150 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Budget</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
                    ${trip.budget > 0 ? trip.budget.toLocaleString() : '—'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{trip.budget > 0 ? 'Planned spend' : 'No budget set'}</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Expense Tracking
              </p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-500/70">
                Add individual expenses and track your spending against the budget in the full trip planner.
              </p>
              <Link
                to={`/trips/${trip.id}`}
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Manage expenses →
              </Link>
            </div>
          </div>
        )}

        {/* ── Notes Tab ── */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Notes & Reminders</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Jot down ideas, reminders, and important info</p>
              </div>
              {notesSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={9}
              placeholder="Add your notes, visa requirements, accommodation ideas, local tips, must-see places…"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-60"
            >
              {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {savingNotes ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Trip Plan Card ───────────────────────────────────────────────────────────

interface TripPlanCardProps {
  trip: Trip;
  onDelete: (id: number) => void;
}

const TripPlanCard: React.FC<TripPlanCardProps> = ({ trip, onDelete }) => {
  const navigate = useNavigate();
  const daysLeft = getDaysRemaining(trip.start_date);
  const duration = getTripDuration(trip.start_date, trip.end_date);
  const travelType = trip.description?.match(/^\[(.*?)\]/)?.[1];

  // Derive planning status from checklist
  const saved = localStorage.getItem(`checklist_trip_${trip.id}`);
  const checklist: TodoItem[] = saved ? JSON.parse(saved) : DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: i + 1 }));
  const completedCount = checklist.filter(t => t.done).length;
  const progressRatio = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
  const status = getPlanningStatus(progressRatio);

  const handleOpenPlanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/planner?open=${trip.id}`);
  };

  return (
    <div
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/40 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
      onClick={handleOpenPlanner}
    >
      {/* Cover */}
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=600'}
          alt={trip.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Status badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold backdrop-blur-xs ${status.bg} ${status.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>

        {/* Countdown chip */}
        {daysLeft !== null && (
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white ${
            daysLeft <= 7 ? 'bg-rose-500' : daysLeft <= 30 ? 'bg-amber-500' : 'bg-emerald-500/90 backdrop-blur-xs'
          }`}>
            {daysLeft > 0 ? `${daysLeft}d` : daysLeft === 0 ? 'Today!' : 'Now'}
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-white/70 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {trip.city ? `${trip.city}, ` : ''}{trip.country}
            </p>
          </div>
          {travelType && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 text-white text-[9px] font-bold backdrop-blur-xs border border-white/15">
              {TRAVEL_TYPE_ICONS[travelType as TravelType]}
              {travelType}
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{trip.title}</h3>

        {/* Dates */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {trip.start_date ? formatDateShort(trip.start_date) : 'Flexible'}
            {trip.end_date && ` → ${formatDateShort(trip.end_date)}`}
          </span>
        </div>

        {/* Budget + Duration */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-3.5 w-3.5" />
            {trip.budget > 0 ? `$${trip.budget.toLocaleString()}` : 'Budget TBD'}
          </span>
          {duration && (
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}d
            </span>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Preparation</span>
            <span>{progressRatio}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressRatio >= 100 ? 'bg-emerald-500' : progressRatio >= 71 ? 'bg-teal-500' : progressRatio >= 31 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressRatio}%` }}
            />
          </div>
        </div>

        {/* Open/Delete */}
        <div className="flex gap-2 mt-auto pt-1">
          <button
            onClick={handleOpenPlanner}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3 rotate-180" />
            Open Planner
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}
            className="p-2 rounded-xl border border-rose-100 dark:border-rose-950/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Planner Page ────────────────────────────────────────────────────────

export const FutureTrips: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Derive the active trip from URL param
  const openTripId = searchParams.get('open') ? Number(searchParams.get('open')) : null;
  const selectedTrip = openTripId ? trips.find(t => t.id === openTripId) ?? null : null;

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ trips: Trip[] }>('/trips?status=planned');
      setTrips(data.trips || []);
    } catch (err) {
      console.error('Failed to load planned trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Scroll to top whenever we enter workspace view
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [openTripId]);

  const handleCreate = (newTrip: Trip) => {
    setTrips(prev => [newTrip, ...prev]);
    // Navigate into the new trip's workspace immediately
    navigate(`/planner?open=${newTrip.id}`, { replace: false });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this trip plan?')) return;
    try {
      await apiRequest(`/trips/${id}`, { method: 'DELETE' });
      setTrips(prev => prev.filter(t => t.id !== id));
      // If we deleted the currently open trip, go back to grid
      if (openTripId === id) navigate('/planner', { replace: true });
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const handleBack = () => {
    navigate('/planner', { replace: false });
  };

  // Nearest departure
  const nearestTrip = [...trips]
    .filter(t => t.start_date)
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())[0];
  const nearestDays = getDaysRemaining(nearestTrip?.start_date);
  const totalBudget = trips.reduce((sum, t) => sum + (t.budget || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // ── Full-page Workspace View (when a trip is open) ──
  if (selectedTrip) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
        <TripWorkspace
          key={selectedTrip.id}
          trip={selectedTrip}
          onBack={handleBack}
        />
      </div>
    );
  }

  // ── Grid View (trip card list) ──
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">
              Trip Planner
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm ml-11.5">
            Plan your next adventure — itineraries, checklists, and budgets in one place.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-sm transition-all cursor-pointer text-sm shrink-0 group"
        >
          <Plus className="h-4.5 w-4.5 group-hover:rotate-90 transition-transform duration-200" />
          Plan New Trip
        </button>
      </div>

      {/* ── Stats Bar (only when trips exist) ── */}
      {trips.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            {
              label: 'Planned Trips',
              value: trips.length,
              icon: <Plane className="h-5 w-5 text-emerald-500" />,
              sub: 'adventures ahead'
            },
            {
              label: 'Total Budget',
              value: totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : '—',
              icon: <DollarSign className="h-5 w-5 text-amber-500" />,
              sub: 'estimated spend'
            },
            {
              label: 'Next Departure',
              value: nearestDays !== null ? (nearestDays > 0 ? `${nearestDays}d` : 'Today!') : '—',
              icon: <Clock className="h-5 w-5 text-rose-500" />,
              sub: nearestTrip ? nearestTrip.country : 'no date set'
            }
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-1 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</span>
                {stat.icon}
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">{stat.value}</span>
              <span className="text-[10px] text-slate-400 truncate">{stat.sub}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {trips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-center max-w-lg mx-auto shadow-xs">
          <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-md">
            <Plane className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white font-serif mb-2">
            Start planning your next trip
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
            Create a trip plan to organize itineraries, track your budget, and prepare checklists for your upcoming adventure.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            Plan My First Trip
          </button>
        </div>
      )}

      {/* ── Trip Cards Grid ── */}
      {trips.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map(trip => (
            <TripPlanCard
              key={trip.id}
              trip={trip}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <CreateTripModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};

export default FutureTrips;
