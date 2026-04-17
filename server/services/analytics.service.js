const analyticsDao = require('../daos/analytics.dao');

async function getAnalytics() {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const bookings = await analyticsDao.getAnalyticsBookings(lastMonth);

  const stylistCounts = {};
  const serviceCounts = {};
  const dayCounts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 };
  const hourCounts = {};

  bookings.forEach((b) => {
    const name = b.stylists?.name || 'Unknown';
    stylistCounts[name] = (stylistCounts[name] || 0) + 1;

    const serviceName = b.services?.name || 'Unknown';
    serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;

    // Group by London time explicitly — otherwise a 23:30 BST booking
    // (22:30 UTC) would be grouped under the UTC day/hour on a UTC server,
    // giving misleading "busiest day" and "peak hour" stats.
    const start = new Date(b.start_time);
    const dayOfWeek = start.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Europe/London' });
    if (dayCounts[dayOfWeek] !== undefined) dayCounts[dayOfWeek]++;

    const hour = parseInt(
      start.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/London' }),
      10
    );
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const topStylist = Object.entries(stylistCounts).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0] || [0, 0];

  const formatHour = (h) => {
    const hour = parseInt(h);
    return `${String(hour).padStart(2, '0')}:00`;
  };

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayChartData = dayOrder.map(day => ({
    day: day.slice(0, 3),
    fullDay: day,
    bookings: dayCounts[day],
  }));

  return {
    totalBookings: bookings.length,
    topStylist: topStylist[0],
    topService: { name: topService[0], count: topService[1] },
    topDay: { name: topDay[0], count: topDay[1] },
    topHour: { time: formatHour(topHour[0]), count: topHour[1] },
    dayChartData,
  };
}

module.exports = { getAnalytics };