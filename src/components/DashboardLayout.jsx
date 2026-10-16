import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen overflow-x-hidden">
    <Navbar />
    <div className="flex flex-1 min-w-0">
      <Sidebar />
      <main className="flex-1 min-w-0 p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 overflow-x-hidden animate-fade-in">
        {children}
      </main>
    </div>
  </div>
);

export default DashboardLayout;
