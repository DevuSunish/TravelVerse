import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Mail, Lock, User as UserIcon, Globe, ArrowRight, AlertCircle } from 'lucide-react';
import { apiRequest } from '../services/api';

export const AuthPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const isRegister = searchParams.get('tab') === 'register';
  const setIsRegister = (val: boolean) => {
    navigate(val ? '?tab=register' : '?tab=login', { replace: true });
  };

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password || (isRegister && !username)) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Register API
        const data = await apiRequest('/auth/register', {
          method: 'POST',
          body: { username, email, password, home_country: homeCountry }
        });
        login(data.token, data.user);
        navigate('/');
      } else {
        // Login API
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password }
        });
        login(data.token, data.user);
        navigate('/');
      }
    } catch (err: unknown) {
      const errorObject = err as { message?: string };
      setError(errorObject.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-stretch bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      
      {/* Left Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80">
        <div className="mx-auto w-full max-w-md">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/landing')}>
            <Compass className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
            <span className="text-2xl font-bold font-serif bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              TravelVerse
            </span>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif leading-tight">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {isRegister 
              ? 'Join TravelVerse and map your world footprint.' 
              : 'Log in to manage trips and explore social travel recommendations.'
            }
          </p>

          {/* Error Alert Box */}
          {error && (
            <div className="mt-6 flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl animate-shake">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Wanderer101"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@travelverse.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Home Country</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Canada"
                    value={homeCountry}
                    onChange={(e) => setHomeCountry(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-md hover:shadow-emerald-500/10 transition-all cursor-pointer"
            >
              {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
              {!loading && <ArrowRight className="h-4.5 w-4.5" />}
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => setIsRegister(false)}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => setIsRegister(true)}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Create one now
                </button>
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Right Visual Panel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1200"
          alt="Gorgeous mountain scenery"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent" />
        
        {/* Floating Quote */}
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="text-xl font-bold font-serif italic mb-2">
            "To travel is to live, and to map it is to remember."
          </p>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
            TravelVerse Explorer Community
          </span>
        </div>
      </div>

    </div>
  );
};
export default AuthPage;
