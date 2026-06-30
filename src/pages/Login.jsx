import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// ── Icons ────────────────────────────────────────────────────────────────────

const EyeIcon = ({ open }) => open ? (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

// ── Error messages ────────────────────────────────────────────────────────────

const AUTH_ERRORS = {
  'auth/user-not-found':         'No account found with this email.',
  'auth/wrong-password':         'Incorrect password. Use the password you set during sign-up.',
  'auth/invalid-credential':     'Incorrect email or password.',
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/too-many-requests':      'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection.',
  'auth/user-disabled':          'This account has been disabled.',
};

// ── Component ─────────────────────────────────────────────────────────────────

const Login = ({ setView }) => {
  const { loginWithEmail, hasUserProfile } = useAuth();

  const [mode, setMode]               = useState('form');
  const [form, setForm]               = useState({ email: '', password: '' });
  const [errors, setErrors]           = useState({});
  const [authError, setAuthError]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [blockedEmail, setBlockedEmail] = useState('');

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    if (authError) setAuthError('');
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.password || form.password.length < 6)
      e.password = 'Min 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Redirect helper — works whether the app uses setView or a URL router
  const goTo = (view) => {
    if (setView) {
      setView(view);
    } else {
      window.location.href = `/${view}`;
    }
  };

  // ── Email + password sign-in ─────────────────────────────────────────────
  // Flow:
  //  1. Firebase authenticates credentials — throws if wrong email/password.
  //  2. On success, check Firestore for a users/{uid} document.
  //  3. No document → user never completed onboarding → send to OnboardingFree.
  //  4. Document exists → fully registered → AuthContext state update routes
  //     the app to the dashboard automatically.
  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    setAuthError('');
    try {
      const result = await loginWithEmail(form.email.trim(), form.password);
      const uid = result.user.uid;

      const profileExists = await hasUserProfile(uid);
      if (!profileExists) {
        // Authenticated but no onboarding profile yet → send to onboarding.
        // The auth state is already set so OnboardingFree can write to users/{uid}.
        goTo('onboarding-free');
      }
      // If profile exists, AuthContext's onAuthStateChanged fires, the app's
      // top-level routing detects user != null and renders the dashboard.
    } catch (err) {
      const code = err.code;
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        // Could be truly unregistered OR wrong password — show not-registered
        // screen which gives them the option to go to onboarding or try again.
        setBlockedEmail(form.email.trim());
        setMode('not-registered');
      } else {
        setAuthError(AUTH_ERRORS[code] || `Something went wrong: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetToForm = () => {
    setMode('form');
    setForm({ email: '', password: '' });
    setErrors({});
    setAuthError('');
    setShowPass(false);
  };

  const inputBase    = 'w-full px-4 py-3.5 rounded-2xl bg-white border-2 outline-none transition-all text-sm font-semibold text-gray-900 placeholder-gray-300';
  const inputNormal  = `${inputBase} border-gray-100 focus:border-orange-400`;
  const inputErrored = `${inputBase} border-red-300 focus:border-red-400`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden"
      style={{ backgroundColor: '#FDF8F5' }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-10"
           style={{ backgroundColor: '#FF9800' }} />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-5"
           style={{ backgroundColor: '#111111' }} />

      {/* ── Logo lock-up ── */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-[2rem] blur-2xl scale-110 opacity-20"
               style={{ backgroundColor: '#FF9800' }} />
          <div
            className="relative w-20 h-20 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 active:scale-95 transition-transform"
            style={{ backgroundColor: '#111111' }}
          >
            <img src="/logo192.png" alt="RadiExpense" className="w-full h-full object-cover" />
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tighter leading-none" style={{ color: '#111111' }}>
          RadiExpense
        </h1>
        <p className="mt-2 text-sm text-gray-400 font-medium text-center max-w-[220px] leading-relaxed">
          Smart money tracking for your business
        </p>
      </div>

      {/* ── Card ── */}
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-xl border border-gray-100 p-7">

        {/* ══ MAIN LOGIN FORM ══════════════════════════════════════════════ */}
        {mode === 'form' && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-black tracking-tight" style={{ color: '#111111' }}>
                Welcome back
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Sign in with your registered account
              </p>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                className={errors.email ? inputErrored : inputNormal}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 ml-1 font-semibold">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your sign-up password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                  className={`${errors.password ? inputErrored : inputNormal} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 ml-1 font-semibold">{errors.password}</p>
              )}
              <p className="text-[10px] text-gray-400 font-medium mt-1.5 ml-1">
                Use the password you created during sign-up
              </p>
            </div>

            {authError && (
              <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                <p className="text-xs text-red-500 font-semibold text-center">{authError}</p>
              </div>
            )}

            {/* Sign In button */}
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              style={{ backgroundColor: '#FF9800', boxShadow: '0 8px 20px rgba(255,152,0,0.25)' }}
            >
              {loading ? <><Spinner /> Signing in…</> : 'Sign In'}
            </button>

            <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-300 mt-1">
              256-bit encrypted · Secure
            </p>

            {/* Link to onboarding */}
            <p className="text-center text-xs text-gray-400 font-medium mt-4">
              No account yet?{' '}
              <button
                onClick={() => goTo('onboarding-free')}
                className="font-bold hover:underline"
                style={{ color: '#FF9800' }}
              >
                Get started free →
              </button>
            </p>
          </>
        )}

        {/* ══ NOT REGISTERED / WRONG PASSWORD ═════════════════════════════ */}
        {mode === 'not-registered' && (
          <>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: '#111111' }}>
                Couldn't sign you in
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed max-w-[230px]">
                No account was found for{' '}
                <span className="font-bold break-all" style={{ color: '#111111' }}>{blockedEmail}</span>,
                or the password is incorrect.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 mb-5">
              <p className="text-xs text-amber-700 font-semibold text-center leading-relaxed">
                If you have an account, double-check your password — it's the one you created during sign-up, not your Gmail password.
              </p>
            </div>

            {/* Try again */}
            <button
              onClick={resetToForm}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 transition-all mb-3"
              style={{ backgroundColor: '#111111' }}
            >
              ← Try again
            </button>

            {/* Go to onboarding */}
            <p className="text-center text-xs text-gray-400 font-medium">
              Need an account?{' '}
              <button
                onClick={() => goTo('onboarding-free')}
                className="font-bold hover:underline"
                style={{ color: '#FF9800' }}
              >
                Get started free →
              </button>
            </p>
          </>
        )}
      </div>

      <p className="mt-8 text-[10px] text-gray-300 font-bold uppercase tracking-widest text-center">
        © {new Date().getFullYear()} RadiExpense · All rights reserved
      </p>
    </div>
  );
};

export default Login;