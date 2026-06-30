import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// ─── Constants ──────────────────────────────────────────────────────────────

const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Mbarara', 'Gulu',
  'Lira', 'Masaka', 'Entebbe', 'Arua', 'Fort Portal', 'Soroti', 'Kabale',
  'Tororo', 'Hoima', 'Kasese', 'Iganga', 'Busia', 'Other',
];

const FEATURES = [
  { id: 'pos',       label: 'Daily POS / Sales' },
  { id: 'inventory', label: 'Inventory / Stock Management' },
  { id: 'expense',   label: 'Expense Tracking' },
  { id: 'savings',   label: 'Savings & Earnings Goals' },
  { id: 'loans',     label: 'Loans / Borrowed Money Tracking' },
  { id: 'reports',   label: 'Basic Reporting' },
];

const FREE_FEATURES = [
  'Basic POS — cash, card & mobile money',
  'Digital & print receipt generation',
  'Manual stock tracking + low-stock alerts',
  'Expense & income logging',
  'Savings goals with progress tracking',
  'Loan & borrowing records',
  'Daily sales & finance summaries',
  'CSV / PDF export',
  'Offline mode with sync',
  'Single-user account',
];

const NEXT_STEPS = [
  'Verify your email to activate your account',
  'Complete your business profile',
  'Import sample or existing data',
  'Take a guided tour of Free features',
];

const steps = ['Account', 'Business', 'Usage', 'Setup'];

// ─── Small shared components ─────────────────────────────────────────────────

const CheckIcon = ({ size = 'sm' }) => {
  const d = size === 'lg'
    ? 'w-6 h-6'
    : size === 'xl'
    ? 'w-8 h-8'
    : 'w-3.5 h-3.5';
  return (
    <svg className={d} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
    </svg>
  );
};

const EyeIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.684-4.274M6.228 6.228A9.96 9.96 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.398 2.816M6.228 6.228L3 3m3.228 3.228l3.65 3.65M17.772 17.772l3.228 3.228m-3.228-3.228l-3.65-3.65" />
  </svg>
);

/** Reusable password field with show/hide toggle */
const PasswordInput = ({ placeholder, value, onChange, error, label, required: req }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && <Label required={req}>{label}</Label>}
      <div className="relative">
        <input
          className={inputClass + ' pr-12'}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-radi-orange transition-colors focus:outline-none"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{error}</p>}
    </div>
  );
};

const Label = ({ children, required }) => (
  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
    {children}{required && <span className="text-radi-orange ml-1">*</span>}
  </label>
);

const inputClass =
  'w-full p-4 bg-app-bg rounded-2xl border border-transparent focus:border-radi-orange focus:ring-2 focus:ring-radi-orange/20 outline-none transition-all font-semibold text-radi-dark placeholder-gray-300 text-sm';

// ─── Congratulations Modal ────────────────────────────────────────────────────

