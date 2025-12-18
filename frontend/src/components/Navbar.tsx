import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage?: 'dashboard' | 'jobs' | 'live_jobs' | 'interview' | 'roadmaps' | 'question_gen';
  onNavigate: (page: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '🏠' },
    { id: 'jobs' as const, label: 'Job Matcher', icon: '🎯' },
    { id: 'live_jobs' as const, label: 'Live Jobs', icon: '🌐' },
    { id: 'roadmaps' as const, label: 'My Roadmaps', icon: '🗺️' },
    { id: 'interview' as const, label: 'Interview', icon: '🎤' },
    { id: 'question_gen' as const, label: 'Question Gen', icon: '⚡' },
  ];

  return (
    <nav className="card sticky top-0 z-50 rounded-none border-b-2">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚀</div>
            <div>
              <h1 className="text-xl font-bold text-primary-400">
                CareerPath AI
              </h1>
              <p className="text-xs text-text-tertiary">Your AI Career Companion</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  currentPage === item.id
                    ? 'bg-primary-100 text-primary-600 font-semibold'
                    : 'hover:bg-neutral-100 text-text-secondary'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-text-primary">
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-text-tertiary">{user?.email}</p>
            </div>

            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center text-white font-bold">
              {(user?.username?.[0] || 'U').toUpperCase()}
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="px-4 py-2 bg-error-50 hover:bg-error-100 text-error-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4 flex gap-2 overflow-x-auto pb-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                currentPage === item.id
                  ? 'bg-primary-100 text-primary-600 font-semibold'
                  : 'hover:bg-neutral-100 text-text-secondary'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
