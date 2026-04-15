import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from './lib/supabase';
import { useToast } from './Notifications';
import API_URL from './config';

const loginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  .font-display { font-family: 'Cormorant Garamond', serif !important; }
`;

export default function Login() {
  const { signIn, signUp, user, role } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const reviewParam = searchParams.get('review');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
        toast.success('Account created! Please check your email to verify your account before logging in.');
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
      redirectTo: 'https://hairbyamnesia.co.uk/reset-password',

      });
      if (error) throw error;
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch = isSignUp && confirmPassword && confirmPassword !== password;

  // --- FORGOT PASSWORD FORM ---
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <style>{loginStyles}</style>
        <div className="w-full max-w-[420px] mx-4">
          <div className="text-center mb-10">
            <a href="/" className="font-display text-[1.3rem] font-medium tracking-wide text-[#1A1A18] no-underline">
              Hair by <span style={{ color: '#B8975A' }}>Amnesia</span>
            </a>
          </div>
          <div className="bg-white border border-[#E4E0D8] p-8 md:p-10">
            <h2 className="font-display text-[1.6rem] font-light text-[#1A1A18] text-center mb-2">Reset Password</h2>
            <p className="text-[0.75rem] font-light text-[#7A7870] text-center mb-8">Enter your email and we'll send you a reset link.</p>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-[0.78rem] font-light mb-5">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-[0.78rem] font-light mb-5">{success}</div>}
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email Address"
                required
                className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors"
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                disabled={loading}
                className="w-full bg-[#1A1A18] text-white py-3.5 text-[0.72rem] font-medium tracking-[0.12em] uppercase hover:bg-[#B8975A] transition-colors duration-200 border-none cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-center mt-6 text-[0.75rem] font-light text-[#7A7870]">
              <button onClick={() => setIsForgotPassword(false)} className="text-[#1A1A18] bg-transparent border-none cursor-pointer p-0 font-light" style={{ borderBottom: '1px solid #E4E0D8' }}>
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN LOGIN / SIGNUP FORM ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
      <style>{loginStyles}</style>
      <div className="w-full max-w-[420px] mx-4">
        <div className="text-center mb-10">
          <a href="/" className="font-display text-[1.3rem] font-medium tracking-wide text-[#1A1A18] no-underline">
            Hair by <span style={{ color: '#B8975A' }}>Amnesia</span>
          </a>
        </div>
        <div className="bg-white border border-[#E4E0D8] p-8 md:p-10">
          <h2 className="font-display text-[1.6rem] font-light text-[#1A1A18] text-center mb-8">
            {isSignUp ? 'Join Us' : 'Sign In'}
          </h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-[0.78rem] font-light mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <>
                <div>
                  <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Smith"
                    className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>
                    Phone Number <span className="text-[#B4A894]">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 07700 900000"
                    className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              {isSignUp && (
                <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>Email Address</label>
              )}
              <input
                type="email"
                placeholder="Email Address"
                className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              {isSignUp && (
                <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>
                  Password <span className="text-[#B4A894]">(min. 6 characters)</span>
                </label>
              )}
              <input
                type="password"
                placeholder="Password"
                className="w-full border border-[#E4E0D8] bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {isSignUp && (
              <div>
                <label className="text-[0.62rem] tracking-[0.15em] uppercase block mb-1.5" style={{ color: '#B8975A' }}>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  className={`w-full border bg-[#FAFAF8] px-4 py-3.5 text-[0.85rem] font-light text-[#1A1A18] placeholder-[#B4A894] focus:outline-none focus:border-[#B8975A] transition-colors ${passwordMismatch ? 'border-red-300' : 'border-[#E4E0D8]'}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {passwordMismatch && (
                  <p className="text-[0.75rem] text-red-500 mt-1.5 font-light">Passwords do not match</p>
                )}
              </div>
            )}

            <button
              disabled={loading || !!passwordMismatch}
              className="w-full bg-[#1A1A18] text-white py-3.5 text-[0.72rem] font-medium tracking-[0.12em] uppercase hover:bg-[#B8975A] transition-colors duration-200 border-none cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Login'}
            </button>
          </form>

          {!isSignUp && (
            <p className="text-center mt-5 text-[0.75rem] font-light text-[#7A7870]">
              <button onClick={() => setIsForgotPassword(true)} className="text-[#1A1A18] bg-transparent border-none cursor-pointer p-0 font-light" style={{ borderBottom: '1px solid #E4E0D8' }}>
                Forgot password?
              </button>
            </p>
          )}

          <div className="border-t border-[#E4E0D8] mt-6 pt-6">
            <p className="text-center text-[0.75rem] font-light text-[#7A7870]">
              {isSignUp ? 'Already have an account?' : 'New client?'}{' '}
              <button onClick={handleToggleMode} className="text-[#1A1A18] bg-transparent border-none cursor-pointer p-0 font-medium" style={{ borderBottom: '1px solid #B8975A' }}>
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
