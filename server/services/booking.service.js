const supabase = require('../supabaseClient');
const bookingsDao = require('../daos/bookings.dao');
const guestsDao = require('../daos/guests.dao');
const profilesDao = require('../daos/profiles.dao');
const servicesDao = require('../daos/services.dao');
const stylistsDao = require('../daos/stylists.dao');
const { calculatePrice } = require('../utils/pricing');
const {
  sendEmail,
  bookingConfirmationTemplate,
  bookingPendingTemplate,
  bookingRejectionTemplate,
  cancellationTemplate,
  rescheduleTemplate,
  reviewRequestTemplate,
} = require('./email.service');
const ics = require('ics');

// -- Ownership helpers -----------------------------------------------

// Fetches the caller's role from the profiles table. Used for admin overrides
// on endpoints that don't chain requireRole middleware.
async function getUserRole(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role || null;
}

// Resolves the stylist record for the caller (matched by email). Returns null
// if the caller is not a stylist. Used to enforce stylist ownership on approve /
// reject / complete.
async function getStylistForUser(userEmail) {
  if (!userEmail) return null;
  const stylists = await stylistsDao.getAllStylists();
  return stylists.find((s) => s.email === userEmail) || null;
}

// Throws a 403 if the caller is neither the booking's customer nor an admin.
async function assertCanModifyCustomerBooking(booking, userId) {
  if (booking.customer_id && booking.customer_id === userId) return;
  const role = await getUserRole(userId);
  if (role === 'admin') return;
  throw Object.assign(new Error('Forbidden: you can only modify your own bookings.'), { status: 403 });
}

async function createBooking({ customer_id, service_id, stylist_id, start_time, booked_by_admin }) {
  // Validate start_time is a real future date
  const start = new Date(start_time);
  if (isNaN(start.getTime())) {
    throw Object.assign(new Error('Invalid start time.'), { status: 400 });
  }
  if (start < new Date()) {
    throw Object.assign(new Error('Booking time must be in the future.'), { status: 400 });
  }

  const services = await servicesDao.getAllServices();
  const service = services.find((s) => s.id == service_id);
  if (!service) throw new Error('Service not found');

  const stylists = await stylistsDao.getAllStylists();
  const stylist = stylists.find((s) => s.id == stylist_id);
  if (!stylist) throw new Error('Stylist not found');

  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  const conflict = await bookingsDao.checkConflict(stylist_id, start.toISOString(), end.toISOString());
  if (conflict) throw Object.assign(new Error('Time slot unavailable.'), { status: 409 });

  // Admin bookings confirm immediately; all customer bookings require senior stylist approval
  const status = booked_by_admin ? 'confirmed' : 'pending';
  const booking = await bookingsDao.createBooking({ customer_id, service_id, stylist_id, start_time: start, end_time: end, status });

  const { price: finalPrice } = calculatePrice(
    service.base_price,
    stylist.price_multiplier,
    start_time,
    stylist.peak_surcharge_percent ?? 15,
    stylist.peak_days ?? [5, 6],
    stylist.peak_hour_start ?? 17
  );

  const profile = await profilesDao.getProfileById(customer_id);
  if (profile?.email) {
    if (status === 'pending') {
      await sendEmail(
        profile.email,
        'Booking Request Received - Hair By Amnesia',
        bookingPendingTemplate({ fullName: profile.full_name, serviceName: service.name, stylistName: stylist.name, startTime: start, price: finalPrice })
      );
    } else {
      await sendEmail(
        profile.email,
        'Booking Confirmed - Hair By Amnesia',
        bookingConfirmationTemplate({ fullName: profile.full_name, serviceName: service.name, stylistName: stylist.name, startTime: start, price: finalPrice })
      );
    }
  }

  return { booking, price: finalPrice, status };
}

