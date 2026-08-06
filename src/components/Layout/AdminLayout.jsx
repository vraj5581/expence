import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex overflow-x-hidden max-w-full w-full">
      {/* Sidebar (Desktop view) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden lg:pl-64 print:pl-0 print:m-0 print:w-full">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 px-2 py-3.5 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl w-full max-w-full mx-auto overflow-x-hidden print:p-0 print:m-0 print:max-w-none print:w-full">
          <Outlet />
        </main>

        {/* Mobile Bottom Footer Navigation Bar */}
        <BottomNav />
      </div>
    </div>
  );
};

export default AdminLayout;
