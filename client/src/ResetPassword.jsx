import { useState } from 'react';
import { useAuth } from './AuthContext';
import API_URL from './config';

export default function ResetPassword() {
  const { session, isRecoveryMode, clearRecoveryMode } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // AuthContext handles the recovery hash and sets isRecoveryMode + session
  if (!isRecoveryMode || !session?.access_token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="bg-white p-8 rounded shadow-lg w-96 border border-gray-100 text-center">
          <h2 className="text-2xl font-light uppercase tracking-widest mb-4">Invalid Link</h2>
          <p className="text-sm text-gray-500 mb-6">This password reset link is invalid or has expired. Please request a new one.</p>
          <a href="/login" className="text-black underline text-sm font-bold">Back to Login</a>
        </div>
      </div>
    );
  }

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password updated successfully! Redirecting to login...');
      clearRecoveryMode();
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            {resetMismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
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
