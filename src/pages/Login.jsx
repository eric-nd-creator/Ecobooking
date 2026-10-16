import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShieldCheck, Trophy } from 'lucide-react';

const ROLE_PATHS = { member: '/member', coach: '/coach', ballboy: '/ballboy', admin: '/admin' };

const Login = () => {
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');

  const afterLogin = (user) => {
    toast.success(`Welcome back, ${user.name}!`);
    if (user.mustChangePassword) {
      navigate('/profile', { state: { forcePasswordTab: true } });
      toast('Please set a new password to continue.', { icon: <ShieldCheck className="w-5 h-5" /> });
      return;
    }
    navigate(ROLE_PATHS[user.role] || '/');
  };

  const handle = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result?.requires2FA) {
        setChallenge(result.challenge);
      } else {
        afterLogin(result);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await verifyTwoFactor(challenge, code);
      afterLogin(user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-700 to-brand-500 items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Trophy className="w-12 h-12" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold mb-4">TennisCourt</h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Manage your tennis bookings, track your progress, and connect with coaches.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-sm">
            {['6 Courts', 'Expert Coaches', 'Real-time Booking', 'Analytics'].map(t => (
              <div key={t} className="bg-white/10 rounded-xl py-3 px-4 font-medium">{t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 lg:hidden mb-6">
              <div className="w-10 h-10 bg-brand-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">TC</span>
              </div>
              <span className="font-bold text-brand-700 dark:text-brand-300 text-xl">TennisCourt</span>
            </Link>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {challenge ? 'Two-Factor Verification' : 'Welcome Back'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {challenge ? 'Enter the 6-digit code from your authenticator app' : 'Sign in to your account'}
            </p>
          </div>

          {challenge ? (
            <form onSubmit={handleVerify} className="card space-y-5 animate-fade-in">
              <div className="flex justify-center text-brand-600 dark:text-brand-300">
                <ShieldCheck className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Authentication Code</label>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required
                  autoFocus value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="input text-center text-2xl tracking-[0.5em] font-mono" placeholder="000000"
                />
              </div>
              <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full text-base py-3">
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => { setChallenge(null); setCode(''); }} className="w-full text-center text-sm text-gray-500 hover:underline">
                Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handle} className="card space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input" placeholder="you@example.com"/>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <Link to="/forgot-password" className="text-xs text-brand-600 dark:text-brand-300 hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="input pr-12" placeholder="Your password"/>
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-brand-700 dark:text-brand-300 font-semibold hover:underline">Create one</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
