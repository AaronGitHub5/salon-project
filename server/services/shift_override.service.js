const shiftOverridesDao = require('../daos/shift_overrides.dao');
const stylistsDao = require('../daos/stylists.dao');
const { sendEmail, overrideCancellationTemplate } = require('./email.service');

/**
 * Preview how many bookings will be affected before committing.
 * Returns the list of affected bookings so frontend can show confirmation.
 */
async function previewOverride({ stylist_id, override_date, cancel_remaining_only = false }) {
  const bookings = await shiftOverridesDao.getConfirmedBookingsForDate(
    stylist_id,
    override_date,
    cancel_remaining_only
  );
  return {
    count: bookings.length,
    bookings: bookings.map(b => ({
      id: b.id,
      start_time: b.start_time,
      customer_name: b.profiles?.full_name || b.guests?.full_name || 'Guest',
      service_name: b.services?.name,
    })),
  };
}

/**
 * Save override and cancel + email all affected bookings.
 * cancel_remaining_only: if true, only cancels bookings from now onwards (sick day mid-shift use case).
 */
async function saveOverride({ stylist_id, override_date, is_working = false, reason, cancel_remaining_only = false }) {
  // 1. Upsert the override record
  const override = await shiftOverridesDao.upsertOverride({
    stylist_id,
    override_date,
    is_working,
    reason,
  });

  // 2. If marking as not working, cancel affected bookings + send emails
  let cancelledCount = 0;
  if (!is_working) {
    const stylist = await stylistsDao.getStylistById(stylist_id);
    const bookings = await shiftOverridesDao.getConfirmedBookingsForDate(
      stylist_id,
      override_date,
      cancel_remaining_only
    );

    // Cancel each booking and email the customer
    for (const booking of bookings) {
      await shiftOverridesDao.cancelBookingById(booking.id);
      cancelledCount++;

      const email = booking.profiles?.email || booking.guests?.email;
      const fullName = booking.profiles?.full_name || booking.guests?.full_name || 'Valued Customer';

      if (email) {
        await sendEmail(
          email,
          'Appointment Cancelled - Hair By Amnesia',
          overrideCancellationTemplate({
            fullName,
            serviceName: booking.services?.name || 'your appointment',
            stylistName: stylist.name,
            startTime: booking.start_time,
            reason: reason || null,
          })
        );
      }
    }
  }

  return { override, cancelledCount };
}

async function getOverridesForStylist(stylist_id) {
  return shiftOverridesDao.getOverridesByStylist(stylist_id);
}

async function deleteOverride(id) {
  return shiftOverridesDao.deleteOverride(id);
}

module.exports = {
  previewOverride,
  saveOverride,
  getOverridesForStylist,
  deleteOverride,
};
