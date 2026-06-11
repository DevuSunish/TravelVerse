import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  home_country?: string;
  profile_picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (fields: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check localStorage for active session on load
  useEffect(() => {
    async function loadSession() {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Refresh profile stats in the background
        try {
          const res = await fetch('http://localhost:5000/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            const freshUser = {
              id: data.profile.id,
              username: data.profile.username,
              email: JSON.parse(storedUser).email, // Email is not in public profile
              bio: data.profile.bio,
              home_country: data.profile.home_country,
              profile_picture: data.profile.profile_picture
            };
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
        } catch (e) {
          console.warn('Session refresh failed', e);
        }
      }
      setLoading(false);
    }
    loadSession();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = async (fields: Partial<User>) => {
    try {
      const data = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: fields
      });
      if (data.user) {
        const mergedUser = { ...user, ...data.user };
        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
      }
    } catch (err) {
      console.error('Update user failed:', err);
      throw err;
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const data = await apiRequest('/auth/profile');
      if (data.profile) {
        const mergedUser = {
          ...user!,
          bio: data.profile.bio,
          home_country: data.profile.home_country,
          profile_picture: data.profile.profile_picture
        };
        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
      }
    } catch (err) {
      console.error('Refresh profile failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
