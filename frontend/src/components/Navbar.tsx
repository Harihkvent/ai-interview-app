import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sun, Moon, LogOut, Rocket } from 'lucide-react';

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
            <div className="text-2xl text-blue-500">
              <Rocket size={24} fill="currentColor" />
            </div>
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
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
