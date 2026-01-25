import { useState, useEffect } from 'react'

function App() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:5000/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(data)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black text-white p-6">
        <h1 className="text-3xl font-bold">Hair by Amnesia</h1>
        <p className="text-gray-400">Book your appointment online</p>
      </header>

      {/* Services List */}
      <main className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Our Services</h2>
        
        {loading ? (
          <p>Loading services...</p>
        ) : (
          <div className="space-y-3">
            {services.map(service => (
              <div 
                key={service.id} 
                className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <h3 className="font-bold text-lg">{service.name}</h3>
                  <p className="text-gray-500">{service.duration_minutes} mins</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">
                    £{service.base_price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App