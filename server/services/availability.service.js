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

  const current = new Date(date);
  current.setHours(Number(sH), Number(sM), 0, 0);

  const shiftEnd = new Date(date);
  shiftEnd.setHours(Number(eH), Number(eM), 0, 0);

  while (current.getTime() + serviceDuration * 60000 <= shiftEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + serviceDuration * 60000);

    const isBooked = bookings.some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return current < bEnd && slotEnd > bStart;
    });

    if (!isBooked) slots.push({ start: current.toISOString() });
    current.setMinutes(current.getMinutes() + 30);
  }

  return { available: true, slots };
}

module.exports = { getAvailableSlots };
