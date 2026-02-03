import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import GuestBookingModal from './GuestBookingModal';

export default function AdminDashboard({ onBack }) {
  const { user, signOut } = useAuth();
  
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: 60, category: 'Cutting' });
  const [editingId, setEditingId] = useState(null); 
  const [refresh, setRefresh] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Fetch Services
  useEffect(() => {
    fetch('http://localhost:5000/api/services')
      .then(res => res.json())
      .then(data => setServices(data));
  }, [refresh]);

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingId 
      ? `http://localhost:5000/api/services/${editingId}`
      : 'http://localhost:5000/api/services';
      
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        base_price: formData.price,
        duration_minutes: formData.duration,
        category: formData.category
      })
    });

    if (response.ok) {
      alert(editingId ? "Service Updated!" : "Service Added!");
      setEditingId(null);
      setFormData({ name: '', price: '', duration: 60, category: 'Cutting' });
      setRefresh(prev => prev + 1);
    }
  };

  // Populate form for Editing
  const handleEditClick = (service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.base_price,
      duration: service.duration_minutes,
      category: service.category
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', price: '', duration: 60, category: 'Cutting' });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    await fetch(`http://localhost:5000/api/services/${id}`, { method: 'DELETE' });
    setRefresh(prev => prev + 1);
  };

  // Shadow Booking Logic
  const handleGuestBooking = async (bookingData) => {
    const response = await fetch('http://localhost:5000/api/bookings/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    if (response.ok) {
      alert("Shadow Booking Confirmed!");
      setShowGuestModal(false);
    } else {
      alert("Error creating booking");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans p-8">
      <header className="flex justify-between items-center mb-8 bg-white p-4 shadow-sm rounded-lg border-l-4 border-black">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">Admin Control Panel</h1>
          <p className="text-xs text-gray-500">Logged in as {user?.email}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded">Back to Site</button>
          <button onClick={signOut} className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded font-bold">Logout</button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Actions */}
        <div className="md:col-span-1 space-y-8">
          
          {/* Shadow Booking Button */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 shadow-sm text-center">
            <h2 className="text-blue-800 font-bold mb-2">Offline Client?</h2>
            <button onClick={() => setShowGuestModal(true)} className="w-full bg-blue-600 text-white px-6 py-3 rounded shadow font-bold hover:bg-blue-700">
              + Create Shadow Booking
            </button>
          </div>

          {/* Add/Edit Service Form */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
              {editingId && <button onClick={handleCancelEdit} className="text-xs text-red-500 underline">Cancel</button>}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Service Name" className="w-full border p-2 rounded bg-gray-50" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <select className="w-full border p-2 rounded bg-gray-50" 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="Cutting & Styling">Cutting & Styling</option>
                <option value="Colour & Balayage">Colour & Balayage</option>
                <option value="Treatments">Treatments</option>
                <option value="Other">Other</option>
              </select>

              <div className="flex gap-2">
                <input required type="number" placeholder="Price (£)" className="w-1/2 border p-2 rounded bg-gray-50" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})} />
                <input required type="number" placeholder="Mins" className="w-1/2 border p-2 rounded bg-gray-50"
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})} />
              </div>

              <button className={`w-full text-white p-3 rounded font-bold transition ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-black hover:bg-gray-800'}`}>
                {editingId ? 'Update Service' : 'Save Service'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: List */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4">Current Menu ({services.length})</h2>
          <div className="overflow-y-auto max-h-[600px] pr-2 space-y-2">
            {services.map(s => (
              <div key={s.id} className={`flex justify-between items-center p-4 border rounded transition ${editingId === s.id ? 'bg-orange-50 border-orange-300' : 'bg-white hover:bg-gray-50'}`}>
                <div>
                  <p className="font-bold text-gray-800">{s.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-600 uppercase">{s.category}</span>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">{s.duration_minutes}m</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-lg text-green-600">£{s.base_price}</span>
                  <button onClick={() => handleEditClick(s)} className="text-blue-500 hover:text-blue-700 p-2 text-xl" title="Edit">✎</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 p-2 text-xl" title="Delete">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL POPUP */}
      {showGuestModal && (
        <GuestBookingModal 
          onClose={() => setShowGuestModal(false)}
          onConfirm={handleGuestBooking}
        />
      )}
    </div>
  );
}