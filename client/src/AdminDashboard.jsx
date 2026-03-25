import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import GuestBookingModal from './GuestBookingModal';
import AdminAnalytics from './AdminAnalytics';
import API_URL from './config';

export default function AdminDashboard({ onBack }) {
  const { user, session, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState('analytics');
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: 60, category: 'Cutting & Styling' });
  const [editingId, setEditingId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reviews state
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
    if (activeTab === 'reviews') {
      fetchPendingReviews();
    }
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
      await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE', headers: authHeader });
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
        alert('Shadow Booking Created!');
        setShowGuestModal(false);
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-8">
      <header className="flex justify-between items-center mb-8 bg-white p-4 shadow-sm rounded-lg border-l-4 border-black">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">Admin Control Panel</h1>
          <p className="text-xs text-gray-500">Logged in as {user?.email}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="text-sm bg-gray-100 px-4 py-2 rounded hover:bg-gray-200">← Back to Site</button>
          <button onClick={signOut} className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-100">Logout</button>
        </div>
      </header>

      <div className="flex gap-4 mb-8 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-2 px-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'analytics' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-2 px-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'services' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Service Menu
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-2 px-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'reviews' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Reviews
          {pendingReviews.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingReviews.length}</span>
          )}
        </button>
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

      {showGuestModal && <GuestBookingModal onClose={() => setShowGuestModal(false)} onConfirm={handleGuestBooking} />}
    </div>
  );
}