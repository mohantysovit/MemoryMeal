import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, contextMessage }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const mapAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before finishing. Please try again.';
      case 'auth/popup-blocked':
        return 'Popup was blocked by your browser. Please allow popups for this site and retry.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password). Please use Continue with Google or enable Email/Password in Firebase Console.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Switch to the Sign in tab.';
      case 'auth/weak-password':
        return 'Please choose a password with at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      default:
        return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (tab === 'signup' && name.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        onClose();
      } else {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: name.trim() });
        try {
          await sendEmailVerification(cred.user);
          setInfoMsg('Account created and verification email sent.');
        } catch {
          // Non-blocking verification email failure
        }
        onClose();
      }
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Memory Meals · Dehradun
            </p>
            <h2
              id="auth-modal-title"
              className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {contextMessage && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            {contextMessage}
          </p>
        )}

        {/* Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-xs transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span>or with email</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        {/* Sign in / Create account Tabs */}
        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
          role="tablist"
          aria-label="Account authentication mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signin'}
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            className={`min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === 'signin'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            className={`min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === 'signup'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3.5" noValidate>
          {tab === 'signup' && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Full Name
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Patnaik"
                  maxLength={100}
                  required
                  className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white pr-3.5 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={160}
                required
                className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white pr-3.5 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white pr-11 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-700 focus:outline-hidden focus:ring-2 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-1 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{infoMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] w-full rounded-xl bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            {loading
              ? 'Please wait...'
              : tab === 'signin'
                ? 'Sign in with Email'
                : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
