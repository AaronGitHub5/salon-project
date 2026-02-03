import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import GuestBookingModal from './GuestBookingModal';

export default function AdminDashboard({ onBack }) {
  const { user, signOut } = useAuth();

  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: 60,
    category: 'Cutting & Styling',
  });
  const [editingId, setEditingId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Services
  useEffect(() => {
    fetch('http://localhost:5000/api/services')
      .then((res) => res.json())
      .then((data) => setServices(data))
      .catch((err) => console.error('Error fetching services:', err));
  }, [refresh]);

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const price = parseFloat(formData.price);
    const duration = parseInt(formData.duration);

    if (!formData.name || !formData.name.trim()) {
      alert('Please enter a service name');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(duration) || duration < 1) {
      alert('Please enter a valid duration');
      setIsSubmitting(false);
      return;
    }

    const url = editingId
      ? `http://localhost:5000/api/services/${editingId}`
      : 'http://localhost:5000/api/services';

    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          base_price: price,
          duration_minutes: duration,
          category: formData.category,
        }),
      });

      if (response.ok) {
        alert(editingId ? 'Service Updated!' : 'Service Added!');
        setEditingId(null);
        setFormData({
          name: '',
          price: '',
          duration: 60,
          category: 'Cutting & Styling',
        });
        setRefresh((prev) => prev + 1);
      } else {
        const errorData = await response.json();
        alert('Error: ' + (errorData.error || 'Failed to save service'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Is the server running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.base_price.toString(),
      duration: service.duration_minutes.toString(),
      category: service.category || 'Other',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      price: '',
      duration: 60,
      category: 'Cutting & Styling',
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/services/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Service Deleted!');
        setRefresh((prev) => prev + 1);
      } else {
        const errorData = await response.json();
        alert('Error: ' + (errorData.error || 'Failed to delete'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Network error.');
    }
  };

  const handleGuestBooking = async (bookingData) => {
    try {
      const response = await fetch('http://localhost:5000/api/bookings/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Shadow Booking Confirmed!\nGuest: ${data.guest.full_name}\nPrice: £${data.price}`
        );
        setShowGuestModal(false);
      } else {
        alert('Error: ' + (data.error || 'Failed to create booking'));
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Network error.');
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Group services by category for display
  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-100 font-sans p-8">
      <header className="flex justify-between items-center mb-8 bg-white p-4 shadow-sm rounded-lg border-l-4 border-black">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
            Admin Control Panel
          </h1>
          <p className="text-xs text-gray-500">Logged in as {user?.email}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            ← Back to Site
          </button>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-100 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* LEFT COLUMN */}
        <div className="md:col-span-1 space-y-6">
          {/* Shadow Booking Card (FR-16) */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm">
            <h2 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
              <span>👤</span> Offline Client?
            </h2>
            <p className="text-xs text-blue-600 mb-4">
              Book for elderly or walk-in clients without an account
            </p>
            <button
              onClick={() => setShowGuestModal(true)}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded shadow font-bold hover:bg-blue-700 transition"
            >
              + Create Shadow Booking
            </button>
          </div>

          {/* Add/Edit Service Form (FR-02) */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold">
                {editingId ? '✏️ Edit Service' : '➕ Add New Service'}
              </h2>
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="text-xs text-red-500 underline"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full Head Highlights"
                  className="w-full border p-2 rounded bg-gray-50 mt-1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Category
                </label>
                <select
                  className="w-full border p-2 rounded bg-gray-50 mt-1"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <option value="Cutting & Styling">Cutting & Styling</option>
                  <option value="Colour & Balayage">Colour & Balayage</option>
                  <option value="Treatments">Treatments</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Price (£)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="95"
                    className="w-full border p-2 rounded bg-gray-50 mt-1"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="150"
                    className="w-full border p-2 rounded bg-gray-50 mt-1"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-white p-3 rounded font-bold transition disabled:opacity-50 ${
                  editingId
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-black hover:bg-gray-800'
                }`}
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingId
                    ? 'Update Service'
                    : 'Create Service'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN - Service List */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4">
            Current Menu ({services.length} services)
          </h2>

          <div className="overflow-y-auto max-h-[600px] space-y-6">
            {Object.keys(groupedServices).length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No services yet. Add one using the form.
              </p>
            ) : (
              Object.entries(groupedServices).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 border-b pb-1">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className={`flex justify-between items-center p-3 border rounded transition ${
                          editingId === s.id
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-gray-800">
                            {s.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {s.duration_minutes} mins
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-green-600">
                            £{s.base_price}
                          </span>
                          <button
                            onClick={() => handleEditClick(s)}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shadow Booking Modal */}
      {showGuestModal && (
        <GuestBookingModal
          onClose={() => setShowGuestModal(false)}
          onConfirm={handleGuestBooking}
        />
      )}
    </div>
  );
}