import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import API_URL from './config'; 

export default function StylistSchedule({ onBack }) {
  const { user } = useAuth(); 
  const [myBookings, setMyBookings] = useState([]);
  const [stylistProfile, setStylistProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMySchedule() {
      if (!user?.email) return;

      try {
        const stylistRes = await fetch(`${API_URL}/api/stylists`); 
        const stylists = await stylistRes.json();
        
        const me = stylists.find(s => s.email === user.email);

        if (!me) {
          console.warn("User email not found in stylists table");
          setLoading(false);
          return;
        }

        setStylistProfile(me);

        const bookingRes = await fetch(`${API_URL}/api/bookings`); 
        const allBookings = await bookingRes.json();

        const mine = allBookings
          .filter(b => b.stylist_id === me.id && b.status === 'confirmed')
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        setMyBookings(mine);
      } catch (error) {
        console.error("Error loading schedule:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMySchedule();
  }, [user]);

  if (loading) return <div className="p-10 animate-pulse">Loading your roster...</div>;

  if (!stylistProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow text-center max-w-md border-l-4 border-red-500">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">Your email ({user?.email}) is not linked to an active Stylist Profile.</p>
          <button onClick={onBack} className="bg-gray-200 px-4 py-2 rounded font-bold text-sm hover:bg-gray-300 transition">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-light uppercase tracking-widest text-gray-800">My Schedule</h1>
            <p className="text-gray-500 mt-2">Logged in as: <span className="font-bold text-black">{stylistProfile.name}</span></p>
          </div>
          <button onClick={onBack} className="text-xs font-bold uppercase underline hover:text-red-600 text-gray-400 transition">Exit Portal</button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {myBookings.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <p className="text-4xl mb-2">☕</p>
              <p className="text-xl font-light">No upcoming appointments.</p>
              <p className="text-sm mt-2">Enjoy your free time!</p>
            </div>
          ) : (
            <div>
              {myBookings.map((booking) => {
                const start = new Date(booking.start_time);
                const clientName = booking.profiles?.full_name || booking.guests?.full_name || "Unknown Client";
                const serviceName = booking.services?.name || "Service";
                const duration = booking.services?.duration_minutes || 60;
                const dateStr = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

                return (
                  <div key={booking.id} className="border-b last:border-0 border-gray-100 p-6 flex items-center hover:bg-gray-50 transition group">
                    <div className="w-32 flex-shrink-0 text-right pr-6 border-r border-gray-100">
                      <p className="text-xl font-bold text-black font-mono">{start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{dateStr}</p>
                    </div>
                    <div className="flex-grow pl-6">
                      <h3 className="font-bold text-lg text-gray-800">{clientName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">{serviceName}</span>
                        <span className="text-xs text-gray-400 font-bold">⏱ {duration} Mins</span>
                      </div>
                    </div>
                    <div className="ml-4 opacity-0 group-hover:opacity-100 transition">
                      <span className="text-green-600 text-xs font-bold uppercase tracking-widest border border-green-200 px-3 py-1 rounded-full bg-green-50">Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}