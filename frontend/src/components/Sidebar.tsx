import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'jobs', path: '/jobs', label: 'Job Matcher', icon: '🎯' },
    { id: 'roadmaps', path: '/roadmaps', label: 'My Roadmaps', icon: '🗺️' },
    { id: 'interview', path: '/upload', label: 'Interview', icon: '💼' },
    { id: 'avatar_interview', path: '/avatar-interview/start', label: 'AI Avatar', icon: '🤖' },
    { id: 'analytics', path: '/analytics', label: 'Analytics', icon: '📈' },
    { id: 'schedule', path: '/schedule', label: 'Schedule', icon: '📅' },
    { id: 'skill_tests', path: '/skill-tests', label: 'Skill Tests', icon: '✍️' },
    { id: 'insights', path: '/insights', label: 'AI Review', icon: '🤖' },
    { id: 'live_jobs', path: '/live-jobs', label: 'Live Jobs', icon: '🌐' },
    { id: 'saved_jobs', path: '/saved-jobs', label: 'Saved Jobs', icon: '⭐' },
    { id: 'question_gen', path: '/question-gen', label: 'Question Gen', icon: '⚡' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] z-40
        border-r transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        flex flex-col
      `}
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      {/* Header / Toggle Area */}
      <div className="h-12 flex items-center justify-between px-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        {isOpen && (
          <span 
            className="font-semibold text-sm tracking-wide whitespace-nowrap overflow-hidden"
            style={{ color: 'var(--text-secondary)' }}
          >
            NAVIGATION
          </span>
        )}
        <button 
          onClick={onToggle}
          className="p-1.5 rounded-md transition-colors ml-auto"
          style={{ 
            color: 'var(--text-tertiary)',
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${active ? 'font-semibold' : 'font-medium'}
              `}
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
              title={!isOpen ? item.label : ''}
            >
              <span className="text-lg min-w-[20px] text-center flex-shrink-0">{item.icon}</span>
              <span 
                className={`
                  whitespace-nowrap overflow-hidden transition-all duration-300 text-sm
                  ${isOpen ? 'w-full opacity-100' : 'w-0 opacity-0'}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Area */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className={`
          text-[10px] font-medium text-center transition-opacity duration-300 uppercase tracking-wider
          ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
        `}
        style={{ color: 'var(--text-muted)' }}
        >
          Version 1.0.0
        </div>
      </div>
    </aside>
  );
};
