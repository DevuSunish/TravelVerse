import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, MapPin, Sparkles, Share2, DollarSign, Globe, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden py-20 lg:py-32 bg-slate-900 text-white">
        
        {/* Abstract Background Image with overlay */}
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1920" 
            alt="Travel background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-slate-950" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider mb-6 animate-float">
            <Compass className="h-4 w-4 text-emerald-400" />
            Discover the World
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold font-serif tracking-tight leading-none mb-6">
            Your Journeys, <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Mapped.</span> <br />
            Your Adventures, <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">Shared.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 mb-10 font-sans font-medium">
            TravelVerse is the ultimate social travel platform. Pin your visited countries on an interactive world map, collaborate with friends in real-time travel groups, log trip budgets, and let Gemini AI craft custom day-by-day itineraries.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to={user ? "/" : "/auth"}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
            >
              {user ? 'Go to Dashboard' : 'Start Your Adventure'}
              <ArrowRight className="h-5 w-5" />
            </Link>
            {!user && (
              <Link
                to="/auth?tab=register"
                className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 border border-white/20 hover:bg-white/10 text-white font-bold rounded-2xl transition-all duration-200"
              >
                Sign Up Free
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-serif">
            Designed for Passionate Travelers
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Everything you need to plan, log, and share your globetrotting adventures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Card 1: Map */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-5">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Interactive Map</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pin countries you have explored, draft wishlist regions, and track your global coverage statistics dynamically.
            </p>
          </div>

          {/* Card 2: AI Planner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center mb-5">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">AI Trip Planner</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your destinations, travel budget, and interests to receive fully structured, day-wise itineraries in seconds.
            </p>
          </div>

          {/* Card 3: Groups */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-5">
              <Share2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Group Collaboration</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Invite friends to travel groups, plan packing checklists together, and cast votes on scheduled activities.
            </p>
          </div>

          {/* Card 4: Expense split */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-5">
              <DollarSign className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Expense Splitter</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Keep tab of trip budgets by category, record travel receipts, and split costs fairly among group participants.
            </p>
          </div>

        </div>
      </div>

      {/* Middle Banner: Airbnb style grid */}
      <div className="bg-slate-100 dark:bg-slate-900/40 py-20 border-y border-slate-200/50 dark:border-slate-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
          
          {/* Images visual */}
          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-4">
            <img 
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400" 
              alt="Beach travel" 
              className="rounded-2xl shadow-md transform -rotate-2 hover:rotate-0 transition-transform duration-300 object-cover aspect-square"
            />
            <img 
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400" 
              alt="Mountain hiking" 
              className="rounded-2xl shadow-md transform rotate-3 hover:rotate-0 transition-transform duration-300 mt-6 object-cover aspect-square"
            />
          </div>

          {/* Description */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-serif leading-tight">
              Create stories that inspire, <br />
              pin memories that stay.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-4 leading-relaxed font-sans">
              TravelVerse is inspired by Airbnb's premium interface and Wanderlog's planning flexibility. We combine beautiful, high-resolution photo galleries, maps showing exact travel coordinates, timeline feeds for travel stories, and AI to give you a state-of-the-art social ecosystem.
            </p>
            <div className="mt-8">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Join other global travelers today
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} TravelVerse Inc. All rights reserved.</p>
          <p className="mt-1.5 text-slate-400/80">Built with React, TypeScript, Tailwind CSS, Node.js, and Google Gemini AI.</p>
        </div>
      </footer>

    </div>
  );
};
export default LandingPage;
