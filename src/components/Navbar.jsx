import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Bell, Menu, X, Sun, Moon, Trophy } from 'lucide-react';

const POLL_INTERVAL = 15000; // 15 seconds

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  const load = () => {
    api.get('/notifications/my')
      .then(({ data }) => { setNotifications(data.notifications); setUnreadCount(data.unreadCount); })
      .catch(err => console.error('Failed to load notifications:', err.message));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markRead = (id) => {
    api.put(`/notifications/${id}/read`).then(load).catch(err => console.error('Failed to mark notification read:', err.message));
  };

  const handleClick = (n) => {
    markRead(n.id);
    if (n.link) { setOpen(false); navigate(n.link); }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen(!open)} aria-label="Notifications" aria-expanded={open}
        className="relative p-2 text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 animate-scale-in origin-top-right">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200 text-sm">Notifications</div>
          {notifications.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">No notifications yet</p>
          ) : (
            notifications.map(n => (
              <button key={n.id} onClick={() => handleClick(n)}
                className={`block w-full text-left px-4 py-3 text-sm border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 ${n.is_read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100 font-medium bg-blue-50/50 dark:bg-brand-900/30'}`}>
                {n.message}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</p>
                  {n.link && <span className="text-[10px] text-brand-600 dark:text-brand-300 font-semibold">View →</span>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-700 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-brand-700 dark:text-brand-300 text-lg hidden sm:block">TennisCourt</span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-1">
            {['/', '/about', '/booking', '/membership'].map((path, i) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    isActive ? 'text-brand-700 bg-blue-50 dark:text-brand-300 dark:bg-brand-900/40 font-semibold' : 'text-gray-600 hover:text-brand-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-brand-300 dark:hover:bg-gray-700'
                  }`
                }
              >
                {['Home', 'About Us', 'Booking', 'Membership'][i]}
              </NavLink>
            ))}
          </div>

          {/* Right: theme toggle / login / user */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 text-gray-500 hover:text-brand-700 dark:text-gray-300 dark:hover:text-accent-400 transition-colors">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user ? (
              <>
                <NotificationBell />
                <button onClick={handleLogout} className="btn-outline text-sm py-2 px-4">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary text-sm py-2 px-5">Login</Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 text-gray-500 dark:text-gray-300">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
              {menuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-200" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1 animate-fade-in">
            {[['/', 'Home'], ['/about', 'About Us'], ['/booking', 'Booking'], ['/membership', 'Membership']].map(([path, label]) => (
              <NavLink key={path} to={path} onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium">
                {label}
              </NavLink>
            ))}
            {user ? (
              <button onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-red-600 font-medium">Logout</button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-brand-700 dark:text-brand-300 font-semibold">Login</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
