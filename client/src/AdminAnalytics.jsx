import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API_URL from './config';

export default function AdminAnalytics({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Analytics Error:', err);
        setError(true);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="p-12 text-center text-[#7A7870] font-light animate-pulse">Calculating business metrics...</div>;
  if (error) return <div className="p-12 text-center font-light" style={{ color: '#B56145' }}>Failed to load analytics data.</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-[#E4E0D8] flex flex-col justify-between min-h-[8rem]">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>Total Appointments</p>
          <div className="flex justify-between items-end">
            <span className="font-display text-[2.6rem] font-light text-[#1A1A18] leading-none">{data.totalBookings}</span>
            <span className="text-[0.6rem] tracking-[0.1em] uppercase text-[#7A7870] bg-[#FAFAF8] border border-[#E4E0D8] px-2 py-1">Past 30 Days</span>
          </div>
        </div>
        <div className="bg-white p-6 border border-[#E4E0D8] flex flex-col justify-between min-h-[8rem]">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>Top Performer</p>
          <div>
            <span className="font-display text-[1.6rem] font-light text-[#1A1A18] block truncate">{data.topStylist || 'No Data'}</span>
            <span className="text-[0.72rem] font-light text-[#7A7870]">Most requested stylist</span>
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-[#E4E0D8] flex flex-col justify-between min-h-[7rem]">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>Popular Service</p>
          <div>
            <span className="font-display text-[1.3rem] font-light text-[#1A1A18] block truncate">{data.topService?.name || 'No Data'}</span>
            {data.topService?.count > 0 && (
              <span className="text-[0.72rem] font-light text-[#7A7870]">{data.topService.count} booking{data.topService.count !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 border border-[#E4E0D8] flex flex-col justify-between min-h-[7rem]">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>Busiest Day</p>
          <div>
            <span className="font-display text-[1.3rem] font-light text-[#1A1A18] block">{data.topDay?.name || 'No Data'}</span>
            {data.topDay?.count > 0 && (
              <span className="text-[0.72rem] font-light text-[#7A7870]">{data.topDay.count} booking{data.topDay.count !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 border border-[#E4E0D8] flex flex-col justify-between min-h-[7rem]">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>Peak Hour</p>
          <div>
            <span className="font-display text-[1.3rem] font-light text-[#1A1A18] block">{data.topHour?.time || 'No Data'}</span>
            {data.topHour?.count > 0 && (
              <span className="text-[0.72rem] font-light text-[#7A7870]">{data.topHour.count} booking{data.topHour.count !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Day of week chart */}
      <div className="bg-white p-6 border border-[#E4E0D8]">
        <div className="flex justify-between items-center mb-6">
          <p className="text-[0.62rem] tracking-[0.15em] uppercase" style={{ color: '#B8975A' }}>Bookings by Day</p>
          <span className="text-[0.6rem] tracking-[0.1em] uppercase text-[#7A7870] bg-[#FAFAF8] border border-[#E4E0D8] px-2 py-1">Last 30 Days</span>
        </div>
        {data.totalBookings === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#B4A894] text-[0.85rem] font-light italic">No booking data to display yet.</div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dayChartData}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7A7870' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#B4A894' }} axisLine={false} tickLine={false} width={25} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1A18', border: 'none', color: '#fff', fontSize: '12px' }} cursor={{ fill: '#FAFAF8' }} />
                <Bar dataKey="bookings" fill="#1A1A18" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}