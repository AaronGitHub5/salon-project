import { useState, useEffect } from 'react';

export default function BookingModal({ service, onClose, onConfirm }) {
  const [stylists, setStylists] = useState([]);
  const [selectedStylist, setSelectedStylist] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Load Stylists when modal opens
  useEffect(() => {
    fetch('http://localhost:5000/api/stylists')
      .then(res => res.json())
      .then(data => setStylists(data));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Combine Date + Time
    const fullDateTime = `${date}T${time}:00`;
    onConfirm(selectedStylist, fullDateTime);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white p-8 w-full max-w-md shadow-2xl relative">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black font-bold"
        >
          ✕
        </button>

        <h2 className="text-xl font-light uppercase tracking-widest mb-2">Book Appointment</h2>
        <p className="text-sm font-bold mb-6">{service.name} (£{service.base_price})</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Stylist Dropdown */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Stylist</label>
            <select 
              required 
              className="w-full border p-3 bg-gray-50"
              onChange={e => setSelectedStylist(e.target.value)}
            >
              <option value="">-- Choose Stylist --</option>
              {stylists.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Date</label>
            <input 
              type="date" 
              required 
              className="w-full border p-3 bg-gray-50"
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Time Picker */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Time</label>
            <select 
              required 
              className="w-full border p-3 bg-gray-50"
              onChange={e => setTime(e.target.value)}
            >
              <option value="">-- Choose Time --</option>
              <option value="09:00">09:00</option>
              <option value="10:00">10:00</option>
              <option value="11:00">11:00</option>
              <option value="12:00">12:00</option>
              <option value="13:00">13:00</option>
              <option value="14:00">14:00</option>
              <option value="15:00">15:00</option>
              <option value="16:00">16:00</option>
            </select>
          </div>

          <button className="w-full bg-black text-white p-4 uppercase tracking-widest font-bold text-xs hover:bg-gray-800 transition mt-4">
            Confirm Booking
          </button>
        </form>
      </div>
    </div>
  );
}