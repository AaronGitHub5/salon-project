import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast, useConfirm } from './Notifications';
import GuestBookingModal from './GuestBookingModal';
import AdminAnalytics from './AdminAnalytics';
import AdminStylists from './AdminStylists';
import API_URL from './config';

function VoucherLookup({ authHeader }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [code, setCode] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [marked, setMarked] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    setVoucher(null);
    setMarked(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/profiles/vouchers/lookup?code=${encodeURIComponent(code.trim())}`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Voucher not found');
      } else {
        setVoucher(data);
      }
    } catch (err) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUsed = async () => {
    const ok = await confirm({
      title: 'Mark voucher as used?',
      message: 'This cannot be undone.',
      confirmText: 'Mark as Used',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/profiles/vouchers/${voucher.id}/use`, {
        method: 'PATCH',
        headers: authHeader,
      });
      if (res.ok) {
        setVoucher(prev => ({ ...prev, used: true }));
        setMarked(true);
      } else {
        toast.error('Failed to mark voucher as used.');
      }
    } catch (err) {
      toast.error('Something went wrong.');
    }
  };

  const handleReset = () => {
    setCode('');
    setVoucher(null);
    setError('');
    setMarked(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border border-[#E4E0D8] p-8">
        <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-6" style={{ color: '#B8975A' }}>Voucher Validator</p>

        <form onSubmit={handleLookup} className="flex gap-3 mb-6">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="AMNESIA10-XXXXX"
            className="flex-1 border border-[#E4E0D8] p-3 bg-[#FAFAF8] font-mono text-[0.8rem] uppercase focus:outline-none focus:border-[#B8975A]"
            required
          />
          <button
            disabled={loading}
            className="px-6 py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Lookup'}
          </button>
        </form>

        {error && (
          <div className="border border-[#E4D5AE] bg-[#FBF3E6] p-4 text-center">
            <p className="text-[0.8rem] font-light" style={{ color: '#B56145' }}>{error}</p>
          </div>
        )}

        {voucher && (
          <div className={`border p-6 ${voucher.used ? 'border-[#E4E0D8] bg-[#F5F2EB]' : 'border-[#B8975A] bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[0.62rem] tracking-[0.12em] uppercase px-3 py-1 ${voucher.used ? 'bg-[#E4E0D8] text-[#7A7870]' : 'bg-[#1A1A18] text-white'}`}>
                {voucher.used ? 'Already Used' : `${voucher.discount}% Discount`}
              </span>
              <span className="text-[0.65rem] font-light text-[#B4A894]">
                Issued {new Date(voucher.created_at).toLocaleDateString('en-GB')}
              </span>
            </div>
            <p className={`font-display text-[1.8rem] font-light mb-4 ${voucher.used ? 'text-[#B4A894] line-through' : 'text-[#1A1A18]'}`}>
              {voucher.code}
            </p>
            <div className="bg-[#FAFAF8] border border-[#E4E0D8] p-4 mb-4">
              <p className="text-[0.6rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Customer</p>
              <p className="font-display text-[1.05rem] font-medium text-[#1A1A18]">{voucher.profiles?.full_name}</p>
              <p className="text-[0.78rem] font-light text-[#7A7870]">{voucher.profiles?.email}</p>
            </div>
            {marked ? (
              <div className="border border-[#B8975A] bg-[rgba(184,151,90,0.08)] p-4 text-center">
                <p className="text-[0.8rem] font-medium" style={{ color: '#B8975A' }}>✓ Voucher marked as used</p>
                <button onClick={handleReset} className="mt-3 text-[0.68rem] tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] bg-transparent border-none cursor-pointer" style={{ borderBottom: '1px solid #E4E0D8' }}>
                  Look up another voucher
                </button>
              </div>
            ) : voucher.used ? (
              <div className="border border-[#E4E0D8] bg-[#FAFAF8] p-4 text-center">
                <p className="text-[0.8rem] font-light text-[#7A7870]">This voucher has already been used</p>
                <button onClick={handleReset} className="mt-3 text-[0.68rem] tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] bg-transparent border-none cursor-pointer" style={{ borderBottom: '1px solid #E4E0D8' }}>
                  Look up another voucher
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleMarkUsed}
                  className="flex-1 py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] transition-colors"
                >
                  ✓ Mark as Used
                </button>
                <button
                  onClick={handleReset}
                  className="px-5 py-3 text-[0.68rem] font-light tracking-[0.1em] uppercase text-[#7A7870] border border-[#E4E0D8] bg-transparent cursor-pointer hover:text-[#1A1A18] hover:border-[#1A1A18] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CancelBooking({ authHeader }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { fetchAllBookings(); }, []);

  const fetchAllBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/bookings`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load bookings.'); return; }
      const now = new Date();
      const upcoming = (Array.isArray(data) ? data : [])
        .filter(b => ['confirmed', 'pending'].includes(b.status) && new Date(b.start_time) >= now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      setAllBookings(upcoming);
    } catch (err) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = query.trim().length < 1 ? allBookings : allBookings.filter(b => {
    const q = query.trim().toLowerCase();
    const name = (b.profiles?.full_name || b.guests?.full_name || '').toLowerCase();
    const email = (b.profiles?.email || b.guests?.email || '').toLowerCase();
    const phone = (b.profiles?.phone_number || b.guests?.phone_number || '').toLowerCase();
    const service = (b.services?.name || '').toLowerCase();
    const stylist = (b.stylists?.name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || service.includes(q) || stylist.includes(q);
  });

  const handleCancel = async (bookingId) => {
    setCancellingId(bookingId);
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: authHeader,
      });
      if (res.ok) {
        setAllBookings(prev => prev.filter(b => b.id !== bookingId));
        setConfirmId(null);
        toast.success('Booking cancelled. Customer notified.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to cancel booking.');
      }
    } catch (err) {
      toast.error('Something went wrong.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-[#E4E0D8] p-8">
        <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Cancellations</p>
        <h2 className="font-display text-[1.4rem] font-light text-[#1A1A18] mb-1">Manage Bookings</h2>
        <p className="text-[0.78rem] font-light text-[#7A7870] mb-6">All upcoming bookings shown below. Use the search to filter by name, email, phone, service, or stylist.</p>

        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter bookings..."
            className="w-full border border-[#E4E0D8] p-3 bg-[#FAFAF8] text-[0.85rem] font-light focus:outline-none focus:border-[#B8975A] pr-10"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-3 text-[#B4A894] hover:text-[#1A1A18] bg-transparent border-none cursor-pointer text-sm">✕</button>
          )}
        </div>

        {loading && (
          <div className="text-center py-12 text-[#7A7870] font-light animate-pulse">Loading bookings...</div>
        )}

        {error && (
          <div className="border border-[#E4D5AE] bg-[#FBF3E6] p-4 mb-4">
            <p className="text-[0.78rem] font-light" style={{ color: '#B56145' }}>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-10 text-[0.82rem] font-light text-[#7A7870]">
            {query ? `No bookings match "${query}".` : 'No upcoming bookings.'}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <p className="text-[0.65rem] font-light text-[#B4A894] mb-3">{filtered.length} upcoming booking{filtered.length !== 1 ? 's' : ''}{query ? ' matching filter' : ''}</p>
            <div className="space-y-3">
              {filtered.map((booking) => {
                const customerName = booking.profiles?.full_name || booking.guests?.full_name || 'Guest';
                const customerEmail = booking.profiles?.email || booking.guests?.email || null;
                const customerPhone = booking.profiles?.phone_number || booking.guests?.phone_number || null;
                const start = new Date(booking.start_time);
                const isConfirming = confirmId === booking.id;
                const isCancelling = cancellingId === booking.id;

                return (
                  <div key={booking.id} className="border border-[#E4E0D8] p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-display text-[1.05rem] font-medium text-[#1A1A18]">{customerName}</span>
                          <span className={`text-[0.58rem] tracking-[0.12em] uppercase px-2 py-0.5 ${
                            booking.status === 'pending'
                              ? 'bg-[#FBF3E6] text-[#B8975A] border border-[#E4D5AE]'
                              : 'bg-[#F0EDE5] text-[#1A1A18]'
                          }`}>
                            {booking.status}
                          </span>
                          {!booking.profiles && (
                            <span className="text-[0.58rem] tracking-[0.12em] uppercase bg-[#F0EDE5] text-[#7A7870] px-2 py-0.5">Guest</span>
                          )}
                        </div>
                        <p className="text-[0.78rem] font-light text-[#7A7870]">{booking.services?.name} — {booking.stylists?.name}</p>
                        <p className="text-[0.7rem] font-light text-[#B4A894] mt-0.5">
                          {start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {customerEmail && <p className="text-[0.7rem] font-light text-[#B4A894] mt-0.5">✉ {customerEmail}</p>}
                        {customerPhone && <p className="text-[0.7rem] font-light text-[#B4A894]">✆ {customerPhone}</p>}
                      </div>

                      <div className="shrink-0">
                        {isConfirming ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={isCancelling}
                              className="px-4 py-2 text-[0.68rem] font-medium tracking-[0.12em] uppercase text-white border-none cursor-pointer transition-colors disabled:opacity-50"
                              style={{ background: '#B56145' }}
                            >
                              {isCancelling ? '...' : 'Confirm Cancel'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="px-4 py-2 text-[0.68rem] font-light tracking-[0.1em] uppercase text-[#7A7870] border border-[#E4E0D8] bg-transparent cursor-pointer hover:text-[#1A1A18] hover:border-[#1A1A18] transition-colors"
                            >
                              Back
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(booking.id)}
                            className="px-4 py-2 text-[0.68rem] font-light tracking-[0.1em] uppercase border bg-transparent cursor-pointer transition-colors"
                            style={{ color: '#B56145', borderColor: '#E4D5AE' }}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState('analytics');
  const [services, setServices] = useState([]);
  const [inactiveServices, setInactiveServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: 60, category: 'Cutting & Styling' });
  const [editingId, setEditingId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestBookingSuccess, setGuestBookingSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const authHeader = {
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    fetch(`${API_URL}/api/services`)
      .then((res) => res.json())
      .then((data) => setServices(data))
      .catch((err) => console.error('Error fetching services:', err));
  }, [refresh]);

  // Load inactive services when the services tab is active
  useEffect(() => {
    if (activeTab !== 'services') return;
    fetch(`${API_URL}/api/services/inactive`, { headers: authHeader })
      .then((res) => res.json())
      .then((data) => setInactiveServices(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching inactive services:', err));
  }, [activeTab, refresh]);

  const handleRestore = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/services/${id}/restore`, {
        method: 'PUT',
        headers: authHeader,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Failed to restore service.');
        return;
      }
      toast.success('Service restored to menu.');
      setRefresh((p) => p + 1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to restore service.');
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews') fetchPendingReviews();
  }, [activeTab]);

  const fetchPendingReviews = async () => {
    setReviewsLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`${API_URL}/api/reviews/pending`, { headers: authHeader }),
        fetch(`${API_URL}/api/reviews/approved`, { headers: authHeader }),
      ]);
      const pendingData = await pendingRes.json();
      const approvedData = await approvedRes.json();
      setPendingReviews(Array.isArray(pendingData) ? pendingData : []);
      setApprovedReviews(Array.isArray(approvedData) ? approvedData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/reviews/${id}/approve`, {
        method: 'PATCH',
        headers: authHeader,
      });
      if (res.ok) {
        setPendingReviews(prev => prev.filter(r => r.id !== id));
        toast.success('Review approved.');
      } else {
        toast.error('Failed to approve review.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong.');
    }
  };

  const handleDeleteReview = async (id) => {
    const ok = await confirm({
      title: 'Delete this review?',
      message: 'This review will be permanently removed.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/reviews/${id}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (res.ok) {
        setPendingReviews(prev => prev.filter(r => r.id !== id));
        setApprovedReviews(prev => prev.filter(r => r.id !== id));
        toast.success('Review deleted.');
      } else {
        toast.error('Failed to delete review.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const price = parseFloat(formData.price);
    const duration = parseInt(formData.duration);
    const url = editingId ? `${API_URL}/api/services/${editingId}` : `${API_URL}/api/services`;
    const method = editingId ? 'PUT' : 'POST';
    try {
      await fetch(url, {
        method,
        headers: authHeader,
        body: JSON.stringify({ name: formData.name, base_price: price, duration_minutes: duration, category: formData.category }),
      });
      toast.success(editingId ? 'Service updated.' : 'Service created.');
      setEditingId(null);
      setFormData({ name: '', price: '', duration: 60, category: 'Cutting & Styling' });
      setRefresh(p => p + 1);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete service?',
      message: 'This will remove the service from the menu. Existing bookings will still show it.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE', headers: authHeader });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Failed to delete service.');
        return;
      }
      toast.success('Service removed from menu.');
      setRefresh(p => p + 1);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete service.');
    }
  };

  const handleGuestBooking = async (bookingData) => {
    // Customer booking — already created by GuestBookingModal via POST /api/bookings
    if (bookingData._customerBooking) {
      setShowGuestModal(false);
      setSuccessMessage({
        title: 'Customer Booking Made',
        subtitle: `Booked for ${bookingData.customerName}. Confirmation email sent${bookingData.customerEmail ? ` to ${bookingData.customerEmail}` : ''}.`,
      });
      setGuestBookingSuccess(true);
      return;
    }

    // Original guest flow — POST /api/bookings/guest
    try {
      const res = await fetch(`${API_URL}/api/bookings/guest`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(bookingData),
      });
      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        // emailSent: null = no email provided, true = delivered, false = all retries failed
        const emailFailed = result.emailSent === false;
        setShowGuestModal(false);
        setSuccessMessage({
          title: 'Guest Booking Made',
          subtitle: emailFailed
            ? 'Booking created, but the confirmation email could not be delivered. Please contact the guest directly.'
            : 'The booking has been confirmed and the customer will receive an email if one was provided.',
        });
        setGuestBookingSuccess(true);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(`Failed to create booking: ${err.error || res.status}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const groupedServices = services.reduce((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const handleEditClick = (s) => {
    setEditingId(s.id);
    setFormData({ name: s.name, price: s.base_price, duration: s.duration_minutes, category: s.category || 'Other' });
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A18] p-6 md:p-10">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500&display=swap');.font-display{font-family:'Cormorant Garamond',serif !important;}`}</style>
      <header className="flex justify-between items-center mb-10 pb-5 border-b border-[#E4E0D8]">
        <div>
          <p className="text-[0.62rem] tracking-[0.2em] uppercase mb-1" style={{ color: '#B8975A' }}>Admin Console</p>
          <h1 className="font-display font-light text-[2rem] md:text-[2.4rem] text-[#1A1A18] leading-none">Control Panel</h1>
          <p className="text-[0.72rem] font-light text-[#7A7870] mt-2">Signed in as {user?.email}</p>
        </div>
        <div className="flex gap-5 items-center">
          <button onClick={() => navigate('/app')} className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] transition-colors bg-transparent border-none cursor-pointer p-0" style={{ borderBottom: '1px solid #E4E0D8' }}>Back to Site</button>
          <button onClick={handleLogout} className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#B56145] transition-colors bg-transparent border-none cursor-pointer p-0" style={{ borderBottom: '1px solid #E4E0D8' }}>Logout</button>
        </div>
      </header>

      <div className="flex gap-8 mb-10 border-b border-[#E4E0D8] flex-wrap">
        {[
          { key: 'analytics', label: 'Overview' },
          { key: 'services', label: 'Services' },
          { key: 'stylists', label: 'Stylists' },
          { key: 'loyalty', label: 'Vouchers' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'cancel', label: 'Cancel' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`pb-3 text-[0.72rem] tracking-[0.12em] uppercase transition-colors bg-transparent border-none cursor-pointer p-0 ${activeTab === key ? 'font-medium text-[#1A1A18]' : 'font-light text-[#7A7870] hover:text-[#1A1A18]'}`}
            style={activeTab === key ? { borderBottom: '2px solid #B8975A', marginBottom: '-1px' } : {}}
          >
            {label}
            {key === 'reviews' && pendingReviews.length > 0 && (
              <span className="ml-2 text-[0.58rem] px-1.5 py-0.5" style={{ background: '#B8975A', color: '#fff' }}>{pendingReviews.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in">
          <AdminAnalytics token={session?.access_token} />
          <div className="bg-white border border-[#E4E0D8] p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Operational Actions</p>
              <h2 className="font-display text-[1.4rem] font-light text-[#1A1A18]">Create a booking</h2>
              <p className="text-[0.78rem] font-light text-[#7A7870] mt-1">Manage walk-ins and offline clients.</p>
            </div>
            <button
              onClick={() => setShowGuestModal(true)}
              className="px-6 py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] transition-colors"
            >
              + New Booking
            </button>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="grid md:grid-cols-3 gap-8 animate-fade-in">
          <div className="md:col-span-1 bg-white p-6 border border-[#E4E0D8] h-fit">
            <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-4" style={{ color: '#B8975A' }}>{editingId ? 'Edit Service' : 'Add New Service'}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full border border-[#E4E0D8] p-3 bg-[#FAFAF8] text-[0.85rem] font-light focus:outline-none focus:border-[#B8975A]"
                placeholder="Service Name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <select
                className="w-full border border-[#E4E0D8] p-3 bg-[#FAFAF8] text-[0.85rem] font-light focus:outline-none focus:border-[#B8975A]"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Cutting & Styling</option>
                <option>Colour & Balayage</option>
                <option>Treatments</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number" className="w-full border border-[#E4E0D8] p-3 bg-[#FAFAF8] text-[0.85rem] font-light focus:outline-none focus:border-[#B8975A]" placeholder="Price £"
                  value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required
                />
                <input
                  type="number" className="w-full border border-[#E4E0D8] p-3 bg-[#FAFAF8] text-[0.85rem] font-light focus:outline-none focus:border-[#B8975A]" placeholder="Mins"
                  value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} required
                />
              </div>
              <button disabled={isSubmitting} className="w-full py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] disabled:opacity-50 transition-colors">
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && <button type="button" onClick={() => setEditingId(null)} className="w-full text-[0.68rem] tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] mt-2 bg-transparent border-none cursor-pointer">Cancel Edit</button>}
            </form>
          </div>
          <div className="md:col-span-2 space-y-6">
            {Object.entries(groupedServices).map(([cat, items]) => (
              <div key={cat} className="bg-white p-6 border border-[#E4E0D8]">
                <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-4" style={{ color: '#B8975A' }}>{cat}</p>
                <div className="divide-y divide-[#E4E0D8]">
                  {items.map(s => (
                    <div key={s.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                      <div>
                        <span className="font-display text-[1.05rem] font-medium text-[#1A1A18]">{s.name}</span>
                        <span className="text-[0.72rem] font-light text-[#7A7870] ml-3">{s.duration_minutes}m</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="font-display text-[1.1rem] font-light text-[#1A1A18]">£{s.base_price}</span>
                        <div className="flex gap-3">
                          <button onClick={() => handleEditClick(s)} className="text-[0.68rem] tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] bg-transparent border-none cursor-pointer" style={{ borderBottom: '1px solid #E4E0D8' }}>Edit</button>
                          <button onClick={() => handleDelete(s.id)} className="text-[0.68rem] tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#B56145] bg-transparent border-none cursor-pointer" style={{ borderBottom: '1px solid #E4E0D8' }}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Deleted / inactive services */}
            {inactiveServices.length > 0 && (
              <div className="bg-white p-6 border border-[#E4E0D8]">
                <button
                  onClick={() => setShowInactive(v => !v)}
                  className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0 text-left"
                >
                  <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>
                    Deleted Services ({inactiveServices.length})
                  </p>
                  <span className={`text-[#B4A894] text-xs transition-transform duration-200 ${showInactive ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showInactive && (
                  <div className="divide-y divide-[#E4E0D8] mt-4">
                    {inactiveServices.map(s => (
                      <div key={s.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                        <div>
                          <span className="font-display text-[1.05rem] font-medium text-[#B4A894] italic">{s.name}</span>
                          <span className="text-[0.72rem] font-light text-[#B4A894] ml-3">{s.duration_minutes}m · {s.category}</span>
                        </div>
                        <div className="flex items-center gap-5">
                          <span className="font-display text-[1.1rem] font-light text-[#B4A894]">£{s.base_price}</span>
                          <button
                            onClick={() => handleRestore(s.id)}
                            className="text-[0.68rem] tracking-[0.1em] uppercase bg-transparent border-none cursor-pointer transition-colors"
                            style={{ color: '#B8975A', borderBottom: '1px solid #E4E0D8' }}
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stylists' && (
        <div className="animate-fade-in">
          <AdminStylists authHeader={authHeader} />
        </div>
      )}

      {activeTab === 'loyalty' && (
        <div className="animate-fade-in">
          <VoucherLookup authHeader={authHeader} />
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Moderation</p>
              <h2 className="font-display text-[1.6rem] font-light text-[#1A1A18]">Pending Reviews</h2>
            </div>
            <button onClick={fetchPendingReviews} className="text-[0.68rem] tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] bg-transparent border-none cursor-pointer" style={{ borderBottom: '1px solid #E4E0D8' }}>Refresh</button>
          </div>
          {reviewsLoading ? (
            <div className="text-center text-[#7A7870] font-light animate-pulse py-12">Loading...</div>
          ) : pendingReviews.length === 0 ? (
            <div className="bg-white border border-[#E4E0D8] p-16 text-center">
              <p className="font-display text-[1.2rem] font-light text-[#7A7870]">No pending reviews.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <div key={review.id} className="bg-white border border-[#E4E0D8] p-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-display text-[1.1rem] font-medium text-[#1A1A18]">{review.profiles?.full_name || 'Customer'}</span>
                      <span className="text-[0.72rem] font-light text-[#7A7870]">→ {review.stylists?.name}</span>
                      <span className="tracking-[0.1em]" style={{ color: '#D4B07A' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    </div>
                    {review.comment && (
                      <p className="text-[0.85rem] font-light text-[#7A7870] leading-relaxed max-w-xl">{review.comment}</p>
                    )}
                    <p className="text-[0.65rem] font-light text-[#B4A894] mt-2 tracking-wide">{new Date(review.created_at).toLocaleString('en-GB')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="px-5 py-2.5 text-[0.68rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="px-4 py-2.5 text-[0.68rem] font-light tracking-[0.1em] uppercase border bg-transparent cursor-pointer transition-colors"
                      style={{ color: '#B56145', borderColor: '#E4D5AE' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved Reviews — Live on Landing Page */}
          {!reviewsLoading && approvedReviews.length > 0 && (
            <div className="mt-10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1" style={{ color: '#B8975A' }}>Live on Landing Page</p>
                  <h2 className="font-display text-[1.4rem] font-light text-[#1A1A18]">Approved Reviews ({approvedReviews.length})</h2>
                </div>
              </div>
              <div className="space-y-3">
                {approvedReviews.map((review) => (
                  <div key={review.id} className="bg-[#FAFAF8] border border-[#E4E0D8] p-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-display text-[1rem] font-medium text-[#1A1A18]">{review.profiles?.full_name || 'Customer'}</span>
                        <span className="text-[0.72rem] font-light text-[#7A7870]">→ {review.stylists?.name}</span>
                        <span className="tracking-[0.1em]" style={{ color: '#D4B07A' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      </div>
                      {review.comment && (
                        <p className="text-[0.82rem] font-light text-[#7A7870] leading-relaxed max-w-xl">{review.comment}</p>
                      )}
                      <p className="text-[0.62rem] font-light text-[#B4A894] mt-1.5 tracking-wide">{new Date(review.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="px-4 py-2 text-[0.68rem] font-light tracking-[0.1em] uppercase border bg-transparent cursor-pointer transition-colors shrink-0"
                      style={{ color: '#B56145', borderColor: '#E4D5AE' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cancel' && (
        <div className="animate-fade-in">
          <CancelBooking authHeader={authHeader} />
        </div>
      )}

      {showGuestModal && (
        <GuestBookingModal
          onClose={() => setShowGuestModal(false)}
          onConfirm={handleGuestBooking}
          token={session?.access_token}
        />
      )}

      {guestBookingSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm p-8 text-center border border-[#E4E0D8]">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ border: '1px solid #B8975A', background: 'rgba(184,151,90,0.08)' }}>
              <span className="text-xl" style={{ color: '#B8975A' }}>✓</span>
            </div>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-1">{successMessage.title}</h2>
            <p className="text-[0.78rem] font-light text-[#7A7870] mb-6 leading-relaxed">{successMessage.subtitle}</p>
            <button
              onClick={() => setGuestBookingSuccess(false)}
              className="w-full py-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase bg-[#1A1A18] text-white border-none cursor-pointer hover:bg-[#B8975A] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}