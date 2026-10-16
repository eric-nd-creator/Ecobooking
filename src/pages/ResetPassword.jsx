import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { KeyRound, Trophy } from 'lucide-react';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('id');
  const token = params.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handle = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { id, token, new_password: form.password });
      toast.success('Password reset — you can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'This link is invalid or has expired');
    } finally {
      setLoading(false);
    }
  };

  if (!id || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="card max-w-md text-center space-y-3">
          <p className="font-semibold text-gray-800 dark:text-gray-100">Invalid reset link</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">This password reset link is missing required information.</p>
          <Link to="/forgot-password" className="btn-primary inline-block mt-2">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-700 rounded-full flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-brand-700 dark:text-brand-300 text-xl">TennisCourt</span>
          </Link>
          <KeyRound className="w-10 h-10 text-brand-600 dark:text-brand-300 mx-auto mb-2" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Reset Password</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Choose a new password for your account</p>
        </div>

        <form onSubmit={handle} className="card space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
            <input type="password" required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="input" placeholder="Min. 6 characters"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
            <input type="password" required value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              className="input" placeholder="Repeat new password"/>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
