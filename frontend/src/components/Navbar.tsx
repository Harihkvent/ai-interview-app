import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage?: 'dashboard' | 'jobs' | 'live_jobs' | 'saved_jobs' | 'interview' | 'roadmaps' | 'question_gen' | 'insights' | 'profile';
  onNavigate: (page: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage }) => {
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <nav 
      className="sticky top-0 z-50 border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--navbar-bg)',
        borderColor: 'var(--navbar-border)',
      }}
    >
      <div className="w-full px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate('/dashboard')}
          >
            <div className="text-2xl">🚀</div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                CareerPath AI
              </h1>
              <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
                AI Career Companion
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--bg-hover)]"
              title="Toggle Theme"
              style={{ color: 'var(--text-secondary)' }}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* User Profile */}
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
              style={{ borderLeft: '1px solid var(--border-primary)' }}
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  {user?.email}
                </p>
              </div>
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {(user?.username?.[0] || 'U').toUpperCase()}
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg transition-all"
              style={{ 
                backgroundColor: 'var(--error-light)',
                color: 'var(--error)',
              }}
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
