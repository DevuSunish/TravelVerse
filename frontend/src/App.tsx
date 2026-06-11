import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';

// Page imports
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { ProfilePage } from './pages/ProfilePage';
import { PastTrips } from './pages/PastTrips';
import { TripDetails } from './pages/TripDetails';
import { RecommendationsFeed } from './pages/RecommendationsFeed';
import { FutureTrips } from './pages/FutureTrips';
import { GroupPlanner } from './pages/GroupPlanner';
import { AIAssistant } from './pages/AIAssistant';
import { Settings } from './pages/Settings';

// Protected Route Wrapper Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-250 flex flex-col">
            <Navbar />
            
            <main className="flex-1">
              <Routes>
                {/* Public Promotion routes */}
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />

                {/* Private Dashboard routes */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/trips" 
                  element={
                    <ProtectedRoute>
                      <PastTrips />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/trips/:id" 
                  element={
                    <ProtectedRoute>
                      <TripDetails />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/recommendations" 
                  element={
                    <ProtectedRoute>
                      <RecommendationsFeed />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/planner" 
                  element={
                    <ProtectedRoute>
                      <FutureTrips />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/groups" 
                  element={
                    <ProtectedRoute>
                      <GroupPlanner />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/ai-assistant" 
                  element={
                    <ProtectedRoute>
                      <AIAssistant />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />

                {/* Catch-all Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
export default App;
