import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentPage?: 'dashboard' | 'jobs' | 'interview' | 'roadmaps';
  onNavigate: (page: 'dashboard' | 'jobs' | 'interview' | 'roadmaps') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '🏠' },
    { id: 'jobs' as const, label: 'Job Matches', icon: '💼' },
    { id: 'roadmaps' as const, label: 'My Roadmaps', icon: '🗺️' },
    { id: 'interview' as const, label: 'New Interview', icon: '🎤' },
  ];

  return (
    <nav className="glass-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚀</div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                CareerPath AI
              </h1>
              <p className="text-xs text-gray-400">Your AI Career Companion</p>
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
                    ? 'bg-primary-500/20 text-primary-300 font-semibold'
                    : 'hover:bg-white/10 text-gray-300'
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
              <p className="text-sm font-semibold text-white">
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>

            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-400 flex items-center justify-center text-white font-bold">
              {(user?.username?.[0] || 'U').toUpperCase()}
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors flex items-center gap-2"
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
                  ? 'bg-primary-500/20 text-primary-300 font-semibold'
                  : 'hover:bg-white/10 text-gray-300'
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
