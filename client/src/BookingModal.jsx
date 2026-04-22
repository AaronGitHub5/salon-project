import { useState, useEffect } from "react";
import API_URL from './config';

export default function BookingModal({ service, onClose, onConfirm, isRescheduling = false, existingStylistId = null }) {
  const [stylists, setStylists] = useState([]);
  const [selectedStylist, setSelectedStylist] = useState(existingStylistId ? String(existingStylistId) : "");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(service.base_price);
  const [isPeak, setIsPeak] = useState(false);

  const allTimeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

  useEffect(() => {
    fetch(`${API_URL}/api/stylists`)
      .then((res) => res.json())
      .then((data) => setStylists(data));
  }, []);

  useEffect(() => {
    if (selectedStylist && selectedDate) {
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedTime("");
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      fetch(`${API_URL}/api/availability/${selectedStylist}/${dateStr}?serviceId=${service.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.available && data.slots) {
            setAvailableSlots(data.slots.map(s => s.start));
          }
          setIsLoadingSlots(false);
        })
        .catch(err => { console.error(err); setIsLoadingSlots(false); });
    }
  }, [selectedStylist, selectedDate, service.id]);

  useEffect(() => {
    let price = parseFloat(service.base_price);
    let peakActive = false;
    if (selectedStylist) {
      const stylist = stylists.find(s => s.id == selectedStylist);
      if (stylist?.price_multiplier) price = price * stylist.price_multiplier;
    }
    if (selectedDate) {
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
  }, [selectedStylist, selectedDate, selectedTime, service.base_price, stylists]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStylist || !selectedDate || !selectedTime) return;
    // Build a Date in the user's local timezone, then serialise as UTC ISO.
    // This avoids timezone-guessing on the server: "09:00 local" always arrives
    // as the correct UTC instant regardless of where the server is running.
    const [hour, minute] = selectedTime.split(':').map(Number);
    const localDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hour,
      minute,
      0
    );
    onConfirm(selectedStylist, localDate.toISOString());
  };

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

  const isToday = (date) => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  };

  const isPastDate = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // FIX 1: block slots that have already passed today
  const isPastTime = (slot) => {
    if (!selectedDate || !isToday(selectedDate)) return false;
    const [slotHour, slotMin] = slot.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(slotHour, slotMin, 0, 0);
    return slotDate <= new Date();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const formatMonth = (date) =>
    date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    // FIX 2: overflow-y-auto on the overlay itself — works on iOS Safari
    // inner wrapper uses min-h-full + flex so modal centres on desktop but top-aligns on short mobile screens
    <div
      className="fixed inset-0 bg-black/50 z-[100] overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="min-h-full flex items-start justify-center p-4 sm:items-center">
        <div className="bg-white w-full max-w-md shadow-2xl relative my-4">

          {/* Sticky header — price + close always visible while scrolling */}
          <div className="sticky top-0 z-10 p-6 border-b bg-gray-50">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl">✕</button>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{service.name}</h2>
                <p className="text-sm text-gray-500">{service.category} · {service.duration_minutes} Mins</p>
              </div>
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
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Step 1 */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
                <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">1</span>
                {isRescheduling ? 'Stylist (locked)' : 'Select Stylist'}
              </label>
              <select
                required
                disabled={isRescheduling}
                value={selectedStylist}
                onChange={(e) => setSelectedStylist(e.target.value)}
                className={`w-full border border-gray-300 p-3 text-sm ${isRescheduling ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
              >
                <option value="">Choose a stylist...</option>
                {stylists.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Step 2 */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
                <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">2</span>
                Choose Date
              </label>
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">‹</button>
                <span className="text-sm font-semibold uppercase tracking-wider">{formatMonth(currentMonth)}</span>
                <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs text-gray-400 py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, idx) => {
                  const dayNum = date ? date.getDay() : -1;
                  const selectedStylistObj = stylists.find(s => s.id == selectedStylist);
                  const peakDays = selectedStylistObj?.peak_days ?? [5, 6];
                  const isPeakDay = peakDays.includes(dayNum);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!date || isPastDate(date)}
                      onClick={() => date && !isPastDate(date) && setSelectedDate(date)}
                      className={`
                        aspect-square flex flex-col items-center justify-center text-sm rounded relative
                        ${!date ? "invisible" : ""}
                        ${isPastDate(date) ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}
                        ${isSelected(date) ? "bg-black text-white hover:bg-black" : ""}
                        ${isToday(date) && !isSelected(date) ? "border border-black" : ""}
                        ${isPeakDay && !isPastDate(date) && !isSelected(date) ? "bg-orange-50 text-orange-800" : ""}
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

            {/* Step 3 */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
                <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">3</span>
                Pick a Time
              </label>
              {!selectedDate ? (
                <p className="text-xs text-gray-400 p-2 italic">Please select a date first.</p>
              ) : isLoadingSlots ? (
                <p className="text-xs text-blue-500 p-2 animate-pulse">Checking stylist availability...</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {allTimeSlots.map((slot) => {
                    const hour = parseInt(slot.split(':')[0]);
                    const selectedStylistObj = stylists.find(s => s.id == selectedStylist);
                    const peakHourStart = selectedStylistObj?.peak_hour_start ?? 17;
                    const isPeakSlot = hour >= peakHourStart;
                    // Unavailable if backend says booked OR time has already passed today
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
                            ? "bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through"
                            : selectedTime === slot
                              ? "bg-black text-white border-black"
                              : "border-gray-300 hover:border-black"
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
              disabled={!selectedStylist || !selectedDate || !selectedTime}
              className="w-full bg-black text-white p-4 uppercase tracking-widest font-semibold text-xs hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Confirm Booking (£{displayPrice})
            </button>

            {/* iOS home bar spacer */}
            <div className="h-4" />
          </form>
        </div>
      </div>
    </div>
  );
}