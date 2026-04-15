import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import { useToast, useConfirm } from './Notifications';
import API_URL from './config';
import BookingModal from './BookingModal';

const LOYALTY_GOAL = 10;
const MILESTONES = [2, 4, 6, 8, 10];

const profileStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  .font-display { font-family: 'Cormorant Garamond', serif !important; }
`;

function LoyaltyRing({ points, goal }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(points / goal, 1);
  const offset = circumference - progress * circumference;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#E4E0D8" strokeWidth="10" />
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#B8975A" strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="70" y="65" textAnchor="middle" style={{ fontSize: '22px', fontWeight: '300', fill: '#1A1A18', fontFamily: 'Cormorant Garamond, serif' }}>{points}</text>
      <text x="70" y="82" textAnchor="middle" style={{ fontSize: '9px', fill: '#B8975A', letterSpacing: '2px', textTransform: 'uppercase' }}>Visits</text>
    </svg>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="border-b border-[#E4E0D8] pb-8 mb-8 last:border-0 last:mb-0 last:pb-0">
      <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-5" style={{ color: '#B8975A' }}>{title}</p>
      {children}
    </div>
  );
}

function FeedbackMsg({ type, msg }) {
  if (!msg) return null;
  return (
    <p className={`text-[0.78rem] mt-2 font-light ${type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
      {type === 'success' ? '✓ ' : '✕ '}{msg}
    </p>
  );
}

