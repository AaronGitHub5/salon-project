/**
 * Calculates the final price for a booking.
 * Applies a 15% peak surcharge on Fri/Sat or any evening slot (>= 17:00).
 *
 * @param {number} basePrice - Base service price from the services table.
 * @param {number} stylistMultiplier - Stylist price multiplier (e.g. 1.0–1.5).
 * @param {string|Date} bookingTime - ISO string or Date of the booking start time.
 * @returns {number} Final price rounded to 2 decimal places.
 */
function calculatePrice(basePrice, stylistMultiplier, bookingTime) {
  const date = new Date(bookingTime);
  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  let price = basePrice * stylistMultiplier;
  const isPeakDay = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
  const isEvening = hour >= 17;

  if (isPeakDay || isEvening) {
    price *= 1.15;
  }

  return Math.round(price * 100) / 100;
}

module.exports = { calculatePrice };