function CongratulationsModal({ firstName, email, businessName, onContinue }) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    /* Backdrop */
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 transition-all duration-300 ${
        visible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      {/* Modal card */}
      <div
        className={`relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
        }`}
      >
        {/* Orange accent strip */}
        <div className="h-2 w-full bg-gradient-to-r from-radi-orange via-orange-400 to-amber-400" />

        <div className="p-8 text-center">

          {/* Animated trophy / check */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-radi-orange/10 animate-ping opacity-30" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-radi-orange to-orange-400 flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Headline */}
          <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-2">
            Free Plan Activated
          </p>
          <h2 className="text-3xl font-black text-radi-dark tracking-tight mb-2">
            Congratulations, {firstName}! 🎉
          </h2>
          <p className="text-gray-500 text-sm font-medium leading-relaxed mb-1">
            Your <span className="text-radi-dark font-bold">RadiExpense Free</span> account is ready.
            Welcome aboard — you're now part of a growing community of smart Ugandan business owners.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            A confirmation email has been sent to{' '}
            <span className="text-radi-dark font-semibold">{email}</span>.
            Please verify it to fully activate your account.
          </p>

          {/* What's next */}
          <div className="bg-app-bg rounded-2xl p-5 text-left mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
              Your next steps
            </p>
            {NEXT_STEPS.map((item, i) => (
              <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                <div className="w-6 h-6 rounded-full bg-radi-orange text-white flex items-center justify-center text-xs font-black flex-shrink-0 shadow-sm">
                  {i + 1}
                </div>
                <p className="text-sm font-semibold text-radi-dark">{item}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onContinue}
            className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg mb-3"
          >
            Go to My Dashboard →
          </button>
          <p className="text-xs text-gray-400">
            Questions?{' '}
            <a href="mailto:support@radiexpense.com" className="text-radi-orange font-bold hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingFree({ setView }) {
  const [step, setStep]               = useState(0);
  const [showModal, setShowModal]     = useState(false);
  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);
  const [firebaseError, setFirebaseError] = useState('');

  const [form, setForm] = useState({
    // Step 0 — Account
    fullName:         '',
    email:            '',
    phone:            '',
    password:         '',
    confirmPassword:  '',
    businessName:     '',
    language:         'English',
    // Step 1 — Business
    businessType:     '',
    businessTypeOther:'',
    businessSize:     '',
    locations:        1,
    address:          '',
    district:         '',
    // Step 2 — Usage
    features:         [],
    tierInterest:     '',
    // Step 3 — Setup
    currency:         'UGX',
    multiUser:        '',
    posHardware:      '',
    importData:       '',
    additionalInfo:   '',
    // Consent
    agreeTerms:       false,
    subscribeUpdates: false,
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleFeature = (id) => {
    setForm(f => ({
      ...f,
      features: f.features.includes(id)
        ? f.features.filter(x => x !== id)
        : [...f.features, id],
    }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.fullName.trim())                               e.fullName        = 'Required';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email      = 'Valid email required';
      if (!form.phone.trim())                                  e.phone           = 'Required';
      if (!form.password || form.password.length < 6)         e.password        = 'Min 6 characters';
      if (form.password !== form.confirmPassword)             e.confirmPassword  = 'Passwords do not match';
      if (!form.businessName.trim())                           e.businessName    = 'Required';
    }
    if (step === 1) {
      if (!form.businessType)                                  e.businessType    = 'Required';
      if (form.businessType === 'other' && !form.businessTypeOther.trim()) e.businessTypeOther = 'Please specify';
      if (!form.businessSize)                                  e.businessSize    = 'Required';
    }
    if (step === 3) {
      if (!form.agreeTerms)                                    e.agreeTerms      = 'You must agree to continue';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => { setErrors({}); setStep(s => s - 1); };

  /**
   * Sends the welcome / onboarding-appreciation email by calling our own
   * backend (server.js), which uses the Resend API server-side.
   *
   * The Resend API key never touches the browser — it lives only in
   * server.js's environment. The frontend just calls the local API.
   *
   * Setup:
   *  1. Run the email server: `npm run server` (see server.js)
   *  2. Add to your .env file:
   *       VITE_EMAIL_API_URL=http://localhost:4000
   */
  const sendCongratulationsEmail = async (fullName, email, businessName) => {
    try {
      const apiUrl = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/send-welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          businessName,
          plan: 'free',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.warn('Welcome email send failed:', err);
      }
    } catch (err) {
      // Email failure is non-blocking — account was already created successfully.
      console.warn('Could not send welcome email:', err);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setFirebaseError('');
    try {
      // 1. Create the Firebase Auth user
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = credential.user.uid;

      // 2. Send Firebase email verification
      await sendEmailVerification(credential.user);

      // 3. Write the user profile to Firestore
      await setDoc(doc(db, 'users', uid), {
        plan:         'free',
        uid,
        fullName:     form.fullName,
        email:        form.email,
        phone:        form.phone,
        businessName: form.businessName,
        language:     form.language,
        businessType: form.businessType === 'other' ? form.businessTypeOther : form.businessType,
        businessSize: form.businessSize,
        locations:    form.locations,
        address:      form.address,
        district:     form.district,
        features:     form.features,
        tierInterest: form.tierInterest,
        currency:     form.currency,
        multiUser:    form.multiUser,
        posHardware:  form.posHardware,
        importData:   form.importData,
        additionalInfo: form.additionalInfo,
        subscribeUpdates: form.subscribeUpdates,
        createdAt:    serverTimestamp(),
      });

      // 4. Send welcome email (non-blocking)
      await sendCongratulationsEmail(
        form.fullName,
        form.email,
        form.businessName,
      );

      // 5. Show the congratulations modal
      setShowModal(true);

    } catch (err) {
      const messages = {
        'auth/email-already-in-use':    'An account with this email already exists.',
        'auth/invalid-email':           'Please enter a valid email address.',
        'auth/weak-password':           'Password must be at least 6 characters.',
        'auth/network-request-failed':  'Network error — please check your connection.',
      };
      setFirebaseError(messages[err.code] || `Something went wrong: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to FreeTier page after user dismisses the modal
  const handleContinueToDashboard = () => {
    setShowModal(false);
    setView && setView('free-tier'); // links to Pages/FreeTier.jsx
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Congratulations Modal (portal-like overlay) */}
      {showModal && (
        <CongratulationsModal
          firstName={form.fullName.split(' ')[0]}
          email={form.email}
          businessName={form.businessName}
          onContinue={handleContinueToDashboard}
        />
      )}

      <div className="min-h-screen bg-app-bg py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* ── Header ── */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-radi-orange rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="font-black text-lg text-radi-dark">RadiExpense</span>
            </div>
            <div className="inline-block bg-radi-orange/10 text-radi-orange text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4">
              Free Tier
            </div>
            <h1 className="text-3xl font-black text-radi-dark tracking-tight mb-2">Set up your free account</h1>
            <p className="text-gray-500 text-sm font-medium">Perfect for solo operators & small shops. No credit card needed.</p>
          </div>

          {/* ── Stepper ── */}
          <div className="flex items-center justify-center gap-0 mb-10">
            {steps.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    i < step  ? 'bg-radi-orange text-white' :
                    i === step ? 'bg-radi-dark text-white ring-4 ring-radi-dark/10' :
                                 'bg-gray-200 text-gray-400'
                  }`}>
                    {i < step ? <CheckIcon /> : i + 1}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest mt-1.5 ${i === step ? 'text-radi-dark' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px w-12 sm:w-20 mb-4 mx-1 transition-all ${i < step ? 'bg-radi-orange' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Card ── */}
          <div className="bg-white rounded-[2.5rem] shadow-soft border border-gray-100 p-8 sm:p-10">

            {/* ── STEP 0: Account ── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Step 1 of 4</p>
                  <h2 className="text-xl font-black text-radi-dark tracking-tight">Personal & account info</h2>
                  <p className="text-gray-400 text-sm mt-1">This will be your login and primary contact details.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="sm:col-span-2">
                    <Label required>Full Name</Label>
                    <input className={inputClass} placeholder="Jane Nakato" value={form.fullName}
                      onChange={e => set('fullName', e.target.value)} />
                    {errors.fullName && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.fullName}</p>}
                  </div>
                  <div>
                    <Label required>Email Address</Label>
                    <input className={inputClass} type="email" placeholder="you@business.com" value={form.email}
                      onChange={e => set('email', e.target.value)} />
                    {errors.email && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.email}</p>}
                  </div>
                  <div>
                    <Label required>Phone Number</Label>
                    <input className={inputClass} placeholder="+256 700 000 000" value={form.phone}
                      onChange={e => set('phone', e.target.value)} />
                    {errors.phone && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.phone}</p>}
                  </div>
                  <PasswordInput
                    label="Password"
                    required
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    error={errors.password}
                  />
                  <PasswordInput
                    label="Confirm Password"
                    required
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    error={errors.confirmPassword}
                  />
                  <div className="sm:col-span-2">
                    <Label required>Business / Company Name</Label>
                    <input className={inputClass} placeholder="Nakato General Store" value={form.businessName}
                      onChange={e => set('businessName', e.target.value)} />
                    {errors.businessName && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.businessName}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Preferred Language</Label>
                    <select className={inputClass} value={form.language} onChange={e => set('language', e.target.value)}>
                      <option>English</option>
                      <option>Luganda</option>
                      <option>Swahili</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 1: Business ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Step 2 of 4</p>
                  <h2 className="text-xl font-black text-radi-dark tracking-tight">Business details</h2>
                  <p className="text-gray-400 text-sm mt-1">Help us tailor your setup to your business.</p>
                </div>
                <div className="pt-2 space-y-4">
                  <div>
                    <Label required>Business Type</Label>
                    <select className={inputClass} value={form.businessType} onChange={e => set('businessType', e.target.value)}>
                      <option value="">Select type…</option>
                      <option value="retail">Retail Shop</option>
                      <option value="grocery">Grocery / Supermarket</option>
                      <option value="restaurant">Restaurant / Cafe</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="services">Services (Salon, Repair, etc.)</option>
                      <option value="other">Other (please specify)</option>
                    </select>
                    {errors.businessType && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.businessType}</p>}
                  </div>
                  {form.businessType === 'other' && (
                    <div>
                      <Label required>Please specify</Label>
                      <input className={inputClass} placeholder="e.g. Bookshop" value={form.businessTypeOther}
                        onChange={e => set('businessTypeOther', e.target.value)} />
                      {errors.businessTypeOther && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.businessTypeOther}</p>}
                    </div>
                  )}
                  <div>
                    <Label required>Business Size</Label>
                    <select className={inputClass} value={form.businessSize} onChange={e => set('businessSize', e.target.value)}>
                      <option value="">Select size…</option>
                      <option value="micro">Solo / Micro (1–5 staff)</option>
                      <option value="small">Small (6–20 staff)</option>
                      <option value="medium">Medium (21+ staff)</option>
                    </select>
                    {errors.businessSize && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.businessSize}</p>}
                  </div>
                  <div>
                    <Label>Number of Locations / Branches</Label>
                    <input className={inputClass} type="number" min="1" value={form.locations}
                      onChange={e => set('locations', e.target.value)} />
                  </div>
                  <div>
                    <Label>Physical Address</Label>
                    <textarea className={inputClass} rows="2" placeholder="Street, building, area…"
                      value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div>
                    <Label>District / City</Label>
                    <select className={inputClass} value={form.district} onChange={e => set('district', e.target.value)}>
                      <option value="">Select district…</option>
                      {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Usage ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Step 3 of 4</p>
                  <h2 className="text-xl font-black text-radi-dark tracking-tight">Features & usage</h2>
                  <p className="text-gray-400 text-sm mt-1">Tell us what you'll use RadiExpense for.</p>
                </div>

                <div className="pt-2">
                  <Label>Primary use cases (select all that apply)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {FEATURES.map(({ id, label }) => {
                      const checked = form.features.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleFeature(id)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                            checked
                              ? 'border-radi-orange bg-radi-orange/5 text-radi-dark'
                              : 'border-gray-100 bg-app-bg text-gray-500 hover:border-gray-200'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all ${
                            checked ? 'bg-radi-orange text-white' : 'bg-gray-200'
                          }`}>
                            {checked && <CheckIcon />}
                          </div>
                          <span className="text-sm font-semibold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <Label>Plan interest</Label>
                  <div className="space-y-3 mt-2">
                    {[
                      { value: 'free',   label: 'Free Tier',      sub: 'Simple daily operations' },
                      { value: 'pro',    label: 'Pro Features',   sub: 'Advanced POS, Inventory & Analytics' },
                      { value: 'unsure', label: 'Not sure yet',   sub: "I'll explore and decide later" },
                    ].map(({ value, label, sub }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set('tierInterest', value)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                          form.tierInterest === value
                            ? 'border-radi-orange bg-radi-orange/5'
                            : 'border-gray-100 bg-app-bg hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          form.tierInterest === value ? 'border-radi-orange' : 'border-gray-300'
                        }`}>
                          {form.tierInterest === value && <div className="w-2.5 h-2.5 rounded-full bg-radi-orange" />}
                        </div>
                        <div>
                          <p className="font-bold text-radi-dark text-sm">{label}</p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Setup ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Step 4 of 4</p>
                  <h2 className="text-xl font-black text-radi-dark tracking-tight">Setup preferences</h2>
                  <p className="text-gray-400 text-sm mt-1">Almost done — a few quick setup choices.</p>
                </div>

                <div className="pt-2 space-y-5">
                  <div>
                    <Label required>Currency</Label>
                    <select className={inputClass} value={form.currency} onChange={e => set('currency', e.target.value)}>
                      <option value="UGX">Ugandan Shillings (UGX) — recommended</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="KES">Kenyan Shilling (KES)</option>
                      <option value="TZS">Tanzanian Shilling (TZS)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {[
                    { field: 'multiUser',   label: 'Do you need multi-user access?',                        opts: ['Yes', 'No'] },
                    { field: 'posHardware', label: 'POS hardware (barcode scanner / receipt printer)?',     opts: ['Yes, I have it', 'No', 'Planning to buy'] },
                    { field: 'importData',  label: 'Import existing data? (products, past expenses)',        opts: ['Yes', 'No'] },
                  ].map(({ field, label, opts }) => (
                    <div key={field}>
                      <Label>{label}</Label>
                      <div className="flex gap-3 flex-wrap">
                        {opts.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => set(field, opt)}
                            className={`px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                              form[field] === opt
                                ? 'border-radi-orange bg-radi-orange/5 text-radi-dark'
                                : 'border-gray-100 bg-app-bg text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div>
                    <Label>Additional info / specific needs</Label>
                    <textarea
                      className={inputClass}
                      rows="3"
                      placeholder='e.g. "I run a small grocery in Kampala and need good stock alerts"'
                      value={form.additionalInfo}
                      onChange={e => set('additionalInfo', e.target.value)}
                    />
                  </div>

                  {/* What's included */}
                  <div className="bg-app-bg rounded-2xl p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Your free plan includes</p>
                    <ul className="space-y-2">
                      {FREE_FEATURES.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setView && setView('onboarding-pro')}
                      className="mt-4 text-xs font-black text-radi-orange hover:underline uppercase tracking-widest"
                    >
                      Need more? See Pro features →
                    </button>
                  </div>

                  {/* Consent */}
                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={() => set('agreeTerms', !form.agreeTerms)}
                      className="flex items-start gap-3 text-left w-full"
                    >
                      <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 border-2 transition-all ${
                        form.agreeTerms ? 'bg-radi-orange border-radi-orange text-white' : 'border-gray-300'
                      }`}>
                        {form.agreeTerms && <CheckIcon />}
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        I agree to the{' '}
                        <span className="text-radi-orange font-bold">Terms of Service</span>
                        {' '}and{' '}
                        <span className="text-radi-orange font-bold">Privacy Policy</span>
                        <span className="text-radi-orange"> *</span>
                      </p>
                    </button>
                    {errors.agreeTerms && <p className="text-radi-orange text-xs ml-8 font-semibold">{errors.agreeTerms}</p>}

                    <button
                      type="button"
                      onClick={() => set('subscribeUpdates', !form.subscribeUpdates)}
                      className="flex items-start gap-3 text-left w-full"
                    >
                      <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 border-2 transition-all ${
                        form.subscribeUpdates ? 'bg-radi-orange border-radi-orange text-white' : 'border-gray-300'
                      }`}>
                        {form.subscribeUpdates && <CheckIcon />}
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Sign me up for product updates & tips (optional)</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation ── */}
            <div className={`flex gap-3 mt-8 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="px-6 py-4 rounded-2xl font-bold text-sm text-gray-500 bg-app-bg hover:bg-gray-100 transition-all"
                >
                  ← Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 bg-radi-dark text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95"
                >
                  Continue →
                </button>
              ) : (
                <div className="flex-1 space-y-3">
                  {firebaseError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                      <svg className="w-4 h-4 text-radi-orange flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <p className="text-radi-orange text-xs font-semibold">{firebaseError}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Creating your account…
                      </>
                    ) : (
                      'Create My RadiExpense Account & Start Setup'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 font-medium">
            Already have an account?{' '}
            <button onClick={() => setView && setView('login')} className="text-radi-orange font-bold hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </>
  );
}