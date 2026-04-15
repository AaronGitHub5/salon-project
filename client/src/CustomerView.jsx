import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import { useToast } from './Notifications';
import BookingModal from './BookingModal';
import ReviewModal from './ReviewModal';
import API_URL from './config';

const LOYALTY_GOAL = 10;

const viewStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  .font-display { font-family: 'Cormorant Garamond', serif !important; }
  .svc-row:hover .svc-row-inner { background: #1A1A18 !important; }
  .svc-row:hover .svc-row-name { color: #fff !important; }
  .svc-row:hover .svc-row-dur { color: rgba(255,255,255,0.45) !important; }
  .svc-row:hover .svc-row-price { color: #fff !important; }
  .svc-row:hover .svc-row-from { color: rgba(255,255,255,0.35) !important; }
  .svc-row:hover .svc-row-icon { color: #D4B07A !important; }
`;

const SVC_ICONS = { haircut: "✂", colour: "◈", highlights: "◎", blowdry: "◇", treatment: "△", consultation: "○" };
function svcIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("cut") || n.includes("trim")) return "✂";
  if (n.includes("colour") || n.includes("color") || n.includes("toner")) return "◈";
  if (n.includes("highlight") || n.includes("balayage")) return "◎";
  if (n.includes("blow") || n.includes("style") || n.includes("finish")) return "◇";
  if (n.includes("treat") || n.includes("condition") || n.includes("keratin")) return "△";
  return "○";
}

export default function CustomerView() {
  const { user, role, session, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
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
      const result = await response.json();
      const isPending = result.status === 'pending';
      const { data: profile } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('id', user.id)
        .single();
      const points = profile?.loyalty_points || 0;
      setSelectedService(null);
      setBookingSuccess({ pending: isPending, points });
    } else {
      const err = await response.json().catch(() => ({}));
      toast.error(`Failed to book: ${err.error || response.status}`);
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
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A18] overflow-x-hidden">
      <style>{viewStyles}</style>

      {/* Navigation */}
      <nav className="fixed w-full bg-[#FAFAF8]/92 backdrop-blur-md border-b border-[#E4E0D8] z-40 transition-shadow duration-300">
        <div className="max-w-6xl mx-auto px-6 md:px-16 h-[72px] flex items-center justify-between">
          <a href="/" className="font-display text-[1.3rem] font-medium tracking-wide text-[#1A1A18] no-underline">
            Hair by <span style={{ color: '#B8975A' }}>Amnesia</span>
          </a>

          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={() => navigate('/profile')}
              className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] transition-colors bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"
            >
              <span className="md:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              <span className="hidden md:block" style={{ borderBottom: '1px solid #E4E0D8' }}>
                {user?.email}
              </span>
            </button>

            {role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="text-[0.72rem] font-medium tracking-[0.1em] uppercase text-white bg-[#1A1A18] px-4 py-2 border-none cursor-pointer hover:bg-[#B8975A] transition-colors duration-200"
              >
                Admin
              </button>
            )}

            {role === 'stylist' && (
              <button
                onClick={() => navigate('/stylist')}
                className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-[#1A1A18] transition-colors bg-transparent border-none cursor-pointer p-0"
                style={{ borderBottom: '1px solid #E4E0D8' }}
              >
                My Schedule
              </button>
            )}

            <button
              onClick={handleLogout}
              className="text-[0.72rem] font-light tracking-[0.1em] uppercase text-[#7A7870] hover:text-red-600 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              Logout
            </button>

            <button
              onClick={() => setSelectedService(services[0] || null)}
              className="text-[0.72rem] font-medium tracking-[0.1em] uppercase text-white bg-[#1A1A18] hover:bg-[#B8975A] px-6 py-3 border-none cursor-pointer transition-colors duration-200"
            >
              Book Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-[120px] pb-10 px-6 text-center">
        <p className="text-[0.67rem] tracking-[0.2em] uppercase mb-4" style={{ color: '#B8975A' }}>
          Our Services
        </p>
        <h2 className="font-display font-light leading-tight text-[#1A1A18]" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)' }}>
          The Collection
        </h2>
        <p className="font-light text-[#7A7870] leading-relaxed max-w-md mx-auto text-[0.87rem] mt-4">
          Browse our services and book your next appointment.
        </p>
      </div>

      {/* Services Grid */}
      <main className="max-w-4xl mx-auto px-6 md:px-16 pb-20">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-44" style={{ background: 'linear-gradient(90deg,#E4E0D8 25%,#F2EFE8 50%,#E4E0D8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map((category) => (
              <div key={category}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1" style={{ background: '#E4E0D8' }} />
                  <h3 className="font-display text-[1.1rem] font-medium text-[#1A1A18] tracking-wide">
                    {category}
                  </h3>
                  <div className="h-px flex-1" style={{ background: '#E4E0D8' }} />
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  {groupedServices[category].map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className="svc-row cursor-pointer"
                    >
                      <div className="svc-row-inner bg-white p-6 md:p-7 flex justify-between items-center transition-colors duration-200">
                        <div className="flex items-center gap-4">
                          <span className="svc-row-icon text-xl transition-colors duration-200" style={{ color: '#B8975A' }}>
                            {svcIcon(service.name)}
                          </span>
                          <div>
                            <h4 className="svc-row-name font-display text-[1.1rem] font-medium text-[#1A1A18] transition-colors duration-200">
                              {service.name}
                            </h4>
                            <p className="svc-row-dur text-[0.7rem] tracking-wide text-[#7A7870] mt-0.5 transition-colors duration-200">
                              {service.duration_minutes} min
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="svc-row-price font-display text-[1.35rem] font-light text-[#1A1A18] transition-colors duration-200">
                            £{service.base_price}
                          </span>
                          <span className="svc-row-from font-body text-[0.72rem] font-light text-[#7A7870] ml-1 transition-colors duration-200">
                            from
                          </span>
                        </div>
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
          <div className="bg-white w-full max-w-sm p-8 text-center border border-[#E4E0D8]">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ border: '1px solid #B8975A', background: 'rgba(184,151,90,0.08)' }}>
              <span className="text-xl" style={{ color: '#B8975A' }}>{bookingSuccess.pending ? '◷' : '✓'}</span>
            </div>
            <h2 className="font-display text-[1.4rem] font-medium text-[#1A1A18] mb-1">
              {bookingSuccess.pending ? 'Request Sent' : 'Booking Confirmed'}
            </h2>
            <p className="text-[0.78rem] font-light text-[#7A7870] mb-6">
              {bookingSuccess.pending
                ? 'Your stylist will review and confirm your booking. You\'ll receive an email once approved.'
                : 'Check your email for details.'}
            </p>
            <div className="bg-[#FAFAF8] border border-[#E4E0D8] p-5 mb-6">
              <p className="text-[0.62rem] tracking-[0.15em] uppercase mb-1.5" style={{ color: '#B8975A' }}>
                Your Loyalty Visits
              </p>
              <p className="font-display text-[2.5rem] font-light text-[#1A1A18]">{bookingSuccess.points}</p>
                <p className="text-[0.75rem] font-light text-[#7A7870] mt-1">
                  {bookingSuccess.points >= LOYALTY_GOAL
                    ? 'You can redeem a reward voucher!'
                    : `${LOYALTY_GOAL - bookingSuccess.points} more visit${LOYALTY_GOAL - bookingSuccess.points === 1 ? '' : 's'} to your next reward`}
                </p>
                <div className="flex gap-1.5 justify-center mt-4">
                  {Array.from({ length: LOYALTY_GOAL }).map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] transition-colors duration-200"
                      style={{
                        border: `1px solid ${i < bookingSuccess.points ? '#B8975A' : '#E4E0D8'}`,
                        background: i < bookingSuccess.points ? 'rgba(184,151,90,0.15)' : 'transparent',
                        color: i < bookingSuccess.points ? '#D4B07A' : '#E4E0D8',
                      }}
                    >
                      {i < bookingSuccess.points ? '✓' : ''}
                    </div>
                  ))}
                </div>
              </div>
            <button
              onClick={() => setBookingSuccess(null)}
              className="w-full bg-[#1A1A18] text-white py-3.5 text-[0.72rem] font-medium tracking-[0.12em] uppercase hover:bg-[#B8975A] transition-colors duration-200 border-none cursor-pointer"
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
