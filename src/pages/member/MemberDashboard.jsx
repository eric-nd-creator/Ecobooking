import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Trophy, CalendarDays, CreditCard, HourglassIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';

const StatCard = ({ Icon, label, value, color }) => (
  <div className={`card dashboard-card flex items-center gap-4 border-l-4 ${color}`}>
    <Icon className="w-8 h-8 text-gray-700 dark:text-gray-200" strokeWidth={1.5} />
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  </div>
);

const MemberDashboard = () => {
  const { user } = useAuth();
  const [membership, setMembership] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/memberships/my'),
      api.get('/bookings/my')
    ]).then(([memRes, bkRes]) => {
      setMembership(memRes.data);
      setBookings(bkRes.data.slice(0, 5));
    }).catch(() => toast.error('Could not load dashboard data')).finally(() => setLoading(false));
  }, []);

  const daysLeft = membership?.end_date
    ? Math.max(0, Math.ceil((new Date(membership.end_date) - new Date()) / 86400000))
    : 0;

  const upcomingBookings = bookings.filter(b => new Date(b.date) >= new Date() && b.status === 'confirmed');

  return (
    <DashboardLayout contentClassName="member-dashboard-content">
      <div className="member-dashboard space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Welcome back, {user.name.split(' ')[0]}!</h1>
            <p className="text-gray-500 text-sm mt-1">Here's your tennis activity overview</p>
          </div>
          <Link to="/member/book" className="btn-primary">Book Court</Link>
        </div>

        {/* Membership alert */}
        {!membership || membership.status !== 'active' ? (
          <div className="dashboard-card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">No Active Membership</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">You need an active membership to book courts.</p>
              </div>
            </div>
            <Link to="/member/membership" className="btn-accent text-sm py-2 px-4">Subscribe</Link>
          </div>
        ) : (
          <div className="dashboard-card bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">Membership Active — {membership.type.replace('_', ' ')}</p>
                <p className="text-sm text-green-600 dark:text-green-400">{daysLeft} days remaining · Expires {new Date(membership.end_date).toLocaleDateString()}</p>
              </div>
            </div>
            <Link to="/member/membership" className="btn-outline text-sm py-2 px-4">Renew</Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          <StatCard Icon={Trophy} label="Total Bookings" value={bookings.length} color="border-blue-500"/>
          <StatCard Icon={CalendarDays} label="Upcoming" value={upcomingBookings.length} color="border-green-500"/>
          <StatCard Icon={CreditCard} label="Membership" value={membership?.status === 'active' ? 'Active' : 'None'} color="border-yellow-500"/>
          <StatCard Icon={HourglassIcon} label="Days Left" value={daysLeft} color="border-purple-500"/>
        </div>

        {/* Membership card */}
        {membership && (
          <div className="dashboard-card bg-gradient-to-r from-brand-700 to-brand-500 rounded-2xl p-6 lg:p-8 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-blue-200 text-sm uppercase font-medium tracking-wide">Membership Card</p>
                <h2 className="text-2xl font-bold mt-1">{user.name}</h2>
                <p className="text-blue-200 capitalize mt-1">{membership.type.replace('_', ' ')} Plan</p>
              </div>
              <div className="text-right">
                <Trophy className="w-12 h-12 mb-2 ml-auto" strokeWidth={1.5} />
                <div className={`text-xs font-semibold px-3 py-1 rounded-full ${membership.status === 'active' ? 'bg-green-400/30 text-green-200' : 'bg-red-400/30 text-red-200'}`}>
                  {membership.status.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-sm">
              <div>
                <p className="text-blue-300">Valid From</p>
                <p className="font-semibold">{new Date(membership.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-blue-300">Expires</p>
                <p className="font-semibold">{new Date(membership.end_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-blue-300">Days Left</p>
                <p className={`font-semibold ${daysLeft < 10 ? 'text-yellow-300' : ''}`}>{daysLeft}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent bookings */}
        <div className="card dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Recent Bookings</h2>
            <Link to="/member/book" className="text-sm text-brand-700 font-medium hover:underline">New Booking →</Link>
          </div>
          {loading ? (
            <p className="text-gray-400 text-center py-6">Loading...</p>
          ) : bookings.length === 0 ? (
            <div className="text-center py-10">
              <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-500">No bookings yet</p>
              <Link to="/member/book" className="btn-primary mt-4 inline-block">Book Your First Court</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Court', 'Date', 'Time', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{b.court_name}</td>
                      <td className="px-4 py-3">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MemberDashboard;
