import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CourtTable from '../../components/CourtTable';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BRAND_HEX } from '../../theme';
import { CalendarDays, Zap, Users, CreditCard, BarChart3 } from 'lucide-react';
import { getClubDateString } from '../../utils/clubTime';

const KPIS = [
  { Icon: CalendarDays, label: 'Total Bookings', field: 'totalBookings', color: 'bg-blue-500', border: 'border-blue-500', link: '/admin/bookings' },
  { Icon: Zap, label: "Today's Bookings", field: 'todayBookings', color: 'bg-green-500', border: 'border-green-500', link: '/admin/bookings' },
  { Icon: Users, label: 'Total Members', field: 'totalMembers', color: 'bg-yellow-500', border: 'border-yellow-500', link: '/admin/members' },
  { Icon: CreditCard, label: 'Active Members', field: 'activeMembers', color: 'bg-purple-500', border: 'border-purple-500', link: '/admin/members' },
];

const QUICK_ACTIONS = [
  { label: 'Manage Members', to: '/admin/members', Icon: Users, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50' },
  { label: 'View All Bookings', to: '/admin/bookings', Icon: CalendarDays, color: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50' },
  { label: 'Analytics Report', to: '/admin/analytics', Icon: BarChart3, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50' },
];

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [withPartner, setWithPartner] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get('/admin/analytics').then(r => setData(r.data)).catch(() => toast.error('Could not load dashboard data')).finally(() => setLoading(false));
    api.get('/admin/members').then(r => setMembers(r.data)).catch(() => toast.error('Could not load members'));
  }, []);

  const handleBookForMember = async () => {
    if (!memberId || !bookingDate || !selectedSlot) return;
    const startHour = parseInt(selectedSlot.start_time.split(':')[0], 10);
    const endTime = `${String(startHour + duration).padStart(2, '0')}:00`;
    setBooking(true);
    try {
      await api.post('/bookings', {
        court_id: selectedSlot.court_id,
        date: bookingDate,
        start_time: selectedSlot.start_time,
        end_time: endTime,
        target_user_id: Number(memberId),
        with_partner: withPartner,
      });
      const member = members.find(m => String(m.id) === String(memberId));
      toast.success(`Booking created for ${member?.name || 'member'}`);
      setSelectedSlot(null);
      setBookingDate('');
      setWithPartner(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <DashboardLayout><div className="text-center py-20 text-gray-400">Loading dashboard...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Admin Dashboard</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>

        {/* KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map(s => (
            <Link key={s.label} to={s.link}
              className={`card hover:shadow-md transition-shadow flex items-center gap-4 border-l-4 ${s.border}`}>
              <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                <s.Icon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data?.[s.field] || 0}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Revenue card */}
        <div className="bg-gradient-to-r from-green-700 to-green-500 rounded-2xl p-6 text-white">
          <p className="text-green-200 text-sm">Total Revenue</p>
          <p className="text-4xl font-bold mt-1">{Number(data?.revenue || 0).toLocaleString()} <span className="text-xl font-normal text-green-200">RWF</span></p>
          <p className="text-green-200 text-sm mt-2">
            From memberships and guest bookings
            {data?.guestRevenue?.revenue > 0 && (
              <> &middot; {Number(data.guestRevenue.revenue).toLocaleString()} RWF from {data.guestRevenue.count} guest booking{data.guestRevenue.count === 1 ? '' : 's'}</>
            )}
          </p>
        </div>

        {/* Create a booking on behalf of a member */}
        <section className="card space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Book a Court for a Member</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose a member, date, and available court slot.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="booking-member" className="block text-xs font-medium text-gray-500 mb-1">Member</label>
              <select id="booking-member" value={memberId} onChange={e => setMemberId(e.target.value)} className="input text-sm">
                <option value="">Select a member</option>
                {members.map(member => <option key={member.id} value={member.id}>{member.name} — {member.email}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="booking-date" className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input id="booking-date" type="date" value={bookingDate} min={getClubDateString()}
                onChange={e => { setBookingDate(e.target.value); setSelectedSlot(null); }} className="input text-sm" />
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 mb-1">Duration</span>
              <div className="flex gap-2">
                {[1, 2].map(hours => <button key={hours} type="button" onClick={() => { setDuration(hours); setSelectedSlot(null); }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${duration === hours ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {hours} hour{hours > 1 ? 's' : ''}
                </button>)}
              </div>
            </div>
          </div>
          {bookingDate && <CourtTable date={bookingDate} duration={duration} onSelect={setSelectedSlot} disabled={!memberId} />}
          {selectedSlot && (
            <div className="border border-brand-200 rounded-xl p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {selectedSlot.court_name} · {bookingDate} · {selectedSlot.start_time}–{String(parseInt(selectedSlot.start_time.split(':')[0], 10) + duration).padStart(2, '0')}:00
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={withPartner} onChange={e => setWithPartner(e.target.checked)} className="rounded border-gray-300" />
                Member is playing with a partner
              </label>
              <button type="button" onClick={handleBookForMember} disabled={booking || !memberId} className="btn-primary">
                {booking ? 'Creating booking…' : 'Confirm Booking for Member'}
              </button>
            </div>
          )}
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Court usage chart */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Court Usage</h2>
            {data?.courtUsage?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.courtUsage}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/>
                  <Tooltip/>
                  <Bar dataKey="bookings" fill={BRAND_HEX} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-8">No booking data</p>}
          </div>

          {/* Recent activity */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Recent Bookings</h2>
            {data?.recentBookings?.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No recent bookings</p>
            ) : (
              <div className="space-y-3">
                {data?.recentBookings?.slice(0, 6).map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{b.member} — {b.court}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{new Date(b.date).toLocaleDateString()} · {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.to} to={a.to}
              className={`flex items-center gap-3 p-4 rounded-2xl font-semibold transition-all ${a.color}`}>
              <a.Icon className="w-5 h-5" strokeWidth={1.75} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
