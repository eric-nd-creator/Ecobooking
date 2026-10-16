import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Users, Check } from 'lucide-react';

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('');
  const [viewMember, setViewMember] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (membershipFilter) params.set('membership_status', membershipFilter);
    const { data } = await api.get(`/admin/members?${params}`);
    setMembers(data);
    setLoading(false);
  }, [search, membershipFilter]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleView = async (id) => {
    setViewMember(id);
    const { data } = await api.get(`/admin/members/${id}`);
    setViewData(data);
  };

  // Lets a notification link (e.g. "/admin/members?view=7") deep-link straight
  // into that member's detail modal instead of just landing on the list.
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId) {
      handleView(viewId);
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this member? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setMembers(members.filter(m => m.id !== id));
      toast.success('Member deleted');
    } catch { toast.error('Failed'); }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Membership', 'Expires', 'Joined'];
    const rows = members.map(m => [
      m.name, m.email, m.phone || '',
      m.membership_status || 'None',
      m.membership_end ? new Date(m.membership_end).toLocaleDateString() : '',
      new Date(m.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `members-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Members ({members.length})</h1>
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-all">
            ⬇️ Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input type="text" placeholder="Name or email..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="input text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Membership Status</label>
              <select value={membershipFilter}
                onChange={e => setMembershipFilter(e.target.value)}
                className="input text-sm">
                <option value="">All members</option>
                <option value="active">Active membership</option>
                <option value="none">No membership</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card overflow-x-auto">
          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"/>)}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" strokeWidth={1.5} />
              <p className="text-gray-400 mt-3">No members found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-700 text-white">
                  {['#', 'Name', 'Email', 'Phone', 'Membership', 'Expires', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m, i) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        m.membership_status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.membership_status === 'active'
                          ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" strokeWidth={3} />{m.membership_type?.replace('_', ' ')}</span>
                          : 'No membership'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {m.membership_end ? new Date(m.membership_end).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleView(m.id)}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium hover:bg-blue-100">View</button>
                        <button onClick={() => handleDelete(m.id)}
                          className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-medium hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Member detail modal */}
      {viewMember && viewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{viewData.user?.name}</h3>
                <p className="text-gray-500 text-sm">{viewData.user?.email}</p>
              </div>
              <button onClick={() => { setViewMember(null); setViewData(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-xl">
                ×
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                ['Phone', viewData.user?.phone || 'N/A'],
                ['Joined', new Date(viewData.user?.created_at).toLocaleDateString()],
                ['Membership', viewData.membership?.status || 'None'],
                ['Plan', viewData.membership?.type?.replace('_', ' ') || '—'],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold">{l}</p>
                  <p className="font-semibold text-gray-800 mt-0.5 capitalize">{v}</p>
                </div>
              ))}
            </div>

            {viewData.membership && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-800">Active Membership</p>
                  <p className="text-sm text-blue-600">
                    Expires {new Date(viewData.membership.end_date).toLocaleDateString()} ·{' '}
                    {Math.max(0, Math.ceil((new Date(viewData.membership.end_date) - new Date()) / 86400000))} days left
                  </p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">ACTIVE</span>
              </div>
            )}

            {viewData.membership && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">MoMo Payment Reference</p>
                  <p className="font-mono text-sm text-gray-700">{viewData.membership.payment_reference}</p>
                </div>
                {viewData.momoStatus ? (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                    viewData.momoStatus === 'SUCCESSFUL' ? 'bg-green-100 text-green-700'
                    : viewData.momoStatus === 'FAILED' ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                  }`}>
                    {viewData.momoStatus}
                  </span>
                ) : viewData.membership.payment_reference?.startsWith('DEMO-') ? (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-200 text-gray-600">DEMO MODE</span>
                ) : null}
              </div>
            )}

            <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
              Bookings ({viewData.bookings?.length})
            </h4>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{['Court', 'Date', 'Time', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewData.bookings?.slice(0, 10).map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{b.court_name}</td>
                      <td className="px-3 py-2">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 font-mono">{b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold ${b.status === 'confirmed' ? 'text-green-600' : 'text-red-500'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminMembers;
