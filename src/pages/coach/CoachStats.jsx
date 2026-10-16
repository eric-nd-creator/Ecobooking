import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BRAND_HEX } from '../../theme';

const CoachStats = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/my').then(r => setBookings(r.data)).finally(() => setLoading(false));
  }, []);

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const monthly = confirmed.reduce((acc, b) => {
    const m = new Date(b.date).toLocaleDateString('en', { month: 'short' });
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(monthly).map(([month, sessions]) => ({ month, sessions }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">My Statistics</h1>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Sessions', value: bookings.length, color: 'border-blue-500' },
            { label: 'Confirmed', value: confirmed.length, color: 'border-green-500' },
            { label: 'Cancelled', value: bookings.length - confirmed.length, color: 'border-red-500' },
          ].map(s => (
            <div key={s.label} className={`card border-l-4 ${s.color}`}>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Sessions by Month</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }}/>
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }}/>
                <Tooltip/>
                <Bar dataKey="sessions" fill={BRAND_HEX} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-10">No session data yet</p>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CoachStats;
