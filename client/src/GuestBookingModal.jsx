import { useState, useEffect } from 'react';

export default function GuestBookingModal({ onClose, onConfirm }) {
  const [stylists, setStylists] = useState([]);
  const [services, setServices] = useState([]);
  
  // Guest Details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState(''); // <--- NEW STATE
  
  // Booking Details
  const [serviceId, setServiceId] = useState('');
  const [stylistId, setStylistId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Load Data
  useEffect(() => {
    fetch('http://localhost:5000/api/stylists').then(r => r.json()).then(setStylists);
    fetch('http://localhost:5000/api/services').then(r => r.json()).then(setServices);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      guestName,
      guestPhone,
      guestEmail: guestEmail || null, // <--- Send NULL if empty string
      serviceId,
      stylistId,
      startTime: `${date}T${time}:00`
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
      <div className="bg-white p-8 w-full max-w-lg shadow-2xl relative border-t-4 border-blue-600 animate-fade-in rounded-lg">
        <button onClick={onClose} className="absolute top-4 right-4 font-bold text-xl text-gray-400 hover:text-black">✕</button>
        
        <h2 className="text-xl font-bold mb-1 text-gray-800">Shadow Booking</h2>
        <p className="text-xs text-gray-500 mb-6 uppercase tracking-widest">Create Walk-in Appointment</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Guest Info Section */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <label className="block text-xs font-bold uppercase text-blue-600 mb-3">Guest Details</label>
            <div className="space-y-3">
              <input required placeholder="Client Name *" className="border p-2 w-full rounded"
                onChange={e => setGuestName(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Phone (Optional)" className="border p-2 w-full rounded"
                  onChange={e => setGuestPhone(e.target.value)} />
                <input type="email" placeholder="Email (Optional)" className="border p-2 w-full rounded"
                  onChange={e => setGuestEmail(e.target.value)} /> 
              </div>
            </div>
          </div>

          {/* Service Selection */}
          <select required className="w-full border p-3 rounded" onChange={e => setServiceId(e.target.value)}>
            <option value="">-- Select Service --</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} (£{s.base_price})</option>)}
          </select>

          {/* Stylist Selection */}
          <select required className="w-full border p-3 rounded" onChange={e => setStylistId(e.target.value)}>
            <option value="">-- Select Stylist --</option>
            {stylists.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
          </select>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <input type="date" required className="border p-3 rounded" onChange={e => setDate(e.target.value)} />
            <select required className="border p-3 rounded" onChange={e => setTime(e.target.value)}>
              <option value="">Time</option>
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

          <button className="w-full bg-blue-600 text-white p-4 font-bold hover:bg-blue-700 transition rounded shadow-lg uppercase tracking-wide text-sm">
            Create Booking
          </button>
        </form>
      </div>
    </div>
  );
}