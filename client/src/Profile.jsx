import { useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "./lib/supabase";

export default function Profile({ onBack }) {
  const { user, role } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 10000);
    });

    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const result = await Promise.race([
        supabase.auth.updateUser({ password: newPassword }),
        timeoutPromise,
      ]);

      const { error } = result;

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Password updated successfully!" });
        setNewPassword("");
        setShowPasswordForm(false);
      }
    } catch (err) {
      console.error("Password update error:", err);
      setMessage({
        type: "error",
        text: err.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.email?.split("@")[0] || "Guest";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 tracking-wide">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-light uppercase tracking-[0.2em]">
            Hair By Amnesia
          </div>
          <button
            onClick={onBack}
            className="text-xs font-bold uppercase tracking-widest hover:text-gray-500 transition flex items-center gap-2"
          >
            <span>←</span> Back to Menu
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          {/* Welcome Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-light mb-3">
              Welcome back, {displayName}
            </h1>
            <div className="w-12 h-0.5 bg-black mx-auto mt-6"></div>
          </div>

          {/* Account Details */}
          <div className="border border-gray-200 p-6 mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">
              Account Details
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-mono">{user?.email}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Role</span>
                <span className="text-xs uppercase tracking-widest bg-gray-100 px-3 py-1">
                  {role}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-500">Password</span>
                <button
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setMessage({ type: "", text: "" });
                    setNewPassword("");
                  }}
                  className="text-xs uppercase tracking-widest underline hover:no-underline"
                >
                  {showPasswordForm ? "Cancel" : "Change"}
                </button>
              </div>

              {showPasswordForm && (
                <form
                  onSubmit={handlePasswordChange}
                  className="pt-4 space-y-4"
                >
                  {message.text && (
                    <div
                      className={`p-3 text-xs ${
                        message.type === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="New password (min 6 characters)"
                    className="w-full border border-gray-200 p-3 text-sm focus:outline-none focus:border-black transition"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />

                  <button
                    type="submit"
                    disabled={loading || newPassword.length < 6}
                    className="w-full bg-black text-white text-xs uppercase tracking-widest py-3 hover:bg-gray-800 transition disabled:bg-gray-300"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onBack}
                className="border border-black bg-black text-white text-xs uppercase tracking-widest py-4 hover:bg-gray-800 transition"
              >
                Book Now
              </button>
              <button
                onClick={onBack}
                className="border border-gray-200 text-xs uppercase tracking-widest py-4 hover:border-black transition"
              >
                View Services
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest">
            Hair By Amnesia © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}