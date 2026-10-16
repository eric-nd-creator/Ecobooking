import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CourtTable from '../../components/CourtTable';
import CancelBookingModal from '../../components/CancelBookingModal';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CoachBooking = () => {
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadedBookings, setLoadedBookings] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      setBookings(data);
    } catch {
      toast.error('Could not load your sessions');
    } finally {
      setLoadedBookings(true);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const handleSelect = (slot) => {
    setSelected(slot);
    const h = parseInt(slot.start_time.split(':')[0]);
    setEndTime(`${(h + 1).toString().padStart(2,'0')}:00`);
  };

  const handleBook = async () => {
    if (!selected || !endTime) return;
    setLoading(true);
    try {
      await api.post('/bookings', {
        court_id: selected.court_id,
        date,
        start_time: selected.start_time,
        end_time: endTime
      });
      toast.success('Court booked successfully!');
      setSelected(null);
      await loadBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async (reason) => {
    setCancelling(true);
    try {
      await api.put(`/bookings/${cancelTarget}/cancel`, { reason });
      toast.success('Booking cancelled');
      setBookings(bookings.map(b => b.id === cancelTarget ? { ...b, status: 'cancelled' } : b));
      setCancelTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Book a Court</h1>

        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Date</label>
              <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
                onChange={e => { setDate(e.target.value); setSelected(null); }}
                className="input max-w-xs"/>
            </div>
          </div>
        </div>

        <CourtTable date={date} onSelect={handleSelect} />

        {selected && (
          <div className="card border-2 border-brand-700">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Confirm Booking</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div><p className="text-xs text-gray-500 uppercase">Court</p><p className="font-semibold mt-1">{selected.court_name}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Date</p><p className="font-semibold mt-1">{new Date(date).toDateString()}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Start</p><p className="font-semibold mt-1">{selected.start_time}</p></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
              <select value={endTime} onChange={e => setEndTime(e.target.value)} className="input max-w-xs">
                {Array.from({ length: 4 }, (_, i) => {
                  const h = parseInt(selected.start_time.split(':')[0]) + i + 1;
                  if (h > 22) return null;
                  const t = `${h.toString().padStart(2,'0')}:00`;
                  return <option key={t} value={t}>{t}</option>;
                }).filter(Boolean)}
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4 text-xs text-blue-700">
              Coaches: max 2 courts at the same time
            </div>
            <div className="flex gap-3">
              <button onClick={handleBook} disabled={loading} className="btn-primary">
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button onClick={() => setSelected(null)} className="btn-outline">Cancel</button>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">My Sessions</h2>
            <button onClick={loadBookings} className="text-sm text-brand-700 dark:text-brand-300 hover:underline">
              Refresh
            </button>
          </div>
          {loadedBookings ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Court', 'Date', 'Time', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-medium">{b.court_name}</td>
                      <td className="px-4 py-3">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {b.status === 'confirmed' && new Date(b.date) >= new Date() && (
                          <button onClick={() => setCancelTarget(b.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-center text-gray-400 py-4 text-sm">Loading sessions...</p>}
        </div>
      </div>

      <CancelBookingModal
        open={!!cancelTarget}
        submitting={cancelling}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
      />
    </DashboardLayout>
  );
};

export default CoachBooking;
