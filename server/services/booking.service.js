const bookingsDao = require('../daos/bookings.dao');
const guestsDao = require('../daos/guests.dao');
const profilesDao = require('../daos/profiles.dao');
const servicesDao = require('../daos/services.dao');
const stylistsDao = require('../daos/stylists.dao');
const { calculatePrice } = require('../utils/pricing');
const { sendEmail, bookingConfirmationTemplate, cancellationTemplate } = require('./email.service');

async function createBooking({ customer_id, service_id, stylist_id, start_time }) {
  // Fetch service and stylist details needed for calculation
  const services = await servicesDao.getAllServices();
  const service = services.find((s) => s.id == service_id);
  if (!service) throw new Error('Service not found');

  const stylists = await stylistsDao.getAllStylists();
  const stylist = stylists.find((s) => s.id == stylist_id);
  if (!stylist) throw new Error('Stylist not found');

  const start = new Date(start_time);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  const conflict = await bookingsDao.checkConflict(
    stylist_id,
    start.toISOString(),
    end.toISOString()
  );
  if (conflict) throw Object.assign(new Error('Time slot unavailable.'), { status: 409 });

  const booking = await bookingsDao.createBooking({
    customer_id,
    service_id,
    stylist_id,
    start_time: start,
    end_time: end,
  });

  const finalPrice = calculatePrice(service.base_price, stylist.price_multiplier, start_time);

  // Send confirmation email
  const profile = await profilesDao.getProfileById(customer_id);
  if (profile?.email) {
  await sendEmail(
    profile.email,
    'Booking Confirmed - Hair By Amnesia',
    bookingConfirmationTemplate({
      fullName: profile.full_name,
      serviceName: service.name,
      stylistName: stylist.name,
      startTime: start,
      price: finalPrice,
    })
  );
}

  return { booking, price: finalPrice };
}

async function createGuestBooking({ guestName, guestPhone, guestEmail, serviceId, stylistId, startTime }) {
  const guest = await guestsDao.createGuest({
    full_name: guestName,
    phone_number: guestPhone,
    email: guestEmail,
  });

  const services = await servicesDao.getAllServices();
  const service = services.find((s) => s.id == serviceId);
  if (!service) throw new Error('Service not found');

  const stylists = await stylistsDao.getAllStylists();
  const stylist = stylists.find((s) => s.id == stylistId);
  if (!stylist) throw new Error('Stylist not found');

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  const conflict = await bookingsDao.checkConflict(
    stylistId,
    start.toISOString(),
    end.toISOString()
  );
  if (conflict) {
    await guestsDao.deleteGuest(guest.id); // rollback guest record
    throw Object.assign(new Error('Time slot unavailable.'), { status: 409 });
  }

  const booking = await bookingsDao.createGuestBooking({
    guest_id: guest.id,
    service_id: serviceId,
    stylist_id: stylistId,
    start_time: start,
    end_time: end,
  });

  const finalPrice = calculatePrice(service.base_price, stylist.price_multiplier, startTime);

  if (guestEmail) {
  await sendEmail(
    guestEmail,
    'Booking Confirmed - Hair By Amnesia',
    bookingConfirmationTemplate({
      fullName: guestName,
      serviceName: service.name,
      stylistName: stylist.name,
      startTime: start,
      price: finalPrice,
    })
  );
}

  return { guest, booking, price: finalPrice };
}

async function cancelBooking(id) {
  const data = await bookingsDao.cancelBooking(id);
  if (data?.profiles?.email) {
  await sendEmail(
    data.profiles.email,
    'Cancellation Confirmed - Hair By Amnesia',
    cancellationTemplate({ serviceName: data.services.name })
  );
}
  return data;
}

async function completeBooking(id) {
  const booking = await bookingsDao.getBookingById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });

  await bookingsDao.completeBooking(id);

  if (booking.customer_id) {
    const points = Math.floor(booking.services.base_price);
    const profile = await profilesDao.getProfileById(booking.customer_id);
    const newPoints = (profile.loyalty_points || 0) + points;
    await profilesDao.updateLoyaltyPoints(booking.customer_id, newPoints);
    return { message: 'Booking completed', pointsAdded: points };
  }

  return { message: 'Guest booking completed (no points awarded)' };
}

module.exports = { createBooking, createGuestBooking, cancelBooking, completeBooking };
