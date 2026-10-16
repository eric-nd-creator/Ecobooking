// Returns true if an existing confirmed booking on this court/date overlaps
// [start_time, end_time). Shared by member/coach bookings and guest checkout
// so the overlap rule only has to be fixed in one place.
async function hasCourtConflict(query, { court_id, date, start_time, end_time }) {
  const [rows] = await query(
    `SELECT id FROM bookings WHERE court_id=? AND date=? AND status='confirmed'
     AND NOT (end_time <= ? OR start_time >= ?)`,
    [court_id, date, start_time, end_time]
  );
  return rows.length > 0;
}

module.exports = { hasCourtConflict };
