const { getBookingsDueForReminder, markReminderSent } = require('../daos/reminders.dao');
const { sendEmail, reminderTemplate } = require('./email.service');

async function sendPendingReminders(window) {
  const bookings = await getBookingsDueForReminder(window);
  const label = window === '1h' ? '1 hour' : '24 hour';

  console.log(`Reminder job (${label}): ${bookings.length} booking(s) to remind`);

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      const fullName = booking.profiles?.full_name || 'there';
      const email = booking.profiles?.email;
      const serviceName = booking.services?.name || 'appointment';
      const stylistName = booking.stylists?.name || 'your stylist';

      if (!email) {
        console.warn(`Booking ${booking.id}: no email on profile, skipping`);
        continue;
      }

      const subject = window === '1h'
        ? 'Your Hair By Amnesia appointment is in 1 hour'
        : 'Reminder: Your Hair By Amnesia appointment is tomorrow';

      await sendEmail(
        email,
        subject,
        reminderTemplate({ fullName, serviceName, stylistName, startTime: booking.start_time, window })
      );

      await markReminderSent(booking.id, window);
      sent++;
    } catch (err) {
      console.error(`Reminder failed for booking ${booking.id}:`, err);
      failed++;
    }
  }

  return { sent, failed, total: bookings.length };
}

module.exports = { sendPendingReminders };
