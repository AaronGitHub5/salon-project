export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded shadow-sm border border-gray-100 h-32 flex flex-col justify-between">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Revenue</p>
          <span className="text-3xl font-light text-gray-800">£0.00</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-gray-100 h-32 flex flex-col justify-between">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Bookings</p>
          <span className="text-3xl font-light text-gray-800">0</span>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-gray-100 h-32 flex flex-col justify-between">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Top Stylist</p>
          <span className="text-2xl font-light text-gray-300">-</span>
        </div>
      </div>

      {/* 2. Chart Placeholder */}
      <div className="bg-white p-8 rounded shadow-sm border border-gray-200 border-dashed flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm font-mono">
          [ Weekly Booking Activity Chart ]
        </p>
      </div>

    </div>
  );
}