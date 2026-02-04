import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import API_URL from './config';

export default function Profile({ onBack }) {
  const { user, role } = useAuth();
  
  // Tab State
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  
  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Loyalty State
  const [points, setPoints] = useState(0); 
  const nextReward = 500;
  const progress = Math.min((points / nextReward) * 100, 100);

  // 1. Fetch Data on Load
  useEffect(() => {
    if (user?.id) {
      // Fetch Appointments
      fetch(`${API_URL}/api/bookings/customer/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setAppointments(data);
          setLoadingAppts(false);
        })
        .catch(err => {
          console.error("Error fetching bookings:", err);
          setLoadingAppts(false);
        });

      // Fetch Real Points
      supabase.from('profiles').select('loyalty_points').eq('id', user.id).single()
        .then(({ data }) => { if(data) setPoints(data.loyalty_points || 0); });
    }
  }, [user]);

  // 2. Cancel Logic
  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'PUT'
      });
      
      if (res.ok) {
        alert("Appointment cancelled successfully.");
        setAppointments(prev => prev.filter(b => b.id !== bookingId));
      } else {
        alert("Failed to cancel.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Password Logic (Fixed - No AbortError)
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        alert("Error: " + error.message);
      } else {
        alert("Password updated successfully!");
        setNewPassword('');
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
           <div>
             <h1 className="text-3xl font-light uppercase tracking-widest text-gray-800">My Account</h1>
             <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
           </div>
           <button onClick={onBack} className="text-sm underline hover:text-red-500">Back to Home</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-8">
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'appointments' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            My Appointments
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'settings' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Profile & Rewards
          </button>
        </div>

        {/* TAB 1: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
             {loadingAppts ? (
               <div className="p-10 text-center text-gray-400">Loading history...</div>
             ) : appointments.length === 0 ? (
               <div className="p-16 text-center">
                 <div className="text-4xl mb-4">📅</div>
                 <h3 className="text-lg font-bold text-gray-700">No Upcoming Bookings</h3>
                 <p className="text-gray-500 text-sm mb-6">You are free! Time to treat yourself?</p>
                 <button onClick={onBack} className="bg-black text-white px-6 py-3 text-xs font-bold uppercase rounded hover:bg-gray-800 transition">
                   Book New Appointment
                 </button>
               </div>
             ) : (
               <div className="divide-y divide-gray-100">
                 {appointments.map(appt => {
                   const start = new Date(appt.start_time);
                   const isPast = new Date() > start;
                   
                   return (
                     <div key={appt.id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-gray-50 transition">
                        <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0">
                           <div className="bg-gray-100 p-4 rounded text-center min-w-[80px]">
                              <span className="block text-xs font-bold uppercase text-gray-500">{start.toLocaleString('default', { month: 'short' })}</span>
                              <span className="block text-2xl font-bold text-black">{start.getDate()}</span>
                           </div>
                           <div>
                              <h3 className="font-bold text-gray-800 text-lg">{appt.services?.name || 'Service'}</h3>
                              <p className="text-sm text-gray-500">with {appt.stylists?.name || 'Stylist'}</p>
                              <p className="text-xs font-mono mt-1 text-gray-400">
                                {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • £{appt.services?.base_price}
                              </p>
                           </div>
                        </div>
                        <div>
                          {isPast || appt.status === 'completed' ? (
                             <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-3 py-1 rounded uppercase border border-gray-200">Completed</span>
                          ) : (
                             <button 
                               onClick={() => handleCancel(appt.id)}
                               className="text-red-500 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition"
                             >
                               Cancel Booking
                             </button>
                          )}
                        </div>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>
        )}

        {/* TAB 2: SETTINGS & LOYALTY */}
        {activeTab === 'settings' && (
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
             {/* Security Form */}
             <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 h-fit">
                <h3 className="font-bold text-sm text-gray-800 mb-6 uppercase tracking-widest">Security Settings</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Update Password</label>
                    <input 
                      type="password" required minLength={6} placeholder="New Password"
                      className="w-full border p-2 rounded bg-gray-50 text-sm"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <button disabled={pwLoading} className="w-full bg-black text-white p-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition disabled:opacity-50">
                    {pwLoading ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <p className="text-xs font-bold uppercase text-gray-400 mb-2">Account Role</p>
                  <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded uppercase font-bold">
                    {role || 'Customer'}
                  </span>
                </div>
             </div>

             {/* Loyalty Card */}
             <div className="bg-black text-white p-8 rounded-lg shadow-xl relative overflow-hidden flex flex-col justify-between h-[300px]">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-gray-800 rounded-full opacity-50 blur-3xl"></div>
                
                <div className="relative z-10">
                  <h2 className="text-xl font-light uppercase tracking-[0.2em] mb-1">Amnesia Rewards</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gold Member</p>
                </div>

                <div className="my-4 text-center relative z-10">
                   <div className="text-5xl font-bold mb-2 tracking-tighter">{points}</div>
                   <p className="text-xs uppercase tracking-widest text-gray-400">Current Balance</p>
                </div>

                <div className="relative z-10">
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-4">
                     <div style={{width: `${progress}%`}} className="bg-white h-full transition-all duration-1000"></div>
                  </div>
                  <button onClick={() => alert("Coming soon!")} className="w-full bg-white text-black py-2 text-xs font-bold uppercase rounded hover:bg-gray-200 transition">
                     Redeem Voucher
                  </button>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}