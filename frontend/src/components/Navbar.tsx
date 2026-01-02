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

  const navItems = [
    { id: 'dashboard' as const, path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'jobs' as const, path: '/jobs', label: 'Job Matcher', icon: '🎯' },
    { id: 'roadmaps' as const, path: '/roadmaps', label: 'My Roadmaps', icon: '🗺️' },
    { id: 'interview' as const, path: '/upload', label: 'Interview', icon: '🎤' },
    { id: 'insights' as const, path: '/insights', label: 'AI Review', icon: '🧠' },
    { id: 'live_jobs' as const, path: '/live-jobs', label: 'Live Jobs', icon: '🌐' },
    { id: 'saved_jobs' as const, path: '/saved-jobs', label: 'Saved Jobs', icon: '❤️' },
    { id: 'question_gen' as const, path: '/question-gen', label: 'Question Gen', icon: '⚡' },
  ];

  return (
    <nav className="glass-card sticky top-0 z-50 rounded-none border-b shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="text-3xl animate-bounce">🚀</div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gradient">
                CareerPath AI
              </h1>
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Your AI Career Companion</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-semibold ${
                  currentPage === item.id
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-all active:scale-90"
              title="Toggle Theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* User Profile */}
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 pl-3 border-l border-white/10 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all text-left"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold leading-tight">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[10px] opacity-50">{user?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-black shadow-lg shadow-primary-500/20">
                {(user?.username?.[0] || 'U').toUpperCase()}
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/10"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
