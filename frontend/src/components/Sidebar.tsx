import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sun, Moon } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const menuItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', badge: null },
    { id: 'interview', path: '/upload', label: 'Interviews', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', badge: null },
    { id: 'avatar_interview', path: '/avatar-interview/start', label: 'AI Avatar', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', badge: null },
    { id: 'skill_tests', path: '/skill-tests', label: 'Practice', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', badge: null },
    { id: 'insights', path: '/insights', label: 'AI Insights', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', badge: null },
    { id: 'jobs', path: '/jobs', label: 'Job Matcher', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', badge: null },
    { id: 'live_jobs', path: '/live-jobs', label: 'Live Jobs', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', badge: null },
    { id: 'roadmaps', path: '/roadmaps', label: 'Roadmaps', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', badge: null },
    { id: 'saved_jobs', path: '/saved-jobs', label: 'Saved Jobs', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', badge: null },
    { id: 'schedule', path: '/schedule', label: 'Schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', badge: null },
  ];

  const bottomItems = [
    { id: 'analytics', path: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'profile', path: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get user initials
  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div
      className={`h-screen flex flex-col transition-all duration-300 ${
        isOpen ? 'w-72' : 'w-20'
      }`}
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo & Toggle */}
      <div className="h-16 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>CareerPath</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI Interview</p>
            </div>
          </div>
        )}
        
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg transition-all ${!isOpen ? 'mx-auto' : ''}`}
          style={{
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-secondary)',
          }}
        >
          <svg
            className={`w-5 h-5 transition-transform ${!isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative`}
              style={{
                backgroundColor: active ? 'var(--sidebar-active)' : 'transparent',
                color: active ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {/* Active Indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r" style={{ backgroundColor: 'var(--accent-primary)' }} />
              )}

              {/* Icon */}
              <div className={`flex-shrink-0 ${!isOpen ? 'mx-auto' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>

              {/* Label */}
              {isOpen && (
                <>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  
                  {/* Badge */}
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                      backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-hover)',
                      color: active ? 'white' : 'var(--text-primary)',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Tooltip for collapsed state */}
              {!isOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--bg-hover)' }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-3">
        <div className="h-px" style={{ backgroundColor: 'var(--border-primary)' }} />
      </div>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 space-y-1">
        {bottomItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative`}
              style={{
                backgroundColor: active ? 'var(--sidebar-active)' : 'transparent',
                color: active ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div className={`flex-shrink-0 ${!isOpen ? 'mx-auto' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>

              {isOpen && <span className="flex-1 text-left font-medium">{item.label}</span>}

              {!isOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="px-3 pb-4 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <div 
          onClick={() => navigate('/profile')}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
            !isOpen ? 'justify-center' : ''
          }`}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))' }}>
            <span className="text-white font-bold text-sm">{getInitials()}</span>
          </div>
          
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.full_name || user?.username || 'User'}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email || ''}</p>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full mt-3 flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${!isOpen ? 'justify-center' : ''}`}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {isOpen && <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          {!isOpen && (
            <div className="absolute left-full ml-4 px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
              }}
            >
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </div>
          )}
        </button>

        {/* Logout Button */}
        {isOpen && (
          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--error)';
              e.currentTarget.style.backgroundColor = 'var(--error-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
};
