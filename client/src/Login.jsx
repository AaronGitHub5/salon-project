import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';

export default function Login() {
  const { signIn, signUp, user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewParam = searchParams.get('review');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Detect password reset link
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsResetPassword(true);
    }
  }, []);

  // Redirect once both user and role are resolved
  useEffect(() => {
    if (!user || !role) return;
    const appPath = reviewParam ? `/app?review=${reviewParam}` : '/app';
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'stylist') navigate('/stylist', { replace: true });
    else navigate(appPath, { replace: true });
  }, [user, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMode = () => {
    setIsSignUp(v => !v);
    setError('');
    setConfirmPassword('');
    setPhone('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone_number: phone || null,
            },
          },
        });
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('An account with this email already exists. Please log in instead.');
          } else {
            throw error;
          }
          return;
        }
        alert('Account created! Please check your email to verify your account before logging in.');
      } else {
        const { error } = await signIn({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setError('Please verify your email address before logging in. Check your inbox for a confirmation link from no-reply@hairbyamnesia.co.uk');
          } else {
            throw error;
          }
          return;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://hairbyamnesia.co.uk/login',
      });
      if (error) throw error;
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        setIsResetPassword(false);
        window.location.hash = '';
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RESET PASSWORD FORM ---
  if (isResetPassword) {
    const resetMismatch = confirmNewPassword && confirmNewPassword !== newPassword;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="bg-white p-8 rounded shadow-lg w-96 border border-gray-100">
          <h2 className="text-2xl font-light uppercase tracking-widest mb-2 text-center">New Password</h2>
          <p className="text-xs text-gray-400 text-center mb-6">Enter and confirm your new password below.</p>
          {error && <p className="bg-red-50 text-red-600 p-3 text-xs mb-4">{error}</p>}
          {success && <p className="bg-green-50 text-green-600 p-3 text-xs mb-4">{success}</p>}
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">New Password <span className="text-gray-300">(min. 6 characters)</span></label>
              <input
                type="password"
                placeholder="New password"
                minLength={6}
                required
                className="w-full border p-3 text-sm focus:outline-black transition"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="Repeat new password"
                required
                className={`w-full border p-3 text-sm focus:outline-black transition ${resetMismatch ? 'border-red-300' : ''}`}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              {resetMismatch && <p className="text-xs text-red-500 mt-1">✕ Passwords do not match</p>}
            </div>
            <button
              disabled={loading || !!resetMismatch}
              className="bg-black text-white p-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- FORGOT PASSWORD FORM ---
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="bg-white p-8 rounded shadow-lg w-96 border border-gray-100">
          <h2 className="text-2xl font-light uppercase tracking-widest mb-2 text-center">Reset Password</h2>
          <p className="text-xs text-gray-400 text-center mb-6">Enter your email and we'll send you a reset link.</p>
          {error && <p className="bg-red-50 text-red-600 p-3 text-xs mb-4">{error}</p>}
          {success && <p className="bg-green-50 text-green-600 p-3 text-xs mb-4">{success}</p>}
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email Address"
              required
              className="border p-3 text-sm focus:outline-black transition"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={loading} className="bg-black text-white p-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <p className="text-center mt-6 text-xs text-gray-400">
            <button onClick={() => setIsForgotPassword(false)} className="text-black underline">Back to Login</button>
          </p>
        </div>
      </div>
    );
  }

  // --- MAIN LOGIN / SIGNUP FORM ---
  const passwordMismatch = isSignUp && confirmPassword && confirmPassword !== password;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="bg-white p-8 rounded shadow-lg w-96 border border-gray-100">
        <h2 className="text-2xl font-light uppercase tracking-widest mb-6 text-center">
          {isSignUp ? 'Join Us' : 'Sign In'}
        </h2>

        {error && <p className="bg-red-50 text-red-600 p-3 text-xs mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  className="w-full border p-3 text-sm focus:outline-black transition"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">
                  Phone Number <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 07700 900000"
                  className="w-full border p-3 text-sm focus:outline-black transition"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            {isSignUp && (
              <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
            )}
            <input
              type="email"
              placeholder="Email Address"
              className="w-full border p-3 text-sm focus:outline-black transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            {isSignUp && (
              <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">
                Password <span className="text-gray-300">(min. 6 characters)</span>
              </label>
            )}
            <input
              type="password"
              placeholder="Password"
              className="w-full border p-3 text-sm focus:outline-black transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat password"
                className={`w-full border p-3 text-sm focus:outline-black transition ${passwordMismatch ? 'border-red-300' : ''}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {passwordMismatch && (
                <p className="text-xs text-red-500 mt-1">✕ Passwords do not match</p>
              )}
            </div>
          )}

          <button
            disabled={loading || !!passwordMismatch}
            className="bg-black text-white p-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Login'}
          </button>
        </form>

        {!isSignUp && (
          <p className="text-center mt-4 text-xs text-gray-400">
            <button onClick={() => setIsForgotPassword(true)} className="text-black underline">
              Forgot password?
            </button>
          </p>
        )}

        <p className="text-center mt-4 text-xs text-gray-400">
          {isSignUp ? 'Already have an account?' : 'New client?'}{' '}
          <button onClick={handleToggleMode} className="text-black underline font-bold">
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}