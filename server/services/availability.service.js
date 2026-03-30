const availabilityDao = require('../daos/availability.dao');
const servicesDao = require('../daos/services.dao');

async function getAvailableSlots(stylistId, date, serviceId) {
  let serviceDuration = 60; // default fallback

  if (serviceId) {
    const services = await servicesDao.getAllServices();
    const service = services.find((s) => s.id === parseInt(serviceId));
    if (service) serviceDuration = service.duration_minutes;
  }

  const dayOfWeek = new Date(date).getDay();
  const shift = await availabilityDao.getStylistShift(stylistId, dayOfWeek);

  if (!shift) {
    return { available: false, slots: [], message: 'Stylist off duty' };
  }

  const bookings = await availabilityDao.getBookingsForDay(stylistId, date);

  const slots = [];
  const [sH, sM] = shift.start_time.split(':');
  const [eH, eM] = shift.end_time.split(':');

  // Use minutes-from-midnight to avoid timezone issues.
  // Slots are returned as "HH:MM" strings representing wall clock time.
  const shiftStartMin = Number(sH) * 60 + Number(sM);
  const shiftEndMin = Number(eH) * 60 + Number(eM);

  let currentMin = shiftStartMin;

  while (currentMin + serviceDuration <= shiftEndMin) {
    const slotHour = String(Math.floor(currentMin / 60)).padStart(2, '0');
    const slotMin = String(currentMin % 60).padStart(2, '0');
    const slotTime = `${slotHour}:${slotMin}`;

    const slotEndMin = currentMin + serviceDuration;
    const slotEndHour = String(Math.floor(slotEndMin / 60)).padStart(2, '0');
    const slotEndMinStr = String(slotEndMin % 60).padStart(2, '0');

    // Build full ISO-like strings for comparison with bookings (stored in UTC)
    const slotStart = new Date(`${date}T${slotTime}:00`);
    const slotEnd = new Date(`${date}T${slotEndHour}:${slotEndMinStr}:00`);

    const isBooked = bookings.some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return slotStart < bEnd && slotEnd > bStart;
    });

    if (!isBooked) slots.push({ start: slotTime });
    currentMin += 30;
  }

  return { available: true, slots };
}

module.exports = { getAvailableSlots };
