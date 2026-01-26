import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Call Supabase function
    const { error } = isSignUp 
      ? await signUp({ email, password })
      : await signIn({ email, password });

    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="bg-white p-8 rounded shadow-lg w-96 border border-gray-100">
        <h2 className="text-2xl font-light uppercase tracking-widest mb-6 text-center">
          {isSignUp ? 'Join Us' : 'Sign In'}
        </h2>
        
        {error && <p className="bg-red-50 text-red-600 p-3 text-xs mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email Address"
            className="border p-3 text-sm focus:outline-black transition"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-3 text-sm focus:outline-black transition"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button disabled={loading} className="bg-black text-white p-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition">
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Login')}
          </button>
        </form>

        <p className="text-center mt-6 text-xs text-gray-400">
          {isSignUp ? 'Already have an account?' : "New client?"} {' '}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-black underline font-bold"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}