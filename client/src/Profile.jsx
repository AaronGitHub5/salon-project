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
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#111" strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="70" y="65" textAnchor="middle" style={{ fontSize: '22px', fontWeight: '700', fill: '#111' }}>{points}</text>
      <text x="70" y="82" textAnchor="middle" style={{ fontSize: '9px', fill: '#9ca3af', letterSpacing: '2px' }}>VISITS</text>
    </svg>
  );
}

// Reusable field with label + success/error feedback
function SettingsSection({ title, children }) {
  return (
    <div className="border-b border-gray-100 pb-8 mb-8 last:border-0 last:mb-0 last:pb-0">
      <h3 className="font-bold text-sm text-gray-800 mb-5 uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  );
}

function FeedbackMsg({ type, msg }) {
  if (!msg) return null;
  return (
    <p className={`text-xs mt-2 font-medium ${type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
      {type === 'success' ? '✓ ' : '✕ '}{msg}
    </p>
  );
}

export default function Profile() {
  const { user, role, session } = useAuth();
  const navigate = useNavigate();

  // Role-aware tabs — admin/stylist only get settings
  const isCustomer = role === 'customer' || !role;
  const tabs = isCustomer ? ['appointments', 'loyalty', 'settings'] : ['settings'];
  const [activeTab, setActiveTab] = useState(isCustomer ? 'appointments' : 'settings');

  // Appointments
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);

  // Loyalty
  const [points, setPoints] = useState(0);
  const [voucherCode, setVoucherCode] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // Settings — personal info
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [infoFeedback, setInfoFeedback] = useState(null); // { type, msg }
  const [savingInfo, setSavingInfo] = useState(false);

  // Settings — email change
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Settings — password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwFeedback, setPwFeedback] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  const token = session?.access_token;
  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Fetch profile data on mount
  useEffect(() => {
    if (!user?.id) return;

    // Fetch full profile (name + phone)
    supabase.from('profiles').select('full_name, phone_number, loyalty_points').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || '');
          setPhone(data.phone_number || '');
          setPoints(data.loyalty_points || 0);
        }
      });

    if (isCustomer) {
      fetch(`${API_URL}/api/bookings/customer/${user.id}`, { headers: authHeader })
        .then(res => res.json())
        .then(data => { setAppointments(Array.isArray(data) ? data : []); setLoadingAppts(false); })
        .catch(() => setLoadingAppts(false));

      setLoadingVouchers(true);
      fetch(`${API_URL}/api/profiles/vouchers`, { headers: authHeader })
        .then(res => res.json())
        .then(data => { setVouchers(Array.isArray(data) ? data : []); setLoadingVouchers(false); })
        .catch(() => setLoadingVouchers(false));
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'loyalty' && user?.id) {
      supabase.from('profiles').select('loyalty_points').eq('id', user.id).single()
        .then(({ data }) => { if (data) setPoints(data.loyalty_points || 0); });
      setLoadingVouchers(true);
      fetch(`${API_URL}/api/profiles/vouchers`, { headers: authHeader })
        .then(res => res.json())
        .then(data => { setVouchers(Array.isArray(data) ? data : []); setLoadingVouchers(false); })
        .catch(() => setLoadingVouchers(false));
    }
  }, [activeTab]);

  // --- Handlers ---
  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this appointment?')) return;
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, { method: 'PUT', headers: authHeader });
    if (res.ok) setAppointments(prev => prev.filter(b => b.id !== bookingId));
    else alert('Failed to cancel booking.');
  };

  const handleReschedule = async (stylistId, newStartTime) => {
    const res = await fetch(`${API_URL}/api/bookings/${reschedulingBooking.id}/reschedule`, {
      method: 'PUT', headers: authHeader,
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
      const a = document.createElement('a'); a.href = url; a.download = `booking-${bookingId}.ics`; a.click();
      window.URL.revokeObjectURL(url);
    } else alert('Failed to export calendar file.');
  };

  const handleRedeem = async () => {
    if (points < LOYALTY_GOAL) return;
    if (!confirm('Redeem your 10 visits for a 10% discount voucher?')) return;
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/api/profiles/redeem`, { method: 'POST', headers: authHeader });
      const data = await res.json();
      if (res.ok) {
        setVoucherCode(data.code); setPoints(data.visitsRemaining);
        setVouchers(prev => [{ id: data.voucherId, code: data.code, discount: data.discount, used: false, created_at: new Date().toISOString() }, ...prev]);
      } else alert(data.error || 'Failed to redeem points.');
    } catch { alert('Something went wrong.'); } finally { setRedeeming(false); }
  };

  // Save personal info (name + phone) → profiles table
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true); setInfoFeedback(null);
    try {
      const res = await fetch(`${API_URL}/api/profiles/${user.id}`, {
        method: 'PUT', headers: authHeader,
        body: JSON.stringify({ full_name: fullName, phone_number: phone }),
      });
      if (res.ok) setInfoFeedback({ type: 'success', msg: 'Personal details updated.' });
      else { const d = await res.json(); setInfoFeedback({ type: 'error', msg: d.error || 'Failed to save.' }); }
    } catch { setInfoFeedback({ type: 'error', msg: 'Something went wrong.' }); }
    finally { setSavingInfo(false); }
  };

  // Change email — re-authenticate then update via Supabase auth
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !emailPassword) return;
    setSavingEmail(true); setEmailFeedback(null);
    try {
      // Re-authenticate first
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: emailPassword });
      if (signInError) { setEmailFeedback({ type: 'error', msg: 'Current password is incorrect.' }); return; }
      // Update email
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) setEmailFeedback({ type: 'error', msg: error.message });
      else { setEmailFeedback({ type: 'success', msg: 'Confirmation sent to new email address.' }); setNewEmail(''); setEmailPassword(''); }
    } catch { setEmailFeedback({ type: 'error', msg: 'Something went wrong.' }); }
    finally { setSavingEmail(false); }
  };

  // Change password — re-authenticate then update
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwFeedback({ type: 'error', msg: 'New passwords do not match.' }); return; }
    if (newPassword.length < 6) { setPwFeedback({ type: 'error', msg: 'Password must be at least 6 characters.' }); return; }
    setSavingPw(true); setPwFeedback(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) { setPwFeedback({ type: 'error', msg: 'Current password is incorrect.' }); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) setPwFeedback({ type: 'error', msg: error.message });
      else { setPwFeedback({ type: 'success', msg: 'Password updated successfully.' }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    } catch { setPwFeedback({ type: 'error', msg: 'Something went wrong.' }); }
    finally { setSavingPw(false); }
  };

  const canRedeem = points >= LOYALTY_GOAL;
  const remaining = Math.max(LOYALTY_GOAL - points, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Hair By Amnesia</p>
            <h1 className="text-3xl font-light uppercase tracking-widest text-gray-800">
              Welcome back, {fullName?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>
          <button onClick={() => navigate(role === 'admin' ? '/admin' : role === 'stylist' ? '/stylist' : '/app')}
            className="text-sm underline hover:text-red-500">← Back</button>
        </div>

        {/* Tabs — only show relevant tabs per role */}
        <div className="flex gap-6 border-b border-gray-200 mb-8">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold uppercase tracking-widest transition ${activeTab === tab ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* TAB: APPOINTMENTS */}
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

        {/* TAB: LOYALTY */}
        {activeTab === 'loyalty' && (
          <div className="grid md:grid-cols-2 gap-8 grid-flow-row">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Loyalty Card</h2>
              <LoyaltyRing points={points} goal={LOYALTY_GOAL} />
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-4">{points} of {LOYALTY_GOAL} visits</p>
              <div className="flex gap-3 mt-6">
                {MILESTONES.map(milestone => (
                  <div key={milestone} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${points >= milestone ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-300'}`}>✓</div>
                ))}
              </div>
              {voucherCode && (
                <div className="mt-6 w-full bg-green-50 border border-green-200 rounded p-4 text-center">
                  <p className="text-xs text-green-600 uppercase tracking-widest font-bold mb-1">Your Voucher Code</p>
                  <p className="text-2xl font-mono font-bold text-green-700">{voucherCode}</p>
                  <p className="text-xs text-green-500 mt-1">Show this at your next appointment</p>
                </div>
              )}
              <button onClick={handleRedeem} disabled={!canRedeem || redeeming}
                className={`mt-6 w-full py-3 text-xs font-bold uppercase tracking-widest rounded transition ${canRedeem ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {redeeming ? 'Redeeming...' : 'Redeem for Voucher'}
              </button>
              <p className="text-[10px] text-gray-400 mt-2">
                {canRedeem ? 'You have enough visits to redeem a voucher!' : `Unlocks at ${LOYALTY_GOAL} visits · ${remaining} remaining`}
              </p>
            </div>
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
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${v.used ? 'bg-gray-200 text-gray-400' : 'bg-black text-white'}`}>{v.used ? 'Used' : `${v.discount}% Off`}</span>
                        <span className="text-[10px] text-gray-400">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <p className={`font-mono font-bold text-lg mt-2 ${v.used ? 'text-gray-400 line-through' : 'text-black'}`}>{v.code}</p>
                      {!v.used && <p className="text-[10px] text-gray-400 mt-1">Show this at your appointment</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Past Appointments</h2>
              {appointments.filter(a => new Date() > new Date(a.start_time) || a.status === 'completed').length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">No past appointments yet.</div>
              ) : (
                <div className="space-y-4">
                  {appointments.filter(a => new Date() > new Date(a.start_time) || a.status === 'completed').slice(0, 6).map(appt => {
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
                        <button onClick={() => setReschedulingBooking(appt)} className="text-[10px] font-bold uppercase tracking-widest border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 transition">Rebook</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 space-y-0">

            {/* Personal Information */}
            <SettingsSection title="Personal Information">
              <form onSubmit={handleSaveInfo} className="space-y-4 max-w-md">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name" required
                    className="w-full border border-gray-300 p-3 text-sm bg-gray-50 focus:outline-black rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 07700 900000"
                    className="w-full border border-gray-300 p-3 text-sm bg-gray-50 focus:outline-black rounded" />
                </div>
                <button disabled={savingInfo} className="bg-black text-white px-6 py-3 text-xs font-bold uppercase rounded hover:bg-gray-800 disabled:opacity-50 transition">
                  {savingInfo ? 'Saving...' : 'Save Changes'}
                </button>
                <FeedbackMsg type={infoFeedback?.type} msg={infoFeedback?.msg} />
              </form>
            </SettingsSection>

            {/* Change Email */}
            <SettingsSection title="Change Email Address">
              <p className="text-xs text-gray-400 mb-4">Current: <span className="font-medium text-gray-600">{user?.email}</span></p>
              <form onSubmit={handleChangeEmail} className="space-y-4 max-w-md">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">New Email Address</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="new@email.com" required
                    className="w-full border border-gray-300 p-3 text-sm bg-gray-50 focus:outline-black rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Confirm Current Password</label>
                  <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)}
                    placeholder="Enter your current password" required
                    className="w-full border border-gray-300 p-3 text-sm bg-gray-50 focus:outline-black rounded" />
                </div>
                <button disabled={savingEmail} className="bg-black text-white px-6 py-3 text-xs font-bold uppercase rounded hover:bg-gray-800 disabled:opacity-50 transition">
                  {savingEmail ? 'Updating...' : 'Update Email'}
                </button>
                <FeedbackMsg type={emailFeedback?.type} msg={emailFeedback?.msg} />
              </form>
            </SettingsSection>

            {/* Change Password */}
            <SettingsSection title="Change Password">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Current password" required
                    className="w-full border border-gray-300 p-3 text-sm bg-gray-50 focus:outline-black rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters" required minLength={6}
                    className="w-full border border-gray-300 p-3 text-sm bg-gray-50 focus:outline-black rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password" required
                    className={`w-full border p-3 text-sm bg-gray-50 focus:outline-black rounded ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : 'border-gray-300'}`} />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <button disabled={savingPw} className="bg-black text-white px-6 py-3 text-xs font-bold uppercase rounded hover:bg-gray-800 disabled:opacity-50 transition">
                  {savingPw ? 'Updating...' : 'Update Password'}
                </button>
                <FeedbackMsg type={pwFeedback?.type} msg={pwFeedback?.msg} />
              </form>
            </SettingsSection>

            {/* Account Info */}
            <SettingsSection title="Account">
              <div className="flex gap-6 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase text-gray-400 mb-1">Role</p>
                  <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded uppercase font-bold">{role || 'Customer'}</span>
                </div>
                {isCustomer && (
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-400 mb-1">Loyalty Balance</p>
                    <span className="text-lg font-mono font-bold text-black">{points} Visits</span>
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="border border-red-100 rounded-lg p-4 bg-red-50">
                <p className="text-xs font-bold uppercase tracking-widest text-red-600 mb-1">Danger Zone</p>
                <p className="text-xs text-red-400 mb-3">To delete your account please contact us directly. We will remove all your data within 48 hours.</p>
                <a href="tel:02084767326" className="text-xs font-bold text-red-600 underline hover:text-red-800">
                  Call 020 8476 7326
                </a>
              </div>
            </SettingsSection>

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