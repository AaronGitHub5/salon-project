import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import API_URL from './config';

export default function Profile({ onBack }) {
  const { user, role } = useAuth();
  
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [points, setPoints] = useState(0); 

  useEffect(() => {
    if (user?.id) {
      // Fetch Appointments
      fetch(`${API_URL}/api/bookings/customer/${user.id}`)
        .then(res => res.json())
        .then(data => { setAppointments(data); setLoadingAppts(false); })
        .catch(err => console.error(err));

      // Fetch Points
      supabase.from('profiles').select('loyalty_points').eq('id', user.id).single()
        .then(({ data }) => { if(data) setPoints(data.loyalty_points || 0); });
    }
  }, [user]);

  const handleCancel = async (bookingId) => {
    if (!confirm("Cancel this appointment?")) return;
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, { method: 'PUT' });
    if (res.ok) {
        alert("Booking cancelled.");
        setAppointments(prev => prev.filter(b => b.id !== bookingId));
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert("Error: " + error.message);
    else { alert("Updated!"); setNewPassword(''); }
    setPwLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        
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
          <button onClick={() => setActiveTab('appointments')} className={`pb-3 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'appointments' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>My Appointments</button>
          <button onClick={() => setActiveTab('settings')} className={`pb-3 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'settings' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>Settings</button>
        </div>

        {/* TAB 1: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
             {loadingAppts ? <div className="p-10 text-center text-gray-400">Loading...</div> : appointments.length === 0 ? <div className="p-16 text-center text-gray-400">No bookings found.</div> : (
               <div className="divide-y divide-gray-100">
                 {appointments.map(appt => {
                   const start = new Date(appt.start_time);
                   const isPast = new Date() > start;
                   return (
                     <div key={appt.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition">
                        <div>
                           <h3 className="font-bold text-gray-800 text-lg">{appt.services?.name}</h3>
                           <p className="text-sm text-gray-500">with {appt.stylists?.name} • £{appt.services?.base_price}</p>
                           <p className="text-xs font-mono mt-1 text-gray-400">{start.toLocaleString()}</p>
                        </div>
                        <div>
                          {isPast || appt.status === 'completed' ? (
                             <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-3 py-1 rounded uppercase">Completed</span>
                          ) : (
                             <button onClick={() => handleCancel(appt.id)} className="text-red-500 border border-red-200 bg-white hover:bg-red-50 px-4 py-2 rounded text-xs font-bold uppercase tracking-wide">Cancel</button>
                          )}
                        </div>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>
        )}

        {/* TAB  SETTINGS  */}
        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
             
             {/* 1. Account Info & Points */}
             <div className="grid grid-cols-2 gap-4 mb-8 border-b border-gray-100 pb-8">
               <div>
                 <p className="text-xs font-bold uppercase text-gray-400 mb-1">Account Role</p>
                 <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded uppercase font-bold">{role || 'Customer'}</span>
               </div>
               <div>
                 <p className="text-xs font-bold uppercase text-gray-400 mb-1">Loyalty Balance</p>
                 <span className="text-lg font-mono font-bold text-black">{points} Points</span>
               </div>
             </div>

             {/* 2. Security Form */}
             <h3 className="font-bold text-sm text-gray-800 mb-6 uppercase tracking-widest">Update Password</h3>
             <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
               <input type="password" required minLength={6} placeholder="New Password" className="w-full border p-2 rounded bg-gray-50 text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
               <button disabled={pwLoading} className="bg-black text-white px-6 py-3 text-xs font-bold uppercase rounded hover:bg-gray-800 disabled:opacity-50">{pwLoading ? 'Updating...' : 'Save Changes'}</button>
             </form>
          </div>
        )}

      </div>
    </div>
  );
}