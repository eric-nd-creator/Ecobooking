import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import CourtTable from '../../components/CourtTable';
import CancelBookingModal from '../../components/CancelBookingModal';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { CalendarX } from 'lucide-react';
import { getClubDateString } from '../../utils/clubTime';

const MemberBooking = () => {
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [selected, setSelected] = useState(null);
  const [endTime, setEndTime] = useState('');
  const [withPartner, setWithPartner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadedBookings, setLoadedBookings] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchDate, setSearchDate] = useState('');
  const [lastBooked, setLastBooked] = useState(null);
  const [membership, setMembership] = useState(null);
  const [membershipLoaded, setMembershipLoaded] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      setBookings(data);
    } catch {
      toast.error('Could not load your bookings');
    } finally {
      setLoadedBookings(true);
    }
  };

  const loadMembership = async () => {
    try {
      const { data } = await api.get('/memberships/my');
      setMembership(data);
    } catch {
      setMembership(null);
    } finally {
      setMembershipLoaded(true);
    }
  };

  useEffect(() => { loadBookings(); loadMembership(); }, []);

  const handleSelect = (slot) => {
    setSelected(slot);
    setLastBooked(null);
    setWithPartner(false);
    const h = parseInt(slot.start_time.split(':')[0]);
    setEndTime(`${(h + duration).toString().padStart(2, '0')}:00`);
  };

  const changeDuration = (d) => {
    setDuration(d);
    setSelected(null);
  };

  const handleBook = async () => {
    if (!selected || !endTime) return;
    setLoading(true);
    try {
      const { data } = await api.post('/bookings', {
        court_id: selected.court_id,
        date,
        start_time: selected.start_time,
        end_time: endTime,
        with_partner: withPartner,
      });
      toast.success(`${selected.court_name} booked!`);
      setLastBooked({ court_name: selected.court_name, date, start_time: selected.start_time, end_time: endTime, coach: data.coach });
      setSelected(null);
      await loadBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async (reason) => {
    setCancelling(true);
    try {
      await api.put(`/bookings/${cancelTarget}/cancel`, { reason });
      toast.success('Booking cancelled. A cancellation email has been sent.');
      setBookings(bookings.map(b => b.id === cancelTarget ? { ...b, status: 'cancelled' } : b));
      setCancelTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const bookAnotherDay = () => {
    setDate('');
    setSelected(null);
    setLastBooked(null);
  };

  const isSlotPast = (b) => {
    const dateOnly = b.date?.split('T')[0];
    if (!dateOnly || !b.end_time) return false;
    return new Date(`${dateOnly}T${b.end_time}`) <= new Date();
  };

  const filteredBookings = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => !searchDate || b.date?.startsWith(searchDate));

  const upcomingBookings = filteredBookings.filter(b => !isSlotPast(b));
  const pastBookings = filteredBookings.filter(isSlotPast);

  const upcoming = bookings.filter(b => new Date(b.date) >= new Date() && b.status === 'confirmed').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Book a Court</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Bookings', value: bookings.length, color: 'border-blue-400' },
            { label: 'Confirmed', value: confirmed, color: 'border-green-400' },
            { label: 'Upcoming', value: upcoming, color: 'border-purple-400' },
          ].map(s => (
            <div key={s.label} className={`card border-l-4 ${s.color} text-center py-4`}>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Membership warning */}
        {membershipLoaded && membership?.status !== 'active' && (
          <div className="card border-2 border-amber-400 bg-amber-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-amber-800 font-bold text-base">
                  {membership ? 'Membership Expired' : 'No Active Membership'}
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  {membership
                    ? 'Your membership has expired. Renew it to book courts.'
                    : 'You need an active membership plan to book a court.'}
                </p>
              </div>
              <Link to="/member/membership" className="whitespace-nowrap px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
                {membership ? 'Renew Membership' : 'Get a Membership'}
              </Link>
            </div>
          </div>
        )}

        {/* Success banner with "Book Another Day" */}
        {lastBooked && (
          <div className="card border-2 border-green-400 bg-green-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-green-800 font-bold text-lg">Booking Confirmed!</p>
                <p className="text-green-700 text-sm mt-1">
                  {lastBooked.court_name} &middot; {new Date(lastBooked.date + 'T00:00:00').toDateString()} &middot; {lastBooked.start_time.slice(0, 5)} &ndash; {lastBooked.end_time.slice(0, 5)}
                </p>
                <p className="text-xs text-green-600 mt-1">A confirmation email has been sent to you.</p>
                {lastBooked.coach && (
                  <p className="text-sm text-green-800 font-semibold mt-2">
                    You've been matched with Coach {lastBooked.coach.name} for this session.
                  </p>
                )}
              </div>
              <button onClick={bookAnotherDay} className="btn-primary whitespace-nowrap">
                + Book Another Day
              </button>
            </div>
          </div>
        )}

        {/* Date picker */}
        <div className="card">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select a Date to Book</label>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <input
              type="date"
              value={date}
              min={getClubDateString()}
              onChange={e => { setDate(e.target.value); setSelected(null); setLastBooked(null); }}
              className="input max-w-xs"
            />
            {date && (
              <button onClick={bookAnotherDay} className="text-sm text-red-500 hover:underline">
                Clear date
              </button>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500 sm:ml-auto">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" />Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300" />Past</span>
            </div>
          </div>
        </div>

        {/* Duration + hour table */}
        {date && (
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base font-bold text-gray-800">Available Time Slots</h2>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(date + 'T00:00:00').toDateString()} &mdash; click a green slot to book</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Duration:</span>
                {[1, 2].map(d => (
                  <button
                    key={d}
                    onClick={() => changeDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      duration === d ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {d} Hour{d > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Only courts free for the full {duration}-hour block are shown as bookable &mdash; a {duration}-hour booking always stays on a single court.
            </p>
            <CourtTable date={date} duration={duration} onSelect={handleSelect} disabled={membership?.status !== 'active'} />
          </div>
        )}

        {/* Booking confirmation form */}
        {selected && (
          <div className="card border-2 border-brand-700 shadow-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Confirm Your Booking</h2>
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
                <p className="text-xs text-gray-400 uppercase font-semibold">Time</p>
                <p className="font-bold text-gray-800 mt-1">{selected.start_time} &ndash; {endTime}</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4 text-xs text-blue-700">
              {duration}-hour booking on {selected.court_name} only &middot; members can book 1 court at a time
            </div>
            <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={withPartner} onChange={e => setWithPartner(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-700 focus:ring-brand-700" />
              I'm playing with a partner
            </label>
            {!withPartner && (
              <p className="text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 mb-4">
                Playing alone? We'll automatically match you with a coach for this session.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={handleBook} disabled={loading} className="btn-primary">
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button onClick={() => setSelected(null)} className="btn-outline">Cancel</button>
            </div>
          </div>
        )}

        {/* My bookings */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">My Bookings</h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="input text-sm max-w-[160px]"
              />
              {['all', 'confirmed', 'cancelled'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    filterStatus === s ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {s}
                </button>
              ))}
              {searchDate && (
                <button onClick={() => setSearchDate('')} className="text-xs text-red-500 hover:underline">Clear</button>
              )}
            </div>
          </div>

          {!loadedBookings ? (
            <p className="text-center text-gray-400 py-4 text-sm">Loading your bookings...</p>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-10">
              <CalendarX className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" strokeWidth={1.5} />
              <p className="text-gray-400 mt-3">No bookings match your filters</p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingBookings.length > 0 && (
                <BookingsTable rows={upcomingBookings} onCancel={setCancelTarget} />
              )}
              {pastBookings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Past</p>
                  <BookingsTable rows={pastBookings} onCancel={setCancelTarget} past />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CancelBookingModal
        open={!!cancelTarget}
        submitting={cancelling}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
      />
    </DashboardLayout>
  );
};

const BookingsTable = ({ rows, onCancel, past = false }) => (
  <div className={`overflow-x-auto ${past ? 'opacity-70' : ''}`}>
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50">
          {['Court', 'Date', 'Time', 'Status', 'Action'].map(h => (
            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map(b => (
          <tr key={b.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 font-medium">{b.court_name}</td>
            <td className="px-4 py-3">{new Date(b.date).toLocaleDateString()}</td>
            <td className="px-4 py-3 font-mono text-xs">{b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}</td>
            <td className="px-4 py-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>{b.status}</span>
            </td>
            <td className="px-4 py-3">
              {!past && b.status === 'confirmed' && (
                <button onClick={() => onCancel(b.id)}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold hover:underline underline-offset-2">
                  Cancel
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default MemberBooking;
