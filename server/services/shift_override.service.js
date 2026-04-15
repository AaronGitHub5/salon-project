const shiftOverridesDao = require('../daos/shift_overrides.dao');
const stylistsDao = require('../daos/stylists.dao');
const { sendEmail, overrideCancellationTemplate } = require('./email.service');

/**
 * Generate array of date strings between start and end (inclusive).
 */
function dateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date((endDate || startDate) + 'T12:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Preview how many bookings will be affected before committing.
 * Supports date ranges and all-stylists mode.
 */
async function previewOverride({ stylist_id, override_date, end_date, cancel_remaining_only = false, all_stylists = false }) {
  const dates = dateRange(override_date, end_date);
  let stylistIds = stylist_id ? [stylist_id] : [];

  if (all_stylists) {
    const allStylists = await stylistsDao.getAllStylists();
    stylistIds = allStylists.map(s => s.id);
  }

  const allBookings = [];
  const seen = new Set();

  for (const sid of stylistIds) {
    for (const date of dates) {
      const bookings = await shiftOverridesDao.getConfirmedBookingsForDate(sid, date, cancel_remaining_only);
      for (const b of bookings) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          allBookings.push(b);
        }
      }
    }
  }

  return {
    count: allBookings.length,
    dates: dates.length,
    bookings: allBookings.map(b => ({
      id: b.id,
      start_time: b.start_time,
      customer_name: b.profiles?.full_name || b.guests?.full_name || 'Guest',
      service_name: b.services?.name,
    })),
  };
}

/**
 * Save override(s) and cancel + email all affected bookings.
 * Supports date ranges and all-stylists mode.
 */
async function saveOverride({ stylist_id, override_date, end_date, is_working = false, reason, cancel_remaining_only = false, all_stylists = false }) {
  const dates = dateRange(override_date, end_date);
  let stylistIds = stylist_id ? [stylist_id] : [];

  if (all_stylists) {
    const allStylists = await stylistsDao.getAllStylists();
    stylistIds = allStylists.map(s => s.id);
  }

  // 1. Upsert override for each stylist + date combination
  const overrides = [];
  for (const sid of stylistIds) {
    for (const date of dates) {
      const override = await shiftOverridesDao.upsertOverride({
        stylist_id: sid,
        override_date: date,
        is_working,
        reason,
      });
      overrides.push(override);
    }
  }

  // 2. Cancel affected bookings + send emails
  let cancelledCount = 0;
  const seen = new Set();

  if (!is_working) {
    for (const sid of stylistIds) {
      const stylist = await stylistsDao.getStylistById(sid);
      for (const date of dates) {
        const bookings = await shiftOverridesDao.getConfirmedBookingsForDate(sid, date, cancel_remaining_only);
        for (const booking of bookings) {
          if (seen.has(booking.id)) continue;
          seen.add(booking.id);

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
    }
  }

  return { overrides, cancelledCount };
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