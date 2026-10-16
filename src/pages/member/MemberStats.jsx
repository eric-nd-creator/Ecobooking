import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CHART_COLORS as COLORS, BRAND_HEX, SUCCESS_HEX, DANGER_HEX } from '../../theme';
import { CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react';

const MemberStats = () => {
  const [bookings, setBookings] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/bookings/my'), api.get('/memberships/my')])
      .then(([bk, mem]) => { setBookings(bk.data); setMembership(mem.data); })
      .finally(() => setLoading(false));
  }, []);

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  const courtUsage = confirmed.reduce((acc, b) => {
    acc[b.court_name] = (acc[b.court_name] || 0) + 1;
    return acc;
  }, {});
  const courtData = Object.entries(courtUsage).map(([court, count]) => ({ court, count }));

  const monthlyData = confirmed.reduce((acc, b) => {
    const m = new Date(b.date).toLocaleDateString('en', { month: 'short' });
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const monthlyChartData = Object.entries(monthlyData).map(([month, bookings]) => ({ month, bookings }));

  const pieData = [
    { name: 'Confirmed', value: confirmed.length },
    { name: 'Cancelled', value: cancelled.length },
  ];

  if (loading) return <DashboardLayout><div className="text-center py-20 text-gray-400">Loading statistics...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">My Statistics</h1>

        {/* Summary stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: bookings.length, Icon: CalendarDays, color: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
            { label: 'Confirmed', value: confirmed.length, Icon: CheckCircle2, color: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
            { label: 'Cancelled', value: cancelled.length, Icon: XCircle, color: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' },
            { label: 'Hours on Court', value: confirmed.length, Icon: Clock, color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' },
          ].map(s => (
            <div key={s.label} className={`card border ${s.color} flex items-center gap-4`}>
              <s.Icon className="w-8 h-8 text-gray-700 dark:text-gray-200" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Bookings by Month</h2>
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyChartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }}/>
                  <Tooltip/>
                  <Bar dataKey="bookings" fill={BRAND_HEX} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-8">No booking data yet</p>}
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Court Usage</h2>
            {courtData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={courtData} dataKey="count" nameKey="court" cx="50%" cy="50%" outerRadius={80} label>
                    {courtData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-8">No court usage data yet</p>}
          </div>
        </div>

        {/* Booking status pie */}
        <div className="card max-w-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Booking Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                <Cell fill={SUCCESS_HEX}/>
                <Cell fill={DANGER_HEX}/>
              </Pie>
              <Tooltip/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Membership info */}
        {membership && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Membership History</h2>
            <div className="grid sm:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Plan', value: membership.type.replace('_', ' ') },
                { label: 'Status', value: membership.status },
                { label: 'Start Date', value: new Date(membership.start_date).toLocaleDateString() },
                { label: 'End Date', value: new Date(membership.end_date).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-500 text-xs uppercase font-medium">{label}</p>
                  <p className="font-semibold text-gray-800 mt-1 capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MemberStats;
