const analyticsDao = require('../daos/analytics.dao');

async function getAnalytics() {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const bookings = await analyticsDao.getAnalyticsBookings(lastMonth);

  const totalRevenue = bookings.reduce(
    (sum, b) => sum + (b.services?.base_price || 0),
    0
  );

  const stylistCounts = {};
  const dailyData = {};

  bookings.forEach((b) => {
    const name = b.stylists?.name || 'Unknown';
    stylistCounts[name] = (stylistCounts[name] || 0) + 1;

    const date = b.start_time.split('T')[0];
    dailyData[date] = (dailyData[date] || 0) + 1;
  });

  const topStylist = Object.entries(stylistCounts).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

  const chartData = Object.keys(dailyData)
    .sort()
    .map((d) => ({ date: d, bookings: dailyData[d] }));

  return {
    totalRevenue,
    totalBookings: bookings.length,
    topStylist: topStylist[0],
    chartData,
  };
}

module.exports = { getAnalytics };
