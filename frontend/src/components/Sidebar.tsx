import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * Sidebar with monochrome black/white/gray theme
 */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onToggle }) => {
  const [collapsed, setCollapsed] = useState(!isOpen);
  const location = useLocation();

  const handleToggle = () => {
    setCollapsed(!collapsed);
    onToggle?.();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', badge: null, path: '/dashboard' },
    { id: 'interviews', label: 'Interviews', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', badge: null, path: '/interviews' },
    { id: 'practice', label: 'Practice', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', badge: null, path: '/practice' },
    { id: 'skills', label: 'Skills', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', badge: null, path: '/skills' },
    { id: 'jobs', label: 'Job Matcher', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', badge: null, path: '/jobs' },
    { id: 'resume', label: 'Resume', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', badge: null, path: '/upload' },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', path: '/settings' },
    { id: 'help', label: 'Help & Support', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', path: '/help' },
  ];

  return (
    <div
      className={`h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col transition-all duration-300 fixed left-0 top-0 z-40 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Logo & Toggle */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">CareerPath</h2>
              <p className="text-gray-400 text-xs">AI Interview</p>
            </div>
          </div>
        )}
        
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg bg-zinc-800 text-gray-300 hover:bg-zinc-700 transition-all"
        >
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
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
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r" />
              )}

              {/* Icon */}
              <div className={`flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>

              {/* Label */}
              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  
                  {/* Badge */}
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-zinc-700 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-700 text-xs font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-3">
        <div className="h-px bg-zinc-800" />
      </div>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 space-y-1">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <div className={`flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>

              {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}

              {collapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="px-3 pb-4 border-t border-zinc-800 pt-4">
        <div className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all ${
          collapsed ? 'justify-center' : ''
        }`}>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-black font-bold">JD</span>
          </div>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">John Doe</p>
              <p className="text-gray-400 text-xs truncate">john@example.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

