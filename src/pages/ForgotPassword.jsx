import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { MailCheck, Trophy } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handle = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'We could not process your request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Forgot Password</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">We'll email you a link to reset it</p>
        </div>

        {sent ? (
          <div className="card text-center space-y-3 animate-fade-in">
            <MailCheck className="w-12 h-12 text-green-500 mx-auto" strokeWidth={1.5} />
            <p className="text-gray-700 dark:text-gray-200 font-semibold">Check your email</p>
            <p className="text-sm text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
              If an account with that email exists, you will receive a password reset link shortly. The link expires in 30 minutes.
            </p>
            <Link to="/login" className="btn-outline w-full inline-block text-center mt-2">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handle} className="card space-y-5">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com"/>
            </div>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Remembered it? <Link to="/login" className="text-brand-700 dark:text-brand-300 font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
