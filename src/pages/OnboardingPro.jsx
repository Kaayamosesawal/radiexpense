import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// ─── Constants ───────────────────────────────────────────────────────────────

const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Mbarara', 'Gulu',
  'Lira', 'Masaka', 'Entebbe', 'Arua', 'Fort Portal', 'Soroti', 'Kabale',
  'Tororo', 'Hoima', 'Kasese', 'Iganga', 'Busia', 'Other',
];

const PRO_FEATURES = [
  'Everything in Free, plus:',
  'Barcode / QR scanner & hardware support',
  'Custom branded invoices, taxes & discounts',
  'Customer profiles, loyalty programs & history',
  'Automated inventory updates from sales',
  'Supplier & purchase order management',
  'Multi-location / warehouse inventory',
  'Expiry date, batch & FIFO/LIFO tracking',
  'AI-powered insights & anomaly detection',
  'Budgeting, forecasting & tax reports',
  'Role-based team access (admin, cashier…)',
  'Accounting & e-commerce integrations',
  'Priority support & API access',
];

const ROLES = [
  { id: 'director', label: 'Director',   icon: '👑', desc: 'Full access — view all branches, reports, finances & team settings' },
  { id: 'manager',  label: 'Manager',    icon: '🗂️', desc: 'Manage stock, staff, daily ops & branch-level reports' },
  { id: 'accounts', label: 'Accounts',   icon: '📊', desc: 'Finance, expense logging, savings, tax reports & exports' },
  { id: 'sales_rep',label: 'Sales Rep',  icon: '🛒', desc: 'POS & receipts only — no access to finance or settings' },
];

const PRO_ADDONS = [
  { id: 'barcode',       label: 'Barcode / QR scanner integration' },
  { id: 'invoicing',     label: 'Custom branded invoices & taxes' },
  { id: 'loyalty',       label: 'Customer loyalty & profiles' },
  { id: 'suppliers',     label: 'Supplier & purchase orders' },
  { id: 'multiLocation', label: 'Multi-location / warehouse' },
  { id: 'expiry',        label: 'Expiry, batch & FIFO/LIFO tracking' },
  { id: 'ai',            label: 'AI insights & anomaly detection' },
  { id: 'forecasting',   label: 'Budgeting, forecasting & tax' },
  { id: 'integrations',  label: 'Accounting & e-commerce integrations' },
  { id: 'api',           label: 'API access' },
];

// Pricing config — edit amounts here
const PRICING = { monthly: { amount: 50000, label: 'UGX 50,000 / month' }, yearly: { amount: 500000, label: 'UGX 500,000 / year' } };

const MOBILE_MONEY = [
  {
    id: 'mtn',
    name: 'MTN Mobile Money',
    shortName: 'MTN MoMo',
    color: '#FFCC00',
    textColor: '#1a1a1a',
    logo: (
      <svg viewBox="0 0 60 24" className="h-5 w-auto" fill="none">
        <text x="0" y="18" fontFamily="Arial" fontWeight="900" fontSize="18" fill="#FFCC00">MTN</text>
      </svg>
    ),
    prefix: ['256 07', '256 077', '256 078'],
    placeholder: '0771 234 567',
    hint: 'MTN numbers: 077, 078',
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    shortName: 'Airtel Money',
    color: '#E40000',
    textColor: '#ffffff',
    logo: (
      <svg viewBox="0 0 80 24" className="h-5 w-auto" fill="none">
        <text x="0" y="18" fontFamily="Arial" fontWeight="900" fontSize="18" fill="#E40000">Airtel</text>
      </svg>
    ),
    prefix: ['256 07', '256 070', '256 075'],
    placeholder: '0701 234 567',
    hint: 'Airtel numbers: 070, 075',
  },
];

const steps = ['Account', 'Business', 'Team & Roles', 'Setup'];

// ─── Small shared components ──────────────────────────────────────────────────

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.684-4.274M6.228 6.228A9.96 9.96 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.398 2.816M6.228 6.228L3 3m3.228 3.228l3.65 3.65M17.772 17.772l3.228 3.228m-3.228-3.228l-3.65-3.65" />
  </svg>
);

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