async function createGuestBooking({ guestName, guestPhone, guestEmail, serviceId, stylistId, startTime }) {
  const guest = await guestsDao.createGuest({ full_name: guestName, phone_number: guestPhone, email: guestEmail });

  const services = await servicesDao.getAllServices();
  const service = services.find((s) => s.id == serviceId);
  if (!service) throw new Error('Service not found');

  const stylists = await stylistsDao.getAllStylists();
  const stylist = stylists.find((s) => s.id == stylistId);
  if (!stylist) throw new Error('Stylist not found');

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  const conflict = await bookingsDao.checkConflict(stylistId, start.toISOString(), end.toISOString());
  if (conflict) {
    await guestsDao.deleteGuest(guest.id);
    throw Object.assign(new Error('Time slot unavailable.'), { status: 409 });
  }

  const booking = await bookingsDao.createGuestBooking({ guest_id: guest.id, service_id: serviceId, stylist_id: stylistId, start_time: start, end_time: end });

  const { price: finalPrice } = calculatePrice(
    service.base_price,
    stylist.price_multiplier,
    startTime,
    stylist.peak_surcharge_percent ?? 15,
    stylist.peak_days ?? [5, 6],
    stylist.peak_hour_start ?? 17
  );

  // Best-effort email delivery. Booking persists even if Resend is unavailable;
  // emailSent is returned so the admin UI can warn the operator to contact the
  // guest manually if delivery failed.
  let emailSent = null; // null = didn't attempt, true = delivered, false = failed
  if (guestEmail) {
    emailSent = await sendEmail(
      guestEmail,
      'Booking Confirmed - Hair By Amnesia',
      bookingConfirmationTemplate({ fullName: guestName, serviceName: service.name, stylistName: stylist.name, startTime: start, price: finalPrice })
    );
  }

  return { guest, booking, price: finalPrice, emailSent };
}

async function approveBooking(id, userEmail) {
  const booking = await bookingsDao.getBookingById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
  if (booking.status !== 'pending') throw Object.assign(new Error('Booking is not pending'), { status: 400 });

  // Ownership check: the stylist approving must be assigned to this booking,
  // OR must be a senior stylist (senior stylists can approve across the salon).
  const me = await getStylistForUser(userEmail);
  if (!me) throw Object.assign(new Error('Forbidden: stylist record not found.'), { status: 403 });
  if (!me.is_senior && booking.stylist_id !== me.id) {
    throw Object.assign(new Error('Forbidden: you can only approve your own bookings.'), { status: 403 });
  }

  const data = await bookingsDao.approveBooking(id);

  if (data?.profiles?.email) {
    const { sendEmail, bookingConfirmationTemplate } = require('./email.service');
    await sendEmail(
      data.profiles.email,
      'Booking Confirmed - Hair By Amnesia',
      bookingConfirmationTemplate({
        fullName: data.profiles.full_name,
        serviceName: data.services.name,
        stylistName: data.stylists.name,
        startTime: new Date(booking.start_time),
        price: null,
      })
    );
  }

  return data;
}

async function rejectBooking(id, userEmail) {
  const booking = await bookingsDao.getBookingById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
  if (booking.status !== 'pending') throw Object.assign(new Error('Booking is not pending'), { status: 400 });

  // Same ownership rule as approve
  const me = await getStylistForUser(userEmail);
  if (!me) throw Object.assign(new Error('Forbidden: stylist record not found.'), { status: 403 });
  if (!me.is_senior && booking.stylist_id !== me.id) {
    throw Object.assign(new Error('Forbidden: you can only reject your own bookings.'), { status: 403 });
  }

  const data = await bookingsDao.rejectBooking(id);

  if (data?.profiles?.email) {
    await sendEmail(
      data.profiles.email,
      'Booking Request Declined - Hair By Amnesia',
      bookingRejectionTemplate({
        fullName: data.profiles.full_name,
        serviceName: data.services.name,
        stylistName: data.stylists.name,
        startTime: new Date(booking.start_time),
      })
    );
  }

  return data;
}

async function cancelBooking(id, userId) {
  const booking = await bookingsDao.getBookingById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

  // Ownership check: customer owns it, OR caller is admin.
  // Guest bookings (customer_id null) can only be cancelled by admin.
  await assertCanModifyCustomerBooking(booking, userId);

  const data = await bookingsDao.cancelBooking(id);

  // Send cancellation email to customer or guest
  const email = data?.profiles?.email || data?.guests?.email;
  if (email) {
    await sendEmail(
      email,
      'Cancellation Confirmed - Hair By Amnesia',
      cancellationTemplate({ serviceName: data.services.name })
    );
  }

  return data;
}

