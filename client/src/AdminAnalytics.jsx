import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

  if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse">Calculating business metrics...</div>;
  if (error) return <div className="p-12 text-center text-red-500">Failed to load analytics data.</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Appointments</p>
          <div className="flex justify-between items-end">
            <span className="text-4xl font-light text-gray-800">{data.totalBookings}</span>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">Past 30 Days</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Top Performer</p>
          <div>
            <span className="text-2xl font-light text-black block truncate">{data.topStylist || 'No Data'}</span>
            <span className="text-xs text-gray-400">Most requested stylist</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Booking Volume</h3>
          <span className="text-[10px] bg-black text-white px-2 py-1 rounded">Last 30 Days</span>
        </div>
        {!data.chartData?.length ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm italic">No booking data to display yet.</div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(str) => { const d = new Date(str); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '4px', color: '#fff' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                  {data.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#000000' : '#4b5563'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}