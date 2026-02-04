import { useState, useEffect } from "react";
import API_URL from './config';

export default function BookingModal({ service, onClose, onConfirm }) {
  const [stylists, setStylists] = useState([]);
  
  // Form State
  const [selectedStylist, setSelectedStylist] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  
  // UI State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]); 
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  // DYNAMIC PRICING STATE
  const [displayPrice, setDisplayPrice] = useState(service.base_price);
  const [isPeak, setIsPeak] = useState(false);

  const allTimeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

  // Fetch Stylists on mount
  useEffect(() => {
    fetch(`${API_URL}/api/stylists`)
      .then((res) => res.json())
      .then((data) => setStylists(data));
  }, []);

  // AVAILABILITY CHECKER
  useEffect(() => {
    if (selectedStylist && selectedDate) {
      setIsLoadingSlots(true);
      setAvailableSlots([]); 
      setSelectedTime("");

      const dateStr = selectedDate.toISOString().split('T')[0]; 
      
      // Call backend to find free slots
      fetch(`${API_URL}/api/availability/${selectedStylist}/${dateStr}?serviceId=${service.id}`)
        .then(res => res.json())
        .then(data => {
           if (data.available && data.slots) {
             const times = data.slots.map(s => {
               const d = new Date(s.start);
               return d.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});
             });
             setAvailableSlots(times);
           }
           setIsLoadingSlots(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingSlots(false);
        });
    }
  }, [selectedStylist, selectedDate, service.id]);

  // REAL-TIME PRICE CALCULATOR
  useEffect(() => {
    let price = parseFloat(service.base_price);
    let peakActive = false;

    if (selectedStylist) {
      const stylist = stylists.find(s => s.id == selectedStylist); 
      if (stylist && stylist.price_multiplier) {
        price = price * stylist.price_multiplier;
      }
    }

    if (selectedDate) {
      const day = selectedDate.getDay(); 
      // PEAK LOGIC: Friday (5) or Saturday (6)
      const isPeakDay = day === 5 || day === 6;
      
      let isEvening = false;
      if (selectedTime) {
        const hour = parseInt(selectedTime.split(':')[0]);
        if (hour >= 17) isEvening = true; 
      }

      if (isPeakDay || isEvening) {
        price = price * 1.15; 
        peakActive = true;
      }
    }

    setDisplayPrice(price.toFixed(2));
    setIsPeak(peakActive);

  }, [selectedStylist, selectedDate, selectedTime, service.base_price, stylists]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStylist || !selectedDate || !selectedTime) return;

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const fullDateTime = `${year}-${month}-${day}T${selectedTime}:00`;

    onConfirm(selectedStylist, fullDateTime);
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-md shadow-2xl relative">
        
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl">✕</button>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{service.name}</h2>
              <p className="text-sm text-gray-500">
                {service.category} · {service.duration_minutes} Mins
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${isPeak ? 'text-orange-600' : 'text-black'}`}>
                £{displayPrice}
              </p>
              {isPeak && (
                 <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded">
                   ⚡ Peak Time (+15%)
                 </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Stylist */}
          <div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
              <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">1</span>
              Select Stylist
            </label>
            <select
              required
              value={selectedStylist}
              onChange={(e) => setSelectedStylist(e.target.value)}
              className="w-full border border-gray-300 p-3 bg-white text-sm"
            >
              <option value="">Choose a stylist...</option>
              {stylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Calendar */}
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
              {weekDays.map((day) => <div key={day} className="text-center text-xs text-gray-400 py-1">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((date, idx) => {
                  const dayNum = date ? date.getDay() : -1;
                  // 5 = Friday, 6 = Saturday
                  const isPeakDay = dayNum === 5 || dayNum === 6;
                  
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
                        <span className="w-1 h-1 bg-orange-500 rounded-full absolute bottom-1"></span>
                      )}
                    </button>
                  )
              })}
            </div>
          </div>

          {/* Step 3: Time Slots */}
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
                  const isPeakSlot = hour >= 17;
                  const isAvailable = availableSlots.includes(slot);

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
                  )
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
        </form>
      </div>
    </div>
  );
}