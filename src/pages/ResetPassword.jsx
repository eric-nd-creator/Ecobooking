import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { KeyRound, Trophy, CircleCheck } from 'lucide-react';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordStrong = form.password.length >= 10 && /[a-z]/i.test(form.password) && /\d/.test(form.password);

  const handle = async e => {
    e.preventDefault();
    if (!passwordStrong) return toast.error('Use at least 10 characters, including a letter and a number.');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: form.password });
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'This link is invalid or has expired');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="card w-full max-w-md text-center space-y-4">
          <CircleCheck className="w-12 h-12 text-green-500 mx-auto" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Password reset complete</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300" role="status" aria-live="polite">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <Link to="/login" className="btn-primary w-full">Go to Login</Link>
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
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={10} required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="input" placeholder="At least 10 characters" aria-describedby="password-rules"/>
            <p id="password-rules" className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use at least 10 characters, including a letter and a number.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={10} required value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              className="input" placeholder="Enter the same password again" aria-invalid={Boolean(form.confirm && form.password !== form.confirm)}/>
            {form.confirm && form.password !== form.confirm && <p role="alert" className="text-xs text-red-600 mt-1">Passwords do not match.</p>}
          </div>
          <button type="submit" disabled={loading || !passwordStrong || form.password !== form.confirm} className="btn-primary w-full py-3">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
