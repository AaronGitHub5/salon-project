import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import BookingModal from './BookingModal';
import ReviewModal from './ReviewModal';
import API_URL from './config';

const LOYALTY_GOAL = 10;

export default function CustomerView() {
  const { user, role, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null); // { points }

  // ?review=<bookingId> — read on mount, clean immediately
  const reviewBookingId = searchParams.get('review');
  const clearReview = () => {
    searchParams.delete('review');
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
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
  }, []);

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', user.id)
        .single();
      setSelectedService(null);
      setBookingSuccess({ points: profile?.loyalty_points || 0 });
    } else {
      const err = await response.json().catch(() => ({}));
      alert(`Failed to book: ${err.error || response.status}`);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

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

          <div className="flex items-center gap-4 md:gap-6">
            {/* Profile — visible on all screen sizes */}
            <button
              onClick={() => navigate('/profile')}
              className="text-xs uppercase tracking-widest text-gray-500 hover:text-black transition flex items-center gap-1"
            >
              {/* Icon on mobile, email on desktop */}
              <span className="md:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              <span className="hidden md:block border-b border-transparent hover:border-black transition">
                {user?.email}
              </span>
            </button>

            {role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition"
              >
                Admin Panel
              </button>
            )}

            {role === 'stylist' && (
              <button
                onClick={() => navigate('/stylist')}
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

      {/* Booking Success Modal */}
      {bookingSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm shadow-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">✓</span>
            </div>
            <h2 className="text-lg font-semibold uppercase tracking-widest mb-1">Booking Confirmed!</h2>
            <p className="text-sm text-gray-400 mb-6">Check your email for details.</p>
            <div className="bg-gray-50 rounded p-4 mb-6">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Your Loyalty Visits</p>
              <p className="text-4xl font-bold text-black">{bookingSuccess.points}</p>
              <p className="text-xs text-gray-400 mt-1">
                {bookingSuccess.points >= LOYALTY_GOAL
                  ? 'You can redeem a reward voucher!'
                  : `${LOYALTY_GOAL - bookingSuccess.points} more visit${LOYALTY_GOAL - bookingSuccess.points === 1 ? '' : 's'} to your next reward`}
              </p>
              <div className="flex gap-1 justify-center mt-3">
                {Array.from({ length: LOYALTY_GOAL }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < bookingSuccess.points ? 'bg-black' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={() => setBookingSuccess(null)}
              className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Review Modal — opens when ?review=<bookingId> in URL */}
      {reviewBookingId && user && (
        <ReviewModal
          bookingId={reviewBookingId}
          token={session?.access_token}
          onClose={clearReview}
        />
      )}
    </div>
  );
}