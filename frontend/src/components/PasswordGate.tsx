import React, { useState } from 'react';
import { Lock, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { loginWithPassword } from '../services/api';

interface Props {
  onAuthenticated: () => void;
}

export const PasswordGate: React.FC<Props> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your access password.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await loginWithPassword(password);
    setLoading(false);

    if (result.success) {
      onAuthenticated();
    } else {
      setError(result.error || 'Incorrect password. Access denied.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neutral-800/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-neutral-900/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-neutral-800/80 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        {/* Brand Icon */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-bold text-lg tracking-tighter shadow-xl">
            SY
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Syncra Workspace</h1>
            <p className="text-xs text-neutral-400 mt-1">Private social auto-posting dashboard</p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
              Access Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password to unlock..."
                className="w-full pl-9 pr-10 py-2.5 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200 active:scale-95 transition shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Unlock Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Security Info */}
        <div className="pt-2 border-t border-neutral-900 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>Server-Side Authenticated • Zero Leak</span>
        </div>
      </div>
    </div>
  );
};
