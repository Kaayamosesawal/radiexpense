import React, { useState } from 'react';

// ── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ children, bg, color }) => (
  <div className={`${bg} ${color} w-12 h-12 flex items-center justify-center rounded-xl mb-4 flex-shrink-0`}>
    {children}
  </div>
);

// ── Section Label ─────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <span className="inline-block bg-radi-orange/10 text-radi-orange text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4">
    {children}
  </span>
);

// ── Feature Card ──────────────────────────────────────────────────────────────

const FeatureCard = ({ icon, bg, color, title, desc }) => (
  <div className="glass-card p-8 rounded-[2rem] text-left hover:shadow-xl transition-shadow duration-300">
    <Icon bg={bg} color={color}>{icon}</Icon>
    <h3 className="font-black text-radi-dark uppercase text-sm tracking-widest mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

// ── Tier Card ─────────────────────────────────────────────────────────────────

const TierCard = ({ label, name, tagline, price, features, cta, highlight, setView, destination }) => (
  <div className={`relative rounded-[2rem] p-8 flex flex-col gap-6 ${highlight ? 'bg-radi-dark text-white shadow-2xl scale-105' : 'glass-card text-radi-dark'}`}>
    {highlight && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-radi-orange text-white text-xs font-black uppercase tracking-widest px-5 py-2 rounded-full shadow">
        Most Popular
      </div>
    )}
    <div>
      <p className={`text-xs font-black uppercase tracking-widest mb-1 ${highlight ? 'text-radi-orange' : 'text-radi-orange'}`}>{label}</p>
      <h3 className="text-2xl font-black">{name}</h3>
      <p className={`text-sm mt-1 ${highlight ? 'text-gray-300' : 'text-gray-500'}`}>{tagline}</p>
    </div>
    <div>
      <span className="text-4xl font-black">{price}</span>
      {price !== 'Free' && <span className={`text-sm ml-1 ${highlight ? 'text-gray-400' : 'text-gray-400'}`}>/month</span>}
    </div>
    <ul className="flex flex-col gap-3 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlight ? 'text-radi-orange' : 'text-radi-orange'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span className={highlight ? 'text-gray-200' : 'text-gray-600'}>{f}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={() => setView(destination)}
      className={`mt-2 w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
        highlight
          ? 'bg-radi-orange text-white hover:bg-orange-500 shadow-lg'
          : 'bg-radi-dark text-white hover:bg-black'
      }`}
    >
      {cta}
    </button>
  </div>
);

// ── Home Page ─────────────────────────────────────────────────────────────────

