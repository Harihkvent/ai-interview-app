import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Shield, Database, Activity, Settings, 
  MessageSquare, BarChart3, LogOut, Menu, X,
  Clock, BookOpen
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Protected route check for admin role
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const menuItems = [
    { id: 'overview', path: '/admin', label: 'Overview', icon: BarChart3 },
    { id: 'users', path: '/admin/users', label: 'Users', icon: Users },
    { id: 'sessions', path: '/admin/sessions', label: 'Sessions', icon: Clock },
    { id: 'skill-tests', path: '/admin/skill-tests', label: 'Skill Tests', icon: BookOpen },
    { id: 'questions', path: '/admin/questions', label: 'Questions', icon: Database },
    { id: 'feedback', path: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'health', path: '/admin/health', label: 'Health', icon: Activity },
    { id: 'infra', path: '/admin/infra', label: 'Infrastructure', icon: Shield },
    { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#212121] flex text-white font-sans">
      {/* Admin Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-[#171717] border-r border-white/5 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-16 flex items-center px-6">
          <Shield className="w-6 h-6 text-white flex-shrink-0" />
          {isSidebarOpen && <span className="ml-3 font-bold text-lg tracking-tight text-white">Admin Hub</span>}
        </div>

        <nav className="p-3 space-y-1 mt-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.id === 'overview' && location.pathname === '/admin');
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  isActive 
                    ? 'bg-[#212121] text-white shadow-sm' 
                    : 'text-white/70 hover:bg-[#212121]/50 hover:text-white'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="h-16 bg-[#212121]/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40 border-b border-white/5">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-white/70"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-white">{user?.full_name || user?.username}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/50">System Operator</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#171717] border border-white/10 flex items-center justify-center font-bold text-white text-sm">
              {user?.username?.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};
