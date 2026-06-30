import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import Header from '../components/Header';
import {
  collection, addDoc, onSnapshot, query, where,
  orderBy, doc, setDoc, updateDoc, increment, getDocs,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const today = () => new Date().toDateString();
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.getTime(); };
const EXPENSE_CATS = ['Food & Drink', 'Transport', 'Utilities', 'Supplies', 'Rent', 'Salaries', 'Marketing', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Card'];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Label = ({ children, required }) => (
  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
    {children}{required && <span className="text-radi-orange ml-1">*</span>}
  </label>
);

const inputCls = 'w-full p-3.5 bg-app-bg rounded-2xl border border-transparent focus:border-radi-orange focus:ring-2 focus:ring-radi-orange/20 outline-none transition-all font-semibold text-radi-dark placeholder-gray-300 text-sm';

const Pill = ({ children, active, onClick, color = 'orange' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
      active
        ? color === 'green' ? 'border-green-500 bg-green-50 text-green-700' : 'border-radi-orange bg-radi-orange/10 text-radi-dark'
        : 'border-gray-100 bg-app-bg text-gray-400 hover:border-gray-200'
    }`}
  >
    {children}
  </button>
);

const MetricCard = ({ label, value, sub, icon, accent = 'orange' }) => {
  const colors = {
    orange: 'bg-radi-orange/10 text-radi-orange',
    green:  'bg-green-100 text-green-600',
    red:    'bg-red-100 text-red-500',
    blue:   'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className="bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-soft flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-xl font-black text-radi-dark tracking-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-[2rem] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-radi-dark text-base uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-app-bg flex items-center justify-center text-gray-400 hover:text-radi-dark transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Toast = ({ toasts }) => (
  <div className="fixed top-5 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce-in ${
        t.type === 'danger' ? 'bg-red-500 text-white' :
        t.type === 'warning' ? 'bg-yellow-400 text-yellow-900' :
        t.type === 'success' ? 'bg-green-500 text-white' :
        'bg-radi-dark text-white'
      }`}>
        {t.type === 'danger'  && '⚠️'}
        {t.type === 'warning' && '🔔'}
        {t.type === 'success' && '✅'}
        {t.type === 'info'    && 'ℹ️'}
        {t.message}
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// NAV TABS
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'dashboard', label: 'Home',      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'pos',       label: 'POS',       icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { id: 'inventory', label: 'Stock',     icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'finance',   label: 'Finance',   icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'reports',   label: 'Reports',   icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'wallet',    label: 'My Wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', isExternal: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function FreeTier({ setView }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  // Firestore data
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts]         = useState([]);
  const [savings, setSavings]           = useState([]);
  const [loans, setLoans]               = useState([]);
  const [userDoc, setUserDoc]           = useState({});

  // offline queue
  const offlineQueue = useRef([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Sync offline queue when back online
  useEffect(() => {
    if (isOnline && offlineQueue.current.length > 0) {
      offlineQueue.current.forEach(async (item) => {
        try { await addDoc(collection(db, item.col), item.data); } catch (_) {}
      });
      offlineQueue.current = [];
      toast('Offline data synced!', 'success');
    }
  }, [isOnline]);

  const toast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  // ── Firestore listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const qT = query(collection(db, 'expenses'), where('uid', '==', user.uid), orderBy('date', 'desc'));
    const unT = onSnapshot(qT, snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qP = query(collection(db, 'products'), where('uid', '==', user.uid), orderBy('name'));
    const unP = onSnapshot(qP, snap => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prods);
      prods.filter(p => p.quantity <= (p.lowStockAt || 5)).forEach(p =>
        toast(`Low stock: ${p.name} (${p.quantity} left)`, 'warning')
      );
    });

    const qS = query(collection(db, 'savings'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unS = onSnapshot(qS, snap => setSavings(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qL = query(collection(db, 'loans'), where('uid', '==', user.uid), orderBy('date', 'desc'));
    const unL = onSnapshot(qL, snap => setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unU = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setUserDoc(snap.data());
    });

    return () => { unT(); unP(); unS(); unL(); unU(); };
  }, [user]);

  // ── Write helpers ────────────────────────────────────────────────────────
  const addTransaction = async (data) => {
    const record = { uid: user.uid, date: Date.now(), ...data };
    if (!isOnline) {
      offlineQueue.current.push({ col: 'expenses', data: record });
      toast('Saved offline — will sync when online', 'warning');
      return;
    }
    await addDoc(collection(db, 'expenses'), record);
  };

  const addProduct = async (data) => {
    await addDoc(collection(db, 'products'), { uid: user.uid, createdAt: Date.now(), ...data });
  };

  const updateProductStock = async (productId, delta) => {
    await updateDoc(doc(db, 'products', productId), { quantity: increment(delta) });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED METRICS
  // ─────────────────────────────────────────────────────────────────────────

  const todayTrans   = transactions.filter(t => new Date(t.date).toDateString() === today());
  const todaySales   = todayTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayExpense = todayTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const weekTrans    = transactions.filter(t => t.date >= weekAgo());
  const weekSales    = weekTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const weekExpense  = weekTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalSavings = savings.reduce((s, g) => s + (g.current || 0), 0);
  const lowStock     = products.filter(p => p.quantity <= (p.lowStockAt || 5));
  const pendingLoans = loans.filter(l => !l.settled).reduce((s, l) => s + (l.amount - (l.repaid || 0)), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER TABS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Export helpers passed to Header ──────────────────────────────────────
  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount', 'Note'],
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString('en-GB'),
        t.type, t.category, t.amount, t.note || '',
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `radiexpense_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV downloaded!', 'success');
  };

  const handleExportPDF = () => { window.print(); };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <Toast toasts={toasts} />

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-app-bg border-b border-gray-100">
        <Header
          activeTab={tab}
          setTab={setTab}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
        />
        {!isOnline && (
          <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest text-center py-1">
            Offline — changes will sync when reconnected
          </div>
        )}
      </div>

      {/* ── App body: sidebar on lg+, bottom nav on mobile ── */}
      <div className="flex flex-1 w-full max-w-screen-xl mx-auto">

        {/* ── Sidebar nav (lg+) ── */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] bg-white border-r border-gray-100 py-6 px-3 gap-1">
          {NAV.filter(n => !n.isExternal).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left w-full ${
                tab === id
                  ? 'bg-radi-orange/10 text-radi-orange'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-radi-dark'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
              </svg>
              <span className={`text-xs font-black uppercase tracking-widest ${tab === id ? 'text-radi-orange' : ''}`}>{label}</span>
            </button>
          ))}
          {/* Divider + My Wallet link */}
          <div className="mt-auto pt-3 border-t border-gray-100">
            <button
              onClick={() => setView('dashboard')}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left w-full text-gray-400 hover:bg-radi-orange/5 hover:text-radi-orange group"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-xs font-black uppercase tracking-widest">My Wallet</span>
              <svg className="w-3 h-3 ml-auto opacity-40 group-hover:opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-10">
          <div className="max-w-4xl mx-auto">
            {tab === 'dashboard' && <DashboardTab metrics={{ todaySales, todayExpense, weekSales, weekExpense, totalSavings, lowStock, pendingLoans }} transactions={transactions} products={products} savings={savings} loans={loans} setTab={setTab} toast={toast} user={user} addTransaction={addTransaction} />}
            {tab === 'pos'       && <POSTab products={products} updateProductStock={updateProductStock} addTransaction={addTransaction} toast={toast} user={user} />}
            {tab === 'inventory' && <InventoryTab products={products} addProduct={addProduct} updateProductStock={updateProductStock} toast={toast} user={user} />}
            {tab === 'finance'   && <FinanceTab transactions={transactions} savings={savings} loans={loans} addTransaction={addTransaction} user={user} db={db} toast={toast} />}
            {tab === 'reports'   && <ReportsTab transactions={transactions} products={products} savings={savings} loans={loans} />}
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile/tablet only) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 flex justify-around px-2 py-2">
        {NAV.map(({ id, label, icon, isExternal }) => (
          <button
            key={id}
            onClick={() => isExternal ? setView('dashboard') : setTab(id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
              !isExternal && tab === id ? 'bg-radi-orange/10' : 'hover:bg-gray-50'
            }`}
          >
            <svg className={`w-5 h-5 ${!isExternal && tab === id ? 'text-radi-orange' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
            </svg>
            <span className={`text-[9px] font-black uppercase tracking-widest ${!isExternal && tab === id ? 'text-radi-orange' : 'text-gray-400'}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab({ metrics, transactions, products, savings, setTab, toast, user }) {
  const { todaySales, todayExpense, weekSales, weekExpense, totalSavings, lowStock, pendingLoans } = metrics;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-black text-radi-dark tracking-tight mt-0.5">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}</h1>
      </div>

      {/* Hero card */}
      <div className="bg-radi-dark rounded-[2rem] p-6 text-white">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Today&apos;s Sales</p>
        <p className="text-4xl font-black tracking-tight"><span className="text-radi-orange text-sm mr-1 font-bold">UGX</span>{todaySales.toLocaleString()}</p>
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Expenses</p>
            <p className="text-lg font-black text-red-400">{UGX(todayExpense)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Net</p>
            <p className={`text-lg font-black ${todaySales - todayExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>{UGX(todaySales - todayExpense)}</p>
          </div>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Week Sales" value={UGX(weekSales)} sub={`Expenses: ${UGX(weekExpense)}`} accent="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <MetricCard label="Savings Pots" value={UGX(totalSavings)} sub={`${savings.length} goal${savings.length !== 1 ? 's' : ''}`} accent="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <MetricCard label="Low Stock" value={lowStock.length} sub="items need restock" accent={lowStock.length > 0 ? 'red' : 'green'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
        <MetricCard label="Loans Due" value={UGX(pendingLoans)} sub="outstanding balance" accent="purple"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>} />
      </div>

      {/* Low stock alert strip */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">⚠️ Low Stock Alert</p>
          {lowStock.map(p => (
            <div key={p.id} className="flex justify-between items-center py-1">
              <span className="text-sm font-semibold text-radi-dark">{p.name}</span>
              <span className="text-xs font-black text-red-500">{p.quantity} left</span>
            </div>
          ))}
          <button onClick={() => setTab('inventory')} className="mt-3 text-xs font-black text-radi-orange hover:underline uppercase tracking-widest">Manage Stock →</button>
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Transactions</p>
          <button onClick={() => setTab('reports')} className="text-[10px] font-black text-radi-orange uppercase tracking-widest hover:underline">See All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {transactions.slice(0, 6).map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-4 flex justify-between items-center border border-gray-50 shadow-soft">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-radi-dark">{t.category}</p>
              <p className="text-[9px] text-gray-400 font-semibold mt-0.5 italic">{t.note || '—'}</p>
              <p className="text-[9px] text-gray-300 font-bold mt-0.5">{t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</p>
            </div>
            <span className={`text-sm font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
              {t.type === 'income' ? '+' : '-'}{UGX(t.amount)}
            </span>
          </div>
        ))}
        </div>
        {transactions.length === 0 && (
          <div className="text-center py-10 text-gray-300">
            <p className="text-4xl mb-2">No Record</p>
            <p className="text-sm font-bold">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POS TAB
// ─────────────────────────────────────────────────────────────────────────────

function POSTab({ products, updateProductStock, addTransaction, toast }) {
  const [cart, setCart]               = useState([]);
  const [search, setSearch]           = useState('');
  const [payMethod, setPayMethod]     = useState('Cash');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale]       = useState(null);
  const receiptRef                    = useRef();

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && p.quantity > 0
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        if (existing.qty >= product.quantity) { toast('Not enough stock', 'warning'); return prev; }
        return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty = (id, qty) => {
    if (qty < 1) { removeFromCart(id); return; }
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const checkout = async () => {
    if (cart.length === 0) { toast('Cart is empty', 'warning'); return; }
    try {
      // Record sale income
      await addTransaction({
        type: 'income',
        amount: total,
        category: 'sales',
        note: `POS Sale — ${payMethod} — ${cart.map(c => `${c.name}×${c.qty}`).join(', ')}`,
        paymentMethod: payMethod,
        items: cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price })),
      });
      // Deduct stock
      for (const item of cart) {
        await updateProductStock(item.id, -item.qty);
      }
      setLastSale({ cart: [...cart], total, payMethod, date: new Date() });
      setCart([]);
      setSearch('');
      setReceiptOpen(true);
      toast(`Sale of ${UGX(total)} recorded!`, 'success');
    } catch (e) {
      toast('Sale failed. Try again.', 'danger');
    }
  };

  const printReceipt = () => window.print();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Point of Sale</p>
        <h2 className="text-xl font-black text-radi-dark tracking-tight">New Sale</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className={`${inputCls} pl-10`}
          placeholder="Search product by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Product grid */}
      {search && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.length === 0 && <p className="col-span-2 text-center text-sm text-gray-300 font-bold py-4">No products found</p>}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white rounded-2xl p-4 text-left border border-gray-100 shadow-soft hover:border-radi-orange transition-all active:scale-95"
            >
              <p className="font-black text-radi-dark text-sm">{p.name}</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{p.category}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-radi-orange font-black text-sm">{UGX(p.price)}</p>
                <p className={`text-[9px] font-black uppercase ${p.quantity <= (p.lowStockAt || 5) ? 'text-red-400' : 'text-gray-300'}`}>{p.quantity} left</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</p>
          </div>
          {cart.map(item => (
            <div key={item.id} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <p className="font-bold text-radi-dark text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">{UGX(item.price)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-xl bg-app-bg text-radi-dark font-black flex items-center justify-center hover:bg-gray-200 transition-colors">−</button>
                <span className="w-6 text-center font-black text-sm">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-xl bg-app-bg text-radi-dark font-black flex items-center justify-center hover:bg-gray-200 transition-colors">+</button>
                <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-xl bg-red-50 text-red-400 font-black flex items-center justify-center ml-1 hover:bg-red-100 transition-colors">×</button>
              </div>
              <p className="font-black text-radi-dark text-sm ml-4 w-24 text-right">{UGX(item.price * item.qty)}</p>
            </div>
          ))}
          <div className="px-5 py-4 bg-app-bg">
            <div className="flex justify-between items-center mb-4">
              <p className="font-black text-radi-dark">Total</p>
              <p className="text-xl font-black text-radi-dark">{UGX(total)}</p>
            </div>
            {/* Payment method */}
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Payment Method</p>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(m => (
                  <Pill key={m} active={payMethod === m} onClick={() => setPayMethod(m)}>{m}</Pill>
                ))}
              </div>
            </div>
            <button
              onClick={checkout}
              className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all shadow-lg active:scale-95"
            >
              Complete Sale — {UGX(total)}
            </button>
          </div>
        </div>
      )}

      {cart.length === 0 && !search && (
        <div className="text-center py-16 text-gray-300">
          <p className="text-5xl mb-3">Search</p>
          <p className="text-sm font-bold">Search for a product to start a sale</p>
        </div>
      )}

      {/* Receipt Modal */}
      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Receipt">
        {lastSale && (
          <div ref={receiptRef} className="space-y-4">
            <div className="text-center pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-radi-orange rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="font-black text-radi-dark">RadiExpense</p>
              <p className="text-[10px] text-gray-400">{lastSale.date.toLocaleString()}</p>
            </div>
            {lastSale.cart.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-semibold text-radi-dark">{item.name} × {item.qty}</span>
                <span className="font-bold">{UGX(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between font-black text-radi-dark border-t pt-3">
              <span>Total</span>
              <span>{UGX(lastSale.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Payment</span>
              <span className="font-bold">{lastSale.payMethod}</span>
            </div>
            <p className="text-center text-[10px] text-gray-300 pt-2">Thank you for your purchase!</p>
            <button
              onClick={printReceipt}
              className="w-full bg-radi-dark text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95 mt-2"
            >
              Print Receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY TAB
// ─────────────────────────────────────────────────────────────────────────────

function InventoryTab({ products, addProduct, updateProductStock, toast }) {
  const [addOpen, setAddOpen]     = useState(false);
  const [adjustOpen, setAdjust]   = useState(null); // product object
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');

  const [newProd, setNewProd] = useState({ name: '', price: '', quantity: '', category: '', lowStockAt: 5 });
  const setP = (f, v) => setNewProd(p => ({ ...p, [f]: v }));

  const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products
    .filter(p => (!search || p.name.toLowerCase().includes(search.toLowerCase())))
    .filter(p => filterCat === 'All' || p.category === filterCat);

  const handleAdd = async () => {
    if (!newProd.name.trim() || !newProd.price || !newProd.quantity) { toast('Fill in name, price & quantity', 'warning'); return; }
    await addProduct({ ...newProd, price: parseFloat(newProd.price), quantity: parseInt(newProd.quantity), lowStockAt: parseInt(newProd.lowStockAt) || 5 });
    setNewProd({ name: '', price: '', quantity: '', category: '', lowStockAt: 5 });
    setAddOpen(false);
    toast('Product added!', 'success');
  };

  const handleAdjust = async () => {
    if (!adjustQty || isNaN(adjustQty)) { toast('Enter a valid quantity', 'warning'); return; }
    const delta = adjustType === 'add' ? parseInt(adjustQty) : -parseInt(adjustQty);
    if (adjustType === 'remove' && adjustOpen.quantity + delta < 0) { toast("Can't go below 0", 'warning'); return; }
    await updateProductStock(adjustOpen.id, delta);
    setAdjust(null);
    setAdjustQty('');
    toast('Stock updated!', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Inventory</p>
          <h2 className="text-xl font-black text-radi-dark tracking-tight">Products & Stock</h2>
        </div>
        <button onClick={() => setAddOpen(true)} className="bg-radi-orange text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow hover:bg-orange-500 transition-all active:scale-95">
          + Add Product
        </button>
      </div>

      {/* Search + filter */}
      <input className={inputCls} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cats.map(c => <Pill key={c} active={filterCat === c} onClick={() => setFilterCat(c)}>{c}</Pill>)}
      </div>

      {/* Product list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-300">
            <p className="text-4xl mb-2">Empty</p>
            <p className="text-sm font-bold">No products yet</p>
          </div>
        )}
        {filtered.map(p => (
          <div key={p.id} className={`bg-white rounded-2xl p-4 border shadow-soft flex items-center justify-between ${p.quantity <= (p.lowStockAt || 5) ? 'border-red-100' : 'border-gray-100'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-black text-radi-dark text-sm">{p.name}</p>
                {p.category && <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">{p.category}</span>}
                {p.quantity <= (p.lowStockAt || 5) && <span className="text-[9px] font-black bg-red-50 text-red-400 px-2 py-0.5 rounded-full">LOW</span>}
              </div>
              <p className="text-radi-orange font-black text-sm mt-0.5">{UGX(p.price)}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`text-xl font-black ${p.quantity <= (p.lowStockAt || 5) ? 'text-red-500' : 'text-radi-dark'}`}>{p.quantity}</p>
                <p className="text-[9px] text-gray-300 font-bold">in stock</p>
              </div>
              <button onClick={() => { setAdjust(p); setAdjustQty(''); setAdjustType('add'); }}
                className="w-9 h-9 rounded-xl bg-app-bg hover:bg-radi-orange/10 text-radi-orange font-black flex items-center justify-center transition-colors text-lg">
                ⇅
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add product modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Product">
        <div className="space-y-4">
          <div><Label required>Product Name</Label><input className={inputCls} placeholder="e.g. Coca-Cola 500ml" value={newProd.name} onChange={e => setP('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label required>Price (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={newProd.price} onChange={e => setP('price', e.target.value)} /></div>
            <div><Label required>Initial Stock</Label><input className={inputCls} type="number" placeholder="0" value={newProd.quantity} onChange={e => setP('quantity', e.target.value)} /></div>
          </div>
          <div><Label>Category</Label><input className={inputCls} placeholder="e.g. Beverages" value={newProd.category} onChange={e => setP('category', e.target.value)} /></div>
          <div><Label>Low Stock Alert At</Label><input className={inputCls} type="number" placeholder="5" value={newProd.lowStockAt} onChange={e => setP('lowStockAt', e.target.value)} /></div>
          <button onClick={handleAdd} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg mt-2">Save Product</button>
        </div>
      </Modal>

      {/* Adjust stock modal */}
      <Modal open={!!adjustOpen} onClose={() => setAdjust(null)} title="Adjust Stock">
        {adjustOpen && (
          <div className="space-y-4">
            <div className="bg-app-bg rounded-2xl p-4">
              <p className="font-black text-radi-dark">{adjustOpen.name}</p>
              <p className="text-sm text-gray-400">Current stock: <span className="font-black text-radi-dark">{adjustOpen.quantity}</span></p>
            </div>
            <div className="flex gap-2">
              <Pill active={adjustType === 'add'} onClick={() => setAdjustType('add')} color="green">+ Add Stock</Pill>
              <Pill active={adjustType === 'remove'} onClick={() => setAdjustType('remove')}>− Remove</Pill>
            </div>
            <div><Label required>Quantity</Label><input className={inputCls} type="number" min="1" placeholder="0" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} /></div>
            <button onClick={handleAdjust} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Update Stock</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE TAB
// ─────────────────────────────────────────────────────────────────────────────

function FinanceTab({ transactions, savings, loans, addTransaction, user, db, toast }) {
  const [subTab, setSubTab] = useState('overview');

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cashFlow     = totalIncome - totalExpense;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Finance</p>
        <h2 className="text-xl font-black text-radi-dark tracking-tight">Money Management</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'savings',  label: 'Savings' },
          { id: 'loans',    label: 'Loans' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              subTab === id ? 'bg-radi-dark text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <FinanceOverview totalIncome={totalIncome} totalExpense={totalExpense} cashFlow={cashFlow} transactions={transactions} />
      )}
      {subTab === 'expenses' && (
        <ExpensesPanel transactions={transactions} addTransaction={addTransaction} toast={toast} />
      )}
      {subTab === 'savings' && (
        <SavingsPanel savings={savings} user={user} db={db} toast={toast} />
      )}
      {subTab === 'loans' && (
        <LoansPanel loans={loans} user={user} db={db} toast={toast} />
      )}
    </div>
  );
}

function FinanceOverview({ totalIncome, totalExpense, cashFlow, transactions }) {
  // Category breakdown
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Total Income</p>
            <p className="text-2xl font-black text-green-700 mt-0.5">{UGX(totalIncome)}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Total Expenses</p>
            <p className="text-2xl font-black text-red-600 mt-0.5">{UGX(totalExpense)}</p>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        </div>
        <div className={`border rounded-2xl p-5 flex justify-between items-center ${cashFlow >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${cashFlow >= 0 ? 'text-blue-600' : 'text-radi-orange'}`}>Cash Flow</p>
            <p className={`text-2xl font-black mt-0.5 ${cashFlow >= 0 ? 'text-blue-700' : 'text-radi-orange'}`}>{UGX(cashFlow)}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cashFlow >= 0 ? 'bg-blue-100' : 'bg-radi-orange/10'}`}>
            <svg className={`w-6 h-6 ${cashFlow >= 0 ? 'text-blue-600' : 'text-radi-orange'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expense breakdown */}
      {Object.keys(expenseByCategory).length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Expense Breakdown</p>
          {Object.entries(expenseByCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]) => {
              const pct = Math.round((amt / totalExpense) * 100);
              return (
                <div key={cat} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="capitalize text-radi-dark">{cat}</span>
                    <span className="text-gray-400">{UGX(amt)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-radi-orange rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function ExpensesPanel({ transactions, addTransaction, toast }) {
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ amount: '', category: EXPENSE_CATS[0], note: '' });
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const expenses = transactions.filter(t => t.type === 'expense' && t.category !== 'loan' && t.category !== 'borrowed');

  const handleAdd = async () => {
    if (!form.amount || isNaN(form.amount)) { toast('Enter a valid amount', 'warning'); return; }
    await addTransaction({ type: 'expense', amount: parseFloat(form.amount), category: form.category, note: form.note });
    setForm({ amount: '', category: EXPENSE_CATS[0], note: '' });
    setOpen(false);
    toast('Expense recorded!', 'success');
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(true)} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all shadow active:scale-95">
        + Add Expense
      </button>
      {expenses.slice(0, 20).map(t => (
        <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-soft flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-radi-dark">{t.category}</p>
            <p className="text-[9px] text-gray-400 font-semibold italic mt-0.5">{t.note || '—'}</p>
            <p className="text-[9px] text-gray-300 font-bold mt-0.5">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <p className="font-black text-red-500 text-sm">-{UGX(t.amount)}</p>
        </div>
      ))}
      {expenses.length === 0 && (
        <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">🧾</p><p className="text-sm font-bold">No expenses recorded</p></div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Expense">
        <div className="space-y-4">
          <div><Label required>Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={form.amount} onChange={e => setF('amount', e.target.value)} /></div>
          <div>
            <Label required>Category</Label>
            <select className={inputCls} value={form.category} onChange={e => setF('category', e.target.value)}>
              {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Note</Label><input className={inputCls} placeholder="What was this for?" value={form.note} onChange={e => setF('note', e.target.value)} /></div>
          <button onClick={handleAdd} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg mt-2">Record Expense</button>
        </div>
      </Modal>
    </div>
  );
}

function SavingsPanel({ savings, user, db, toast }) {
  const [open, setOpen]   = useState(false);
  const [depOpen, setDep] = useState(null);
  const [form, setForm]   = useState({ name: '', target: '', current: '' });
  const [depAmt, setDepAmt] = useState('');
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const createGoal = async () => {
    if (!form.name.trim() || !form.target) { toast('Name and target amount required', 'warning'); return; }
    await addDoc(collection(db, 'savings'), { uid: user.uid, name: form.name, target: parseFloat(form.target), current: parseFloat(form.current || 0), createdAt: Date.now() });
    setForm({ name: '', target: '', current: '' });
    setOpen(false);
    toast('Savings goal created!', 'success');
  };

  const deposit = async () => {
    if (!depAmt || isNaN(depAmt)) { toast('Enter a valid amount', 'warning'); return; }
    const amt = parseFloat(depAmt);
    await updateDoc(doc(db, 'savings', depOpen.id), { current: increment(amt) });
    setDep(null); setDepAmt('');
    toast(`${UGX(amt)} added to ${depOpen.name}!`, 'success');
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(true)} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all shadow active:scale-95">
        + New Savings Goal
      </button>
      {savings.map(g => {
        const pct = Math.min(100, Math.round(((g.current || 0) / g.target) * 100));
        return (
          <div key={g.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-black text-radi-dark">{g.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Target: {UGX(g.target)}</p>
              </div>
              <button onClick={() => { setDep(g); setDepAmt(''); }} className="text-xs font-black text-radi-orange bg-radi-orange/10 px-3 py-1.5 rounded-xl hover:bg-radi-orange/20 transition-colors">+ Add</button>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-radi-orange'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-radi-dark">{UGX(g.current || 0)} saved</span>
              <span className={pct >= 100 ? 'text-green-500' : 'text-gray-400'}>{pct}%{pct >= 100 ? ' 🎉' : ''}</span>
            </div>
          </div>
        );
      })}
      {savings.length === 0 && (
        <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">🏦</p><p className="text-sm font-bold">No savings goals yet</p></div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Savings Goal">
        <div className="space-y-4">
          <div><Label required>Goal Name</Label><input className={inputCls} placeholder="e.g. New Fridge" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
          <div><Label required>Target Amount (UGX)</Label><input className={inputCls} type="number" placeholder="500000" value={form.target} onChange={e => setF('target', e.target.value)} /></div>
          <div><Label>Starting Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={form.current} onChange={e => setF('current', e.target.value)} /></div>
          <button onClick={createGoal} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg mt-2">Create Goal</button>
        </div>
      </Modal>

      <Modal open={!!depOpen} onClose={() => setDep(null)} title="Add to Savings">
        {depOpen && (
          <div className="space-y-4">
            <div className="bg-app-bg rounded-2xl p-4">
              <p className="font-black text-radi-dark">{depOpen.name}</p>
              <p className="text-sm text-gray-400">{UGX(depOpen.current || 0)} / {UGX(depOpen.target)}</p>
            </div>
            <div><Label required>Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={depAmt} onChange={e => setDepAmt(e.target.value)} /></div>
            <button onClick={deposit} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Add to Pot</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LoansPanel({ loans, user, db, toast }) {
  const [open, setOpen]     = useState(false);
  const [repOpen, setRep]   = useState(null);
  const [repAmt, setRepAmt] = useState('');
  const [form, setForm]     = useState({ type: 'borrowed', person: '', amount: '', note: '', dueDate: '' });
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const addLoan = async () => {
    if (!form.person.trim() || !form.amount) { toast('Person/source and amount required', 'warning'); return; }
    await addDoc(collection(db, 'loans'), { uid: user.uid, ...form, amount: parseFloat(form.amount), repaid: 0, settled: false, date: Date.now() });
    setForm({ type: 'borrowed', person: '', amount: '', note: '', dueDate: '' });
    setOpen(false);
    toast('Loan recorded!', 'success');
  };

  const repay = async () => {
    if (!repAmt || isNaN(repAmt)) { toast('Enter a valid amount', 'warning'); return; }
    const amt = parseFloat(repAmt);
    const newRepaid = (repOpen.repaid || 0) + amt;
    const settled = newRepaid >= repOpen.amount;
    await updateDoc(doc(db, 'loans', repOpen.id), { repaid: newRepaid, settled });
    setRep(null); setRepAmt('');
    toast(settled ? 'Loan fully settled! 🎉' : `Repayment of ${UGX(amt)} recorded`, 'success');
  };

  const active  = loans.filter(l => !l.settled);
  const settled = loans.filter(l => l.settled);

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(true)} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all shadow active:scale-95">
        + Record Loan / Debt
      </button>

      {active.length > 0 && (
        <>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active ({active.length})</p>
          {active.map(l => {
            const remaining = l.amount - (l.repaid || 0);
            const pct = Math.round(((l.repaid || 0) / l.amount) * 100);
            return (
              <div key={l.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-radi-dark">{l.person}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${l.type === 'borrowed' ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-600'}`}>
                        {l.type === 'borrowed' ? 'I Owe' : 'Owed to Me'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 italic mt-0.5">{l.note}</p>
                    {l.dueDate && <p className="text-[9px] text-radi-orange font-bold mt-0.5">Due: {l.dueDate}</p>}
                  </div>
                  <button onClick={() => { setRep(l); setRepAmt(''); }} className="text-xs font-black text-radi-orange bg-radi-orange/10 px-3 py-1.5 rounded-xl hover:bg-radi-orange/20 transition-colors">Repay</button>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-radi-orange rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-400">Paid: {UGX(l.repaid || 0)}</span>
                  <span className="text-radi-dark">Remaining: {UGX(remaining)}</span>
                </div>
              </div>
            );
          })}
        </>
      )}

      {settled.length > 0 && (
        <>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Settled ({settled.length})</p>
          {settled.map(l => (
            <div key={l.id} className="bg-green-50 rounded-2xl p-4 border border-green-100 flex justify-between items-center">
              <div>
                <p className="font-black text-radi-dark text-sm">{l.person}</p>
                <p className="text-xs text-green-600 font-bold">Fully settled ✓</p>
              </div>
              <p className="font-black text-green-600">{UGX(l.amount)}</p>
            </div>
          ))}
        </>
      )}

      {loans.length === 0 && (
        <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">🤝</p><p className="text-sm font-bold">No loans recorded</p></div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record Loan / Debt">
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <div className="flex gap-2">
              <Pill active={form.type === 'borrowed'} onClick={() => setF('type', 'borrowed')}>I Borrowed</Pill>
              <Pill active={form.type === 'lent'} onClick={() => setF('type', 'lent')} color="green">I Lent</Pill>
            </div>
          </div>
          <div><Label required>{form.type === 'borrowed' ? 'Borrowed From' : 'Lent To'}</Label><input className={inputCls} placeholder="Person or organisation" value={form.person} onChange={e => setF('person', e.target.value)} /></div>
          <div><Label required>Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={form.amount} onChange={e => setF('amount', e.target.value)} /></div>
          <div><Label>Note</Label><input className={inputCls} placeholder="Reason / description" value={form.note} onChange={e => setF('note', e.target.value)} /></div>
          <div><Label>Due Date</Label><input className={inputCls} type="date" value={form.dueDate} onChange={e => setF('dueDate', e.target.value)} /></div>
          <button onClick={addLoan} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg mt-2">Record</button>
        </div>
      </Modal>

      <Modal open={!!repOpen} onClose={() => setRep(null)} title="Record Repayment">
        {repOpen && (
          <div className="space-y-4">
            <div className="bg-app-bg rounded-2xl p-4">
              <p className="font-black text-radi-dark">{repOpen.person}</p>
              <p className="text-sm text-gray-400">Remaining: {UGX(repOpen.amount - (repOpen.repaid || 0))}</p>
            </div>
            <div><Label required>Repayment Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={repAmt} onChange={e => setRepAmt(e.target.value)} /></div>
            <button onClick={repay} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Confirm Repayment</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function ReportsTab({ transactions, products, savings, loans }) {
  const [range, setRange] = useState('today');
  const [exportMsg, setExportMsg] = useState('');

  const now = new Date();
  const rangeFilter = (t) => {
    const d = new Date(t.date);
    if (range === 'today')  return d.toDateString() === now.toDateString();
    if (range === 'week')   return t.date >= weekAgo();
    if (range === 'month')  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true; // all
  };

  const filtered  = transactions.filter(rangeFilter);
  const income    = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense   = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const salesTxns = filtered.filter(t => t.category === 'sales');

  // CSV export
  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount', 'Note'],
      ...filtered.map(t => [
        new Date(t.date).toLocaleDateString('en-GB'),
        t.type,
        t.category,
        t.amount,
        t.note || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `radiexpense_report_${range}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg('CSV downloaded!');
    setTimeout(() => setExportMsg(''), 3000);
  };

  // Simple PDF print
  const exportPDF = () => { window.print(); };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Reports</p>
        <h2 className="text-xl font-black text-radi-dark tracking-tight">Sales & Finance Reports</h2>
      </div>

      {/* Range filter */}
      <div className="flex gap-2">
        {[
          { id: 'today', label: 'Today' },
          { id: 'week',  label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'all',   label: 'All Time' },
        ].map(({ id, label }) => (
          <Pill key={id} active={range === id} onClick={() => setRange(id)}>{label}</Pill>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black uppercase text-green-600 tracking-widest">Income</p>
          <p className="font-black text-green-700 text-sm mt-1">{UGX(income)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black uppercase text-red-400 tracking-widest">Expense</p>
          <p className="font-black text-red-500 text-sm mt-1">{UGX(expense)}</p>
        </div>
        <div className={`border rounded-2xl p-4 text-center ${income - expense >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest ${income - expense >= 0 ? 'text-blue-600' : 'text-radi-orange'}`}>Net</p>
          <p className={`font-black text-sm mt-1 ${income - expense >= 0 ? 'text-blue-700' : 'text-radi-orange'}`}>{UGX(income - expense)}</p>
        </div>
      </div>

      {/* Sales + Stock side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales report */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Sales ({salesTxns.length} transactions)</p>
          {salesTxns.length === 0 ? (
            <p className="text-sm text-gray-300 font-bold text-center py-4">No sales in this period</p>
          ) : (
            salesTxns.slice(0, 10).map(t => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-bold text-radi-dark">{t.note?.replace('POS Sale — ', '') || 'Sale'}</p>
                  <p className="text-[9px] text-gray-300">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <p className="font-black text-green-600 text-sm">{UGX(t.amount)}</p>
              </div>
            ))
          )}
        </div>

        {/* Stock report */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Stock Summary ({products.length} products)</p>
          {products.slice(0, 8).map(p => (
            <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <p className="text-xs font-bold text-radi-dark">{p.name}</p>
              <div className="flex items-center gap-3">
                <p className="text-xs text-radi-orange font-bold">{UGX(p.price)}</p>
                <p className={`text-xs font-black ${p.quantity <= (p.lowStockAt || 5) ? 'text-red-500' : 'text-gray-400'}`}>{p.quantity} in stock</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Savings report */}
      {savings.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Savings Goals</p>
          {savings.map(g => {
            const pct = Math.min(100, Math.round(((g.current || 0) / g.target) * 100));
            return (
              <div key={g.id} className="py-2 border-b border-gray-50 last:border-0">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-radi-dark">{g.name}</span>
                  <span className="text-gray-400">{UGX(g.current || 0)} / {UGX(g.target)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-radi-orange'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={exportCSV} className="bg-radi-dark text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export CSV
        </button>
        <button onClick={exportPDF} className="bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print / PDF
        </button>
      </div>
      {exportMsg && <p className="text-center text-xs font-black text-green-500 uppercase tracking-widest">{exportMsg}</p>}
    </div>
  );
}