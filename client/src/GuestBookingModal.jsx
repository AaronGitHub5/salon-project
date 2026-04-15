import { useState, useEffect, useRef } from 'react';
import { useToast } from './Notifications';
import API_URL from './config';

export default function GuestBookingModal({ onClose, onConfirm, token }) {
  const toast = useToast();
  const [stylists, setStylists] = useState([]);
  const [services, setServices] = useState([]);

  // Customer search (Step 0)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [mode, setMode] = useState('search'); // 'search' | 'guest' | 'customer'
  const searchTimer = useRef(null);

  // Guest details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Booking
  const [serviceId, setServiceId] = useState('');
  const [selectedStylist, setSelectedStylist] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(null);
  const [isPeak, setIsPeak] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allTimeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  useEffect(() => {
    fetch(`${API_URL}/api/stylists`).then(r => r.json()).then(setStylists);
    fetch(`${API_URL}/api/services`).then(r => r.json()).then(setServices);
  }, []);

  // Debounced customer search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/profiles/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Customer search failed:', err);
      }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, token]);

  // Fetch available slots when stylist + date + service all selected
  useEffect(() => {
    if (selectedStylist && selectedDate && serviceId) {
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedTime('');
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      fetch(`${API_URL}/api/availability/${selectedStylist}/${dateStr}?serviceId=${serviceId}`)
        .then(res => res.json())
        .then(data => {
          if (data.available && data.slots) {
            const times = data.slots.map(s => s.start);
            setAvailableSlots(times);
          }
          setIsLoadingSlots(false);
        })
        .catch(err => { console.error(err); setIsLoadingSlots(false); });
    }
  }, [selectedStylist, selectedDate, serviceId]);

  // Calculate display price with peak surcharge
  useEffect(() => {
    const service = services.find(s => s.id == serviceId);
    if (!service) { setDisplayPrice(null); return; }

    let price = parseFloat(service.base_price);
    let peakActive = false;

    if (selectedStylist) {
      const stylist = stylists.find(s => s.id == selectedStylist);
      if (stylist?.price_multiplier) price = price * stylist.price_multiplier;
    }
    if (selectedDate && selectedStylist) {
      const stylist = stylists.find(s => s.id == selectedStylist);
      const peakDays = stylist?.peak_days ?? [5, 6];
      const peakHourStart = stylist?.peak_hour_start ?? 17;
      const peakPercent = stylist?.peak_surcharge_percent ?? 15;
      const day = selectedDate.getDay();
      const isPeakDay = peakDays.includes(day);
      let isEvening = false;
      if (selectedTime) {
        const hour = parseInt(selectedTime.split(':')[0]);
        if (hour >= peakHourStart) isEvening = true;
      }
      if (isPeakDay || isEvening) {
        price = price * (1 + peakPercent / 100);
        peakActive = true;
      }
    }
    setDisplayPrice(price.toFixed(2));
    setIsPeak(peakActive);
  }, [serviceId, selectedStylist, selectedDate, selectedTime, services, stylists]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setMode('customer');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSkipToGuest = () => {
    setMode('guest');
    setSelectedCustomer(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBackToSearch = () => {
    setMode('search');
    setSelectedCustomer(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setServiceId('');
    setSelectedStylist('');
    setSelectedDate(null);
    setSelectedTime('');
    setAvailableSlots([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serviceId || !selectedStylist || !selectedDate || !selectedTime) return;
    if (mode === 'guest' && !guestName) return;

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const startTime = `${year}-${month}-${day}T${selectedTime}:00`;

    if (mode === 'customer' && selectedCustomer) {
      // Book as existing customer via POST /api/bookings with admin flag
      setIsSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/api/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer_id: selectedCustomer.id,
            service_id: serviceId,
            stylist_id: selectedStylist,
            start_time: startTime,
            booked_by_admin: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Booking failed');
        onConfirm({
          _customerBooking: true,
          customerName: selectedCustomer.full_name,
          customerEmail: selectedCustomer.email,
          ...data,
        });
      } catch (err) {
        toast.error(err.message);
      }
      setIsSubmitting(false);
    } else {
      // Original guest flow — handled by AdminDashboard's onConfirm
      onConfirm({
        guestName,
        guestPhone: guestPhone || null,
        guestEmail: guestEmail || null,
        serviceId,
        stylistId: selectedStylist,
        startTime,
      });
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const isToday = (date) => date && date.toDateString() === new Date().toDateString();

  const isPastDate = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isPastTime = (slot) => {
    if (!selectedDate || !isToday(selectedDate)) return false;
    const [slotHour, slotMin] = slot.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(slotHour, slotMin, 0, 0);
    return slotDate <= new Date();
  };

  const isSelected = (date) => date && selectedDate && date.toDateString() === selectedDate.toDateString();
  const formatMonth = (date) => date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const selectedService = services.find(s => s.id == serviceId);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="min-h-full flex items-start justify-center p-4 sm:items-center">
        <div className="bg-white w-full max-w-md shadow-2xl relative my-4 border-t-4 border-blue-600">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 p-6 border-b bg-gray-50">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl">✕</button>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">
                  {mode === 'customer' ? 'Customer Booking' : 'Shadow Booking'}
                </p>
                <h2 className="text-lg font-semibold">{selectedService ? selectedService.name : 'New Walk-in'}</h2>
                {selectedService && (
                  <p className="text-sm text-gray-500">{selectedService.category} · {selectedService.duration_minutes} Mins</p>
                )}
              </div>
              {displayPrice && (
                <div className="text-right pr-8">
                  <p className={`text-2xl font-bold ${isPeak ? 'text-orange-600' : 'text-black'}`}>
                    £{displayPrice}
                  </p>
                  {isPeak && (
                    <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded">
                      ⚡ Peak (+{(() => { const s = stylists.find(s => s.id == selectedStylist); return s?.peak_surcharge_percent ?? 15; })()}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Step 0 — Customer Search */}
            {mode === 'search' && (
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <label className="block text-xs font-bold uppercase tracking-widest text-green-700 mb-3">
                  Find Existing Customer
                </label>
                <input
                  type="text"
                  placeholder="Search by name, email or phone..."
                  className="border p-2 w-full rounded text-sm focus:outline-green-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {isSearching && (
                  <p className="text-xs text-green-600 mt-2 animate-pulse">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left p-2 rounded hover:bg-green-100 transition flex justify-between items-center text-sm border border-transparent hover:border-green-300"
                      >
                        <div>
                          <span className="font-medium">{c.full_name}</span>
                          {c.email && <span className="text-gray-500 ml-2 text-xs">{c.email}</span>}
                        </div>
                        {c.phone_number && <span className="text-xs text-gray-400">{c.phone_number}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">No customers found.</p>
                )}
                <button
                  type="button"
                  onClick={handleSkipToGuest}
                  className="mt-4 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Skip — book as new guest instead
                </button>
              </div>
            )}

            {/* Selected customer banner */}
            {mode === 'customer' && selectedCustomer && (
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <div className="flex justify-between items-start">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-green-700 mb-1">
                      Booking For Customer
                    </label>
                    <p className="font-semibold text-sm">{selectedCustomer.full_name}</p>
                    {selectedCustomer.email && <p className="text-xs text-gray-600">{selectedCustomer.email}</p>}
                    {selectedCustomer.phone_number && <p className="text-xs text-gray-600">{selectedCustomer.phone_number}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToSearch}
                    className="text-xs text-gray-500 hover:text-black underline"
                  >
                    Change
                  </button>
                </div>
                <p className="text-[10px] text-green-600 mt-2">
                  ✓ Loyalty stamps and reminders will apply to this account.
                </p>
              </div>
            )}

            {/* Guest Details — only in guest mode */}
            {mode === 'guest' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <div className="flex justify-between items-start mb-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-blue-600">
                    Guest Details
                  </label>
                  <button
                    type="button"
                    onClick={handleBackToSearch}
                    className="text-xs text-gray-500 hover:text-black underline"
                  >
                    ← Search customers
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    required
                    placeholder="Client Name *"
                    className="border p-2 w-full rounded text-sm focus:outline-black"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      className="border p-2 w-full rounded text-sm focus:outline-black"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      className="border p-2 w-full rounded text-sm focus:outline-black"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Only show booking steps if customer selected or in guest mode */}
            {(mode === 'customer' || mode === 'guest') && (
              <>
                {/* Step 1 — Service */}
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">1</span>
                    Select Service
                  </label>
                  <select
                    required
                    value={serviceId}
                    onChange={(e) => { setServiceId(e.target.value); setSelectedTime(''); setAvailableSlots([]); }}
                    className="w-full border border-gray-300 p-3 bg-white text-sm"
                  >
                    <option value="">Choose a service...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} — £{s.base_price}</option>
                    ))}
                  </select>
                </div>

                {/* Step 2 — Stylist */}
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">2</span>
                    Select Stylist
                  </label>
                  <select
                    required
                    value={selectedStylist}
                    onChange={(e) => { setSelectedStylist(e.target.value); setSelectedTime(''); setAvailableSlots([]); }}
                    className="w-full border border-gray-300 p-3 bg-white text-sm"
                  >
                    <option value="">Choose a stylist...</option>
                    {stylists.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Step 3 — Date */}
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">3</span>
                    Choose Date
                  </label>
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">‹</button>
                    <span className="text-sm font-semibold uppercase tracking-wider">{formatMonth(currentMonth)}</span>
                    <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {weekDays.map(day => (
                      <div key={day} className="text-center text-xs text-gray-400 py-1">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((date, idx) => {
                      const dayNum = date ? date.getDay() : -1;
                      const stylistObj = stylists.find(s => s.id == selectedStylist);
                      const peakDays = stylistObj?.peak_days ?? [5, 6];
                      const isPeakDay = peakDays.includes(dayNum);
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!date || isPastDate(date)}
                          onClick={() => date && !isPastDate(date) && setSelectedDate(date)}
                          className={`
                            aspect-square flex flex-col items-center justify-center text-sm rounded relative
                            ${!date ? 'invisible' : ''}
                            ${isPastDate(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                            ${isSelected(date) ? 'bg-black text-white hover:bg-black' : ''}
                            ${isToday(date) && !isSelected(date) ? 'border border-black' : ''}
                            ${isPeakDay && !isPastDate(date) && !isSelected(date) ? 'bg-orange-50 text-orange-800' : ''}
                          `}
                        >
                          {date?.getDate()}
                          {isPeakDay && !isPastDate(date) && (
                            <span className="w-1 h-1 bg-orange-500 rounded-full absolute bottom-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 4 — Time */}
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">4</span>
                    Pick a Time
                  </label>
                  {!serviceId ? (
                    <p className="text-xs text-gray-400 p-2 italic">Please select a service first.</p>
                  ) : !selectedStylist ? (
                    <p className="text-xs text-gray-400 p-2 italic">Please select a stylist first.</p>
                  ) : !selectedDate ? (
                    <p className="text-xs text-gray-400 p-2 italic">Please select a date first.</p>
                  ) : isLoadingSlots ? (
                    <p className="text-xs text-blue-500 p-2 animate-pulse">Checking availability...</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {allTimeSlots.map(slot => {
                        const hour = parseInt(slot.split(':')[0]);
                        const stylistObj = stylists.find(s => s.id == selectedStylist);
                        const peakHourStart = stylistObj?.peak_hour_start ?? 17;
                        const isPeakSlot = hour >= peakHourStart;
                        const isAvailable = availableSlots.includes(slot) && !isPastTime(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedTime(slot)}
                            className={`
                              py-2 px-3 text-sm border transition relative
                              ${!isAvailable
                                ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                                : selectedTime === slot
                                  ? 'bg-black text-white border-black'
                                  : 'border-gray-300 hover:border-black'
                              }
                            `}
                          >
                            {slot}
                            {isPeakSlot && isAvailable && selectedTime !== slot && (
                              <span className="absolute top-0 right-1 text-orange-500 text-[10px] font-bold">⚡</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !serviceId || !selectedStylist || !selectedDate || !selectedTime ||
                    (mode === 'guest' && !guestName)
                  }
                  className="w-full bg-blue-600 text-white p-4 uppercase tracking-widest font-semibold text-xs hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Creating...'
                    : displayPrice
                      ? `Create Booking — £${displayPrice}`
                      : 'Create Booking'
                  }
                </button>
              </>
            )}

            {/* iOS home bar spacer */}
            <div className="h-4" />
          </form>
        </div>
      </div>
    </div>
  );
}