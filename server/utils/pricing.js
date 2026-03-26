/**
 * Calculates the final price for a booking.
 * Peak days and evening cutoff are fully configurable per stylist.
 *
 * @param {number} basePrice - Base service price from the services table.
 * @param {number} stylistMultiplier - Stylist price multiplier (e.g. 1.0–1.5).
 * @param {string|Date} bookingTime - ISO string or Date of the booking start time.
 * @param {number} [peakSurchargePercent=15] - Peak surcharge as a percentage.
 * @param {number[]} [peakDays=[5,6]] - Days of week that are peak (0=Sun, 6=Sat).
 * @param {number} [peakHourStart=17] - Hour (24hr) from which evening peak begins.
 * @returns {{ price: number, isPeak: boolean }}
 */
function calculatePrice(
  basePrice,
  stylistMultiplier,
  bookingTime,
  peakSurchargePercent = 15,
  peakDays = [5, 6],
  peakHourStart = 17
) {
  const date = new Date(bookingTime);
  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  let price = basePrice * stylistMultiplier;
  const isPeakDay = peakDays.includes(dayOfWeek);
  const isEvening = hour >= peakHourStart;
  const isPeak = isPeakDay || isEvening;

  if (isPeak) {
    price *= 1 + peakSurchargePercent / 100;
  }

  return {
    price: Math.round(price * 100) / 100,
    isPeak,
  };
}

module.exports = { calculatePrice };