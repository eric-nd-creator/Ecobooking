import { useState, useEffect } from 'react';
import api from '../api/axios';
import { getClubDateAndMinutes } from '../utils/clubTime';

const CourtTable = ({ date, duration = 1, onSelect, readOnly = false, disabled = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => getClubDateAndMinutes());

  useEffect(() => {
    if (!date) return;
    let active = true;
    const loadAvailability = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const { data: availability } = await api.get(`/courts/availability?date=${date}`);
        if (active) setData(availability);
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };
    setData(null);
    loadAvailability(true).catch(() => {});
    const availabilityTimer = setInterval(() => loadAvailability().catch(() => {}), 30000);
    return () => {
      active = false;
      clearInterval(availabilityTimer);
    };
  }, [date]);

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(getClubDateAndMinutes()), 15000);
    return () => clearInterval(clockTimer);
  }, []);

  if (!date) return <p className="text-gray-500 text-center py-8">Select a date to view availability</p>;
  if (loading) return <p className="text-center py-8 text-gray-500">Loading availability...</p>;
  if (!data) return null;

  const { courts } = data;
  // The club operates in Kigali time. Hide the current hour once it has started,
  // as well as all earlier hours, so members never select a slot the API rejects.
  const hours = date < now.date ? [] : data.hours.filter(row => (
    date > now.date || (Number(row.hour.slice(0, 2)) * 60 > now.minutes)
  ));

  // A court is bookable at row index `ri` for the requested `duration` only if
  // every hour it would occupy (ri..ri+duration-1) exists, is on this same court,
  // and isn't booked — otherwise the multi-hour block can't fit here and we
  // must not show it as available. (Past hours are already filtered out above.)
  const isRangeBookable = (ri, courtId) => {
    if (ri + duration - 1 > hours.length - 1) return false;
    for (let k = 0; k < duration; k++) {
      const row = hours[ri + k];
      const cell = row[`court_${courtId}`];
      if (cell.status === 'booked') return false;
    }
    return true;
  };

  if (hours.length === 0) {
    return <p className="text-gray-500 text-center py-8">No more available time slots for this date</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-brand-700 text-white">
            <th className="px-4 py-3 text-left font-semibold">Time</th>
            {courts.map(c => (
              <th key={c.id} className="px-4 py-3 text-center font-semibold">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((row, ri) => {
            return (
              <tr key={row.hour} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">{row.hour}</td>
                {courts.map(c => {
                  const cell = row[`court_${c.id}`];
                  const status = cell.status;

                  if (status === 'booked') {
                    return (
                      <td key={c.id} className="px-2 py-3 text-center">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500" title="Booked" />
                      </td>
                    );
                  }

                  // This hour alone is free, but the full requested duration might
                  // not fit (a later hour on this same court is booked, or it would
                  // run past closing) — don't offer it as bookable in that case.
                  const rangeOk = isRangeBookable(ri, c.id);

                  if (!rangeOk) {
                    return (
                      <td key={c.id} className="px-2 py-3 text-center">
                        <span
                          className="bg-amber-50 text-amber-500 text-xs font-semibold px-3 py-1 rounded-full cursor-not-allowed"
                          title={`Not enough consecutive free time on ${c.name} for a ${duration}-hour booking`}>
                          Book
                        </span>
                      </td>
                    );
                  }

                  // available for the full duration
                  return (
                    <td key={c.id} className="px-2 py-3 text-center">
                      {readOnly ? (
                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                          Free
                        </span>
                      ) : disabled ? (
                        <span className="bg-gray-100 text-gray-400 text-xs font-semibold px-3 py-1 rounded-full cursor-not-allowed">
                          Book
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelect?.({ court_id: c.id, court_name: c.name, start_time: row.hour })}
                          className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-green-600 hover:text-white transition-all">
                          Book
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CourtTable;
