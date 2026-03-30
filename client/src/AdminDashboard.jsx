import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import GuestBookingModal from './GuestBookingModal';
import AdminAnalytics from './AdminAnalytics';
import AdminStylists from './AdminStylists';
import API_URL from './config';

function VoucherLookup({ authHeader }) {
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
    if (!confirm('Mark this voucher as used? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/profiles/vouchers/${voucher.id}/use`, {
        method: 'PATCH',
        headers: authHeader,
      });
      if (res.ok) {
        setVoucher(prev => ({ ...prev, used: true }));
        setMarked(true);
      } else {
        alert('Failed to mark voucher as used.');
      }
    } catch (err) {
      alert('Something went wrong.');
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Voucher Validator</h2>

        <form onSubmit={handleLookup} className="flex gap-3 mb-6">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="AMNESIA10-XXXXX"
            className="flex-1 border p-3 rounded bg-gray-50 font-mono text-sm uppercase focus:outline-black"
            required
          />
          <button
            disabled={loading}
            className="bg-black text-white px-6 py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? '...' : 'Lookup'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
            <p className="text-red-600 text-sm font-bold">❌ {error}</p>
          </div>
        )}

        {voucher && (
          <div className={`rounded-lg border-2 p-6 ${voucher.used ? 'border-gray-200 bg-gray-50' : 'border-black bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`text-xs font-bold uppercase px-3 py-1 rounded ${voucher.used ? 'bg-gray-200 text-gray-500' : 'bg-black text-white'}`}>
                {voucher.used ? 'Already Used' : `${voucher.discount}% Discount`}
              </span>
              <span className="text-[10px] text-gray-400">
                Issued {new Date(voucher.created_at).toLocaleDateString('en-GB')}
              </span>
            </div>
            <p className={`font-mono font-bold text-2xl mb-4 ${voucher.used ? 'text-gray-400 line-through' : 'text-black'}`}>
              {voucher.code}
            </p>
            <div className="bg-gray-50 rounded p-4 mb-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Customer</p>
              <p className="font-bold text-gray-800">{voucher.profiles?.full_name}</p>
              <p className="text-sm text-gray-500">{voucher.profiles?.email}</p>
            </div>
            {marked ? (
              <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                <p className="text-green-700 font-bold text-sm">✓ Voucher marked as used</p>
                <button onClick={handleReset} className="mt-3 text-xs text-gray-400 underline hover:text-black">
                  Look up another voucher
                </button>
              </div>
            ) : voucher.used ? (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
                <p className="text-red-600 font-bold text-sm">This voucher has already been used</p>
                <button onClick={handleReset} className="mt-3 text-xs text-gray-400 underline hover:text-black">
                  Look up another voucher
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleMarkUsed}
                  className="flex-1 bg-green-600 text-white py-3 rounded text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition"
                >
                  ✓ Mark as Used
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 border border-gray-200 rounded text-xs font-bold uppercase text-gray-500 hover:bg-gray-50 transition"
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const debounceRef = useRef(null);

  const handleSearch = async (value) => {
    if (value.trim().length < 2) {
      setResults([]);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/bookings/search?q=${encodeURIComponent(value.trim())}`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed.');
        setResults([]);
      } else {
        setResults(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 400);
  };

  const handleCancel = async (bookingId) => {
    setCancellingId(bookingId);
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: authHeader,
      });
      if (res.ok) {
        setResults(prev => prev.filter(b => b.id !== bookingId));
        setConfirmId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel booking.');
      }
    } catch (err) {
      alert('Something went wrong.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Cancel Customer Booking</h2>
        <p className="text-sm text-gray-500 mb-6">Search by customer name, email, or phone number.</p>

        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="e.g. Sarah, sarah@email.com, 07700..."
            className="w-full border p-3 rounded bg-gray-50 text-sm focus:outline-black pr-10"
          />
          {loading && (
            <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {query.trim().length >= 2 && !loading && results.length === 0 && !error && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No active bookings found for "{query}".
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((booking) => {
              const customerName = booking.profiles?.full_name || booking.guests?.full_name || 'Guest';
              const customerEmail = booking.profiles?.email || booking.guests?.email || null;
              const customerPhone = booking.profiles?.phone_number || booking.guests?.phone_number || null;
              const start = new Date(booking.start_time);
              const isConfirming = confirmId === booking.id;
              const isCancelling = cancellingId === booking.id;

              return (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-800">{customerName}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          booking.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {booking.status}
                        </span>
                        {!booking.profiles && (
                          <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Guest</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{booking.services?.name} — {booking.stylists?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {customerEmail && <p className="text-xs text-gray-400 mt-0.5">✉ {customerEmail}</p>}
                      {customerPhone && <p className="text-xs text-gray-400">✆ {customerPhone}</p>}
                    </div>

                    <div className="shrink-0">
                      {isConfirming ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={isCancelling}
                            className="bg-red-600 text-white text-xs font-bold uppercase px-4 py-2 rounded hover:bg-red-700 transition disabled:opacity-50"
                          >
                            {isCancelling ? '...' : 'Confirm Cancel'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="border border-gray-200 text-gray-500 text-xs font-bold uppercase px-4 py-2 rounded hover:bg-gray-50 transition"
                          >
                            Back
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(booking.id)}
                          className="border border-red-200 text-red-500 text-xs font-bold uppercase px-4 py-2 rounded hover:bg-red-50 transition"
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
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('analytics');
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: 60, category: 'Cutting & Styling' });
  const [editingId, setEditingId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestBookingSuccess, setGuestBookingSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'reviews') fetchPendingReviews();
  }, [activeTab]);

  const fetchPendingReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reviews/pending`, { headers: authHeader });
      const data = await res.json();
      setPendingReviews(Array.isArray(data) ? data : []);
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
      } else {
        alert('Failed to approve review.');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
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
      setEditingId(null);
      setFormData({ name: '', price: '', duration: 60, category: 'Cutting & Styling' });
      setRefresh(p => p + 1);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete service?')) return;
    try {
      const res = await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE', headers: authHeader });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error && body.error.includes('bookings')) {
          alert('This service has bookings attached to it and cannot be deleted.');
        } else {
          alert(body.error || 'Failed to delete service.');
        }
        return;
      }
      setRefresh(p => p + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to delete service.');
    }
  };

  const handleGuestBooking = async (bookingData) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/guest`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(bookingData),
      });
      if (res.ok) {
        setShowGuestModal(false);
        setGuestBookingSuccess(true);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to create booking: ${err.error || res.status}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
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
    <div className="min-h-screen bg-gray-50 font-sans p-8">
      <header className="flex justify-between items-center mb-8 bg-white p-4 shadow-sm rounded-lg border-l-4 border-black">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">Admin Control Panel</h1>
          <p className="text-xs text-gray-500">Logged in as {user?.email}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/app')} className="text-sm bg-gray-100 px-4 py-2 rounded hover:bg-gray-200">← Back to Site</button>
          <button onClick={handleLogout} className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-100">Logout</button>
        </div>
      </header>

      <div className="flex gap-4 mb-8 border-b border-gray-200 pb-1 flex-wrap">
        {[
          { key: 'analytics', label: 'Overview & Stats' },
          { key: 'services', label: 'Service Menu' },
          { key: 'stylists', label: 'Stylists' },
          { key: 'loyalty', label: 'Loyalty & Vouchers' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'cancel', label: 'Cancel Booking' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`pb-2 px-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === key ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {label}
            {key === 'reviews' && pendingReviews.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingReviews.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in">
          <AdminAnalytics token={session?.access_token} />
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 flex justify-between items-center">
            <div>
              <h2 className="text-blue-900 font-bold text-lg">Operational Actions</h2>
              <p className="text-blue-700 text-sm">Manage walk-ins and offline clients</p>
            </div>
            <button
              onClick={() => setShowGuestModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded shadow font-bold hover:bg-blue-700 transition"
            >
              + New Shadow Booking
            </button>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="grid md:grid-cols-3 gap-8 animate-fade-in">
          <div className="md:col-span-1 bg-white p-6 rounded shadow-sm border border-gray-100 h-fit">
            <h2 className="font-bold mb-4">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full border p-2 rounded bg-gray-50"
                placeholder="Service Name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <select
                className="w-full border p-2 rounded bg-gray-50"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Cutting & Styling</option>
                <option>Colour & Balayage</option>
                <option>Treatments</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" className="border p-2 rounded bg-gray-50" placeholder="Price £"
                  value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required
                />
                <input
                  type="number" className="border p-2 rounded bg-gray-50" placeholder="Mins"
                  value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} required
                />
              </div>
              <button disabled={isSubmitting} className="w-full bg-black text-white p-2 rounded font-bold hover:bg-gray-800 disabled:opacity-50">
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && <button type="button" onClick={() => setEditingId(null)} className="w-full text-xs text-gray-500 mt-2">Cancel Edit</button>}
            </form>
          </div>
          <div className="md:col-span-2 space-y-6">
            {Object.entries(groupedServices).map(([cat, items]) => (
              <div key={cat} className="bg-white p-6 rounded shadow-sm border border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{cat}</h3>
                <div className="space-y-2">
                  {items.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100">
                      <div>
                        <span className="font-bold text-gray-800">{s.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{s.duration_minutes}m</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono">£{s.base_price}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditClick(s)} className="text-blue-500 hover:text-blue-700 text-sm">Edit</button>
                          <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 text-sm">×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
            <h2 className="font-bold text-lg uppercase tracking-widest">Pending Reviews</h2>
            <button onClick={fetchPendingReviews} className="text-xs text-gray-400 hover:text-black underline">Refresh</button>
          </div>
          {reviewsLoading ? (
            <div className="text-center text-gray-400 animate-pulse py-12">Loading...</div>
          ) : pendingReviews.length === 0 ? (
            <div className="bg-white rounded shadow-sm border border-gray-100 p-16 text-center text-gray-400">
              No pending reviews.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <div key={review.id} className="bg-white rounded shadow-sm border border-gray-100 p-6 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-gray-800">{review.profiles?.full_name || 'Customer'}</span>
                      <span className="text-xs text-gray-400">→ {review.stylists?.name}</span>
                      <span className="text-yellow-500 font-bold">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 max-w-xl">{review.comment}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">{new Date(review.created_at).toLocaleString('en-GB')}</p>
                  </div>
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold uppercase hover:bg-green-700 transition ml-4 shrink-0"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cancel' && (
        <div className="animate-fade-in">
          <CancelBooking authHeader={authHeader} />
        </div>
      )}

      {showGuestModal && <GuestBookingModal onClose={() => setShowGuestModal(false)} onConfirm={handleGuestBooking} />}

      {guestBookingSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm p-8 text-center shadow-2xl rounded-lg">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
              <span className="text-xl text-green-600">✓</span>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-widest text-gray-800 mb-1">Guest Booking Made</h2>
            <p className="text-sm text-gray-500 mb-6">The booking has been confirmed and the customer will receive an email if one was provided.</p>
            <button
              onClick={() => setGuestBookingSuccess(false)}
              className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}