const availabilityDao = require('../daos/availability.dao');
const servicesDao = require('../daos/services.dao');
const shiftOverridesDao = require('../daos/shift_overrides.dao');

// Returns how many minutes London is ahead of UTC on a given calendar date.
// 0 during GMT (winter), 60 during BST (summer). Timezone-safe regardless of
// where the Node process is running — uses IANA timezone data via Intl.
function londonOffsetMinutes(dateStr) {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const hour = parseInt(
    probe.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }),
    10
  );
  return (hour - 12) * 60;
}

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

  // Date-specific override (sick day / holiday / training). If admin has blocked
  // this date for this stylist, no new bookings may be taken regardless of the
  // recurring weekly shift. Existing bookings were already cancelled + emailed
  // by the override-creation flow.
  const override = await shiftOverridesDao.getOverrideForDate(stylistId, date);
  if (override && override.is_working === false) {
    return { available: false, slots: [], message: 'Stylist unavailable on this date' };
  }

  const bookings = await availabilityDao.getBookingsForDay(stylistId, date);

  const slots = [];
  const [sH, sM] = shift.start_time.split(':');
  const [eH, eM] = shift.end_time.split(':');

  // Shifts are stored as wall-clock London time (e.g. "09:00"). To compare with
  // bookings (stored as UTC instants), we need to know London's offset from UTC
  // on this specific date so we can translate wall-clock → UTC.
  const offsetMin = londonOffsetMinutes(date);

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

    // Build the slot's UTC instants by parsing as UTC then subtracting the
    // London→UTC offset. Example: "09:00 on 2026-04-20" during BST →
    // 2026-04-20T09:00:00Z minus 60 min → 2026-04-20T08:00:00Z (correct).
    const slotStart = new Date(`${date}T${slotTime}:00Z`);
    const slotEnd = new Date(`${date}T${slotEndHour}:${slotEndMinStr}:00Z`);
    slotStart.setMinutes(slotStart.getMinutes() - offsetMin);
    slotEnd.setMinutes(slotEnd.getMinutes() - offsetMin);

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
