import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CancelBookingModal from '../../components/CancelBookingModal';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Download, CalendarX } from 'lucide-react';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [ballBoys, setBallBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedBB, setSelectedBB] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date_from: '',
    date_to: ''
  });

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search)    params.set('search', filters.search);
    if (filters.status)    params.set('status', filters.status);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to)   params.set('date_to', filters.date_to);
    try {
      const { data } = await api.get(`/bookings/all?${params}`);
      setBookings(data);
    } catch {
      toast.error('Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  useEffect(() => {
    api.get('/admin/ballboys').then(r => setBallBoys(r.data)).catch(() => toast.error('Could not load ball boys'));
  }, []);

  const handleAssign = async () => {
    if (!selectedBB || !assignModal) return;
    try {
      await api.post('/admin/assign-ballboy', { ball_boy_id: selectedBB, booking_id: assignModal });
      toast.success('Ball boy assigned!');
      setAssignModal(null); setSelectedBB('');
    } catch (err) { toast.error(err.response?.data?.message || 'Assignment failed'); }
  };

  const handleCancelConfirm = async (reason) => {
    setCancelling(true);
    try {
      await api.put(`/bookings/${cancelTarget}/cancel`, { reason });
      setBookings(bookings.map(b => b.id === cancelTarget ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled');
      setCancelTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const clearFilters = () => setFilters({ search: '', status: '', date_from: '', date_to: '' });

  const exportCSV = () => {
    const headers = ['Member', 'Court', 'Date', 'Start', 'End', 'Status', 'Coach'];
    const rows = bookings.map(b => [
      b.member_name, b.court_name,
      new Date(b.date).toLocaleDateString(),
      b.start_time?.slice(0,5), b.end_time?.slice(0,5),
      b.status, b.coach_name || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">All Bookings</h1>
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="card space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search Member</label>
              <input type="text" placeholder="Member name..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="input text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="input text-sm">
                <option value="">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input type="date" value={filters.date_from}
                onChange={e => setFilters({ ...filters, date_from: e.target.value })}
                className="input text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input type="date" value={filters.date_to}
                onChange={e => setFilters({ ...filters, date_to: e.target.value })}
                className="input text-sm"/>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{bookings.length} result{bookings.length !== 1 ? 's' : ''}</span>
            {(filters.search || filters.status || filters.date_from || filters.date_to) && (
              <button onClick={clearFilters}
                className="text-sm text-red-500 hover:underline font-medium">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"/>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <CalendarX className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" strokeWidth={1.5} />
              <p className="text-gray-400 mt-3">No bookings match your filters</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-700 text-white">
                  {['#', 'Member', 'Court', 'Date', 'Time', 'Coach', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b, i) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-3 font-medium">
                      {b.member_name}
                      {!b.user_id && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 align-middle">GUEST</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{b.court_name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{new Date(b.date).toLocaleDateString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</td>
                    <td className="px-3 py-3 text-gray-500">{b.coach_name || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {b.status === 'confirmed' && (
                          <>
                            <button onClick={() => setAssignModal(b.id)}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium hover:bg-blue-100 transition-colors">
                              Assign BB
                            </button>
                            <button onClick={() => setCancelTarget(b.id)}
                              className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-medium hover:bg-red-100 transition-colors">
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assign ball boy modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Assign ball boy">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Assign Ball Boy</h3>
            <select value={selectedBB} onChange={e => setSelectedBB(e.target.value)} className="input mb-4">
              <option value="">Select a ball boy</option>
              {ballBoys.map(bb => <option key={bb.id} value={bb.id}>{bb.name}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={handleAssign} className="btn-primary flex-1">Assign</button>
              <button onClick={() => { setAssignModal(null); setSelectedBB(''); }} className="btn-outline flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <CancelBookingModal
        open={!!cancelTarget}
        submitting={cancelling}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
      />
    </DashboardLayout>
  );
};

export default AdminBookings;
