import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CHART_COLORS as COLORS, BRAND_HEX } from '../../theme';
import { CalendarDays, Zap, Users, Wallet } from 'lucide-react';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [memStats, setMemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateRange.from) params.set('date_from', dateRange.from);
    if (dateRange.to)   params.set('date_to', dateRange.to);
    const [a, m] = await Promise.all([
      api.get(`/admin/analytics?${params}`),
      api.get('/memberships/stats')
    ]);
    setAnalytics(a.data);
    setMemStats(m.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const exportReport = () => {
    if (!analytics) return;
    const lines = [
      'TennisCourt Analytics Report',
      `Generated: ${new Date().toLocaleString()}`,
      dateRange.from ? `Period: ${dateRange.from} to ${dateRange.to || 'today'}` : 'Period: All time',
      '',
      'SUMMARY',
      `Total Bookings,${analytics.totalBookings}`,
      `Today Bookings,${analytics.todayBookings}`,
      `Total Members,${analytics.totalMembers}`,
      `Active Members,${analytics.activeMembers}`,
      `Total Revenue (RWF),${analytics.revenue}`,
      '',
      'COURT USAGE',
      'Court,Bookings',
      ...(analytics.courtUsage?.map(c => `${c.name},${c.bookings}`) || []),
      '',
      'RECENT BOOKINGS',
      'Member,Court,Date,Start,End',
      ...(analytics.recentBookings?.map(b =>
        `${b.member},${b.court},${new Date(b.date).toLocaleDateString()},${b.start_time?.slice(0,5)},${b.end_time?.slice(0,5)}`
      ) || [])
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const membershipPie = memStats?.byType?.map(m => ({
    name: m.type.replace('_', ' '),
    value: Number(m.count)
  })) || [];

  const membershipRevPie = analytics?.membershipRevenue?.map(m => ({
    name: m.type.replace('_', ' '),
    value: Number(m.revenue)
  })) || [];
  if (analytics?.guestRevenue?.revenue > 0) {
    membershipRevPie.push({ name: 'guest bookings', value: analytics.guestRevenue.revenue });
  }

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48"/>
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl"/>)}</div>
        <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl"/>)}</div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Analytics & Reports</h1>
            <p className="text-gray-500 text-sm mt-0.5">Generated: {new Date().toLocaleString()}</p>
          </div>
          <button onClick={exportReport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-all">
            ⬇️ Export Report (CSV)
          </button>
        </div>

        {/* Date range filter */}
        <div className="card">
          <p className="text-sm font-semibold text-gray-600 mb-3">Filter by date range</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                className="input max-w-[180px] text-sm"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                className="input max-w-[180px] text-sm"/>
            </div>
            <button onClick={load} className="btn-primary py-2 text-sm">Apply</button>
            {(dateRange.from || dateRange.to) && (
              <button onClick={() => { setDateRange({ from: '', to: '' }); setTimeout(load, 0); }}
                className="text-sm text-red-500 hover:underline">Clear</button>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: analytics?.totalBookings || 0, Icon: CalendarDays, bg: 'bg-blue-500' },
            { label: 'Today\'s Bookings', value: analytics?.todayBookings || 0, Icon: Zap, bg: 'bg-green-500' },
            { label: 'Active Members', value: analytics?.activeMembers || 0, Icon: Users, bg: 'bg-yellow-500' },
            { label: 'Revenue (RWF)', value: Number(analytics?.revenue || 0).toLocaleString(), Icon: Wallet, bg: 'bg-purple-500' },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                <s.Icon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">{s.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Court usage bar */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Court Usage</h2>
            {analytics?.courtUsage?.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={analytics.courtUsage}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/>
                  <Tooltip/>
                  <Bar dataKey="bookings" fill={BRAND_HEX} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-10">No court data</p>}
          </div>

          {/* Active memberships by type */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Active Memberships by Type</h2>
            {membershipPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={membershipPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                    {membershipPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-10">No membership data</p>}
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Revenue Breakdown</h2>
          {membershipRevPie.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={membershipRevPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {membershipRevPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v => `${Number(v).toLocaleString()} RWF`}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {analytics?.membershipRevenue?.map((m, i) => (
                  <div key={m.type} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}/>
                      <span className="font-medium text-sm capitalize">{m.type.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-800">{Number(m.revenue).toLocaleString()} RWF</p>
                      <p className="text-xs text-gray-400">{m.count} active</p>
                    </div>
                  </div>
                ))}
                {analytics?.guestRevenue?.revenue > 0 && (
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[(analytics.membershipRevenue?.length || 0) % COLORS.length] }}/>
                      <span className="font-medium text-sm capitalize">Guest bookings</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-800">{Number(analytics.guestRevenue.revenue).toLocaleString()} RWF</p>
                      <p className="text-xs text-gray-400">{analytics.guestRevenue.count} bookings</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : <p className="text-gray-400 text-center py-6">No revenue data yet</p>}
        </div>

        {/* Summary table */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Summary</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Total Members', value: analytics?.totalMembers || 0 },
              { label: 'Active Members', value: analytics?.activeMembers || 0 },
              { label: 'Total Bookings', value: analytics?.totalBookings || 0 },
              { label: 'Revenue (RWF)', value: Number(analytics?.revenue || 0).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs uppercase font-semibold mb-1">{label}</p>
                <p className="text-2xl font-bold text-brand-700">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent bookings */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Member', 'Court', 'Date', 'Time'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics?.recentBookings?.map((b, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{b.member}</td>
                    <td className="px-4 py-3">{b.court}</td>
                    <td className="px-4 py-3">{new Date(b.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
