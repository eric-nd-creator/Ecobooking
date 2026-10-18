import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children, contentClassName = '' }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
  <div className="flex flex-col min-h-screen overflow-x-hidden">
    <Navbar dashboard dashboardMenuOpen={menuOpen} onDashboardMenuToggle={() => setMenuOpen(open => !open)} />
    <div className="flex flex-1 min-w-0">
      <Sidebar menuOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className={`flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 bg-gray-50 dark:bg-gray-900 overflow-x-clip animate-fade-in ${contentClassName}`}>
        {children}
      </main>
    </div>
  </div>
  );
};

export default DashboardLayout;
