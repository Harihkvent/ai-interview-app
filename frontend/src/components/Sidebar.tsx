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
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'jobs', path: '/jobs', label: 'Job Matcher', icon: '🎯' },
    { id: 'roadmaps', path: '/roadmaps', label: 'My Roadmaps', icon: '🗺️' },
    { id: 'interview', path: '/upload', label: 'Interview', icon: '🎤' },
    { id: 'insights', path: '/insights', label: 'AI Review', icon: '🧠' },
    { id: 'live_jobs', path: '/live-jobs', label: 'Live Jobs', icon: '🌐' },
    { id: 'saved_jobs', path: '/saved-jobs', label: 'Saved Jobs', icon: '❤️' },
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
        glass-card rounded-none border-r border-white/10
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-20'}
        flex flex-col
      `}
    >
      {/* Header / Toggle Area */}
      <div className="h-14 flex items-center justify-between px-4 mb-2 mt-2">
        {isOpen && (
          <span className="font-bold text-lg bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap overflow-hidden">
            Menu
          </span>
        )}
        <button 
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-auto"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
              ${isActive(item.path) 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }
            `}
            title={!isOpen ? item.label : ''}
          >
            <span className="text-xl min-w-[24px] text-center">{item.icon}</span>
            <span 
              className={`
                whitespace-nowrap overflow-hidden transition-all duration-300
                ${isOpen ? 'w-full opacity-100' : 'w-0 opacity-0'}
                font-medium text-left
              `}
            >
              {item.label}
            </span>
            
            {/* Hover Tooltip for Collapsed State */}
            {!isOpen && (
              <div className="
                absolute left-full top-0 ml-2 px-2 py-1 
                bg-gray-900 text-white text-xs rounded 
                opacity-0 group-hover:opacity-100 
                pointer-events-none transition-opacity z-50
                whitespace-nowrap hidden md:block
              ">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer Area (Optional) */}
      <div className="p-4 border-t border-white/5">
        <div className={`
          text-xs text-gray-500 text-center transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}
        `}>
          v1.0.0
        </div>
      </div>
    </aside>
  );
};
