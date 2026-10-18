import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';

const PLANS = [
  {
    type: 'monthly',
    label: 'Monthly',
    price: 30000,
    per: '/month',
    color: 'border-blue-300 hover:border-blue-500',
    features: ['Access to all 6 courts', 'Book up to 2 sessions/day', 'Cancel anytime'],
  },
  {
    type: 'half_yearly',
    label: 'Half-Yearly',
    price: 75000,
    per: '/6 months',
    color: 'border-green-300 hover:border-green-500',
    popular: true,
    features: ['Access to all 6 courts', 'Book up to 4 sessions/day', 'Priority booking', 'Save 17%'],
  },
  {
    type: 'yearly',
    label: 'Yearly',
    price: 150000,
    per: '/year',
    color: 'border-yellow-300 hover:border-yellow-500',
    features: ['Access to all 6 courts', 'Unlimited sessions', 'Priority booking', 'Save 33%'],
  },
];

const POLL_INTERVAL = 5000; // 5 seconds
const POLL_TIMEOUT  = 120000; // 2 minutes

const MemberMembership = () => {
  const { user } = useAuth();
  const [membership, setMembership]   = useState(null);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [phone, setPhone]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [txnId, setTxnId]             = useState(null);   // waiting for AT callback
  const [pollExpired, setPollExpired] = useState(false);
  const pollRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    api.get('/memberships/my')
      .then(r => setMembership(r.data))
      .catch(() => setMembership(null))
      .finally(() => setLoading(false));
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const daysLeft = membership?.end_date
    ? Math.max(0, Math.ceil((new Date(membership.end_date) - new Date()) / 86400000))
    : 0;

  const startPolling = (transactionId) => {
    setTxnId(transactionId);
    setPollExpired(false);

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payments/status/${transactionId}`);
        if (data.status === 'success') {
          clearInterval(pollRef.current);
          clearTimeout(timeoutRef.current);
          const { data: mem } = await api.get('/memberships/my');
          setMembership(mem);
          setSelected(null);
          setTxnId(null);
          setPhone('');
          toast.success('Membership activated successfully!');
        }
      } catch {/* keep polling */}
    }, POLL_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current);
      setPollExpired(true);
    }, POLL_TIMEOUT);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || !phone.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/payments/initiate', {
        type: selected.type,
        phoneNumber: phone.trim(),
      });

      if (data.status === 'success') {
        // Demo mode — activated immediately
        setMembership(data.membership);
        setSelected(null);
        setPhone('');
        toast.success('Membership activated successfully!');
      } else {
        // Real AT — wait for phone confirmation
        toast.success('Payment request sent to your phone!');
        startPolling(data.transactionId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPending = () => {
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
    setTxnId(null);
    setPollExpired(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800">Membership</h1>

        {/* Current membership card */}
        {loading ? (
          <div className="card animate-pulse h-32" />
        ) : membership?.status === 'active' ? (
          <div className="bg-gradient-to-r from-brand-700 to-brand-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-200 text-xs uppercase font-semibold tracking-wider">Current Membership</p>
                <h2 className="text-2xl font-bold mt-1 capitalize">{membership.type.replace('_', ' ')} Plan</h2>
              </div>
              <div className="bg-green-400/30 text-green-200 text-xs font-bold px-4 py-1.5 rounded-full">ACTIVE</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-300 text-xs">Member</p>
                <p className="font-semibold">{user.name}</p>
              </div>
              <div>
                <p className="text-blue-300 text-xs">Expires</p>
                <p className="font-semibold">{new Date(membership.end_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-blue-300 text-xs">Days Remaining</p>
                <p className={`font-semibold text-lg ${daysLeft < 10 ? 'text-yellow-300' : ''}`}>{daysLeft}</p>
              </div>
            </div>
            {daysLeft < 30 && (
              <div className="mt-4 bg-yellow-400/20 rounded-xl px-4 py-2 text-yellow-200 text-sm">
                Your membership expires soon. Renew below to maintain access.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 flex items-center gap-3">
            <div>
              <p className="font-bold text-yellow-800">No Active Membership</p>
              <p className="text-yellow-600 text-sm">Choose a plan below and pay via Mobile Money to start booking courts.</p>
            </div>
          </div>
        )}

        {/* Plans */}
        <h2 className="text-lg font-bold text-gray-800">Choose a Plan</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {PLANS.map(p => (
            <div
              key={p.type}
              onClick={() => { if (!txnId) { setSelected(selected?.type === p.type ? null : p); } }}
              className={`card border-2 transition-all relative ${txnId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${p.color}
                ${selected?.type === p.type ? 'ring-2 ring-brand-700 shadow-md' : ''}`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Popular
                </div>
              )}
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800">{p.label}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-brand-700">{p.price.toLocaleString()}</span>
                  <span className="text-gray-500 text-sm"> RWF{p.per}</span>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={3} /> {f}
                  </li>
                ))}
              </ul>
              <div className={`mt-4 w-full py-2 rounded-lg text-sm font-semibold text-center transition-all ${
                selected?.type === p.type ? 'bg-brand-700 text-white' : 'border border-brand-700 text-brand-700'
              }`}>
                {selected?.type === p.type ? 'Selected' : 'Select Plan'}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Money payment form */}
        {selected && !txnId && (
          <div className="card border-2 border-brand-700 shadow-md">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Pay via Mobile Money</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selected.label} Plan &mdash; {selected.price.toLocaleString()} RWF{selected.per}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mobile Money Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input"
                  placeholder="+250 7XX XXX XXX"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter the MTN or Airtel number linked to your Mobile Money account.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Total Amount</span>
                <span className="text-xl font-bold text-brand-700">{selected.price.toLocaleString()} RWF</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
                  {submitting ? 'Sending request...' : 'Pay via Mobile Money'}
                </button>
                <button type="button" onClick={() => setSelected(null)} className="btn-outline px-6">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Waiting for payment confirmation */}
        {txnId && !pollExpired && (
          <div className="card border-2 border-blue-300 bg-blue-50">
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-800 font-bold text-base">Waiting for payment confirmation...</p>
              <p className="text-blue-600 text-sm">
                A Mobile Money prompt has been sent to <strong>{phone}</strong>.<br />
                Please approve it on your phone to activate your membership.
              </p>
              <p className="text-xs text-blue-400">This page checks automatically every 5 seconds.</p>
              <button onClick={cancelPending} className="text-xs text-red-500 hover:underline mt-2">
                Cancel and go back
              </button>
            </div>
          </div>
        )}

        {/* Polling timed out */}
        {pollExpired && (
          <div className="card border-2 border-red-300 bg-red-50">
            <div className="text-center py-4">
              <p className="text-red-800 font-bold text-base">Payment confirmation timed out</p>
              <p className="text-red-600 text-sm mt-1">
                We did not receive a payment confirmation within 2 minutes.
                If you approved the payment, please contact support. Otherwise, try again.
              </p>
              <button onClick={cancelPending} className="btn-primary mt-4 bg-red-600 border-red-600 hover:bg-red-700">
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MemberMembership;
