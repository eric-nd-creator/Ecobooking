import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ClipboardList } from 'lucide-react';

const BallBoyAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/ballboy/assignments').then(r => setAssignments(r.data)).catch(() => toast.error('Could not load assignments')).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const filtered = filter === 'upcoming'
    ? assignments.filter(a => new Date(a.date) >= now)
    : filter === 'past'
    ? assignments.filter(a => new Date(a.date) < now)
    : assignments;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">My Assignments</h1>

        <div className="flex gap-2">
          {['all', 'upcoming', 'past'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-brand-700 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading assignments...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-14">
            <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" strokeWidth={1.5} />
            <p className="text-gray-500 mt-3">No assignments found</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Court', 'Date', 'Time', 'Member', 'Assigned'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.court_name}</td>
                    <td className="px-4 py-3">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{a.start_time?.slice(0,5)} – {a.end_time?.slice(0,5)}</td>
                    <td className="px-4 py-3">{a.member_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(a.assigned_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BallBoyAssignments;