// ─── Payment Modal ────────────────────────────────────────────────────────────

/**
 * paymentStage: 'select' | 'phone' | 'processing' | 'success'
 *
 * Integration note:
 *   Replace the simulatePaymentRequest() function below with your real
 *   Mobile Money API calls (e.g. MTN MoMo API, Airtel Money API, or an
 *   aggregator like Flutterwave / Pesapal).
 *   The function should initiate a push USSD prompt to the user's phone,
 *   then poll/webhook for the transaction status.
 */
function PaymentModal({ billingCycle, firstName, businessName, uid, onSuccess, onClose }) {
  const [visible, setVisible]         = useState(false);
  const [stage, setStage]             = useState('select');  // select | phone | processing | success
  const [provider, setProvider]       = useState(null);
  const [payPhone, setPayPhone]       = useState('');
  const [phoneError, setPhoneError]   = useState('');
  const [processingStep, setProcessingStep] = useState(0);

  const price = PRICING[billingCycle];

  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  // Processing animation steps
  const PROC_STEPS = [
    'Connecting to ' + (provider?.shortName ?? 'network') + '…',
    'Sending payment prompt to your phone…',
    'Waiting for your approval…',
    'Confirming transaction…',
    'Activating Pro plan…',
  ];

  useEffect(() => {
    if (stage !== 'processing') return;
    let i = 0;
    setProcessingStep(0);
    const interval = setInterval(() => {
      i += 1;
      if (i < PROC_STEPS.length) {
        setProcessingStep(i);
      } else {
        clearInterval(interval);
        // ── Replace the block below with your real API call result handler ──
        // On real success from your webhook/poll: call setStage('success')
        // On failure: call setStage('phone') and show an error
        setStage('success');
      }
    }, 1400);
    return () => clearInterval(interval);
  }, [stage]);

  const validatePhone = () => {
    const cleaned = payPhone.replace(/\s/g, '');
    if (!cleaned) { setPhoneError('Phone number is required'); return false; }
    if (!/^(0|\+?256)\d{9}$/.test(cleaned)) { setPhoneError('Enter a valid Ugandan mobile number'); return false; }
    setPhoneError('');
    return true;
  };

  const handleProceed = () => {
    if (!validatePhone()) return;
    setStage('processing');
    // ── Real integration point ──
    // simulatePaymentRequest({ provider: provider.id, phone: payPhone, amount: price.amount, uid });
  };

  const handleSuccess = async () => {
    // Update Firestore to mark payment complete and activate Pro
    try {
      await updateDoc(doc(db, 'users', uid), {
        planStatus:     'active',
        paymentProvider: provider.id,
        paymentPhone:   payPhone,
        paidAt:         serverTimestamp(),
        planExpiresAt:  billingCycle === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30  * 24 * 60 * 60 * 1000),
      });
    } catch (e) {
      console.warn('Could not update payment status:', e);
    }
    onSuccess();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 transition-all duration-300 ${visible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div className={`relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>

        {/* Top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-radi-orange via-orange-400 to-amber-400" />

        {/* ── Stage: SELECT PROVIDER ── */}
        {stage === 'select' && (
          <div className="p-7">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Complete payment</p>
                <h2 className="text-2xl font-black text-radi-dark tracking-tight">Choose payment method</h2>
                <p className="text-gray-400 text-sm mt-1">Pay via Mobile Money to activate your Pro plan.</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-1" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Amount summary */}
            <div className="bg-radi-dark rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Amount due</p>
                <p className="text-white font-black text-xl">{price.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">RadiExpense Pro · {businessName}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-radi-orange/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Provider cards */}
            <div className="space-y-3 mb-6">
              {MOBILE_MONEY.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setProvider(p); setStage('phone'); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-app-bg hover:border-gray-300 hover:shadow-sm transition-all text-left group"
                >
                  {/* Provider colour swatch + name */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: p.color }}>
                    <span className="font-black text-xs leading-tight text-center px-1" style={{ color: p.textColor }}>
                      {p.id === 'mtn' ? 'MTN' : 'AIRTEL'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-radi-dark text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.hint}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-radi-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400">
              🔒 Payments are processed securely. Your PIN is never shared with us.
            </p>
          </div>
        )}

        {/* ── Stage: ENTER PHONE ── */}
        {stage === 'phone' && provider && (
          <div className="p-7">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setStage('select'); setPhoneError(''); }}
                className="w-8 h-8 rounded-full bg-app-bg flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-0.5">{provider.name}</p>
                <h2 className="text-xl font-black text-radi-dark tracking-tight">Enter your mobile number</h2>
              </div>
            </div>

            {/* Provider badge */}
            <div className="flex items-center gap-3 p-3 rounded-2xl mb-5" style={{ backgroundColor: provider.color + '18', border: `2px solid ${provider.color}40` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: provider.color }}>
                <span className="font-black text-[10px]" style={{ color: provider.textColor }}>
                  {provider.id === 'mtn' ? 'MTN' : 'AIRTEL'}
                </span>
              </div>
              <div>
                <p className="font-black text-radi-dark text-sm">{provider.name}</p>
                <p className="text-xs text-gray-500">{price.label}</p>
              </div>
            </div>

            {/* Phone input */}
            <div className="mb-5">
              <Label required>Mobile Money Number</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <span className="text-sm font-black text-radi-dark">🇺🇬</span>
                  <span className="text-sm font-black text-gray-400">+256</span>
                  <div className="w-px h-4 bg-gray-300" />
                </div>
                <input
                  className={`${inputClass} pl-24`}
                  type="tel"
                  placeholder={provider.placeholder}
                  value={payPhone}
                  onChange={e => { setPayPhone(e.target.value); setPhoneError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleProceed()}
                />
              </div>
              {phoneError
                ? <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{phoneError}</p>
                : <p className="text-gray-400 text-xs mt-1.5 ml-1">A USSD push prompt will be sent to this number. Enter your PIN to approve.</p>
              }
            </div>

            {/* Amount reminder */}
            <div className="bg-app-bg rounded-2xl p-4 mb-5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-semibold">RadiExpense Pro ({billingCycle})</span>
                <span className="font-black text-radi-dark">{price.label.split(' / ')[0]}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                <span>Billed to {firstName}</span>
                <span>{billingCycle === 'yearly' ? 'Annual subscription' : 'Monthly subscription'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceed}
              className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${provider.color}, ${provider.color}cc)`, color: provider.textColor }}
            >
              Send Payment Prompt →
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              🔒 Secure · Your PIN is entered on your phone, never here.
            </p>
          </div>
        )}

        {/* ── Stage: PROCESSING ── */}
        {stage === 'processing' && (
          <div className="p-7 text-center">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 rounded-full border-4 border-radi-orange border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">
                  {provider?.id === 'mtn' ? '📲' : '📱'}
                </span>
              </div>
            </div>

            <h2 className="text-xl font-black text-radi-dark tracking-tight mb-2">Processing payment…</h2>
            <p className="text-gray-400 text-sm mb-6">
              Check your phone for a <span className="font-bold text-radi-dark">{provider?.name}</span> payment prompt and enter your PIN to confirm.
            </p>

            {/* Animated step list */}
            <div className="text-left space-y-3 bg-app-bg rounded-2xl p-5">
              {PROC_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${i <= processingStep ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                    i < processingStep  ? 'bg-green-500 text-white'
                    : i === processingStep ? 'bg-radi-orange text-white'
                    : 'bg-gray-200'
                  }`}>
                    {i < processingStep
                      ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      : i === processingStep
                      ? <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      : null
                    }
                  </div>
                  <span className={`text-xs font-semibold ${i <= processingStep ? 'text-radi-dark' : 'text-gray-400'}`}>{s}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-4">Do not close this window. This usually takes under 30 seconds.</p>
          </div>
        )}

        {/* ── Stage: SUCCESS ── */}
        {stage === 'success' && (
          <div className="p-7 text-center">
            <div className="relative mx-auto mb-5 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping opacity-40" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Payment confirmed</p>
            <h2 className="text-2xl font-black text-radi-dark tracking-tight mb-2">
              Pro Plan Activated! 🎉
            </h2>
            <p className="text-gray-500 text-sm mb-1">
              Welcome to <span className="font-black text-radi-dark">RadiExpense Pro</span>, {firstName}!
            </p>
            <p className="text-gray-400 text-xs mb-6">
              {price.label} paid via {provider?.name}. A receipt has been sent to your registered email.
            </p>

            <div className="bg-app-bg rounded-2xl p-4 text-left mb-6 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Now unlocked for {businessName}</p>
              {PRO_FEATURES.slice(1, 6).map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-radi-dark">{f}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">+ {PRO_FEATURES.length - 6} more advanced features</p>
            </div>

            <button
              type="button"
              onClick={handleSuccess}
              className="w-full bg-radi-dark text-white py-4 rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95 shadow-lg"
            >
              Launch My Pro Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPro({ setView }) {
  const [step, setStep]                   = useState(0);
  const [showPayment, setShowPayment]     = useState(false);
  const [createdUid, setCreatedUid]       = useState(null);
  const [errors, setErrors]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [firebaseError, setFirebaseError] = useState('');

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    businessName: '', language: 'English',
    businessType: '', businessTypeOther: '', businessSize: '',
    locations: 1, address: '', district: '',
    teamSize: '', selectedRoles: [],
    teamMembers: [{ name: '', role: '', email: '' }],
    currency: 'UGX', posHardware: '', importData: '',
    priorityAddons: [], billingCycle: 'monthly',
    additionalInfo: '', agreeTerms: false, subscribeUpdates: false,
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleRole  = id => setForm(f => ({ ...f, selectedRoles:   f.selectedRoles.includes(id)   ? f.selectedRoles.filter(x => x !== id)   : [...f.selectedRoles, id] }));
  const toggleAddon = id => setForm(f => ({ ...f, priorityAddons:  f.priorityAddons.includes(id)  ? f.priorityAddons.filter(x => x !== id)  : [...f.priorityAddons, id] }));

  const addTeamMember    = () => setForm(f => ({ ...f, teamMembers: [...f.teamMembers, { name: '', role: '', email: '' }] }));
  const removeMember     = i  => setForm(f => ({ ...f, teamMembers: f.teamMembers.filter((_, idx) => idx !== i) }));
  const updateMember     = (i, field, value) => setForm(f => {
    const m = [...f.teamMembers]; m[i] = { ...m[i], [field]: value }; return { ...f, teamMembers: m };
  });

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.fullName.trim())                                      e.fullName       = 'Required';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))   e.email          = 'Valid email required';
      if (!form.phone.trim())                                         e.phone          = 'Required';
      if (!form.password || form.password.length < 6)                e.password       = 'Min 6 characters';
      if (form.password !== form.confirmPassword)                     e.confirmPassword = 'Passwords do not match';
      if (!form.businessName.trim())                                  e.businessName   = 'Required';
    }
    if (step === 1) {
      if (!form.businessType)                                         e.businessType   = 'Required';
      if (form.businessType === 'other' && !form.businessTypeOther.trim()) e.businessTypeOther = 'Please specify';
      if (!form.businessSize)                                         e.businessSize   = 'Required';
    }
    if (step === 3) {
      if (!form.agreeTerms)                                           e.agreeTerms     = 'You must agree to continue';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => { setErrors({}); setStep(s => s - 1); };

  // Step 4 submit — creates account then opens payment modal
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setFirebaseError('');
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = credential.user.uid;
      await sendEmailVerification(credential.user);

      await setDoc(doc(db, 'users', uid), {
        plan: 'pro', planStatus: 'pending_payment', uid,
        fullName: form.fullName, email: form.email, phone: form.phone,
        businessName: form.businessName, language: form.language,
        businessType: form.businessType === 'other' ? form.businessTypeOther : form.businessType,
        businessSize: form.businessSize, locations: form.locations,
        address: form.address, district: form.district,
        teamSize: form.teamSize, selectedRoles: form.selectedRoles,
        teamMembers: form.teamMembers.filter(m => m.name.trim() || m.email.trim()),
        currency: form.currency, posHardware: form.posHardware,
        importData: form.importData, priorityAddons: form.priorityAddons,
        billingCycle: form.billingCycle, additionalInfo: form.additionalInfo,
        subscribeUpdates: form.subscribeUpdates, createdAt: serverTimestamp(),
      });

      setCreatedUid(uid);
      setShowPayment(true);
    } catch (err) {
      const messages = {
        'auth/email-already-in-use':   'An account with this email already exists.',
        'auth/invalid-email':          'Please enter a valid email address.',
        'auth/weak-password':          'Password must be at least 6 characters.',
        'auth/network-request-failed': 'Network error — please check your connection.',
      };
      setFirebaseError(messages[err.code] || `Something went wrong: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    // Send welcome email (non-blocking) now that the Pro plan is active
    sendWelcomeEmail(form.fullName, form.email, form.businessName);
    setView && setView('pro-dashboard'); // links to your Pro dashboard / ProTier page
  };

  /**
   * Sends the welcome / onboarding-appreciation email by calling our own
   * backend (server.js), which uses the Resend API server-side. The Resend
   * API key never touches the browser.
   *
   * Setup:
   *  1. Run the email server: `npm run server` (see server.js)
   *  2. Add to your .env file:
   *       VITE_EMAIL_API_URL=http://localhost:4000
   */
  const sendWelcomeEmail = async (fullName, email, businessName) => {
    try {
      const apiUrl = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/send-welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          businessName,
          plan: 'pro',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.warn('Welcome email send failed:', err);
      }
    } catch (err) {
      // Email failure is non-blocking — account/payment already succeeded.
      console.warn('Could not send welcome email:', err);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Payment Modal */}
      {showPayment && createdUid && (
        <PaymentModal
          billingCycle={form.billingCycle}
          firstName={form.fullName.split(' ')[0]}
          businessName={form.businessName}
          uid={createdUid}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
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
            <div className="inline-flex items-center gap-2 bg-radi-dark text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-radi-orange inline-block" />
              Pro Tier
            </div>
            <h1 className="text-3xl font-black text-radi-dark tracking-tight mb-2">Set up your Pro account</h1>
            <p className="text-gray-500 text-sm font-medium">Built for growing businesses & teams. Pay via Mobile Money.</p>
          </div>

          {/* ── Pro feature strip ── */}
          <div className="bg-radi-dark rounded-[2rem] p-5 mb-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-radi-orange/10 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-3">What you unlock</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRO_FEATURES.slice(1, 7).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-300 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5 text-radi-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-3">+ {PRO_FEATURES.length - 7} more advanced features</p>
          </div>

          {/* ── Stepper ── */}
          <div className="flex items-center justify-center gap-0 mb-10">
            {steps.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    i < step   ? 'bg-radi-orange text-white'
                    : i === step ? 'bg-radi-dark text-white ring-4 ring-radi-dark/10'
                    : 'bg-gray-200 text-gray-400'
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
                  <h2 className="text-xl font-black text-radi-dark tracking-tight">Admin account</h2>
                  <p className="text-gray-400 text-sm mt-1">The primary account owner — you can add team members in step 3.</p>
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
                  <PasswordInput label="Password" required placeholder="Min 6 characters"
                    value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} />
                  <PasswordInput label="Confirm Password" required placeholder="Repeat password"
                    value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} error={errors.confirmPassword} />
                  <div className="sm:col-span-2">
                    <Label required>Business / Company Name</Label>
                    <input className={inputClass} placeholder="Nakato Supermarket Ltd" value={form.businessName}
                      onChange={e => set('businessName', e.target.value)} />
                    {errors.businessName && <p className="text-radi-orange text-xs mt-1 ml-1 font-semibold">{errors.businessName}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Preferred Language</Label>
                    <select className={inputClass} value={form.language} onChange={e => set('language', e.target.value)}>
                      <option>English</option><option>Luganda</option><option>Swahili</option><option>Other</option>
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
                  <p className="text-gray-400 text-sm mt-1">Help us configure Pro features for your business type.</p>
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
                      <input className={inputClass} placeholder="e.g. Hardware Store" value={form.businessTypeOther}
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

            {/* ── STEP 2: Team & Roles ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Step 3 of 4</p>
                  <h2 className="text-xl font-black text-radi-dark tracking-tight">Team & role setup</h2>
                  <p className="text-gray-400 text-sm mt-1">Define who can access what. You can also adjust this after setup.</p>
                </div>
                <div>
                  <Label>Which roles does your business need?</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {ROLES.map(({ id, label, icon, desc }) => {
                      const selected = form.selectedRoles.includes(id);
                      return (
                        <button key={id} type="button" onClick={() => toggleRole(id)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${selected ? 'border-radi-orange bg-radi-orange/5' : 'border-gray-100 bg-app-bg hover:border-gray-200'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{icon}</span>
                            <span className="font-black text-radi-dark text-sm">{label}</span>
                            {selected && (
                              <span className="ml-auto w-5 h-5 rounded-full bg-radi-orange text-white flex items-center justify-center flex-shrink-0">
                                <CheckIcon />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-medium leading-relaxed">{desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Add team members (optional)</Label>
                    <button type="button" onClick={addTeamMember}
                      className="text-xs font-black text-radi-orange hover:underline uppercase tracking-widest">
                      + Add another
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.teamMembers.map((member, i) => (
                      <div key={i} className="bg-app-bg rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Team member {i + 1}</p>
                          {i > 0 && (
                            <button type="button" onClick={() => removeMember(i)}
                              className="text-xs text-gray-400 hover:text-red-400 font-bold transition-colors">Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input className={inputClass} placeholder="Full name" value={member.name}
                            onChange={e => updateMember(i, 'name', e.target.value)} />
                          <select className={inputClass} value={member.role}
                            onChange={e => updateMember(i, 'role', e.target.value)}>
                            <option value="">Role…</option>
                            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                          </select>
                          <input className={inputClass} type="email" placeholder="Email (optional)"
                            value={member.email} onChange={e => updateMember(i, 'email', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-radi-dark rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-2">Pro expiry policy</p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    When your Pro subscription expires, advanced tools are locked and team member access is suspended — but <span className="text-white font-semibold">all data is preserved</span>. Renew anytime to restore everything instantly.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 3: Setup & billing ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Step 4 of 4</p>
                  <h2 className="text-xl font-black text-radi-dark tracking-tight">Setup & billing</h2>
                  <p className="text-gray-400 text-sm mt-1">Choose your billing cycle then complete payment via Mobile Money.</p>
                </div>

                <div className="pt-2 space-y-5">

                  {/* Billing cycle picker */}
                  <div>
                    <Label required>Billing Cycle</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {[
                        { value: 'monthly', label: 'Monthly',  price: 'UGX 50,000 / mo', badge: null },
                        { value: 'yearly',  label: 'Annually', price: 'UGX 500,000 / yr', badge: 'Save ~17%' },
                      ].map(({ value, label, price, badge }) => (
                        <button key={value} type="button" onClick={() => set('billingCycle', value)}
                          className={`relative p-4 rounded-2xl border-2 text-left transition-all ${form.billingCycle === value ? 'border-radi-orange bg-radi-orange/5' : 'border-gray-100 bg-app-bg hover:border-gray-200'}`}>
                          {badge && (
                            <span className="absolute -top-2.5 right-3 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">{badge}</span>
                          )}
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${form.billingCycle === value ? 'border-radi-orange' : 'border-gray-300'}`}>
                              {form.billingCycle === value && <div className="w-2 h-2 rounded-full bg-radi-orange" />}
                            </div>
                            <span className="font-black text-radi-dark text-sm">{label}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-semibold ml-6">{price}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile money preview */}
                  <div className="bg-app-bg rounded-2xl p-4 flex items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded-xl bg-[#FFCC00] flex items-center justify-center">
                        <span className="text-[10px] font-black text-black">MTN</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#E40000] flex items-center justify-center">
                        <span className="text-[10px] font-black text-white">AIR</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-black text-radi-dark">Pay via MTN MoMo or Airtel Money</p>
                      <p className="text-xs text-gray-400">You'll choose your provider after this step</p>
                    </div>
                  </div>

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
                    { field: 'posHardware', label: 'POS hardware (barcode scanner / receipt printer)?', opts: ['Yes, I have it', 'No', 'Planning to buy'] },
                    { field: 'importData',  label: 'Import existing data? (products, past expenses)',   opts: ['Yes', 'No'] },
                  ].map(({ field, label, opts }) => (
                    <div key={field}>
                      <Label>{label}</Label>
                      <div className="flex gap-3 flex-wrap">
                        {opts.map(opt => (
                          <button key={opt} type="button" onClick={() => set(field, opt)}
                            className={`px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all ${form[field] === opt ? 'border-radi-orange bg-radi-orange/5 text-radi-dark' : 'border-gray-100 bg-app-bg text-gray-400 hover:border-gray-200'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div>
                    <Label>Priority Pro features (select the ones you need most)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {PRO_ADDONS.map(({ id, label }) => {
                        const selected = form.priorityAddons.includes(id);
                        return (
                          <button key={id} type="button" onClick={() => toggleAddon(id)}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${selected ? 'border-radi-orange bg-radi-orange/5 text-radi-dark' : 'border-gray-100 bg-app-bg text-gray-500 hover:border-gray-200'}`}>
                            <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all ${selected ? 'bg-radi-orange text-white' : 'bg-gray-200'}`}>
                              {selected && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-xs font-semibold">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Additional info / specific needs</Label>
                    <textarea className={inputClass} rows="3"
                      placeholder='e.g. "We run 3 branches in Kampala and need live stock sync between them"'
                      value={form.additionalInfo} onChange={e => set('additionalInfo', e.target.value)} />
                  </div>

                  {/* Consent */}
                  <div className="space-y-3 pt-1">
                    <button type="button" onClick={() => set('agreeTerms', !form.agreeTerms)}
                      className="flex items-start gap-3 text-left w-full">
                      <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 border-2 transition-all ${form.agreeTerms ? 'bg-radi-orange border-radi-orange text-white' : 'border-gray-300'}`}>
                        {form.agreeTerms && <CheckIcon />}
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        I agree to the <span className="text-radi-orange font-bold">Terms of Service</span> and <span className="text-radi-orange font-bold">Privacy Policy</span><span className="text-radi-orange"> *</span>
                      </p>
                    </button>
                    {errors.agreeTerms && <p className="text-radi-orange text-xs ml-8 font-semibold">{errors.agreeTerms}</p>}

                    <button type="button" onClick={() => set('subscribeUpdates', !form.subscribeUpdates)}
                      className="flex items-start gap-3 text-left w-full">
                      <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 border-2 transition-all ${form.subscribeUpdates ? 'bg-radi-orange border-radi-orange text-white' : 'border-gray-300'}`}>
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
                <button type="button" onClick={back}
                  className="px-6 py-4 rounded-2xl font-bold text-sm text-gray-500 bg-app-bg hover:bg-gray-100 transition-all">
                  ← Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button type="button" onClick={next}
                  className="flex-1 bg-radi-dark text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95">
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
                  <button type="button" onClick={handleSubmit} disabled={loading}
                    className="w-full bg-radi-orange text-white py-4 rounded-2xl font-black text-sm hover:bg-orange-500 transition-all shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Setting up your account…
                      </>
                    ) : (
                      <>Proceed to Payment →</>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    You'll choose MTN MoMo or Airtel Money on the next screen.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 font-medium">
            Just need the basics?{' '}
            <button onClick={() => setView && setView('onboarding-free')} className="text-radi-orange font-bold hover:underline">Start with Free →</button>
          </p>
          <p className="text-center text-xs text-gray-400 mt-2 font-medium">
            Already have an account?{' '}
            <button onClick={() => setView && setView('login')} className="text-radi-orange font-bold hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </>
  );
}