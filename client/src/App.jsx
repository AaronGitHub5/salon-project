import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import Login from './Login'
import BookingModal from './BookingModal'

function App() {
  const { user, signOut } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState(null) // Controls the popup

  // 1. FETCH DATA
  useEffect(() => {
    if (user) {
      fetch('http://localhost:5000/api/services')
        .then(res => res.json())
        .then(data => {
          setServices(data)
          setLoading(false)
        })
    }
  }, [user])

  // 2. HANDLE BOOKING LOGIC
  const handleBooking = async (stylistId, startTime) => {
    const response = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: user.id,
        service_id: selectedService.id,
        stylist_id: stylistId,
        start_time: startTime
      })
    });

    if (response.ok) {
      alert("Booking Confirmed!");
      setSelectedService(null); // Close modal
    } else {
      alert("Failed to book. Check server console.");
    }
  };

  // 3. SHOW LOGIN SCREEN IF NOT LOGGED IN
  if (!user) {
    return <Login />
  }

  // 4. GROUPING ALGORITHM (Zero Hard-Coding)
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
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-light uppercase tracking-[0.2em]">
            Hair By Amnesia
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-xs uppercase tracking-widest text-gray-400 hidden md:block">
              {user.email}
            </span>
            <button 
              onClick={signOut}
              className="text-xs font-bold uppercase tracking-widest hover:text-red-600 transition"
            >
              Logout
            </button>
            <button className="bg-black text-white text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-gray-800 transition">
              Book Online
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-12 px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-light mb-4 text-gray-800">The Collection</h2>
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
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-xl font-light uppercase tracking-[0.15em] mb-8 text-center text-gray-500">
                  {category}
                </h3>
                <div className="grid gap-px bg-gray-100 border border-gray-100">
                  {groupedServices[category].map(service => (
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

      {/* Booking Modal Popup */}
      {selectedService && (
        <BookingModal 
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onConfirm={handleBooking}
        />
      )}
    </div>
  )
}

export default App