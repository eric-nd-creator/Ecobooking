import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { ClipboardList, CalendarDays, Zap, Trophy } from 'lucide-react';

const BallBoyDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    api.get('/ballboy/assignments').then(r => setAssignments(r.data)).catch(() => toast.error('Could not load assignments')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get(`/courts/availability?date=${date}`).then(r => setAvailability(r.data)).catch(() => toast.error('Could not load court status'));
  }, [date]);

  const today = assignments.filter(a => a.date?.startsWith(new Date().toISOString().split('T')[0]));
  const upcoming = assignments.filter(a => new Date(a.date) >= new Date());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ball Boy Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {user.name.split(' ')[0]}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { Icon: ClipboardList, label: 'Total Assignments', value: assignments.length, color: 'border-blue-500' },
            { Icon: CalendarDays, label: 'Upcoming', value: upcoming.length, color: 'border-green-500' },
            { Icon: Zap, label: 'Today', value: today.length, color: 'border-yellow-500' },
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

        {/* Today's assignments */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Assignments</h2>
          {today.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" strokeWidth={1.5} />
              <p className="text-gray-400 mt-2">No assignments for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {today.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-800">{a.court_name}</p>
                    <p className="text-sm text-gray-500">{a.start_time?.slice(0,5)} – {a.end_time?.slice(0,5)} · {a.member_name}</p>
                  </div>
                  <span className="bg-brand-700 text-white text-xs font-semibold px-3 py-1 rounded-full">Today</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Court availability view */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Court Status</h2>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input max-w-[180px] text-sm"/>
          </div>
          {availability ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {availability.courts.map(c => {
                const hasBooking = availability.hours.some(h => h[`court_${c.id}`]?.status === 'booked');
                return (
                  <div key={c.id} className={`rounded-xl p-4 text-center border-2 ${hasBooking ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    <Trophy className="w-6 h-6 mb-1 mx-auto text-gray-600" strokeWidth={1.5} />
                    <p className="font-bold text-sm text-gray-800">{c.name}</p>
                    <p className={`text-xs font-medium mt-1 ${hasBooking ? 'text-red-600' : 'text-green-600'}`}>
                      {hasBooking ? 'In Use' : 'Free'}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-gray-400 text-center py-4">Loading...</p>}
        </div>

        <div className="text-center">
          <Link to="/ballboy/assignments" className="btn-primary">View All Assignments</Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BallBoyDashboard;