async function completeBooking(id, userEmail) {
  const booking = await bookingsDao.getBookingById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

  // Ownership check: only the stylist assigned to this booking can mark it complete.
  // This prevents one stylist from fraudulently awarding loyalty points for
  // another stylist's appointments.
  const me = await getStylistForUser(userEmail);
  if (!me || booking.stylist_id !== me.id) {
    throw Object.assign(new Error('Forbidden: you can only complete your own bookings.'), { status: 403 });
  }

  await bookingsDao.completeBooking(id);

  if (booking.customer_id) {
    // Atomic increment with optimistic retry — prevents lost updates if two
    // bookings for the same customer are marked complete in quick succession.
    let profile;
    let newVisits;
    for (let attempt = 0; attempt < 5; attempt++) {
      profile = await profilesDao.getProfileById(booking.customer_id);
      const current = profile.loyalty_points || 0;
      newVisits = current + 1;
      const { data: updated } = await supabase
        .from('profiles')
        .update({ loyalty_points: newVisits })
        .eq('id', booking.customer_id)
        .eq('loyalty_points', current)
        .select('loyalty_points');
      if (updated && updated.length > 0) break;
      if (attempt === 4) throw new Error('Loyalty update failed after retries');
    }

    if (profile?.email) {
      await sendEmail(
        profile.email,
        'How was your appointment? - Hair By Amnesia',
        reviewRequestTemplate({
          fullName: profile.full_name,
          serviceName: booking.services.name,
          bookingId: booking.id,
        })
      );
    }

    return { message: 'Booking completed', visitsAdded: 1, totalVisits: newVisits };
  }

  return { message: 'Guest booking completed (no loyalty stamp awarded)' };
}

async function rescheduleBooking(id, newStartTime, userId) {
  const booking = await bookingsDao.getBookingById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
  if (booking.status === 'cancelled') throw Object.assign(new Error('Cannot reschedule a cancelled booking'), { status: 400 });

  // Ownership check: customer owns it, OR caller is admin
  await assertCanModifyCustomerBooking(booking, userId);

  const newStart = new Date(newStartTime);
  if (isNaN(newStart.getTime())) {
    throw Object.assign(new Error('Invalid start time.'), { status: 400 });
  }
  if (newStart < new Date()) {
    throw Object.assign(new Error('Booking time must be in the future.'), { status: 400 });
  }
  const newEnd = new Date(newStart.getTime() + booking.services.duration_minutes * 60000);

  const conflict = await bookingsDao.checkConflict(booking.stylist_id, newStart.toISOString(), newEnd.toISOString(), id);
  if (conflict) throw Object.assign(new Error('Time slot unavailable.'), { status: 409 });

  const updated = await bookingsDao.rescheduleBooking(id, newStart.toISOString(), newEnd.toISOString());

  if (updated?.profiles?.email) {
    await sendEmail(
      updated.profiles.email,
      'Appointment Rescheduled - Hair By Amnesia',
      rescheduleTemplate({
        fullName: updated.profiles.full_name,
        serviceName: updated.services.name,
        stylistName: updated.stylists.name,
        newStartTime: newStart,
      })
    );
  }

  return updated;
}

async function exportBookingIcs(id, userId) {
  const booking = await bookingsDao.getBookingById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

  // Ownership check: only the booking's customer (or admin) can export the ICS.
  // Without this, any authenticated user could download any booking's calendar
  // invite by guessing the ID, leaking service / stylist / date / location.
  await assertCanModifyCustomerBooking(booking, userId);

  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  // Use UTC components and tell the ics library they're UTC — the calendar app
  // will then convert to the user's local zone. Using local getHours() without
  // a timezone tag produces "floating time" which shifts by the server's TZ.
  const event = {
    start: [start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes()],
    startInputType: 'utc',
    startOutputType: 'utc',
    end: [end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), end.getUTCHours(), end.getUTCMinutes()],
    endInputType: 'utc',
    endOutputType: 'utc',
    title: `${booking.services.name} at Hair By Amnesia`,
    description: `Stylist: ${booking.stylists.name}`,
    location: 'Hair By Amnesia',
    url: 'https://hairbyamnesia.co.uk',
  };

  return new Promise((resolve, reject) => {
    ics.createEvent(event, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

module.exports = { createBooking, createGuestBooking, approveBooking, rejectBooking, cancelBooking, completeBooking, rescheduleBooking, exportBookingIcs };