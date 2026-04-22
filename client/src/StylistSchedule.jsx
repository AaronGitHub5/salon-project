import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast, useConfirm } from './Notifications';
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
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState('schedule');
  const [myBookings, setMyBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [stylistProfile, setStylistProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [openWeeks, setOpenWeeks] = useState({});

  const authHeader = { Authorization: `Bearer ${session?.access_token}` };

  // Re-fetches bookings + pending for the current stylist. Used by the initial
  // load, the manual Refresh button, and the tab-focus listener. Silent mode
  // skips loading spinners (for background refreshes).
  const refreshSchedule = async (me, { silent = false } = {}) => {
    if (!me) return;
    if (!silent) setRefreshing(true);
    try {
      const bookingRes = await fetch(`${API_URL}/api/bookings/stylist/${me.id}`, { headers: authHeader });
      const data = await bookingRes.json();
      if (bookingRes.ok) {
        const bookings = Array.isArray(data) ? data : [];
        setMyBookings(bookings);
      }
      if (me.is_senior) {
        const res = await fetch(`${API_URL}/api/bookings/pending/all`, { headers: authHeader });
        const pd = await res.json();
        setPendingBookings(Array.isArray(pd) ? pd : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  // Initial load — fetches the stylist record, bookings, and pending bookings.
  useEffect(() => {
    async function initialLoad() {
      if (!user?.email || !session?.access_token) { setLoading(false); return; }
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

        if (me.is_senior) {
          setPendingLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/bookings/pending/all`, { headers: authHeader });
            const pd = await res.json();
            setPendingBookings(Array.isArray(pd) ? pd : []);
          } finally {
            setPendingLoading(false);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Something went wrong loading your schedule.');
      } finally {
        setLoading(false);
      }
    }
    initialLoad();
  }, [user, session]);

  // Auto-refresh when the stylist tabs back to this page — catches new
  // bookings / cancellations / reschedules made elsewhere without manual reload.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && stylistProfile) {
        refreshSchedule(stylistProfile, { silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylistProfile]);

  const toggleWeek = (key) => setOpenWeeks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleComplete = async (bookingId) => {
    const ok = await confirm({
      title: 'Mark job as complete?',
      message: 'A loyalty point will be added to the customer.',
      confirmText: 'Mark Complete',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/complete`, {
        method: 'PUT',
        headers: authHeader,
      });
      if (res.ok) {
        toast.success('Job complete. Loyalty point awarded.');
        setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Could not complete booking');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleApprove = async (bookingId) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/approve`, {
        method: 'PUT',
        headers: authHeader,
      });
      if (res.ok) {
        const approved = pendingBookings.find(b => b.id === bookingId);
        setPendingBookings(prev => prev.filter(b => b.id !== bookingId));
        // Add to confirmed schedule only if it's for this stylist
        if (approved && approved.stylist_id === stylistProfile.id) {
          setMyBookings(prev => [...prev, { ...approved, status: 'confirmed' }]);
        }
        toast.success('Booking approved. Customer notified.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Could not approve booking');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleReject = async (bookingId) => {
    const ok = await confirm({
      title: 'Reject booking request?',
      message: 'The customer will be notified by email.',
      confirmText: 'Reject',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/reject`, {
        method: 'PUT',
        headers: authHeader,
      });
      if (res.ok) {
        setPendingBookings(prev => prev.filter(b => b.id !== bookingId));
        toast.success('Booking rejected. Customer notified.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Could not reject booking');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-[#7A7870] font-light animate-pulse">Loading...</div>;
  if (!stylistProfile) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] font-display text-[1.4rem] font-light text-[#1A1A18]">Access Restricted</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] font-light" style={{ color: '#B56145' }}>{error}</div>;

  const weeks = groupByWeek(myBookings);
  const tabs = stylistProfile.is_senior
    ? [{ key: 'schedule', label: 'My Schedule' }, { key: 'pending', label: 'Pending Approvals', count: pendingBookings.length }]
    : [{ key: 'schedule', label: 'My Schedule' }];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A18] p-6 md:p-10">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500&display=swap');.font-display{font-family:'Cormorant Garamond',serif !important;}`}</style>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-10 pb-5 border-b border-[#E4E0D8]">
          <div>
            <p className="text-[0.62rem] tracking-[0.2em] uppercase mb-1" style={{ color: '#B8975A' }}>Stylist Console</p>
            <h1 className="font-display font-light text-[2rem] md:text-[2.4rem] text-[#1A1A18] leading-none">{stylistProfile.name}</h1>
            <p className="text-[0.72rem] font-light text-[#7A7870] mt-2">Manage your upcoming appointments.</p>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => refreshSchedule(stylistProfile)}
              disabled={refreshing}
              className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] disabled:opacity-50 transition-colors bg-transparent border-none cursor-pointer p-0"
              style={{ borderBottom: '1px solid #E4E0D8' }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button onClick={() => navigate('/app')} className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] transition-colors bg-transparent border-none cursor-pointer p-0" style={{ borderBottom: '1px solid #E4E0D8' }}>Exit</button>
          </div>
        </div>

        {/* Tabs — only shown for senior stylist */}
        {stylistProfile.is_senior && (
          <div className="flex gap-8 mb-10 border-b border-[#E4E0D8]">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`pb-3 text-[0.72rem] tracking-[0.12em] uppercase transition-colors bg-transparent border-none cursor-pointer p-0 ${activeTab === key ? 'font-medium text-[#1A1A18]' : 'font-light text-[#7A7870] hover:text-[#1A1A18]'}`}
                style={activeTab === key ? { borderBottom: '2px solid #B8975A', marginBottom: '-1px' } : {}}
              >
                {label}
                {count > 0 && (
                  <span className="ml-2 text-[0.58rem] px-1.5 py-0.5" style={{ background: '#B8975A', color: '#fff' }}>{count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && (
          <div>
            {pendingLoading ? (
              <div className="text-center py-12 text-[#7A7870] font-light animate-pulse">Loading...</div>
            ) : pendingBookings.length === 0 ? (
              <div className="bg-white border border-[#E4E0D8] p-16 text-center">
                <p className="font-display text-[1.2rem] font-light text-[#7A7870]">No pending booking requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingBookings.map((booking) => {
                  const start = new Date(booking.start_time);
                  const customerName = booking.profiles?.full_name || 'Unknown';
                  const customerEmail = booking.profiles?.email || null;
                  const customerPhone = booking.profiles?.phone_number || null;
                  const stylistName = booking.stylists?.name || null;

                  return (
                    <div key={booking.id} className="bg-white border border-[#E4E0D8] p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Time block */}
                          <div className="text-left w-20 shrink-0">
                            <p className="text-[1.4rem] font-light text-[#1A1A18] leading-tight">
                              {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[0.62rem] tracking-[0.1em] uppercase mt-0.5" style={{ color: '#B8975A' }}>
                              {start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                          </div>

                          {/* Customer info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-display text-[1.1rem] font-medium text-[#1A1A18]">{customerName}</h3>
                              <span className="text-[0.58rem] tracking-[0.12em] uppercase bg-[#FBF3E6] text-[#B8975A] border border-[#E4D5AE] px-1.5 py-0.5">
                                Pending
                              </span>
                            </div>
                            <p className="text-[0.82rem] font-light text-[#7A7870] mt-0.5">
                              {booking.services?.name}
                              {stylistName && stylistName !== stylistProfile.name && (
                                <span className="ml-1 text-[#B4A894]">· with {stylistName}</span>
                              )}
                            </p>
                            <div className="flex flex-col gap-0.5 mt-1">
                              {customerEmail && (
                                <a href={`mailto:${customerEmail}`} className="text-[0.72rem] font-light text-[#B4A894] hover:text-[#1A1A18] transition-colors truncate">
                                  ✉ {customerEmail}
                                </a>
                              )}
                              {customerPhone && (
                                <a href={`tel:${customerPhone}`} className="text-[0.72rem] font-light text-[#B4A894] hover:text-[#1A1A18] transition-colors">
                                  ✆ {customerPhone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Approve / Reject */}
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(booking.id)}
                            className="px-4 py-2.5 text-[0.68rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleReject(booking.id)}
                            className="px-4 py-2.5 text-[0.68rem] font-light tracking-[0.1em] uppercase border bg-transparent cursor-pointer transition-colors"
                            style={{ color: '#B56145', borderColor: '#E4D5AE' }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          weeks.length === 0 ? (
            <div className="bg-white border border-[#E4E0D8] p-16 text-center">
              <p className="font-display text-[1.2rem] font-light text-[#7A7870]">No appointments found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weeks.map((week) => {
                const key = week.weekStart.toISOString();
                const isOpen = !!openWeeks[key];
                const isCurrent = isCurrentWeek(week.weekStart);
                const isPast = isPastWeek(week.weekStart);

                return (
                  <div key={key} className="bg-white border border-[#E4E0D8] overflow-hidden">
                    <button
                      onClick={() => toggleWeek(key)}
                      className="w-full flex items-center justify-between px-5 md:px-6 py-4 hover:bg-[#FAFAF8] transition-colors text-left bg-transparent border-none cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-display text-[1.1rem] font-medium text-[#1A1A18]">
                          {week.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[0.58rem] tracking-[0.12em] uppercase px-2 py-0.5" style={{ background: '#B8975A', color: '#fff' }}>
                            This Week
                          </span>
                        )}
                        {isPast && (
                          <span className="text-[0.58rem] tracking-[0.12em] uppercase bg-[#F0EDE5] text-[#7A7870] px-2 py-0.5">
                            Past
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-[0.72rem] font-light text-[#7A7870] hidden sm:block">
                          {week.bookings.length} appointment{week.bookings.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`text-[#B4A894] text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-[#E4E0D8]">
                        {week.bookings.map((booking) => {
                          const start = new Date(booking.start_time);
                          const customerName = booking.profiles?.full_name || booking.guests?.full_name || 'Guest';
                          const customerEmail = booking.profiles?.email || booking.guests?.email || null;
                          const customerPhone = booking.profiles?.phone_number || booking.guests?.phone_number || null;
                          const isGuest = !booking.profiles;

                          return (
                            <div
                              key={booking.id}
                              className="border-b last:border-0 border-[#E4E0D8] px-5 md:px-6 py-4 hover:bg-[#FAFAF8] transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-start gap-4">
                                  <div className="text-left w-20 shrink-0">
                                    <p className="text-[1.4rem] font-light text-[#1A1A18] leading-tight">
                                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-[0.62rem] tracking-[0.1em] uppercase mt-0.5" style={{ color: '#B8975A' }}>
                                      {start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-display text-[1.1rem] font-medium text-[#1A1A18]">{customerName}</h3>
                                      {isGuest && (
                                        <span className="text-[0.58rem] tracking-[0.12em] uppercase bg-[#F0EDE5] text-[#7A7870] px-1.5 py-0.5">
                                          Guest
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[0.82rem] font-light text-[#7A7870] mt-0.5">{booking.services?.name}</p>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                      {customerEmail && (
                                        <a href={`mailto:${customerEmail}`} className="text-[0.72rem] font-light text-[#B4A894] hover:text-[#1A1A18] transition-colors truncate">
                                          ✉ {customerEmail}
                                        </a>
                                      )}
                                      {customerPhone && (
                                        <a href={`tel:${customerPhone}`} className="text-[0.72rem] font-light text-[#B4A894] hover:text-[#1A1A18] transition-colors">
                                          ✆ {customerPhone}
                                        </a>
                                      )}
                                      {!customerEmail && !customerPhone && (
                                        <p className="text-[0.72rem] font-light text-[#D4CFC2] italic">No contact details</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="shrink-0 sm:ml-4">
                                  {booking.status === 'completed' ? (
                                    <span className="inline-flex items-center text-[0.62rem] tracking-[0.12em] uppercase font-medium px-3 py-2 w-full sm:w-auto justify-center" style={{ color: '#B8975A', border: '1px solid #B8975A', background: 'rgba(184,151,90,0.08)' }}>
                                      ✓ Completed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleComplete(booking.id)}
                                      className="w-full sm:w-auto px-4 py-2.5 text-[0.68rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] transition-colors"
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
          )
        )}
      </div>
    </div>
  );
}