import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export default function AdminDashboard({ onBack }) {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', price: '', duration: 60, category: 'Cutting' });
  const [refresh, setRefresh] = useState(0);

  // 1. Fetch Data
  useEffect(() => {
    fetch('http://localhost:5000/api/services')
      .then(res => res.json())
      .then(data => setServices(data));
  }, [refresh]);

  // 2. Add Service
  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:5000/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newService.name,
        base_price: newService.price,
        duration_minutes: newService.duration,
        category: newService.category
      })
    });
    setRefresh(prev => prev + 1); // Reload list
    alert("Service Added!");
  };

  // 3. Delete Service
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    await fetch(`http://localhost:5000/api/services/${id}`, { method: 'DELETE' });
    setRefresh(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans p-8">
      <header className="flex justify-between items-center mb-8 bg-white p-4 shadow-sm rounded-lg">
        <h1 className="text-2xl font-bold text-gray-800">Admin Control Panel</h1>
        <button onClick={onBack} className="text-sm bg-black text-white px-4 py-2 rounded">
          Back to Site
        </button>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* LEFT: Add Form */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-sm h-fit">
          <h2 className="text-lg font-bold mb-4">Add Service</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <input required placeholder="Service Name" className="w-full border p-2 rounded" 
              onChange={e => setNewService({...newService, name: e.target.value})} />
            
            <select className="w-full border p-2 rounded" 
              onChange={e => setNewService({...newService, category: e.target.value})}>
              <option value="Cutting">Cutting</option>
              <option value="Colour">Colour</option>
              <option value="Styling">Styling</option>
            </select>

            <div className="flex gap-2">
              <input required type="number" placeholder="Price (£)" className="w-1/2 border p-2 rounded" 
                onChange={e => setNewService({...newService, price: e.target.value})} />
              <input required type="number" placeholder="Mins" className="w-1/2 border p-2 rounded" defaultValue="60"
                onChange={e => setNewService({...newService, duration: e.target.value})} />
            </div>

            <button className="w-full bg-black text-white p-3 rounded font-bold hover:bg-gray-800">
              Create Service
            </button>
          </form>
        </div>

        {/* RIGHT: List */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-4">Current Menu ({services.length})</h2>
          <div className="space-y-2">
            {services.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50">
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.category} • {s.duration_minutes}m</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-green-600">£{s.base_price}</span>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}