import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import API_URL from './config';
import BookingModal from './BookingModal';

const LOYALTY_GOAL = 10;
const MILESTONES = [2, 4, 6, 8, 10];

function LoyaltyRing({ points, goal }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(points / goal, 1);
  const offset = circumference - progress * circumference;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={radius} fill="none"
        stroke="#111" strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="70" y="65" textAnchor="middle" className="font-bold" style={{ fontSize: '22px', fontWeight: '700', fill: '#111' }}>
        {points}
      </text>
      <text x="70" y="82" textAnchor="middle" style={{ fontSize: '9px', fill: '#9ca3af', letterSpacing: '2px' }}>
        VISITS
      </text>
    </svg>
  );
}

export default function Profile() {
  const { user, role, session } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [points, setPoints] = useState(0);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [voucherCode, setVoucherCode] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  const token = session?.access_token;
  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchPoints = () => {
    if (!user?.id) return;
    supabase.from('profiles').select('loyalty_points').eq('id', user.id).single()
      .then(({ data }) => { if (data) setPoints(data.loyalty_points || 0); });
  };

  useEffect(() => {
    if (user?.id) {
      fetch(`${API_URL}/api/bookings/customer/${user.id}`, { headers: authHeader })
        .then(res => res.json())
        .then(data => { setAppointments(Array.isArray(data) ? data : []); setLoadingAppts(false); })
        .catch(err => { console.error(err); setLoadingAppts(false); });

      fetchPoints();

      setLoadingVouchers(true);
      fetch(`${API_URL}/api/profiles/vouchers`, { headers: authHeader })
        .then(res => res.json())
        .then(data => { setVouchers(Array.isArray(data) ? data : []); setLoadingVouchers(false); })
        .catch(() => setLoadingVouchers(false));
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'loyalty' && user?.id) {
      fetchPoints();
      setLoadingVouchers(true);
      fetch(`${API_URL}/api/profiles/vouchers`, { headers: authHeader })
        .then(res => res.json())
        .then(data => { setVouchers(Array.isArray(data) ? data : []); setLoadingVouchers(false); })
        .catch(() => setLoadingVouchers(false));
    }
  }, [activeTab]);

  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this appointment?')) return;
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: authHeader,
    });
    if (res.ok) {
      setAppointments(prev => prev.filter(b => b.id !== bookingId));
    } else {
      alert('Failed to cancel booking.');
    }
  };

  const handleReschedule = async (stylistId, newStartTime) => {
    const res = await fetch(`${API_URL}/api/bookings/${reschedulingBooking.id}/reschedule`, {
      method: 'PUT',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_start_time: newStartTime }),
    });
    if (res.ok) {
      alert('Booking rescheduled! Check your email for confirmation.');
      setReschedulingBooking(null);
      const refreshRes = await fetch(`${API_URL}/api/bookings/customer/${user.id}`, { headers: authHeader });
      const data = await refreshRes.json();
      setAppointments(Array.isArray(data) ? data : []);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Failed to reschedule: ${err.error || res.status}`);
    }
  };

  const handleExportIcs = async (bookingId) => {
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/export`, { headers: authHeader });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-${bookingId}.ics`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      alert('Failed to export calendar file.');
    }
  };

  const handleRedeem = async () => {
    if (points < LOYALTY_GOAL) return;
    if (!confirm('Redeem your 10 visits for a 10% discount voucher?')) return;
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/api/profiles/redeem`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await res.json();
      if (res.ok) {
        setVoucherCode(data.code);
        setPoints(data.visitsRemaining);
        setVouchers(prev => [{ id: data.voucherId, code: data.code, discount: data.discount, used: false, created_at: new Date().toISOString() }, ...prev]);
      } else {
        alert(data.error || 'Failed to redeem points.');
      }
    } catch (err) {
      alert('Something went wrong.');
    } finally {
      setRedeeming(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert('Error: ' + error.message);
    else { alert('Updated!'); setNewPassword(''); }
    setPwLoading(false);
  };

  const canRedeem = points >= LOYALTY_GOAL;
  const visits = points;
  const remaining = Math.max(LOYALTY_GOAL - visits, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Hair By Amnesia</p>
            <h1 className="text-3xl font-light uppercase tracking-widest text-gray-800">
              Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>
          <button onClick={() => navigate('/app')} className="text-sm underline hover:text-red-500">← Back</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-8">
          {['appointments', 'loyalty', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold uppercase tracking-widest transition ${activeTab === tab ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB 1: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
            {loadingAppts ? (
              <div className="p-10 text-center text-gray-400 animate-pulse">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="p-16 text-center text-gray-400">No bookings found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {appointments.map(appt => {
                  const start = new Date(appt.start_time);
                  const isPast = new Date() > start || appt.status === 'completed';
                  return (
                    <div key={appt.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition">
                      <div className="flex items-center gap-6">
                        <div className="text-right w-16">
                          <p className="text-lg font-bold font-mono">{start.getDate()}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{start.toLocaleString('en-GB', { month: 'short' })}</p>
                          <p className="text-[10px] text-gray-400">{start.getFullYear()}</p>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{appt.services?.name}</h3>
                          <p className="text-sm text-gray-500">with {appt.stylists?.name} · £{appt.services?.base_price}</p>
                          <p className="text-xs font-mono mt-1 text-gray-400">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {isPast ? (
                          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-3 py-1 rounded uppercase">Completed</span>
                        ) : (
                          <>
                            <button onClick={() => setReschedulingBooking(appt)} className="text-blue-500 border border-blue-200 bg-white hover:bg-blue-50 px-4 py-2 rounded text-xs font-bold uppercase">Reschedule</button>
                            <button onClick={() => handleCancel(appt.id)} className="text-red-500 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 rounded text-xs font-bold uppercase">Cancel</button>
                          </>
                        )}
                        <button onClick={() => handleExportIcs(appt.id)} title="Export to Calendar" className="text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded text-xs font-bold uppercase">📅</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOYALTY */}
        {activeTab === 'loyalty' && (
          <div className="grid md:grid-cols-2 gap-8 grid-flow-row">
            {/* Loyalty Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Loyalty Card</h2>

              <LoyaltyRing points={points} goal={LOYALTY_GOAL} />

              <p className="text-xs text-gray-400 uppercase tracking-widest mt-4">
                {visits} of {LOYALTY_GOAL} visits
              </p>

              <div className="flex gap-3 mt-6">
                {MILESTONES.map(milestone => (
                  <div
                    key={milestone}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                      points >= milestone
                        ? 'bg-black border-black text-white'
                        : 'bg-white border-gray-200 text-gray-300'
                    }`}
                  >
                    ✓
                  </div>
                ))}
              </div>

              {voucherCode && (
                <div className="mt-6 w-full bg-green-50 border border-green-200 rounded p-4 text-center">
                  <p className="text-xs text-green-600 uppercase tracking-widest font-bold mb-1">Your Voucher Code</p>
                  <p className="text-2xl font-mono font-bold text-green-700">{voucherCode}</p>
                  <p className="text-xs text-green-500 mt-1">Show this at your next appointment</p>
                </div>
              )}

              <button
                onClick={handleRedeem}
                disabled={!canRedeem || redeeming}
                className={`mt-6 w-full py-3 text-xs font-bold uppercase tracking-widest rounded transition ${
                  canRedeem
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {redeeming ? 'Redeeming...' : 'Redeem for Voucher'}
              </button>

              <p className="text-[10px] text-gray-400 mt-2">
                {canRedeem
                  ? 'You have enough visits to redeem a voucher!'
                  : `Unlocks at ${LOYALTY_GOAL} visits · ${remaining} remaining`}
              </p>
            </div>

            {/* My Vouchers */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">My Vouchers</h2>
              {loadingVouchers ? (
                <div className="text-center text-gray-400 animate-pulse py-4">Loading...</div>
              ) : vouchers.length === 0 ? (
                <div className="text-center text-gray-400 py-6 text-sm">No vouchers yet. Complete 10 visits to earn one.</div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {vouchers.map(v => (
                    <div key={v.id} className={`border rounded-lg p-4 ${v.used ? 'border-gray-100 bg-gray-50' : 'border-black bg-white'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${v.used ? 'bg-gray-200 text-gray-400' : 'bg-black text-white'}`}>
                          {v.used ? 'Used' : `${v.discount}% Off`}
                        </span>
                        <span className="text-[10px] text-gray-400">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <p className={`font-mono font-bold text-lg mt-2 ${v.used ? 'text-gray-400 line-through' : 'text-black'}`}>{v.code}</p>
                      {!v.used && <p className="text-[10px] text-gray-400 mt-1">Show this at your appointment</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Past Appointments</h2>
              {loadingAppts ? (
                <div className="text-center text-gray-400 animate-pulse py-8">Loading...</div>
              ) : appointments.filter(a => new Date() > new Date(a.start_time) || a.status === 'completed').length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">No past appointments yet.</div>
              ) : (
                <div className="space-y-4">
                  {appointments
                    .filter(a => new Date() > new Date(a.start_time) || a.status === 'completed')
                    .slice(0, 6)
                    .map(appt => {
                      const start = new Date(appt.start_time);
                      return (
                        <div key={appt.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-4">
                            <div className="text-right w-10">
                              <p className="text-sm font-bold">{start.getDate()}</p>
                              <p className="text-[10px] text-gray-400 uppercase">{start.toLocaleString('en-GB', { month: 'short' })}</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{appt.services?.name}</p>
                              <p className="text-xs text-gray-400">with {appt.stylists?.name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setReschedulingBooking(appt)}
                            className="text-[10px] font-bold uppercase tracking-widest border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 transition"
                          >
                            Rebook
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-8 border-b border-gray-100 pb-8">
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Account Role</p>
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded uppercase font-bold">{role || 'Customer'}</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Loyalty Balance</p>
                <span className="text-lg font-mono font-bold text-black">{visits} Visits</span>
              </div>
            </div>
            <h3 className="font-bold text-sm text-gray-800 mb-6 uppercase tracking-widest">Update Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <input type="password" required minLength={6} placeholder="New Password" className="w-full border p-2 rounded bg-gray-50 text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button disabled={pwLoading} className="bg-black text-white px-6 py-3 text-xs font-bold uppercase rounded hover:bg-gray-800 disabled:opacity-50">
                {pwLoading ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}
      </div>

      {reschedulingBooking && (
        <BookingModal
          service={reschedulingBooking.services}
          onClose={() => setReschedulingBooking(null)}
          onConfirm={handleReschedule}
          isRescheduling={true}
        />
      )}
    </div>
  );
}