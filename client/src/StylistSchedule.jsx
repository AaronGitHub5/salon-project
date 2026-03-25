import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import API_URL from './config';

export default function StylistSchedule() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [myBookings, setMyBookings] = useState([]);
  const [stylistProfile, setStylistProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMySchedule() {
      if (!user?.email || !session?.access_token) {
        setLoading(false);
        return;
      }

      const authHeader = { Authorization: `Bearer ${session.access_token}` };

      try {
        const stylistRes = await fetch(`${API_URL}/api/stylists`);
        const stylists = await stylistRes.json();
        const me = stylists.find(s => s.email === user.email);

        if (!me) {
          setLoading(false);
          return;
        }
        setStylistProfile(me);

        const bookingRes = await fetch(`${API_URL}/api/bookings/stylist/${me.id}`, { headers: authHeader });
        const data = await bookingRes.json();

        if (!bookingRes.ok) {
          setError(data.error || 'Failed to load schedule');
          setMyBookings([]);
        } else {
          setMyBookings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
        setError('Something went wrong loading your schedule.');
      } finally {
        setLoading(false);
      }
    }
    fetchMySchedule();
  }, [user, session]);

  const handleComplete = async (bookingId) => {
    if (!confirm('Mark job as complete? Points will be added to customer.')) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/complete`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        alert('Job Complete! Points awarded.');
        setMyBookings(prev =>
          prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b)
        );
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Could not complete booking'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
  };

  if (loading) return <div className="p-10 animate-pulse">Loading...</div>;
  if (!stylistProfile) return <div className="p-10">Access Restricted</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-light uppercase tracking-widest text-gray-800">My Schedule</h1>
            <p className="text-gray-500 mt-2">Stylist: <strong>{stylistProfile.name}</strong></p>
          </div>
          <button onClick={() => navigate('/app')} className="text-xs font-bold uppercase underline">Exit</button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {myBookings.length === 0 ? (
            <div className="p-16 text-center text-gray-400">No appointments found.</div>
          ) : (
            <div>
              {myBookings.map((booking) => {
                const start = new Date(booking.start_time);
                return (
                  <div key={booking.id} className="border-b last:border-0 border-gray-100 p-6 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-6">
                      <div className="text-right w-24">
                        <p className="text-xl font-bold font-mono">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{start.toDateString()}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{booking.profiles?.full_name || booking.guests?.full_name || 'Guest'}</h3>
                        <p className="text-sm text-gray-500">{booking.services?.name}</p>
                      </div>
                    </div>

                    <div>
                      {booking.status === 'completed' ? (
                        <span className="text-green-600 border border-green-200 bg-green-50 text-xs font-bold px-3 py-1 rounded uppercase">Completed</span>
                      ) : (
                        <button
                          onClick={() => handleComplete(booking.id)}
                          className="bg-black text-white text-xs font-bold uppercase px-4 py-2 rounded hover:bg-gray-800 transition shadow-sm"
                        >
                          Complete Job
                        </button>
                      )}
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