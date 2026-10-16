import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { UserX } from 'lucide-react';

const UserManagement = ({ role, title }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  const endpoint = role === 'coach' ? '/admin/coaches' : '/admin/ballboys';

  useEffect(() => {
    api.get(endpoint).then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const handleAdd = async e => {
    e.preventDefault();
    try {
      await api.post('/admin/users', { ...form, role });
      const { data } = await api.get(endpoint);
      setUsers(data);
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', phone: '' });
      toast.success(`${title} added successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete this ${role}?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
      toast.success('Deleted successfully');
    } catch { toast.error('Failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{title} ({users.length})</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
            {showAdd ? 'Cancel' : `+ Add ${title}`}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="card border-2 border-brand-700 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Add New {title}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input" placeholder="Full name"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input" placeholder="Email address"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input" placeholder="Phone number"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input" placeholder="Leave blank for Tennis@123"/>
              </div>
            </div>
            <button type="submit" className="btn-primary">Add {title}</button>
          </form>
        )}

        <div className="card overflow-x-auto">
          {loading ? (
            <p className="text-center py-10 text-gray-400">Loading...</p>
          ) : users.length === 0 ? (
            <div className="text-center py-14">
              <UserX className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" strokeWidth={1.5} />
              <p className="text-gray-400 mt-3">No {title.toLowerCase()} added yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Name', 'Email', 'Phone', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u, i) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(u.id)}
                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-medium hover:bg-red-100">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export const AdminCoaches = () => <UserManagement role="coach" title="Coaches"/>;
export const AdminBallBoys = () => <UserManagement role="ballboy" title="Ball Boys"/>;