const Home = ({ setView }) => {
  const [openFaq, setOpenFaq] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);

  const coreFeatures = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      bg: 'bg-radi-orange/10', color: 'text-radi-orange',
      title: 'Smart Tracking',
      desc: 'Eliminates the tedious work of manually sorting expenses by using intelligent automation to instantly categorize every transaction, whether it\'s a morning coffee, grocery run, subscription payment, or large transfer.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-green-100', color: 'text-green-600',
      title: 'Savings Router',
      desc: 'Effortless wealth-building engine. It automatically diverts a chosen percentage of every income or sale directly into your dedicated savings Pot, before you even get a chance to spend it. Set it once, and watch your savings grow consistently with every inflow.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      bg: 'bg-purple-100', color: 'text-purple-600',
      title: 'Point of Sale',
      desc: 'A fast, intuitive, and all-in-one checkout system designed for small businesses, freelancers, pop-up shops, market traders, and service providers. Whether you’re selling products or services, you can complete sales quickly and professionally, all within the same app that manages your personal and business finances.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      bg: 'bg-blue-100', color: 'text-blue-600',
      title: 'Inventory Control',
      desc: 'Complete visibility and control over your stock in real time. Whether you sell physical products, manage supplies, or run a small retail operation, this feature ensures you always know what you have, what’s running low, and what needs reordering, while eliminating manual stock updates.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      bg: 'bg-yellow-100', color: 'text-yellow-600',
      title: 'Loans & Borrowing',
      desc: 'Full visibility and control over all your debts and receivables. Whether you lend money to friends or family, borrow for business or personal needs, or manage informal loans, this feature keeps every transaction organized, transparent, and easy to track, with automatic reminders and interest calculations.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bg: 'bg-red-100', color: 'text-red-500',
      title: 'Reports & Exports',
      desc: 'Transforms all your financial data into clear, professional, and actionable insights. With just one tap, you can generate beautiful summaries of your income, expenses, sales, inventory, loans, and savings, then export them instantly for accounting, tax filing, investors, or personal records.',
    },
  ];

  const freeTier = {
    label: 'Starter',
    name: 'Free',
    tagline: 'Perfect for solo operators & small shops',
    price: 'Free',
    features: [
      'Basic POS cash, card & mobile money',
      'Digital & print receipt generation',
      'Manual stock tracking + low-stock alerts',
      'Expense & income logging',
      'Savings goals with progress tracking',
      'Loan & borrowing records',
      'Daily sales & finance summaries',
      'CSV / PDF export',
      'Offline mode with sync',
      'Single-user account',
    ],
    cta: 'Get Started Free',
    highlight: false,
  };

  const paidTier = {
    label: 'Professional',
    name: 'Pro',
    tagline: 'Built for growing businesses & teams',
    price: 'Ugx 35,000',
    features: [
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
    ],
    cta: 'Go Pro',
    highlight: true,
  };

  const faqs = [
    {
      q: 'Do I need to pay to start using RadiExpense?',
      a: 'No. The Free tier gives you full POS, inventory tracking, expense logging, savings goals, and loan management at no cost, no credit card required.',
    },
    {
      q: 'Can I use RadiExpense offline?',
      a: 'Yes. The app works offline and automatically syncs your data when you reconnect to the internet.',
    },
    {
      q: 'What payment methods does the POS support?',
      a: 'Cash, card, and mobile money are all supported out of the box. Pro users can add additional payment gateways and split-payment options.',
    },
    {
      q: 'Can multiple staff members use the same account?',
      a: 'The Free tier supports a single user. Pro unlocks role-based access for teams admin, cashier, inventory manager, and more.',
    },
    {
      q: 'How do I export my financial data?',
      a: 'Any plan can export daily, weekly, or monthly reports to CSV or PDF directly from the dashboard.',
    },
  ];

  return (
    <div id="home" className="animate-in">

      {/* ── HERO ── */}
      <section className="pt-20 pb-24 text-center px-4">
        <SectionLabel>Track Smarter · Sell Faster · Grow Confidently</SectionLabel>
        <h1 className="font-black text-radi-dark mb-6 tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 5vw, 2.75rem)',
              lineHeight: '1.22',
              letterSpacing: '-0.03em',
            }}>
          The Smarter Way to Run{' '}
          <span className="text-radi-orange block sm:inline">Your Business.</span>
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ fontSize: 'clamp(0.9375rem, 1.5vw, 1.0625rem)' }}>
          RadiExpense combines a full Point of Sale, inventory management, and personal finance tools
          into one clean, intuitive platform, free to start, built to scale.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => setView('download')}
            className="bg-radi-dark text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-2xl active:scale-95"
          >
            Install Now. It's Free
          </button>
          <button
            onClick={() => setShowFeatures(v => !v)}
            className="bg-white border-2 border-gray-200 text-radi-dark px-10 py-5 rounded-2xl font-bold text-lg hover:border-radi-orange transition-all active:scale-95 flex items-center gap-2 justify-center"
          >
            See All Features
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${showFeatures ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* ── FEATURE LIST DROPDOWN ── */}
        {showFeatures && (
          <div className="mt-10 max-w-4xl mx-auto text-left animate-in">
            <div className="glass-card rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100">
              {/* Header */}
              <div className="bg-radi-dark text-white px-8 py-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tight">RadiExpense – Complete Feature List</h3>
                  <p className="text-gray-400 text-sm mt-1">Free vs Pro Tiers</p>
                </div>
                <button
                  onClick={() => setShowFeatures(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

                {/* ── FREE TIER ── */}
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-green-100 text-green-700 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full">Free Tier</span>
                    <span className="text-gray-400 text-sm">No credit card required</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5">Core Features for Daily Operations</p>
                  <p className="text-xs text-gray-400 italic mb-6">Ideal for small shops &amp; starters</p>

                  {[
                    {
                      category: 'POS (Point of Sale)',
                      items: [
                        'Quick sales recording with item lookup by name or basic barcode',
                        'Support for Cash, Mobile Money, and Card payments',
                        'Basic digital receipt generation',
                        'Daily sales summary report',
                        'Offline mode with automatic sync',
                      ],
                    },
                    {
                      category: 'Inventory Management',
                      items: [
                        'Add and manage products with stock quantities',
                        'Simple stock update after sales',
                        'Low stock alerts',
                        'Basic product categories',
                      ],
                    },
                    {
                      category: 'Finance & Money Management',
                      items: [
                        'Expense tracking with categories',
                        'Automatic earnings/sales income recording from POS',
                        'Savings goals setup and progress tracking',
                        'Record borrowed money and loans with repayment tracking',
                        'Basic daily/weekly financial summary (Income vs Expenses)',
                        'Cash flow overview',
                      ],
                    },
                    {
                      category: 'General Features',
                      items: [
                        'User-friendly dashboard with key metrics',
                        'Single user or limited multi-user access',
                        'Data export to CSV/PDF',
                        'Basic reports (sales, expenses, stock)',
                        'Mobile-responsive web app',
                      ],
                    },
                  ].map(({ category, items }) => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h4 className="text-xs font-black uppercase tracking-widest text-radi-dark mb-3 flex items-center gap-2">
                        <span className="w-4 h-px bg-radi-orange inline-block"></span>
                        {category}
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* ── PRO TIER ── */}
                <div className="p-8 bg-radi-dark/[0.02]">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-radi-orange/10 text-radi-orange text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full">Pro Tier</span>
                    <span className="text-gray-400 text-sm">Ugx 35,000/month</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5">Advanced Features for Growing Businesses</p>
                  <p className="text-xs text-gray-400 italic mb-6">&nbsp;</p>

                  {[
                    {
                      category: 'Advanced POS',
                      items: [
                        'Full barcode/QR scanning support',
                        'Custom branded receipts and invoices with taxes & discounts',
                        'Advanced payment integrations and split payments',
                        'Customer loyalty program and purchase history',
                        'Refund and void transaction handling',
                        'Real-time sales analytics and hourly trends',
                        'Profit margin calculation per item',
                      ],
                    },
                    {
                      category: 'Advanced Inventory',
                      items: [
                        'Automatic stock deduction from sales',
                        'Supplier management and purchase orders',
                        'Multi-location/warehouse support',
                        'Batch/expiry date tracking',
                        'Inventory valuation and turnover reports',
                        'Smart re-order suggestions',
                      ],
                    },
                    {
                      category: 'Advanced Finance & Money Management',
                      items: [
                        'Full budgeting with category limits and alerts',
                        'Detailed loan management with interest calculation and amortization',
                        'Automated savings rules and multiple savings goals',
                        'Tax calculation and reporting (Uganda compliant)',
                        'Advanced financial reports (Profit & Loss, Balance Sheet)',
                        'Cash flow forecasting',
                        'AI-powered spending insights and anomaly detection',
                      ],
                    },
                    {
                      category: 'Business Management & Team',
                      items: [
                        'Full multi-user access with role-based permissions (Cashier, Manager, Admin)',
                        'Staff attendance and performance tracking',
                        'Detailed audit logs',
                        'Custom business branding',
                      ],
                    },
                    {
                      category: 'Analytics & Reporting',
                      items: [
                        'Rich interactive dashboards and charts',
                        'Advanced sales, inventory, and financial analytics',
                        'Exportable professional reports',
                        'Performance comparison (daily/weekly/monthly)',
                      ],
                    },
                    {
                      category: 'Additional Pro Features',
                      items: [
                        'Priority customer support',
                        'Data backup and recovery options',
                        'API access for custom integrations',
                        'Mobile app enhancements',
                        'Ad-free experience and higher storage limits',
                      ],
                    },
                  ].map(({ category, items }) => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h4 className="text-xs font-black uppercase tracking-widest text-radi-dark mb-3 flex items-center gap-2">
                        <span className="w-4 h-px bg-radi-orange inline-block"></span>
                        {category}
                      </h4>
                      <ul className="flex flex-col gap-2">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

              </div>

              {/* Footer CTA */}
              <div className="border-t border-gray-100 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50">
                <p className="text-sm text-gray-500">Ready to unlock the full power of RadiExpense?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setView('onboarding-free')}
                    className="px-5 py-2.5 rounded-xl border-2 border-radi-dark text-radi-dark text-sm font-bold hover:bg-radi-dark hover:text-white transition-all active:scale-95"
                  >
                    Start Free
                  </button>
                  <button
                    onClick={() => setView('onboarding-pro')}
                    className="px-5 py-2.5 rounded-xl bg-radi-orange text-white text-sm font-bold hover:bg-orange-500 transition-all shadow active:scale-95"
                  >
                    Go Pro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { value: '100%', label: 'Free to start' },
            { value: 'Offline', label: 'First design' },
            { value: '1-tap', label: 'Reports & export' },
          ].map(({ value, label }) => (
            <div key={label} className="glass-card rounded-2xl py-5 px-3 text-center">
              <p className="text-2xl font-black text-radi-dark">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-4">
        <div className="text-center mb-12">
          <SectionLabel>Everything You Need</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black text-radi-dark tracking-tight">
            One platform. Every operation.
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            From the first sale of the day to your end-of-month financial report. RadiExpense handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4 bg-gray-50 rounded-[3rem] mx-2">
        <div className="text-center mb-12">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black text-radi-dark tracking-tight">
            Up and running in minutes.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              step: '01',
              title: 'Create your account',
              desc: 'Sign up for free. No credit card, no setup fee. Your dashboard is ready immediately.',
            },
            {
              step: '02',
              title: 'Add your products',
              desc: 'Enter your stock items, set prices, and organise by category. Import via CSV for speed.',
            },
            {
              step: '03',
              title: 'Start selling & tracking',
              desc: 'Ring up sales on the POS, watch inventory update live, and let the finance tools do the maths.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="text-6xl font-black text-radi-orange/20 mb-3">{step}</div>
              <h3 className="font-black text-radi-dark text-lg mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 px-4">
        <div className="text-center mb-14">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black text-radi-dark tracking-tight">
            Simple. Transparent. Fair.
          </h2>
          <p className="text-gray-500 mt-4 max-w-lg mx-auto">
            Start free and grow into Pro when your business needs more power.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto items-center">
          <TierCard {...freeTier} setView={setView} destination="onboarding-free" />
          <TierCard {...paidTier} setView={setView} destination="onboarding-pro" />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="text-4xl font-black text-radi-dark tracking-tight">Common questions.</h2>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map(({ q, a }, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left flex items-center justify-between p-6 font-bold text-radi-dark hover:text-radi-orange transition-colors"
              >
                <span>{q}</span>
                <svg
                  className={`w-5 h-5 flex-shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {openFaq === i && (
                <p className="px-6 pb-6 text-gray-500 text-sm leading-relaxed">{a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 px-4">
        <div className="bg-radi-dark rounded-[2.5rem] p-12 text-center text-white max-w-3xl mx-auto">
          <h2 className="font-black tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: "1.2" }}>
            Ready to track smarter?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Join businesses already using RadiExpense to manage sales, stock, and cash flow in one place.
          </p>
          <button
            onClick={() => setView('download')}
            className="bg-radi-orange text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-orange-500 transition-all shadow-xl active:scale-95"
          >
            Get RadiExpense Free
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-radi-dark text-white rounded-t-[2.5rem] mt-4 px-6 pt-14 pb-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-radi-orange rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="font-black text-lg">RadiExpense</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              A product of <a href="https://slirus.com" target="_blank" rel="noopener noreferrer" className="text-radi-orange hover:underline font-semibold">Slirus Holdings</a>.
              Built to help small and medium businesses track smarter, sell faster, and grow confidently.
            </p>
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Slirus Holdings. All rights reserved.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Quick Links</h4>
            <ul className="flex flex-col gap-3 text-sm">
              {[
                { label: 'Features', view: 'features' },
                { label: 'Download', view: 'download' },
                { label: 'Pricing', view: 'pricing' },
                { label: 'Privacy Policy', view: 'privacy' },
              ].map(({ label, view }) => (
                <li key={label}>
                  <button
                    onClick={() => setView(view)}
                    className="text-gray-300 hover:text-radi-orange transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Contact Us</h4>
            <ul className="flex flex-col gap-4 text-sm">

              {/* Address */}
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Slirus Holdings, Uganda</span>
              </li>

              {/* WhatsApp */}
              <li>
                <a
                  href="https://wa.me/256783091635"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-green-400 transition-colors"
                >
                  {/* WhatsApp SVG */}
                  <svg className="w-4 h-4 flex-shrink-0 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>+256 783 091 635</span>
                </a>
              </li>

              {/* Email */}
              <li>
                <a
                  href="mailto:radiexpense@slirus.com"
                  className="flex items-center gap-3 text-gray-300 hover:text-radi-orange transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>radiexpense@slirus.com</span>
                </a>
              </li>

              {/* Website */}
              <li>
                <a
                  href="https://slirus.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-radi-orange transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-radi-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  <span>slirus.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>Made with care by <span className="text-radi-orange font-semibold">Slirus Holdings</span></p>
          <div className="flex items-center gap-5">
            <a
              href="https://slirus.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-radi-orange transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-white/20">|</span>
            <a
              href="https://slirus.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-radi-orange transition-colors"
            >
              Terms of Use
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;