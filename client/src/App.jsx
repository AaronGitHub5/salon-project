import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import Login from './Login';
import BookingModal from './BookingModal';
import AdminDashboard from './AdminDashboard';
import Profile from './Profile';
import StylistSchedule from './StylistSchedule';
import ReviewModal from './ReviewModal';
import API_URL from './config';

function App() {
  const { user, role, session, signOut } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [view, setView] = useState('customer');
  const [reviewBookingId, setReviewBookingId] = useState(null);

  // Detect ?review=<bookingId> in URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('review');
    if (bookingId) {
      setReviewBookingId(bookingId);
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user && view === 'customer') {
      setLoading(true);
      fetch(`${API_URL}/api/services`)
        .then((res) => res.json())
        .then((data) => {
          setServices(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching services:', err);
          setLoading(false);
        });
    }
  }, [user, view]);

  const handleBooking = async (stylistId, startTime) => {
    const response = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        customer_id: user.id,
        service_id: selectedService.id,
        stylist_id: stylistId,
        start_time: startTime,
      }),
    });

    if (response.ok) {
      alert('Booking Confirmed! Check your email.');
      setSelectedService(null);
    } else {
      const err = await response.json().catch(() => ({}));
      alert(`Failed to book: ${err.error || response.status}`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  // If not logged in, show login — but preserve reviewBookingId for after auth
  if (!user) return <Login />;

  if (view === 'admin') return <AdminDashboard onBack={() => setView('customer')} />;
  if (view === 'profile') return <Profile onBack={() => setView('customer')} />;
  if (view === 'stylist') return <StylistSchedule onBack={() => setView('customer')} />;

  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || 'Other Services';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});
  const categories = Object.keys(groupedServices);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 tracking-wide selection:bg-black selection:text-white">

      {/* Navigation */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-light uppercase tracking-[0.2em]">
            Hair By Amnesia
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setView('profile')}
              className="text-xs uppercase tracking-widest text-gray-500 hover:text-black hidden md:block border-b border-transparent hover:border-black transition"
            >
              {user?.email}
            </button>

            {role === 'admin' && (
              <button
                onClick={() => setView('admin')}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition"
              >
                Admin Panel
              </button>
            )}

            {role === 'stylist' && (
              <button
                onClick={() => setView('stylist')}
                className="text-xs font-bold uppercase tracking-widest text-purple-600 hover:text-purple-800 transition"
              >
                My Schedule
              </button>
            )}

            <button
              onClick={handleLogout}
              className="text-xs font-bold uppercase tracking-widest hover:text-red-600 transition"
            >
              Logout
            </button>

            <button
              onClick={() => setSelectedService(services[0] || null)}
              className="bg-black text-white text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-gray-800 transition"
            >
              Book Online
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-12 px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-light mb-4 text-gray-800">
          The Collection
        </h2>
        <div className="w-12 h-0.5 bg-black mx-auto mt-6"></div>
      </div>

      {/* Services Grid */}
      <main className="max-w-4xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="text-center text-gray-400 tracking-widest uppercase text-xs animate-pulse">
            Loading Menu...
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-xl font-light uppercase tracking-[0.15em] mb-8 text-center text-gray-500">
                  {category}
                </h3>
                <div className="grid gap-px bg-gray-100 border border-gray-100">
                  {groupedServices[category].map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className="bg-white p-6 flex justify-between items-center group hover:bg-gray-50 transition duration-300 cursor-pointer"
                    >
                      <div>
                        <h4 className="text-lg font-light uppercase tracking-widest text-gray-800 group-hover:text-black">
                          {service.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          {service.duration_minutes} Mins
                        </p>
                      </div>
                      <div className="text-lg font-light text-gray-900">
                        From £{service.base_price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onConfirm={handleBooking}
        />
      )}

      {/* Review Modal — opens when ?review=<bookingId> detected in URL */}
      {reviewBookingId && user && (
        <ReviewModal
          bookingId={reviewBookingId}
          token={session?.access_token}
          onClose={() => setReviewBookingId(null)}
        />
      )}
    </div>
  );
}

export default App;