export default function Profile() {
  const { user, role, session } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const isCustomer = role === 'customer' || !role;
  const tabs = isCustomer ? ['appointments', 'loyalty', 'settings'] : ['settings'];
  const [activeTab, setActiveTab] = useState(isCustomer ? 'appointments' : 'settings');
  const [showAllPast, setShowAllPast] = useState(false);
  const [showAllVouchers, setShowAllVouchers] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);

  const [points, setPoints] = useState(0);
  const [voucherCode, setVoucherCode] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [infoFeedback, setInfoFeedback] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwFeedback, setPwFeedback] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  const token = session?.access_token;
  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!user?.id) return;

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

  const handleCancel = async (bookingId) => {
    const ok = await confirm({
      title: 'Cancel this appointment?',
      message: 'This cannot be undone. You will receive a confirmation email.',
      confirmText: 'Cancel Appointment',
      cancelText: 'Keep',
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, { method: 'PUT', headers: authHeader });
    if (res.ok) {
      setAppointments(prev => prev.filter(b => b.id !== bookingId));
      toast.success('Appointment cancelled.');
    } else toast.error('Failed to cancel booking.');
  };

  const handleReschedule = async (stylistId, newStartTime) => {
    const res = await fetch(`${API_URL}/api/bookings/${reschedulingBooking.id}/reschedule`, {
      method: 'PUT', headers: authHeader,
      body: JSON.stringify({ new_start_time: newStartTime }),
    });
    if (res.ok) {
      toast.success('Booking rescheduled! Check your email for confirmation.');
      setReschedulingBooking(null);
      const refreshRes = await fetch(`${API_URL}/api/bookings/customer/${user.id}`, { headers: authHeader });
      const data = await refreshRes.json();
      setAppointments(Array.isArray(data) ? data : []);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(`Failed to reschedule: ${err.error || res.status}`);
    }
  };

  const handleExportIcs = async (bookingId) => {
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/export`, { headers: authHeader });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `booking-${bookingId}.ics`; a.click();
      window.URL.revokeObjectURL(url);
    } else toast.error('Failed to export calendar file.');
  };

  const handleRedeem = async () => {
    if (points < LOYALTY_GOAL) return;
    const ok = await confirm({
      title: 'Redeem your voucher?',
      message: 'Use your 10 visits for a 10% discount voucher on your next appointment.',
      confirmText: 'Redeem',
    });
    if (!ok) return;
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/api/profiles/redeem`, { method: 'POST', headers: authHeader });
      const data = await res.json();
      if (res.ok) {
        setVoucherCode(data.code); setPoints(data.visitsRemaining);
        setVouchers(prev => [{ id: data.voucherId, code: data.code, discount: data.discount, used: false, created_at: new Date().toISOString() }, ...prev]);
        toast.success('Voucher redeemed successfully.');
      } else toast.error(data.error || 'Failed to redeem points.');
    } catch { toast.error('Something went wrong.'); } finally { setRedeeming(false); }
  };

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwFeedback({ type: 'error', msg: 'New passwords do not match.' }); return; }
    if (newPassword.length < 6) { setPwFeedback({ type: 'error', msg: 'Password must be at least 6 characters.' }); return; }
    setSavingPw(true); setPwFeedback(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwFeedback({ type: 'error', msg: data.error }); return; }
      setPwFeedback({ type: 'success', msg: 'Password updated successfully.' }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch { setPwFeedback({ type: 'error', msg: 'Something went wrong.' }); }
    finally { setSavingPw(false); }
  };

  const canRedeem = points >= LOYALTY_GOAL;
  const remaining = Math.max(LOYALTY_GOAL - points, 0);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A18]">
      <style>{profileStyles}</style>

      {/* Nav */}
      <nav className="fixed w-full bg-[#FAFAF8]/92 backdrop-blur-md border-b border-[#E4E0D8] z-40">
        <div className="max-w-4xl mx-auto px-6 md:px-16 h-[72px] flex items-center justify-between">
          <a href="/" className="font-display text-[1.3rem] font-medium tracking-wide text-[#1A1A18] no-underline">
            Hair by <span style={{ color: '#B8975A' }}>Amnesia</span>
          </a>
          <button
            onClick={() => navigate(role === 'admin' ? '/admin' : role === 'stylist' ? '/stylist' : '/app')}
            className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] transition-colors bg-transparent border-none cursor-pointer p-0"
            style={{ borderBottom: '1px solid #E4E0D8' }}
          >
            Back
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 md:px-16 pt-[100px] pb-16">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[0.67rem] tracking-[0.2em] uppercase mb-2" style={{ color: '#B8975A' }}>Your Profile</p>
          <h1 className="font-display font-light leading-tight text-[#1A1A18]" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>
            Welcome back, {fullName?.split(' ')[0] || 'there'}.
          </h1>
          <p className="text-[0.82rem] font-light text-[#7A7870] mt-2">{user?.email}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-[#E4E0D8] mb-10">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[0.72rem] tracking-[0.12em] uppercase transition-colors bg-transparent border-none cursor-pointer p-0 ${
                activeTab === tab
                  ? 'font-medium text-[#1A1A18]'
                  : 'font-light text-[#7A7870] hover:text-[#1A1A18]'
              }`}
              style={activeTab === tab ? { borderBottom: '2px solid #B8975A', marginBottom: '-1px' } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB: APPOINTMENTS (upcoming only) */}
        {activeTab === 'appointments' && (() => {
          const upcoming = appointments.filter(a => new Date() <= new Date(a.start_time) && a.status !== 'completed');
          return (
            <div className="bg-white border border-[#E4E0D8] min-h-[400px]">
              {loadingAppts ? (
                <div className="p-10 text-center text-[#7A7870] font-light animate-pulse">Loading...</div>
              ) : upcoming.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="font-display text-[1.2rem] font-light text-[#7A7870]">No upcoming appointments.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E4E0D8]">
                  {upcoming.map(appt => {
                    const start = new Date(appt.start_time);
                    const isPending = appt.status === 'pending';
                    return (
                      <div key={appt.id} className="p-6 flex justify-between items-center hover:bg-[#FAFAF8] transition-colors duration-200">
                        <div className="flex items-center gap-6">
                          <div className="text-center w-14">
                            <p className="text-[1.6rem] font-light text-[#1A1A18] leading-none">{start.getDate()}</p>
                            <p className="text-[0.62rem] tracking-[0.1em] uppercase mt-0.5" style={{ color: '#B8975A' }}>
                              {start.toLocaleString('en-GB', { month: 'short' })}
                            </p>
                            <p className="text-[0.62rem] text-[#7A7870]">{start.getFullYear()}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-[1.05rem] font-medium text-[#1A1A18]">{appt.services?.name}</h3>
                              {isPending && (
                                <span className="text-[0.58rem] tracking-[0.1em] uppercase px-2 py-0.5" style={{ color: '#B8975A', border: '1px solid #B8975A' }}>
                                  Awaiting Approval
                                </span>
                              )}
                            </div>
                            <p className="text-[0.78rem] font-light text-[#7A7870]">with {appt.stylists?.name} · £{appt.services?.base_price}</p>
                            <p className="text-[0.72rem] font-light text-[#B4A894] mt-0.5">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          {!isPending && (
                            <button onClick={() => setReschedulingBooking(appt)}
                              className="text-[0.68rem] tracking-[0.08em] uppercase font-light text-[#1A1A18] border border-[#E4E0D8] bg-white hover:bg-[#FAFAF8] px-4 py-2 cursor-pointer transition-colors duration-200">
                              Reschedule
                            </button>
                          )}
                          <button onClick={() => handleCancel(appt.id)}
                            className="text-[0.68rem] tracking-[0.08em] uppercase font-light text-red-600 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 cursor-pointer transition-colors duration-200">
                            Cancel
                          </button>
                          {!isPending && (
                            <button onClick={() => handleExportIcs(appt.id)} title="Export to Calendar"
                              className="text-[0.78rem] text-[#7A7870] border border-[#E4E0D8] bg-white hover:bg-[#FAFAF8] px-3 py-2 cursor-pointer transition-colors duration-200">
                              📅
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB: LOYALTY */}
        {activeTab === 'loyalty' && (
          <div className="grid md:grid-cols-2 gap-8 grid-flow-row">
            <div className="bg-white border border-[#E4E0D8] p-8 flex flex-col items-center">
              <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-6" style={{ color: '#B8975A' }}>Loyalty Card</p>
              <LoyaltyRing points={points} goal={LOYALTY_GOAL} />
              <p className="text-[0.75rem] font-light text-[#7A7870] mt-4">{points} of {LOYALTY_GOAL} visits</p>
              <div className="flex gap-2 mt-6">
                {MILESTONES.map(milestone => (
                  <div key={milestone}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[0.6rem] transition-colors duration-200"
                    style={{
                      border: `1px solid ${points >= milestone ? '#B8975A' : '#E4E0D8'}`,
                      background: points >= milestone ? 'rgba(184,151,90,0.15)' : 'transparent',
                      color: points >= milestone ? '#D4B07A' : '#E4E0D8',
                    }}>
                    {points >= milestone ? '✓' : ''}
                  </div>
                ))}
              </div>
              {voucherCode && (
                <div className="mt-6 w-full bg-[#FAFAF8] border border-[#B8975A] p-4 text-center">
                  <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Your Voucher Code</p>
                  <p className="font-display text-[1.8rem] font-light" style={{ color: '#B8975A' }}>{voucherCode}</p>
                  <p className="text-[0.72rem] font-light text-[#7A7870] mt-1">Show this at your next appointment</p>
                </div>
              )}
              <button onClick={handleRedeem} disabled={!canRedeem || redeeming}
                className={`mt-6 w-full py-3.5 text-[0.72rem] font-medium tracking-[0.12em] uppercase border-none cursor-pointer transition-colors duration-200 ${
                  canRedeem
                    ? 'bg-[#1A1A18] text-white hover:bg-[#B8975A]'
                    : 'bg-[#E4E0D8] text-[#B4A894] cursor-not-allowed'
                }`}>
                {redeeming ? 'Redeeming...' : 'Redeem for Voucher'}
              </button>
              <p className="text-[0.72rem] font-light text-[#7A7870] mt-2">
                {canRedeem ? 'You have enough visits to redeem a voucher!' : `Unlocks at ${LOYALTY_GOAL} visits · ${remaining} remaining`}
              </p>
            </div>

            <div className="bg-white border border-[#E4E0D8] p-6">
              <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-6" style={{ color: '#B8975A' }}>Past Appointments</p>
              {(() => {
                const pastAppts = appointments.filter(a => new Date() > new Date(a.start_time) || a.status === 'completed');
                if (pastAppts.length === 0) return (
                  <div className="text-center text-[#7A7870] font-light py-8 text-[0.85rem]">No past appointments yet.</div>
                );
                const visible = showAllPast ? pastAppts : pastAppts.slice(0, 6);
                return (
                  <>
                    <div className="space-y-0">
                      {visible.map(appt => {
                        const start = new Date(appt.start_time);
                        return (
                          <div key={appt.id} className="flex justify-between items-center py-4 border-b border-[#E4E0D8] last:border-0">
                            <div className="flex items-center gap-4">
                              <div className="text-center w-10">
                                <p className="text-[1.1rem] font-light text-[#1A1A18] leading-none">{start.getDate()}</p>
                                <p className="text-[0.58rem] tracking-[0.1em] uppercase" style={{ color: '#B8975A' }}>
                                  {start.toLocaleString('en-GB', { month: 'short' })}
                                </p>
                              </div>
                              <div>
                                <p className="font-display text-[0.95rem] font-medium text-[#1A1A18]">{appt.services?.name}</p>
                                <p className="text-[0.72rem] font-light text-[#7A7870]">with {appt.stylists?.name}</p>
                              </div>
                            </div>
                            <button onClick={() => setReschedulingBooking(appt)}
                              className="text-[0.62rem] tracking-[0.1em] uppercase font-light text-[#1A1A18] border border-[#E4E0D8] bg-white hover:bg-[#FAFAF8] px-3 py-1.5 cursor-pointer transition-colors duration-200">
                              Rebook
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {pastAppts.length > 6 && (
                      <button
                        onClick={() => setShowAllPast(prev => !prev)}
                        className="w-full mt-4 text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] bg-transparent border-none cursor-pointer transition-colors p-0"
                      >
                        {showAllPast ? 'Show less' : `Show all (${pastAppts.length})`}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="bg-white border border-[#E4E0D8] p-6 md:col-span-2">
              <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-6" style={{ color: '#B8975A' }}>My Vouchers</p>
              {loadingVouchers ? (
                <div className="text-center text-[#7A7870] font-light animate-pulse py-4">Loading...</div>
              ) : vouchers.length === 0 ? (
                <div className="text-center text-[#7A7870] font-light py-6 text-[0.85rem]">No vouchers yet. Complete 10 visits to earn one.</div>
              ) : (() => {
                const visible = showAllVouchers ? vouchers : vouchers.slice(0, 3);
                return (
                  <>
                    <div className="grid md:grid-cols-3 gap-4">
                      {visible.map(v => (
                        <div key={v.id} className={`border p-4 ${v.used ? 'border-[#E4E0D8] bg-[#FAFAF8]' : 'border-[#B8975A] bg-white'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[0.62rem] tracking-[0.1em] uppercase px-2 py-0.5 ${
                              v.used ? 'bg-[#E4E0D8] text-[#7A7870]' : 'bg-[#1A1A18] text-white'
                            }`}>
                              {v.used ? 'Used' : `${v.discount}% Off`}
                            </span>
                            <span className="text-[0.68rem] font-light text-[#B4A894]">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
                          </div>
                          <p className={`font-display text-[1.4rem] font-light mt-2 ${v.used ? 'text-[#B4A894] line-through' : 'text-[#1A1A18]'}`}>{v.code}</p>
                          {!v.used && <p className="text-[0.68rem] font-light text-[#7A7870] mt-1">Show this at your appointment</p>}
                        </div>
                      ))}
                    </div>
                    {vouchers.length > 3 && (
                      <button
                        onClick={() => setShowAllVouchers(prev => !prev)}
                        className="w-full mt-4 text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] bg-transparent border-none cursor-pointer transition-colors p-0"
                      >
                        {showAllVouchers ? 'Show less' : `Show all (${vouchers.length})`}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-[#E4E0D8] p-8 md:p-10 space-y-0">

            <SettingsSection title="Personal Information">
              <form onSubmit={handleSaveInfo} className="space-y-4 max-w-md">
                <div>
                  <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name" required
                    className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors" />
                </div>
                <div>
                  <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 07700 900000"
                    className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors" />
                </div>
                <button disabled={savingInfo}
                  className="bg-[#1A1A18] text-white px-6 py-3.5 text-[0.72rem] font-medium tracking-[0.12em] uppercase hover:bg-[#B8975A] transition-colors duration-200 border-none cursor-pointer disabled:opacity-50">
                  {savingInfo ? 'Saving...' : 'Save Changes'}
                </button>
                <FeedbackMsg type={infoFeedback?.type} msg={infoFeedback?.msg} />
              </form>
            </SettingsSection>

            <SettingsSection title="Change Password">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Current password" required
                    className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors" />
                </div>
                <div>
                  <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters" required minLength={6}
                    className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors" />
                </div>
                <div>
                  <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password" required
                    className={`w-full border bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors ${
                      confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : 'border-[#E4E0D8]'
                    }`} />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[0.75rem] text-red-500 mt-1.5 font-light">Passwords do not match</p>
                  )}
                </div>
                <button disabled={savingPw}
                  className="bg-[#1A1A18] text-white px-6 py-3.5 text-[0.72rem] font-medium tracking-[0.12em] uppercase hover:bg-[#B8975A] transition-colors duration-200 border-none cursor-pointer disabled:opacity-50">
                  {savingPw ? 'Updating...' : 'Update Password'}
                </button>
                <FeedbackMsg type={pwFeedback?.type} msg={pwFeedback?.msg} />
              </form>
            </SettingsSection>

            <SettingsSection title="Account">
              <p className="text-[0.78rem] font-light text-[#7A7870] leading-relaxed">
                To delete your account please contact us directly. We will remove all your data within 48 hours.{' '}
                <a href="tel:02084767326" className="text-[#1A1A18]" style={{ borderBottom: '1px solid #E4E0D8' }}>
                  020 8476 7326
                </a>
              </p>
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
