import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Trophy, CreditCard, BarChart3, User, ClipboardList,
  CalendarDays, Users, TrendingUp, CalendarClock, LogOut, Globe, Menu, X,
} from 'lucide-react';
import { useState } from 'react';

// Informational, not tennis-specific — hidden from the admin dashboard nav,
// still shown for other roles.
const STOCKS_LINK = { to: '/stocks', label: 'African Stocks', Icon: Globe };

const LINKS = {
  member: [
    { to: '/member',            label: 'Dashboard',    Icon: Home },
    { to: '/member/book',       label: 'Book Court',   Icon: Trophy },
    { to: '/member/membership', label: 'Membership',   Icon: CreditCard },
    { to: '/member/stats',      label: 'Statistics',   Icon: BarChart3 },
    STOCKS_LINK,
    { to: '/profile',           label: 'My Profile',   Icon: User },
  ],
  coach: [
    { to: '/coach',       label: 'Dashboard',  Icon: Home },
    { to: '/coach/book',  label: 'Book Court', Icon: Trophy },
    { to: '/coach/stats', label: 'Statistics', Icon: BarChart3 },
    STOCKS_LINK,
    { to: '/profile',     label: 'My Profile', Icon: User },
  ],
  ballboy: [
    { to: '/ballboy',              label: 'Dashboard',   Icon: Home },
    { to: '/ballboy/assignments',  label: 'Assignments', Icon: ClipboardList },
    { to: '/ballboy/courts',       label: 'Court View',  Icon: Trophy },
    STOCKS_LINK,
  ],
  admin: [
    { to: '/admin',           label: 'Dashboard',   Icon: Home },
    { to: '/admin/bookings',  label: 'All Bookings',Icon: CalendarDays },
    { to: '/admin/members',   label: 'Members',     Icon: Users },
    { to: '/admin/coaches',   label: 'Coaches',     Icon: Trophy },
    { to: '/admin/ballboys',  label: 'Ball Boys',   Icon: ClipboardList },
    { to: '/admin/analytics', label: 'Analytics',   Icon: BarChart3 },
    { to: '/admin/predictions', label: 'Reservation Forecast', Icon: TrendingUp },
    { to: '/admin/schedule',  label: 'Schedule',    Icon: CalendarClock },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return null;

  const links = LINKS[user.role] || [];

  const navigation = (
    <>
      {/* User header */}
      <div className="p-6 text-white bg-black/15">
        <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-2xl font-bold mb-3 border-2 border-white/50">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <p className="font-bold text-lg leading-tight">{user.name}</p>
        <span className="inline-block bg-white/25 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 capitalize border border-white/30">
          {user.role}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to.split('/').length <= 2}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }>
            <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/20">
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white font-medium transition-all">
          <LogOut className="w-5 h-5" strokeWidth={1.75} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="lg:hidden px-3 py-2 bg-brand-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="dashboard-navigation"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          {menuOpen ? 'Close menu' : 'Dashboard menu'}
        </button>
      </div>

      {menuOpen && (
        <button
          type="button"
          aria-label="Close dashboard menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 top-16 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        id="dashboard-navigation"
        className={`${menuOpen ? 'flex' : 'hidden'} fixed inset-y-16 left-0 z-50 w-[min(18rem,85vw)] flex-col overflow-y-auto shadow-xl bg-brand-800 dark:bg-gray-900 lg:static lg:z-auto lg:flex lg:w-64 lg:shrink-0 lg:shadow-xl`}
      >
        {navigation}
      </aside>
    </>
  );
};

export default Sidebar;
