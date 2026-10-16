import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import CourtTable from '../components/CourtTable';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getClubDateString } from '../utils/clubTime';

const GUEST_PRICE = 5000;
const POLL_INTERVAL = 5000; // 5 seconds
const POLL_TIMEOUT  = 120000; // 2 minutes

const PublicBooking = () => {
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txnId, setTxnId] = useState(null);
  const [pollExpired, setPollExpired] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const pollRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const handleSelect = (slot) => {
    setSelected(slot);
    setConfirmedBooking(null);
  };

  const endTimeFor = (start_time) => {
    const h = parseInt(start_time.split(':')[0]);
    return `${(h + 1).toString().padStart(2, '0')}:00`;
  };

  const startPolling = (transactionId) => {
    setTxnId(transactionId);
    setPollExpired(false);

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payments/guest-status/${transactionId}`);
        if (data.status === 'success') {
          clearInterval(pollRef.current);
          clearTimeout(timeoutRef.current);
          setConfirmedBooking(data.booking);
          setSelected(null);
          setTxnId(null);
          setGuestName('');
          setGuestPhone('');
          toast.success('Booking confirmed!');
        }
      } catch {/* keep polling */}
    }, POLL_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current);
      setPollExpired(true);
    }, POLL_TIMEOUT);
  };

  const cancelPending = () => {
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
    setTxnId(null);
    setPollExpired(false);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selected || !guestName.trim() || !guestPhone.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/payments/guest-initiate', {
        court_id: selected.court_id,
        date,
        start_time: selected.start_time,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
      });

      if (data.status === 'success') {
        setConfirmedBooking(data.booking);
        setSelected(null);
        setGuestName('');
        setGuestPhone('');
        toast.success('Booking confirmed!');
      } else {
        toast.success('Payment request sent to your phone!');
        startPolling(data.transactionId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-gradient-to-br from-brand-700 to-brand-500 text-white py-14 text-center">
        <h1 className="text-4xl font-bold mb-2">Court Availability</h1>
        <p className="text-blue-200">Check availability and book a court as a guest — no account needed</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 w-full space-y-6">
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Date</label>
            <input type="date" value={date} min={getClubDateString()}
                onChange={e => { setDate(e.target.value); setSelected(null); setConfirmedBooking(null); }}
                className="input max-w-xs"/>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/>Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/>Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block"/>Past</span>
            </div>
          </div>
        </div>

        {/* Confirmed banner */}
        {confirmedBooking && (
          <div className="card border-2 border-green-400 bg-green-50">
            <p className="text-green-800 font-bold text-lg">Booking Confirmed!</p>
            <p className="text-green-700 text-sm mt-1">
              {confirmedBooking.court_name} &middot; {new Date(confirmedBooking.date).toDateString()} &middot; {confirmedBooking.start_time.slice(0, 5)} &ndash; {confirmedBooking.end_time.slice(0, 5)}
            </p>
            <p className="text-xs text-green-600 mt-1">A confirmation SMS has been sent to your phone.</p>
          </div>
        )}

        {date && !txnId && (
          <CourtTable date={date} onSelect={handleSelect} />
        )}

        {/* Guest booking + payment form */}
        {selected && !txnId && (
          <div className="card border-2 border-brand-700 shadow-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Book as Guest</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase font-semibold">Court</p>
                <p className="font-bold text-gray-800 mt-1">{selected.court_name}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase font-semibold">Date</p>
                <p className="font-bold text-gray-800 mt-1">{new Date(date + 'T00:00:00').toDateString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase font-semibold">Time (1 hour)</p>
                <p className="font-bold text-gray-800 mt-1">{selected.start_time} &ndash; {endTimeFor(selected.start_time)}</p>
              </div>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                  className="input" placeholder="Full name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Money Phone Number</label>
                <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
                  className="input" placeholder="+250 7XX XXX XXX" required />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Total Amount</span>
                <span className="text-xl font-bold text-brand-700">{GUEST_PRICE.toLocaleString()} RWF</span>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
                  {submitting ? 'Sending request...' : `Pay ${GUEST_PRICE.toLocaleString()} RWF`}
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
                A Mobile Money prompt has been sent to <strong>{guestPhone}</strong>.<br />
                Please approve it on your phone to confirm your booking.
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

        {date && (
          <div className="text-center mt-2">
            <p className="text-gray-600 mb-4">Booking often? Get a membership for unlimited access without paying per booking.</p>
            <div className="flex gap-4 justify-center">
              <Link to="/login" className="btn-primary">Sign In</Link>
              <Link to="/register" className="btn-outline">Create Account</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;
