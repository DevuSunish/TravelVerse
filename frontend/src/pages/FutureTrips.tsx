import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { 
  Calendar, Clock, CheckCircle2, 
  ListTodo, Trash2, CheckSquare, Square
} from 'lucide-react';
import { Trip } from '../components/TripCard';

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

export const FutureTrips: React.FC = () => {
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  // Checklist state
  const [checklist, setChecklist] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  // Countdowns
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    
    // Load countdown
    if (trip.start_date) {
      const timeDiff = new Date(trip.start_date).getTime() - new Date().getTime();
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
      setDaysLeft(days >= 0 ? days : 0);
    } else {
      setDaysLeft(null);
    }

    // Load checklist from localStorage for this specific trip to keep state persistent
    const savedList = localStorage.getItem(`checklist_trip_${trip.id}`);
    if (savedList) {
      setChecklist(JSON.parse(savedList));
    } else {
      // Default checklist items
      const defaultChecklist: TodoItem[] = [
        { id: 1, text: 'Confirm flight tickets & hotel bookings', done: false },
        { id: 2, text: 'Check passport validity (must be > 6 months)', done: false },
        { id: 3, text: 'Acquire travel insurance coverage', done: false },
        { id: 4, text: 'Pack clothing & essential luggage items', done: false },
        { id: 5, text: 'Exchange currency / notify credit cards', done: false }
      ];
      setChecklist(defaultChecklist);
      localStorage.setItem(`checklist_trip_${trip.id}`, JSON.stringify(defaultChecklist));
    }
  };

  const fetchUpcomingTrips = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/trips?status=planned');
      setUpcomingTrips(data.trips || []);
      if (data.trips?.length > 0) {
        handleSelectTrip(data.trips[0]);
      }
    } catch (err) {
      console.error('Failed to load upcoming trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUpcomingTrips();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTodo = (id: number) => {
    if (!selectedTrip) return;
    const updated = checklist.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setChecklist(updated);
    localStorage.setItem(`checklist_trip_${selectedTrip.id}`, JSON.stringify(updated));
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !selectedTrip) return;

    const newItem: TodoItem = {
      id: Date.now(),
      text: newTodo.trim(),
      done: false
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);
    localStorage.setItem(`checklist_trip_${selectedTrip.id}`, JSON.stringify(updated));
    setNewTodo('');
  };

  const handleDeleteTodo = (id: number) => {
    if (!selectedTrip) return;
    const updated = checklist.filter(t => t.id !== id);
    setChecklist(updated);
    localStorage.setItem(`checklist_trip_${selectedTrip.id}`, JSON.stringify(updated));
  };

  const completedCount = checklist.filter(t => t.done).length;
  const progressRatio = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-slate-500 font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">Future Trip Planner</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage checklists, budgets, and itineraries for your upcoming adventures.</p>
      </div>

      {upcomingTrips.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-16 rounded-3xl text-center text-slate-400 max-w-2xl mx-auto shadow-xs">
          <ListTodo className="h-16 w-12 mx-auto text-slate-350 mb-3" />
          <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-white mb-2">No upcoming trips planned</h3>
          <p className="text-xs text-slate-500 mb-6">Log an upcoming trip status to activate preparation checklists and countdown timers.</p>
          <Link
            to="/trips?action=new"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs"
          >
            Schedule a Trip Log
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar: Trips list */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Upcoming Travels</h3>
            <div className="space-y-2">
              {upcomingTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedTrip?.id === trip.id
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                      : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800/80 hover:bg-slate-50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="text-[10px] bg-slate-900/10 dark:bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold mb-2 inline-block">
                    {trip.country}
                  </span>
                  <h4 className="font-bold text-sm block line-clamp-1">{trip.title}</h4>
                  <span className="text-[10px] text-slate-400 mt-1 block flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'Flexible'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Area: Checklist & countdowns */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTrip && (
              <div className="space-y-6">
                
                {/* Header widget */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-bold font-serif text-slate-800 dark:text-slate-100">{selectedTrip.title}</h2>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Departure: {selectedTrip.start_date ? new Date(selectedTrip.start_date).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'Flexible'}
                    </p>
                  </div>

                  {/* Countdown clock */}
                  {daysLeft !== null && (
                    <div className="bg-emerald-500 text-white px-5 py-3 rounded-2xl text-center min-w-[100px] shadow-sm flex items-center justify-center gap-3 shrink-0">
                      <Clock className="h-6 w-6 animate-pulse" />
                      <div>
                        <span className="text-2xl font-black block leading-none">{daysLeft}</span>
                        <span className="text-[9px] uppercase font-bold text-emerald-100 tracking-wide mt-0.5">Days to Go</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar of preparation */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                      Preparation Progress
                    </span>
                    <span>{progressRatio.toFixed(0)}% Complete</span>
                  </div>
                  
                  <div className="w-full h-3 bg-slate-50 dark:bg-slate-800/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressRatio}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Checked off {completedCount} of {checklist.length} checklist items.
                  </p>
                </div>

                {/* Checklist items ledger */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Packing & Departure Checklists</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Custom items for packing, visas, bookings, and currency</p>
                  </div>

                  {/* Add Checklist Todo Form */}
                  <form onSubmit={handleAddTodo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add checklist item... (e.g. buy adapters)"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                    />
                    <button
                      type="submit"
                      className="bg-slate-800 hover:bg-slate-750 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      Add Item
                    </button>
                  </form>

                  {/* Todo list entries */}
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {checklist.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs border border-transparent hover:border-slate-200/40 transition-colors"
                      >
                        <button
                          onClick={() => handleToggleTodo(todo.id)}
                          className="flex items-center gap-2.5 text-left font-semibold"
                        >
                          {todo.done ? (
                            <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-350 shrink-0" />
                          )}
                          <span className={`${todo.done ? 'line-through text-slate-400 font-normal' : 'text-slate-700 dark:text-slate-200'}`}>
                            {todo.text}
                          </span>
                        </button>

                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="text-slate-300 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/trips/${selectedTrip.id}`}
                    className="flex-1 text-center py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                  >
                    Open Daily Itinerary Planner
                  </Link>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
export default FutureTrips;
