import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import API_URL from './config';

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart) {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  return `Week of ${weekStart.toLocaleDateString('en-GB', opts)}`;
}

function isCurrentWeek(weekStart) {
  return weekStart.getTime() === getWeekStart(new Date()).getTime();
}

function isPastWeek(weekStart) {
  return weekStart.getTime() < getWeekStart(new Date()).getTime();
}

function groupByWeek(bookings) {
  const map = new Map();
  for (const booking of bookings) {
    const weekStart = getWeekStart(new Date(booking.start_time));
    const key = weekStart.toISOString();
    if (!map.has(key)) map.set(key, { label: formatWeekLabel(weekStart), weekStart, bookings: [] });
    map.get(key).bookings.push(booking);
  }
  return Array.from(map.values()).sort((a, b) => a.weekStart - b.weekStart);
}

export default function StylistSchedule() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [myBookings, setMyBookings] = useState([]);
  const [stylistProfile, setStylistProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openWeeks, setOpenWeeks] = useState({});

  useEffect(() => {
    async function fetchMySchedule() {
      if (!user?.email || !session?.access_token) { setLoading(false); return; }
      const authHeader = { Authorization: `Bearer ${session.access_token}` };
      try {
        const stylistRes = await fetch(`${API_URL}/api/stylists`);
        const stylists = await stylistRes.json();
        const me = stylists.find(s => s.email === user.email);
        if (!me) { setLoading(false); return; }
        setStylistProfile(me);

        const bookingRes = await fetch(`${API_URL}/api/bookings/stylist/${me.id}`, { headers: authHeader });
        const data = await bookingRes.json();
        if (!bookingRes.ok) {
          setError(data.error || 'Failed to load schedule');
        } else {
          const bookings = Array.isArray(data) ? data : [];
          setMyBookings(bookings);
          const initial = {};
          for (const w of groupByWeek(bookings)) {
            initial[w.weekStart.toISOString()] = !isPastWeek(w.weekStart);
          }
          setOpenWeeks(initial);
        }
      } catch (err) {
        console.error(err);
        setError('Something went wrong loading your schedule.');
      } finally {
        setLoading(false); }
    }
    fetchMySchedule();
  }, [user, session]);

  const toggleWeek = (key) => setOpenWeeks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleComplete = async (bookingId) => {
    if (!confirm('Mark job as complete? Points will be added to customer.')) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/complete`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        alert('Job Complete! Points awarded.');
        setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Could not complete booking'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
  };

  if (loading) return <div className="p-10 animate-pulse">Loading...</div>;
  if (!stylistProfile) return <div className="p-10">Access Restricted</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;

  const weeks = groupByWeek(myBookings);

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-light uppercase tracking-widest text-gray-800">My Schedule</h1>
            <p className="text-gray-500 mt-1 text-sm">Stylist: <strong>{stylistProfile.name}</strong></p>
          </div>
          <button onClick={() => navigate('/app')} className="text-xs font-bold uppercase underline">Exit</button>
        </div>

        {weeks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center text-gray-400">
            No appointments found.
          </div>
        ) : (
          <div className="space-y-4">
            {weeks.map((week) => {
              const key = week.weekStart.toISOString();
              const isOpen = !!openWeeks[key];
              const isCurrent = isCurrentWeek(week.weekStart);
              const isPast = isPastWeek(week.weekStart);

              return (
                <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

                  {/* Week header */}
                  <button
                    onClick={() => toggleWeek(key)}
                    className="w-full flex items-center justify-between px-4 md:px-6 py-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold uppercase tracking-widest text-gray-800">
                        {week.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5 rounded">
                          This Week
                        </span>
                      )}
                      {isPast && (
                        <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-400 px-2 py-0.5 rounded">
                          Past
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {week.bookings.length} appointment{week.bookings.length !== 1 ? 's' : ''}
                      </span>
                      <span className={`text-gray-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </button>

                  {/* Appointments */}
                  {isOpen && (
                    <div className="border-t border-gray-100">
                      {week.bookings.map((booking) => {
                        const start = new Date(booking.start_time);
                        const customerName = booking.profiles?.full_name || booking.guests?.full_name || 'Guest';
                        const customerEmail = booking.profiles?.email || booking.guests?.email || null;
                        const customerPhone = booking.profiles?.phone_number || booking.guests?.phone_number || null;
                        const isGuest = !booking.profiles;

                        return (
                          <div
                            key={booking.id}
                            className="border-b last:border-0 border-gray-100 px-4 md:px-6 py-4 hover:bg-gray-50 transition"
                          >
                            {/* FIX: flex-col on mobile, flex-row on md+ */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                              {/* Left: time + customer info */}
                              <div className="flex items-start gap-4">
                                {/* Time block */}
                                <div className="text-left w-20 shrink-0">
                                  <p className="text-xl font-bold font-mono leading-tight">
                                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <p className="text-[10px] text-gray-400 uppercase mt-0.5">
                                    {start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </p>
                                </div>

                                {/* Customer info */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-gray-800">{customerName}</h3>
                                    {isGuest && (
                                      <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                                        Guest
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-0.5">{booking.services?.name}</p>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    {customerEmail && (
                                      <a href={`mailto:${customerEmail}`} className="text-xs text-gray-400 hover:text-black transition truncate">
                                        ✉ {customerEmail}
                                      </a>
                                    )}
                                    {customerPhone && (
                                      <a href={`tel:${customerPhone}`} className="text-xs text-gray-400 hover:text-black transition">
                                        ✆ {customerPhone}
                                      </a>
                                    )}
                                    {!customerEmail && !customerPhone && (
                                      <p className="text-xs text-gray-300 italic">No contact details</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: action button — full width on mobile, auto on desktop */}
                              <div className="shrink-0 sm:ml-4">
                                {booking.status === 'completed' ? (
                                  <span className="inline-flex items-center text-green-600 border border-green-200 bg-green-50 text-xs font-bold px-3 py-2 rounded uppercase w-full sm:w-auto justify-center">
                                    ✓ Completed
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleComplete(booking.id)}
                                    className="w-full sm:w-auto bg-black text-white text-xs font-bold uppercase px-4 py-2.5 rounded hover:bg-gray-800 transition shadow-sm"
                                  >
                                    Complete Job
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}