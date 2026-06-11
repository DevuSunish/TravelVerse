import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Image as ImageIcon, DollarSign, Clock } from 'lucide-react';

export interface Trip {
  id: number;
  title: string;
  country: string;
  city?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  status: 'past' | 'planned' | 'wishlist';
  cover_image: string;
  budget: number;
  photos?: { id: number; photo_url: string }[];
}

interface TripCardProps {
  trip: Trip;
  onDelete?: (id: number) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onDelete }) => {
  // Format Date Range
  const formatDateRange = () => {
    if (!trip.start_date) return 'Flexible Dates';
    const start = new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!trip.end_date) return start;
    const end = new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  // Get Trip Duration in Days
  const getDaysCount = () => {
    if (!trip.start_date || !trip.end_date) return null;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  const statusConfig = {
    past: { text: 'Past Trip', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' },
    planned: { text: 'Upcoming', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' },
    wishlist: { text: 'Wishlist', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/30' }
  };

  const days = getDaysCount();

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs hover-card">
      
      {/* Cover Image & Overlay Status */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={trip.cover_image || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=600'}
          alt={trip.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        
        {/* Status Badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-full border backdrop-blur-xs ${statusConfig[trip.status].color}`}>
          {statusConfig[trip.status].text}
        </span>

        {/* Days count if any */}
        {days && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900/70 text-white border border-white/10 backdrop-blur-xs">
            <Clock className="h-3 w-3" />
            {days}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{trip.city ? `${trip.city}, ` : ''}{trip.country}</span>
        </div>

        <Link to={`/trips/${trip.id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mb-2">
            {trip.title}
          </h3>
        </Link>

        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
          {trip.description || 'No stories added yet. Click to document your travel memories!'}
        </p>

        <hr className="border-slate-100 dark:border-slate-800/80 mb-4" />

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDateRange()}
          </span>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-0.5">
              <ImageIcon className="h-4 w-4" />
              {trip.photos?.length || 0}
            </span>
            <span className="flex items-center font-semibold text-slate-700 dark:text-slate-300">
              <DollarSign className="h-3.5 w-3.5 -mr-0.5" />
              {Math.round(trip.budget)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <Link
            to={`/trips/${trip.id}`}
            className="flex-1 text-center py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Manage Trip
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(trip.id)}
              className="py-2 px-3 border border-rose-100 dark:border-rose-950/20 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
