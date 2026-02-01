import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage?: 'dashboard' | 'jobs' | 'live_jobs' | 'saved_jobs' | 'interview' | 'roadmaps' | 'question_gen' | 'insights' | 'profile';
  onNavigate: (page: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage }) => {
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 backdrop-blur-xl bg-zinc-900/80">
      <div className="w-full px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                CareerPath AI
              </h1>
              <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400">
                AI Career Companion
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* User Profile */}
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-zinc-800 border-l border-zinc-800"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold leading-tight text-white">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[10px] text-gray-400">
                  {user?.email}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-sm bg-white">
                {(user?.username?.[0] || 'U').toUpperCase()}
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg transition-all bg-red-500/20 text-red-400 hover:bg-red-500/30"
              title="Logout"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
