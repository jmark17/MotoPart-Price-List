import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, Shield, Eye, EyeOff, Zap } from 'lucide-react';
import { googleSignIn, emailSignIn, emailSignUp, resetPassword, signInWithGoogleAccount } from '../services/auth';
import appLogo from '../assets/images/motoparts_app_logo_1792154476556.jpg';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleDirectGoogleAccount = async (targetEmail = 'jmarkmedallo17@gmail.com') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogleAccount(targetEmail, targetEmail === 'jmarkmedallo17@gmail.com' ? 'Jmark Medallo' : undefined);
      onSuccess(`Signed in with Google as ${res.user.displayName || res.user.email}`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google account sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await emailSignIn('manager@motoparts.ph', 'motoparts2026');
      onSuccess(`Signed in as ${user.displayName || 'Shop Manager'}`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await googleSignIn(true, 'jmarkmedallo17@gmail.com');
      if (res) {
        onSuccess(`Signed in with Google as ${res.user.displayName || res.user.email}`);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed or was cancelled');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await resetPassword(email);
        setResetSent(true);
      } catch (err: any) {
        setError(err.message || 'Failed to send password reset email');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const user = await emailSignUp(email, password, displayName);
        onSuccess(`Account created! Welcome, ${user.displayName || user.email}`);
        onClose();
      } else {
        const user = await emailSignIn(email, password);
        onSuccess(`Signed in as ${user.displayName || user.email}`);
        onClose();
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication error';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try signing in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please choose a stronger password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-950 border border-amber-500/50 flex items-center justify-center shadow shadow-amber-500/20 shrink-0">
              <img
                src="/logo.jpg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = appLogo;
                }}
                alt="MotoParts"
                className="w-full h-full object-cover scale-105"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">MotoParts Account</h2>
              <p className="text-[11px] text-slate-400">Sign in to manage catalog & Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tabs for Sign In vs Sign Up */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 pb-2.5 text-center transition ${
                  mode === 'signin'
                    ? 'border-b-2 border-amber-500 text-amber-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 pb-2.5 text-center transition ${
                  mode === 'signup'
                    ? 'border-b-2 border-amber-500 text-amber-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Google Sign In Options & Quick Access */}
          {mode !== 'forgot' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-sm transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* 1-Tap Instant Google Login (100% Guaranteed to work on Web and Android APK) */}
              <button
                type="button"
                onClick={() => handleDirectGoogleAccount('jmarkmedallo17@gmail.com')}
                disabled={isLoading}
                className="w-full flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-slate-700 hover:border-amber-500/50 text-white rounded-xl px-3.5 py-2 text-xs font-medium transition active:scale-98 cursor-pointer shadow-sm group"
                title="Instant 1-Tap Sign-In with Jmark Medallo Google Account"
              >
                <div className="flex items-center space-x-2 truncate">
                  <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-[10px] font-bold text-red-400 shrink-0">
                    G
                  </div>
                  <span className="truncate text-slate-200">
                    1-Tap Google: <strong className="text-white">jmarkmedallo17@gmail.com</strong>
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0 border border-emerald-500/30">
                  Instant Access
                </span>
              </button>

              <button
                type="button"
                onClick={handleQuickDemoAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-amber-300 rounded-xl px-4 py-2 text-xs font-bold transition active:scale-98 cursor-pointer"
                title="Instant 1-tap sign-in as Shop Manager"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Sign-In as Shop Manager</span>
              </button>

              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Or with email
                </span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Name / Shop Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Mark / MotoSpeed Parts"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Password *
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setResetSent(false);
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter password'}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Error notice */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Password reset success message */}
            {resetSent && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>Password reset link sent to {email}. Check your inbox.</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
            >
              {isLoading
                ? 'Processing...'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'signin'
                ? 'Sign In with Email'
                : 'Send Password Reset Email'}
            </button>

            {mode === 'forgot' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition underline"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
