import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { Save, User as UserIcon, Globe, Info, Heart, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [bio, setBio] = useState(user?.bio || '');
  const [homeCountry, setHomeCountry] = useState(user?.home_country || '');
  const [profilePic, setProfilePic] = useState(user?.profile_picture || '');
  
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await updateUser({
        bio,
        home_country: homeCountry,
        profile_picture: profilePic
      });
      setStatusMessage('Profile updated successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDicebearGenerate = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const newPic = `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomSeed}`;
    setProfilePic(newPic);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif">Account Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your personal traveler profile cards and maps.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xs">
        
        {statusMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 animate-fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6 text-xs font-semibold">
          
          {/* Avatar layout */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-150/40 dark:border-slate-800/40">
            <img
              src={profilePic || 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'}
              alt={user?.username}
              className="h-24 w-24 rounded-full object-cover bg-emerald-50 border-2 border-emerald-100 shadow-sm shrink-0"
            />
            
            <div className="space-y-2 text-center sm:text-left">
              <label className="text-[10px] uppercase font-bold text-slate-450 block">Profile Picture Avatar</label>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleDicebearGenerate}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 dark:border-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold transition-all"
                >
                  Generate Random Avatar
                </button>
                <input
                  type="url"
                  placeholder="Or paste custom image URL..."
                  value={profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                  className="w-full sm:w-[250px] bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-1.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-450 flex items-center gap-1.5">
                <UserIcon className="h-4 w-4 text-slate-400" />
                Username (Read-Only)
              </label>
              <input
                type="text"
                disabled
                value={user?.username || ''}
                className="w-full bg-slate-100 border border-slate-150 text-slate-400 rounded-xl px-3.5 py-3 text-xs focus:outline-none dark:bg-slate-950 dark:border-slate-850"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-450 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-slate-400" />
                Home Country (Base Location)
              </label>
              <input
                type="text"
                placeholder="Canada"
                value={homeCountry}
                onChange={(e) => setHomeCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-3 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-450">Biography (Bio)</label>
            <textarea
              placeholder="Tell your stories. Where do you plan to hike? Which beaches are you heading to?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3.5 text-xs dark:bg-slate-950 dark:border-slate-850 dark:text-white leading-relaxed font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Save className="h-4.5 w-4.5" />
            {saving ? 'Saving Changes...' : 'Save Settings'}
          </button>

        </form>

      </div>

    </div>
  );
};
export default Settings;
