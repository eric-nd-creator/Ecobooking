import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Trophy, Check } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handle = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('Account created! Welcome to TennisCourt.');
      navigate('/member');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => e => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-green-700 to-green-500 items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Join TennisCourt</h1>
          <p className="text-green-100 text-lg">Create your account and start booking courts today.</p>
          <div className="mt-10 space-y-3 text-left">
            {['Book 6 professional tennis courts', 'Choose from 3 membership plans', 'Track your statistics', 'Connect with expert coaches'].map(t => (
              <div key={t} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <Check className="w-4 h-4 text-green-200 flex-shrink-0" strokeWidth={3} />
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Create Account</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Join as a member. Coach and ball-boy accounts are created by an admin.
            </p>
          </div>

          <form onSubmit={handle} className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input type="text" required value={form.name} onChange={set('name')}
                className="input" placeholder="John Doe"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <input type="email" required value={form.email} onChange={set('email')}
                className="input" placeholder="john@example.com"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
              <input type="tel" value={form.phone} onChange={set('phone')}
                className="input" placeholder="+250 7xx xxx xxx"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <input type="password" required value={form.password} onChange={set('password')}
                className="input" placeholder="Min. 6 characters"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <input type="password" required value={form.confirm} onChange={set('confirm')}
                className="input" placeholder="Repeat your password"/>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-700 dark:text-brand-300 font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
