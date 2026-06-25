import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Users } from 'lucide-react';
import { apiRequest } from '../services/api';

interface SearchUser {
  id: number;
  username: string;
  bio: string | null;
  profile_picture: string;
}

interface UserSearchBarProps {
  /** Closes parent container (e.g. mobile menu) after navigation */
  onClose?: () => void;
  /** Render full-width (for mobile drawer) */
  fullWidth?: boolean;
}

export const UserSearchBar: React.FC<UserSearchBarProps> = ({
  onClose,
  fullWidth = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ users: SearchUser[] }>(
        `/auth/search?q=${encodeURIComponent(q.trim())}`
      );
      setResults(data.users || []);
      setIsOpen(true);
    } catch {
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  const handleSelectUser = (username: string) => {
    navigate(`/profile?username=${encodeURIComponent(username)}`);
    setIsOpen(false);
    setQuery('');
    setResults([]);
    onClose?.();
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : 'w-56 lg:w-64'}`}
    >
      {/* Input row */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200
          bg-slate-100 dark:bg-slate-800
          border-slate-200 dark:border-slate-700
          focus-within:border-emerald-400 dark:focus-within:border-emerald-500
          focus-within:ring-2 focus-within:ring-emerald-500/20
          shadow-sm`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-emerald-500 animate-spin shrink-0" />
        ) : (
          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
        )}
        <input
          ref={inputRef}
          id="user-search-input"
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search travelers…"
          autoComplete="off"
          className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none min-w-0"
          aria-label="Search travelers"
        />
        {query && (
          <button
            onClick={handleClear}
            className="shrink-0 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 z-[100] rounded-2xl
            bg-white dark:bg-slate-900
            border border-slate-200 dark:border-slate-700
            shadow-2xl
            overflow-hidden"
          role="listbox"
        >
          {error ? (
            <div className="px-4 py-5 text-center text-xs text-rose-500 font-medium">
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
              <Users className="h-7 w-7 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No travelers found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Try a different name</p>
            </div>
          ) : (
            <div className="py-1">
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Travelers
              </p>
              {results.map((u) => (
                <button
                  key={u.id}
                  role="option"
                  onClick={() => handleSelectUser(u.username)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left group"
                >
                  <img
                    src={u.profile_picture}
                    alt={u.username}
                    className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 group-hover:border-emerald-400 transition-colors"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.username)}`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      @{u.username}
                    </p>
                    {u.bio && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {u.bio}
                      </p>
                    )}
                  </div>
                  <span className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors text-xs shrink-0">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;
