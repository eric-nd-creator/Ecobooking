import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { CalendarDays, Trophy, CalendarCheck } from 'lucide-react';

const CoachDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/my').then(r => setBookings(r.data)).catch(() => toast.error('Could not load sessions')).finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter(b => new Date(b.date) >= new Date() && b.status === 'confirmed');
  const today = bookings.filter(b => b.date?.startsWith(new Date().toISOString().split('T')[0]) && b.status === 'confirmed');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Coach Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome, Coach {user.name.split(' ')[0]}</p>
          </div>
          <Link to="/coach/book" className="btn-primary">Book Court</Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { Icon: CalendarDays, label: 'Total Sessions', value: bookings.length, color: 'border-blue-500' },
            { Icon: Trophy, label: 'Upcoming', value: upcoming.length, color: 'border-green-500' },
            { Icon: CalendarCheck, label: 'Today', value: today.length, color: 'border-yellow-500' },
          ].map(s => (
            <div key={s.label} className={`card border-l-4 ${s.color} flex items-center gap-4`}>
              <s.Icon className="w-8 h-8 text-gray-700 dark:text-gray-200" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Today's sessions */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Sessions</h2>
          {today.length === 0 ? (
            <p className="text-gray-400 text-center py-6">No sessions scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {today.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-800">{b.court_name}</p>
                    <p className="text-sm text-gray-500">{b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</p>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Today</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recent Bookings</h2>
            <Link to="/coach/book" className="text-sm text-brand-700 hover:underline">Book Court →</Link>
          </div>
          {loading ? (
            <p className="text-center text-gray-400 py-6">Loading...</p>
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
                  {bookings.slice(0, 8).map(b => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-medium">{b.court_name}</td>
                      <td className="px-4 py-3">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</td>
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

export default CoachDashboard;
