import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-black">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-20'}`}>
        <Navbar onNavigate={() => {}} />
        
        <main className="min-h-screen">
          <div className="container mx-auto px-6 max-w-7xl py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
