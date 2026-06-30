import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import Header from '../components/Header';
import {
  collection, addDoc, onSnapshot, query, where,
  orderBy, doc, setDoc, updateDoc, increment, getDocs, deleteDoc,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const UGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const today = () => new Date().toDateString();
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.getTime(); };
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.getTime(); };

const EXPENSE_CATS = ['Food & Drink', 'Transport', 'Utilities', 'Supplies', 'Rent', 'Salaries', 'Marketing', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Card', 'Split'];
const VAT_RATE = 0.18; // Uganda VAT 18%
const WHT_RATE = 0.06; // Uganda WHT 6%

const ROLES = { ADMIN: 'Admin', MANAGER: 'Manager', CASHIER: 'Cashier' };

const LOCATIONS = ['Main Store', 'Branch 1', 'Branch 2', 'Warehouse'];

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
        ? color === 'green'  ? 'border-green-500 bg-green-50 text-green-700'
        : color === 'blue'   ? 'border-blue-500 bg-blue-50 text-blue-700'
        : color === 'purple' ? 'border-purple-500 bg-purple-50 text-purple-700'
        : 'border-radi-orange bg-radi-orange/10 text-radi-dark'
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
    teal:   'bg-teal-100 text-teal-600',
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

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-[2rem] p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}>
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
        t.type === 'danger'  ? 'bg-red-500 text-white' :
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

// Pro badge for labeling premium features
const ProBadge = () => (
  <span className="ml-2 text-[8px] font-black bg-gradient-to-r from-radi-orange to-orange-400 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">PRO</span>
);

// Simple sparkline bar chart using SVG
const SparkBar = ({ data, color = '#f97316', height = 40 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((v, i) => {
        const barH = (v / max) * (height - 4);
        return (
          <rect
            key={i}
            x={i * w + 0.5}
            y={height - barH - 2}
            width={w - 1}
            height={barH}
            rx="1"
            fill={color}
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV TABS — Extended for Pro
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'dashboard', label: 'Home',    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'pos',       label: 'POS',     icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { id: 'inventory', label: 'Stock',   icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'finance',   label: 'Finance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'team',      label: 'Team',    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'reports',   label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'wallet',    label: 'Wallet',  icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', isExternal: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProTier({ setView }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  // Firestore data
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts]         = useState([]);
  const [savings, setSavings]           = useState([]);
  const [loans, setLoans]               = useState([]);
  const [customers, setCustomers]       = useState([]);
  const [staff, setStaff]               = useState([]);
  const [suppliers, setSuppliers]       = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [auditLogs, setAuditLogs]       = useState([]);
  const [budgets, setBudgets]           = useState([]);
  const [userDoc, setUserDoc]           = useState({});

  // Offline queue
  const offlineQueue = useRef([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

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

  // ── Audit log helper ─────────────────────────────────────────────────────
  const logAudit = useCallback(async (action, details) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        uid: user.uid,
        action,
        details,
        timestamp: Date.now(),
        by: user.displayName || user.email,
      });
    } catch (_) {}
  }, [user]);

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

    const qC = query(collection(db, 'customers'), where('uid', '==', user.uid), orderBy('name'));
    const unC = onSnapshot(qC, snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qSt = query(collection(db, 'staff'), where('uid', '==', user.uid), orderBy('name'));
    const unSt = onSnapshot(qSt, snap => setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qSup = query(collection(db, 'suppliers'), where('uid', '==', user.uid), orderBy('name'));
    const unSup = onSnapshot(qSup, snap => setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qPO = query(collection(db, 'purchaseOrders'), where('uid', '==', user.uid), orderBy('date', 'desc'));
    const unPO = onSnapshot(qPO, snap => setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qAL = query(collection(db, 'auditLogs'), where('uid', '==', user.uid), orderBy('timestamp', 'desc'));
    const unAL = onSnapshot(qAL, snap => setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qB = query(collection(db, 'budgets'), where('uid', '==', user.uid));
    const unB = onSnapshot(qB, snap => setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unU = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setUserDoc(snap.data());
    });

    return () => { unT(); unP(); unS(); unL(); unC(); unSt(); unSup(); unPO(); unAL(); unB(); unU(); };
  }, [user]);

  // ── Write helpers ────────────────────────────────────────────────────────
  const addTransaction = async (data) => {
    const record = { uid: user.uid, date: Date.now(), ...data };
    if (!isOnline) {
      offlineQueue.current.push({ col: 'expenses', data: record });
      toast('Saved offline — will sync when online', 'warning');
      return;
    }
    const ref = await addDoc(collection(db, 'expenses'), record);
    await logAudit('TRANSACTION_ADDED', `${data.type} - ${UGX(data.amount)} - ${data.category}`);
    return ref;
  };

  const addProduct = async (data) => {
    const ref = await addDoc(collection(db, 'products'), { uid: user.uid, createdAt: Date.now(), soldCount: 0, ...data });
    await logAudit('PRODUCT_ADDED', `${data.name} @ ${UGX(data.price)}`);
    return ref;
  };

  const updateProductStock = async (productId, delta, reason = '') => {
    await updateDoc(doc(db, 'products', productId), { quantity: increment(delta) });
    if (reason) await logAudit('STOCK_ADJUSTED', `Product ${productId}: ${delta > 0 ? '+' : ''}${delta} (${reason})`);
  };

  // ── Derived Metrics ──────────────────────────────────────────────────────
  const todayTrans   = transactions.filter(t => new Date(t.date).toDateString() === today());
  const todaySales   = todayTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayExpense = todayTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const weekTrans    = transactions.filter(t => t.date >= weekAgo());
  const weekSales    = weekTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const weekExpense  = weekTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalSavings = savings.reduce((s, g) => s + (g.current || 0), 0);
  const lowStock     = products.filter(p => p.quantity <= (p.lowStockAt || 5));
  const pendingLoans = loans.filter(l => !l.settled).reduce((s, l) => s + (l.amount - (l.repaid || 0)), 0);
  const totalStockValue = products.reduce((s, p) => s + (p.price * p.quantity), 0);

  // Hourly sales breakdown for today
  const hourlySales = Array.from({ length: 24 }, (_, h) => {
    return todayTrans
      .filter(t => t.type === 'income' && new Date(t.date).getHours() === h)
      .reduce((s, t) => s + t.amount, 0);
  });

  // Budget alerts
  useEffect(() => {
    budgets.forEach(b => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((s, t) => s + t.amount, 0);
      const pct = (spent / b.limit) * 100;
      if (pct >= 90 && !b.alerted90) {
        toast(`Budget alert: ${b.category} at ${Math.round(pct)}% of limit!`, 'warning');
        updateDoc(doc(db, 'budgets', b.id), { alerted90: true }).catch(() => {});
      }
    });
  }, [transactions, budgets]);

  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount', 'Note', 'PaymentMethod'],
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString('en-GB'),
        t.type, t.category, t.amount, t.note || '', t.paymentMethod || '',
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `radiexpense_pro_export_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('CSV downloaded!', 'success');
  };

  const handleExportPDF = () => window.print();

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
        {/* Pro tier banner */}
        <div className="bg-gradient-to-r from-radi-dark to-gray-800 text-white text-[10px] font-black uppercase tracking-widest text-center py-1 flex items-center justify-center gap-2">
          <span className="text-radi-orange">★</span> Pro Plan — Advanced Features Active
          <span className="text-radi-orange">★</span>
        </div>
      </div>

      {/* ── App body ── */}
      <div className="flex flex-1 w-full max-w-screen-xl mx-auto">
        {/* ── Sidebar nav (lg+) ── */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 sticky top-[73px] h-[calc(100vh-73px)] bg-white border-r border-gray-100 py-6 px-3 gap-1 overflow-y-auto">
          {NAV.filter(n => !n.isExternal).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left w-full ${
                tab === id ? 'bg-radi-orange/10 text-radi-orange' : 'text-gray-400 hover:bg-gray-50 hover:text-radi-dark'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
              </svg>
              <span className={`text-xs font-black uppercase tracking-widest ${tab === id ? 'text-radi-orange' : ''}`}>{label}</span>
            </button>
          ))}
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
            {tab === 'dashboard' && (
              <DashboardTab
                metrics={{ todaySales, todayExpense, weekSales, weekExpense, totalSavings, lowStock, pendingLoans, totalStockValue }}
                transactions={transactions} products={products} savings={savings} loans={loans}
                hourlySales={hourlySales} customers={customers} budgets={budgets}
                setTab={setTab} toast={toast} user={user} addTransaction={addTransaction}
              />
            )}
            {tab === 'pos' && (
              <POSTab
                products={products} updateProductStock={updateProductStock}
                addTransaction={addTransaction} toast={toast} user={user}
                customers={customers} logAudit={logAudit}
              />
            )}
            {tab === 'inventory' && (
              <InventoryTab
                products={products} addProduct={addProduct}
                updateProductStock={updateProductStock} toast={toast}
                suppliers={suppliers} purchaseOrders={purchaseOrders}
                user={user} db={db} logAudit={logAudit}
              />
            )}
            {tab === 'finance' && (
              <FinanceTab
                transactions={transactions} savings={savings} loans={loans}
                addTransaction={addTransaction} user={user} db={db}
                toast={toast} budgets={budgets}
              />
            )}
            {tab === 'team' && (
              <TeamTab
                staff={staff} auditLogs={auditLogs}
                user={user} db={db} toast={toast} logAudit={logAudit}
              />
            )}
            {tab === 'reports' && (
              <ReportsTab
                transactions={transactions} products={products}
                savings={savings} loans={loans}
                customers={customers} hourlySales={hourlySales}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 flex justify-around px-1 py-2">
        {NAV.map(({ id, label, icon, isExternal }) => (
          <button
            key={id}
            onClick={() => isExternal ? setView('dashboard') : setTab(id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all ${
              !isExternal && tab === id ? 'bg-radi-orange/10' : 'hover:bg-gray-50'
            }`}
          >
            <svg className={`w-5 h-5 ${!isExternal && tab === id ? 'text-radi-orange' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
            </svg>
            <span className={`text-[8px] font-black uppercase tracking-widest ${!isExternal && tab === id ? 'text-radi-orange' : 'text-gray-400'}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB — Pro
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab({ metrics, transactions, products, savings, loans, hourlySales, customers, budgets, setTab, toast, user, addTransaction }) {
  const { todaySales, todayExpense, weekSales, weekExpense, totalSavings, lowStock, pendingLoans, totalStockValue } = metrics;

  // AI Insights — simple rule-based anomaly detection
  const insights = [];
  const avgDailySales = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) / Math.max(1, 30);
  if (todaySales > avgDailySales * 1.5) insights.push({ type: 'positive', msg: `Today's sales are 50%+ above average — great day! 🚀` });
  if (todaySales < avgDailySales * 0.4 && new Date().getHours() > 15) insights.push({ type: 'warning', msg: `Sales are running low today compared to average.` });
  if (lowStock.length > 3) insights.push({ type: 'warning', msg: `${lowStock.length} products are critically low on stock.` });
  const topCat = Object.entries(
    transactions.filter(t => t.type === 'expense').reduce((a, t) => { a[t.category] = (a[t.category] || 0) + t.amount; return a; }, {})
  ).sort((a, b) => b[1] - a[1])[0];
  if (topCat) insights.push({ type: 'info', msg: `Your top expense category this period is ${topCat[0]}.` });

  // Cash flow forecast (simple linear projection)
  const last7Income  = transactions.filter(t => t.type === 'income'  && t.date >= weekAgo()).reduce((s, t) => s + t.amount, 0);
  const last7Expense = transactions.filter(t => t.type === 'expense' && t.date >= weekAgo()).reduce((s, t) => s + t.amount, 0);
  const projMonthlyIncome  = (last7Income  / 7) * 30;
  const projMonthlyExpense = (last7Expense / 7) * 30;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-black text-radi-dark tracking-tight mt-0.5">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
          </h1>
        </div>
        <div className="bg-gradient-to-br from-radi-orange to-orange-400 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-2xl shadow">
          Pro Plan ★
        </div>
      </div>

      {/* Hero card */}
      <div className="bg-radi-dark rounded-[2rem] p-6 text-white">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Today's Sales</p>
        <p className="text-4xl font-black tracking-tight"><span className="text-radi-orange text-sm mr-1 font-bold">UGX</span>{todaySales.toLocaleString()}</p>
        <div className="mt-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Hourly Sales Trend</p>
          <SparkBar data={hourlySales} color="#f97316" height={36} />
        </div>
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Expenses</p>
            <p className="text-base font-black text-red-400">{UGX(todayExpense)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Net</p>
            <p className={`text-base font-black ${todaySales - todayExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>{UGX(todaySales - todayExpense)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Customers</p>
            <p className="text-base font-black text-blue-300">{customers.length}</p>
          </div>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Week Sales" value={UGX(weekSales)} sub={`Exp: ${UGX(weekExpense)}`} accent="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <MetricCard label="Stock Value" value={UGX(totalStockValue)} sub={`${products.length} products`} accent="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
        <MetricCard label="Low Stock" value={lowStock.length} sub="need restock" accent={lowStock.length > 0 ? 'red' : 'green'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <MetricCard label="Loans Due" value={UGX(pendingLoans)} sub="outstanding" accent="purple"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      </div>

      {/* AI-Powered Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-3 flex items-center gap-1">
            🤖 AI Spending Insights <ProBadge />
          </p>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={`rounded-xl p-3 text-xs font-semibold flex items-start gap-2 ${
                ins.type === 'positive' ? 'bg-green-50 text-green-700' :
                ins.type === 'warning'  ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                <span>{ins.type === 'positive' ? '✅' : ins.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                {ins.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Flow Forecast */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1">
          📊 Cash Flow Forecast (30-day projection) <ProBadge />
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Proj. Income</p>
            <p className="font-black text-green-600 text-sm">{UGX(Math.round(projMonthlyIncome))}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Proj. Expense</p>
            <p className="font-black text-red-500 text-sm">{UGX(Math.round(projMonthlyExpense))}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Proj. Net</p>
            <p className={`font-black text-sm ${projMonthlyIncome - projMonthlyExpense >= 0 ? 'text-blue-600' : 'text-radi-orange'}`}>
              {UGX(Math.round(projMonthlyIncome - projMonthlyExpense))}
            </p>
          </div>
        </div>
        <p className="text-[9px] text-gray-300 font-semibold mt-3">Based on last 7 days of activity</p>
      </div>

      {/* Budget status */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Budget Status</p>
          {budgets.slice(0, 4).map(b => {
            const spent = transactions
              .filter(t => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === new Date().getMonth())
              .reduce((s, t) => s + t.amount, 0);
            const pct = Math.min(100, Math.round((spent / b.limit) * 100));
            return (
              <div key={b.id} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-radi-dark">{b.category}</span>
                  <span className={pct >= 90 ? 'text-red-500' : 'text-gray-400'}>{UGX(spent)} / {UGX(b.limit)} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-radi-orange'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <button onClick={() => {}} className="mt-2 text-[10px] font-black text-radi-orange uppercase tracking-widest hover:underline">Manage Budgets →</button>
        </div>
      )}

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">⚠️ Low Stock Alert</p>
          {lowStock.map(p => (
            <div key={p.id} className="flex justify-between items-center py-1">
              <span className="text-sm font-semibold text-radi-dark">{p.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-red-500">{p.quantity} left</span>
                {p.reorderPoint && <span className="text-[9px] bg-red-100 text-red-400 font-bold px-2 py-0.5 rounded-full">Reorder at {p.reorderPoint}</span>}
              </div>
            </div>
          ))}
          <button onClick={() => {}} className="mt-3 text-xs font-black text-radi-orange hover:underline uppercase tracking-widest">Manage Stock →</button>
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Transactions</p>
          <button className="text-[10px] font-black text-radi-orange uppercase tracking-widest hover:underline">See All</button>
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
// POS TAB — Pro (barcode, loyalty, split payment, discounts, refunds)
// ─────────────────────────────────────────────────────────────────────────────

function POSTab({ products, updateProductStock, addTransaction, toast, user, customers, logAudit }) {
  const [cart, setCart]               = useState([]);
  const [search, setSearch]           = useState('');
  const [payMethod, setPayMethod]     = useState('Cash');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale]       = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount]       = useState(0); // percent
  const [applyVAT, setApplyVAT]       = useState(false);
  const [splitAmounts, setSplitAmounts] = useState({ Cash: '', 'Mobile Money': '' });
  const [refundOpen, setRefundOpen]   = useState(false);
  const [refundNote, setRefundNote]   = useState('');
  const receiptRef = useRef();

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

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = Math.round(subtotal * discount / 100);
  const vatAmt      = applyVAT ? Math.round((subtotal - discountAmt) * VAT_RATE) : 0;
  const total       = subtotal - discountAmt + vatAmt;

  // Profit margin per item (if costPrice stored)
  const totalCost   = cart.reduce((s, c) => s + ((c.costPrice || 0) * c.qty), 0);
  const grossProfit = subtotal - totalCost;

  // Loyalty points: 1 point per UGX 1000 spent
  const loyaltyPoints = Math.floor(total / 1000);

  const checkout = async () => {
    if (cart.length === 0) { toast('Cart is empty', 'warning'); return; }
    if (payMethod === 'Split') {
      const splitTotal = Object.values(splitAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(splitTotal - total) > 1) { toast(`Split amounts must total ${UGX(total)}`, 'warning'); return; }
    }
    try {
      await addTransaction({
        type: 'income',
        amount: total,
        category: 'sales',
        note: `POS Sale — ${payMethod} — ${cart.map(c => `${c.name}×${c.qty}`).join(', ')}`,
        paymentMethod: payMethod,
        discount: discountAmt,
        vatAmount: vatAmt,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || null,
        items: cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price, costPrice: c.costPrice || 0 })),
      });
      // Deduct stock
      for (const item of cart) {
        await updateProductStock(item.id, -item.qty, 'POS Sale');
      }
      // Update customer loyalty points
      if (selectedCustomer) {
        await updateDoc(doc(db, 'customers', selectedCustomer.id), {
          loyaltyPoints: increment(loyaltyPoints),
          totalSpent: increment(total),
          lastPurchase: Date.now(),
        });
      }
      setLastSale({ cart: [...cart], total, subtotal, discountAmt, vatAmt, payMethod, date: new Date(), customer: selectedCustomer });
      setCart([]); setSearch(''); setDiscount(0); setApplyVAT(false); setSelectedCustomer(null);
      setReceiptOpen(true);
      toast(`Sale of ${UGX(total)} recorded!`, 'success');
    } catch (e) {
      toast('Sale failed. Try again.', 'danger');
    }
  };

  const handleRefund = async () => {
    if (!lastSale) { toast('No recent sale to refund', 'warning'); return; }
    try {
      await addTransaction({
        type: 'expense',
        amount: lastSale.total,
        category: 'refund',
        note: `Refund: ${refundNote || 'No reason given'}`,
      });
      for (const item of lastSale.cart) {
        await updateProductStock(item.id, item.qty, 'Refund');
      }
      await logAudit('SALE_REFUNDED', `${UGX(lastSale.total)} — ${refundNote}`);
      setRefundOpen(false); setRefundNote('');
      toast('Refund processed and stock restored!', 'success');
    } catch (e) {
      toast('Refund failed.', 'danger');
    }
  };

  // Simulated barcode scan — in production this would use a real scanner
  const simulateScan = () => {
    const barcoded = products.find(p => p.barcode);
    if (barcoded) { addToCart(barcoded); toast(`Scanned: ${barcoded.name}`, 'success'); }
    else toast('No barcoded products found. Add barcodes in Inventory.', 'info');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Point of Sale <ProBadge /></p>
          <h2 className="text-xl font-black text-radi-dark tracking-tight">New Sale</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={simulateScan}
            className="bg-radi-dark text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-black transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            Scan
          </button>
          {lastSale && (
            <button onClick={() => setRefundOpen(true)} className="bg-red-50 text-red-500 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-red-100 transition-all border border-red-100">
              ↩ Refund
            </button>
          )}
        </div>
      </div>

      {/* Customer selector */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-soft">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Customer (optional)</p>
        <select
          className={inputCls}
          value={selectedCustomer?.id || ''}
          onChange={e => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
        >
          <option value="">Walk-in Customer</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.loyaltyPoints || 0} pts</option>
          ))}
        </select>
        {selectedCustomer && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="bg-blue-50 text-blue-600 font-black px-2 py-1 rounded-lg">⭐ {selectedCustomer.loyaltyPoints || 0} loyalty points</span>
            <span className="text-gray-400">Total spent: {UGX(selectedCustomer.totalSpent || 0)}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input className={`${inputCls} pl-10`} placeholder="Search or scan product…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Product grid */}
      {search && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.length === 0 && <p className="col-span-2 text-center text-sm text-gray-300 font-bold py-4">No products found</p>}
          {filtered.map(p => {
            const margin = p.costPrice ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;
            return (
              <button key={p.id} onClick={() => addToCart(p)} className="bg-white rounded-2xl p-4 text-left border border-gray-100 shadow-soft hover:border-radi-orange transition-all active:scale-95">
                <p className="font-black text-radi-dark text-sm">{p.name}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{p.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-radi-orange font-black text-sm">{UGX(p.price)}</p>
                  <p className={`text-[9px] font-black uppercase ${p.quantity <= (p.lowStockAt || 5) ? 'text-red-400' : 'text-gray-300'}`}>{p.quantity} left</p>
                </div>
                {margin !== null && <p className="text-[9px] text-green-500 font-bold mt-1">{margin}% margin</p>}
              </button>
            );
          })}
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
                {item.costPrice && <p className="text-[9px] text-green-500 font-bold">Margin: {Math.round(((item.price - item.costPrice) / item.price) * 100)}%</p>}
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

          <div className="px-5 py-4 bg-app-bg space-y-4">
            {/* Discount & VAT controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount (%)</Label>
                <input type="number" min="0" max="100" className={inputCls} value={discount} onChange={e => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
              </div>
              <div className="flex flex-col justify-end">
                <button
                  onClick={() => setApplyVAT(v => !v)}
                  className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${applyVAT ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-100 text-gray-400'}`}
                >
                  {applyVAT ? '✓ VAT 18%' : 'Add VAT 18%'}
                </button>
              </div>
            </div>

            {/* Totals breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-400 font-semibold"><span>Subtotal</span><span>{UGX(subtotal)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-green-600 font-bold"><span>Discount ({discount}%)</span><span>-{UGX(discountAmt)}</span></div>}
              {vatAmt > 0    && <div className="flex justify-between text-blue-600 font-bold"><span>VAT (18%)</span><span>+{UGX(vatAmt)}</span></div>}
              {totalCost > 0 && <div className="flex justify-between text-gray-300 font-bold border-t border-gray-100 pt-1"><span>Gross Profit</span><span className="text-green-500">{UGX(grossProfit)}</span></div>}
            </div>

            <div className="flex justify-between items-center">
              <p className="font-black text-radi-dark">Total</p>
              <p className="text-xl font-black text-radi-dark">{UGX(total)}</p>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Payment Method</p>
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_METHODS.map(m => (
                  <Pill key={m} active={payMethod === m} onClick={() => setPayMethod(m)}>{m}</Pill>
                ))}
              </div>
            </div>

            {/* Split payment details */}
            {payMethod === 'Split' && (
              <div className="bg-white rounded-2xl p-4 border border-blue-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Split Payment Details</p>
                {['Cash', 'Mobile Money', 'Card'].map(method => (
                  <div key={method}>
                    <Label>{method}</Label>
                    <input
                      type="number" className={inputCls} placeholder="0"
                      value={splitAmounts[method] || ''}
                      onChange={e => setSplitAmounts(p => ({ ...p, [method]: e.target.value }))}
                    />
                  </div>
                ))}
                <p className="text-xs font-bold text-gray-400">
                  Entered: {UGX(Object.values(splitAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0))} / Needed: {UGX(total)}
                </p>
              </div>
            )}

            {/* Loyalty points preview */}
            {selectedCustomer && (
              <div className="bg-blue-50 rounded-xl p-3 text-xs font-bold text-blue-700">
                ⭐ This sale will earn {loyaltyPoints} loyalty point{loyaltyPoints !== 1 ? 's' : ''}
              </div>
            )}

            <button onClick={checkout} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all shadow-lg active:scale-95">
              Complete Sale — {UGX(total)}
            </button>
          </div>
        </div>
      )}

      {cart.length === 0 && !search && (
        <div className="text-center py-16 text-gray-300">
          <p className="text-5xl mb-3">🛒</p>
          <p className="text-sm font-bold">Search for a product or scan barcode to start a sale</p>
        </div>
      )}

      {/* Receipt Modal */}
      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Branded Receipt">
        {lastSale && (
          <div ref={receiptRef} className="space-y-4">
            <div className="text-center pb-4 border-b border-gray-100">
              <div className="w-12 h-12 bg-radi-orange rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="font-black text-radi-dark text-lg">RadiExpense Pro</p>
              <p className="text-[10px] text-gray-400">Your Trusted Business Partner</p>
              <p className="text-[10px] text-gray-400 mt-1">{lastSale.date.toLocaleString()}</p>
              {lastSale.customer && <p className="text-xs font-bold text-blue-600 mt-1">Customer: {lastSale.customer.name}</p>}
            </div>
            {lastSale.cart.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-semibold text-radi-dark">{item.name} × {item.qty}</span>
                <span className="font-bold">{UGX(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{UGX(lastSale.subtotal)}</span></div>
              {lastSale.discountAmt > 0 && <div className="flex justify-between text-green-600 font-bold"><span>Discount</span><span>-{UGX(lastSale.discountAmt)}</span></div>}
              {lastSale.vatAmt > 0    && <div className="flex justify-between text-blue-600 font-bold"><span>VAT (18%)</span><span>+{UGX(lastSale.vatAmt)}</span></div>}
            </div>
            <div className="flex justify-between font-black text-radi-dark border-t pt-3">
              <span>TOTAL</span><span>{UGX(lastSale.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Payment</span><span className="font-bold">{lastSale.payMethod}</span>
            </div>
            {lastSale.customer && (
              <div className="bg-blue-50 rounded-xl p-3 text-center text-xs text-blue-700 font-bold">
                ⭐ +{Math.floor(lastSale.total / 1000)} Loyalty Points Added
              </div>
            )}
            <p className="text-center text-[10px] text-gray-300 pt-2">Thank you for your purchase! • Powered by RadiExpense Pro</p>
            <button onClick={() => window.print()} className="w-full bg-radi-dark text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95 mt-2">
              🖨️ Print Receipt
            </button>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Process Refund">
        <div className="space-y-4">
          {lastSale ? (
            <>
              <div className="bg-red-50 rounded-2xl p-4">
                <p className="font-black text-radi-dark">Refund last sale</p>
                <p className="text-sm text-gray-400">{UGX(lastSale.total)} — {lastSale.date.toLocaleString()}</p>
                <p className="text-xs text-red-500 font-bold mt-1">Stock will be restored automatically</p>
              </div>
              <div><Label required>Reason for Refund</Label><input className={inputCls} placeholder="Customer reason…" value={refundNote} onChange={e => setRefundNote(e.target.value)} /></div>
              <button onClick={handleRefund} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-sm hover:bg-red-600 transition-all active:scale-95 shadow-lg">
                Confirm Refund — {UGX(lastSale.total)}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No recent sale to refund in this session.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY TAB — Pro (suppliers, purchase orders, multi-location, batch/expiry)
// ─────────────────────────────────────────────────────────────────────────────

function InventoryTab({ products, addProduct, updateProductStock, toast, suppliers, purchaseOrders, user, db, logAudit }) {
  const [subTab, setSubTab] = useState('products');
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjust] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterLoc, setFilterLoc] = useState('All');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);

  const [newProd, setNewProd] = useState({
    name: '', price: '', costPrice: '', quantity: '', category: '',
    lowStockAt: 5, reorderPoint: 10, location: LOCATIONS[0],
    barcode: '', batchNumber: '', expiryDate: '', supplier: '',
  });
  const setP = (f, v) => setNewProd(p => ({ ...p, [f]: v }));

  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', email: '', address: '', notes: '' });
  const setS = (f, v) => setNewSupplier(p => ({ ...p, [f]: v }));

  const [newPO, setNewPO] = useState({ supplier: '', items: '', totalAmount: '', expectedDate: '', notes: '' });
  const setPO = (f, v) => setNewPO(p => ({ ...p, [f]: v }));

  const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const locs = ['All', ...LOCATIONS];
  const filtered = products
    .filter(p => (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)))
    .filter(p => filterCat === 'All' || p.category === filterCat)
    .filter(p => filterLoc === 'All' || p.location === filterLoc);

  // Inventory valuation
  const totalValue = products.reduce((s, p) => s + (p.price * p.quantity), 0);
  const totalCostValue = products.reduce((s, p) => s + ((p.costPrice || 0) * p.quantity), 0);

  // Smart re-order suggestions
  const reorderSuggestions = products.filter(p => p.quantity <= (p.reorderPoint || 10) && p.supplier);

  // Turnover rate: sales in last 30 days / avg stock
  const getProductTurnover = (product) => {
    // This would ideally use actual sales data; placeholder for demo
    return product.soldCount ? ((product.soldCount / Math.max(1, product.quantity + product.soldCount)) * 100).toFixed(0) : null;
  };

  // Check expiry
  const soonExpiring = products.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    const diff = (exp - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  });

  const handleAdd = async () => {
    if (!newProd.name.trim() || !newProd.price || !newProd.quantity) { toast('Fill in name, price & quantity', 'warning'); return; }
    await addProduct({
      ...newProd,
      price: parseFloat(newProd.price),
      costPrice: parseFloat(newProd.costPrice) || 0,
      quantity: parseInt(newProd.quantity),
      lowStockAt: parseInt(newProd.lowStockAt) || 5,
      reorderPoint: parseInt(newProd.reorderPoint) || 10,
    });
    setNewProd({ name: '', price: '', costPrice: '', quantity: '', category: '', lowStockAt: 5, reorderPoint: 10, location: LOCATIONS[0], barcode: '', batchNumber: '', expiryDate: '', supplier: '' });
    setAddOpen(false);
    toast('Product added!', 'success');
  };

  const handleAdjust = async () => {
    if (!adjustQty || isNaN(adjustQty)) { toast('Enter a valid quantity', 'warning'); return; }
    const delta = adjustType === 'add' ? parseInt(adjustQty) : -parseInt(adjustQty);
    if (adjustType === 'remove' && adjustOpen.quantity + delta < 0) { toast("Can't go below 0", 'warning'); return; }
    await updateProductStock(adjustOpen.id, delta, `Manual ${adjustType}`);
    setAdjust(null); setAdjustQty('');
    toast('Stock updated!', 'success');
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) { toast('Supplier name required', 'warning'); return; }
    await addDoc(collection(db, 'suppliers'), { uid: user.uid, createdAt: Date.now(), ...newSupplier });
    setNewSupplier({ name: '', contact: '', email: '', address: '', notes: '' });
    setSupplierOpen(false);
    toast('Supplier added!', 'success');
  };

  const handleAddPO = async () => {
    if (!newPO.supplier || !newPO.totalAmount) { toast('Supplier and amount required', 'warning'); return; }
    await addDoc(collection(db, 'purchaseOrders'), {
      uid: user.uid, date: Date.now(), status: 'Pending',
      ...newPO, totalAmount: parseFloat(newPO.totalAmount),
    });
    await logAudit('PURCHASE_ORDER_CREATED', `${newPO.supplier} — ${UGX(newPO.totalAmount)}`);
    setNewPO({ supplier: '', items: '', totalAmount: '', expectedDate: '', notes: '' });
    setPoOpen(false);
    toast('Purchase order created!', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Inventory <ProBadge /></p>
          <h2 className="text-xl font-black text-radi-dark tracking-tight">Products & Stock</h2>
        </div>
        <button onClick={() => setAddOpen(true)} className="bg-radi-orange text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow hover:bg-orange-500 transition-all active:scale-95">
          + Add Product
        </button>
      </div>

      {/* Inventory summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Stock Value</p>
          <p className="font-black text-blue-700 text-sm mt-1">{UGX(totalValue)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black uppercase text-green-600 tracking-widest">Cost Value</p>
          <p className="font-black text-green-700 text-sm mt-1">{UGX(totalCostValue)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black uppercase text-radi-orange tracking-widest">Unrealised</p>
          <p className="font-black text-radi-orange text-sm mt-1">{UGX(totalValue - totalCostValue)}</p>
        </div>
      </div>

      {/* Expiry warnings */}
      {soonExpiring.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 mb-2">⏰ Expiring Soon (within 30 days)</p>
          {soonExpiring.map(p => (
            <div key={p.id} className="flex justify-between text-xs py-1">
              <span className="font-bold text-radi-dark">{p.name}</span>
              <span className="text-yellow-600 font-black">{p.expiryDate}</span>
            </div>
          ))}
        </div>
      )}

      {/* Smart Re-order suggestions */}
      {reorderSuggestions.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2">🤖 Smart Reorder Suggestions</p>
          {reorderSuggestions.slice(0, 3).map(p => (
            <div key={p.id} className="flex justify-between text-xs py-1">
              <span className="font-bold text-radi-dark">{p.name} ({p.quantity} left)</span>
              <span className="text-purple-600 font-black">Supplier: {p.supplier || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'products',  label: 'Products' },
          { id: 'suppliers', label: 'Suppliers' },
          { id: 'orders',    label: 'Purchase Orders' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              subTab === id ? 'bg-radi-dark text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
            }`}>{label}</button>
        ))}
        <button onClick={() => setSupplierOpen(true)} className="ml-auto px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-radi-orange/10 text-radi-orange hover:bg-radi-orange/20 transition-all whitespace-nowrap">
          + Supplier
        </button>
        <button onClick={() => setPoOpen(true)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all whitespace-nowrap">
          + PO
        </button>
      </div>

      {subTab === 'products' && (
        <>
          <input className={inputCls} placeholder="Search by name or barcode…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cats.map(c => <Pill key={c} active={filterCat === c} onClick={() => setFilterCat(c)}>{c}</Pill>)}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {locs.map(l => <Pill key={l} active={filterLoc === l} onClick={() => setFilterLoc(l)} color="blue">{l}</Pill>)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-300">
                <p className="text-4xl mb-2">📦</p><p className="text-sm font-bold">No products yet</p>
              </div>
            )}
            {filtered.map(p => {
              const margin = p.costPrice ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;
              const turnover = getProductTurnover(p);
              return (
                <div key={p.id} className={`bg-white rounded-2xl p-4 border shadow-soft flex flex-col gap-2 ${p.quantity <= (p.lowStockAt || 5) ? 'border-red-100' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-radi-dark text-sm">{p.name}</p>
                        {p.category && <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">{p.category}</span>}
                        {p.quantity <= (p.lowStockAt || 5) && <span className="text-[9px] font-black bg-red-50 text-red-400 px-2 py-0.5 rounded-full">LOW</span>}
                        {p.batchNumber && <span className="text-[9px] font-bold bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full">Batch: {p.batchNumber}</span>}
                      </div>
                      <p className="text-radi-orange font-black text-sm mt-0.5">{UGX(p.price)}</p>
                      {p.costPrice > 0 && <p className="text-[9px] text-gray-400 font-semibold">Cost: {UGX(p.costPrice)}</p>}
                      {p.location && <p className="text-[9px] text-blue-500 font-bold mt-0.5">📍 {p.location}</p>}
                      {p.barcode && <p className="text-[9px] text-gray-300 font-mono">#{p.barcode}</p>}
                      {p.expiryDate && <p className="text-[9px] text-yellow-600 font-bold">Exp: {p.expiryDate}</p>}
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${p.quantity <= (p.lowStockAt || 5) ? 'text-red-500' : 'text-radi-dark'}`}>{p.quantity}</p>
                      <p className="text-[9px] text-gray-300 font-bold">in stock</p>
                      {margin !== null && <p className="text-[9px] text-green-500 font-black mt-1">{margin}% margin</p>}
                      {turnover && <p className="text-[9px] text-purple-500 font-black">{turnover}% turnover</p>}
                    </div>
                  </div>
                  <button onClick={() => { setAdjust(p); setAdjustQty(''); setAdjustType('add'); }}
                    className="w-full bg-app-bg hover:bg-radi-orange/10 text-radi-orange font-black text-xs py-2 rounded-xl transition-colors">
                    Adjust Stock ⇅
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {subTab === 'suppliers' && (
        <div className="space-y-3">
          {suppliers.length === 0 && (
            <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">🏭</p><p className="text-sm font-bold">No suppliers yet</p></div>
          )}
          {suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
              <p className="font-black text-radi-dark">{s.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.contact} {s.email && `• ${s.email}`}</p>
              {s.address && <p className="text-[10px] text-gray-300 mt-0.5">📍 {s.address}</p>}
              {s.notes && <p className="text-xs text-gray-400 italic mt-1">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {subTab === 'orders' && (
        <div className="space-y-3">
          {purchaseOrders.length === 0 && (
            <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">📋</p><p className="text-sm font-bold">No purchase orders yet</p></div>
          )}
          {purchaseOrders.map(po => (
            <div key={po.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-black text-radi-dark">{po.supplier}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{po.items}</p>
                  {po.expectedDate && <p className="text-[10px] text-radi-orange font-bold mt-0.5">Expected: {po.expectedDate}</p>}
                  {po.notes && <p className="text-xs text-gray-400 italic mt-1">{po.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-black text-radi-dark">{UGX(po.totalAmount)}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${
                    po.status === 'Received' ? 'bg-green-50 text-green-600' :
                    po.status === 'Cancelled' ? 'bg-red-50 text-red-400' :
                    'bg-yellow-50 text-yellow-600'
                  }`}>{po.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Product" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label required>Product Name</Label><input className={inputCls} placeholder="e.g. Coca-Cola 500ml" value={newProd.name} onChange={e => setP('name', e.target.value)} /></div>
            <div><Label required>Selling Price (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={newProd.price} onChange={e => setP('price', e.target.value)} /></div>
            <div><Label>Cost Price (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={newProd.costPrice} onChange={e => setP('costPrice', e.target.value)} /></div>
            <div><Label required>Initial Stock</Label><input className={inputCls} type="number" placeholder="0" value={newProd.quantity} onChange={e => setP('quantity', e.target.value)} /></div>
            <div><Label>Category</Label><input className={inputCls} placeholder="e.g. Beverages" value={newProd.category} onChange={e => setP('category', e.target.value)} /></div>
            <div><Label>Low Stock Alert At</Label><input className={inputCls} type="number" placeholder="5" value={newProd.lowStockAt} onChange={e => setP('lowStockAt', e.target.value)} /></div>
            <div><Label>Reorder Point</Label><input className={inputCls} type="number" placeholder="10" value={newProd.reorderPoint} onChange={e => setP('reorderPoint', e.target.value)} /></div>
            <div><Label>Barcode / SKU</Label><input className={inputCls} placeholder="e.g. 1234567890" value={newProd.barcode} onChange={e => setP('barcode', e.target.value)} /></div>
            <div>
              <Label>Location / Warehouse</Label>
              <select className={inputCls} value={newProd.location} onChange={e => setP('location', e.target.value)}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div><Label>Batch Number</Label><input className={inputCls} placeholder="e.g. BATCH-001" value={newProd.batchNumber} onChange={e => setP('batchNumber', e.target.value)} /></div>
            <div><Label>Expiry Date</Label><input className={inputCls} type="date" value={newProd.expiryDate} onChange={e => setP('expiryDate', e.target.value)} /></div>
            <div className="col-span-2">
              <Label>Supplier</Label>
              <select className={inputCls} value={newProd.supplier} onChange={e => setP('supplier', e.target.value)}>
                <option value="">No Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAdd} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg mt-2">Save Product</button>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!adjustOpen} onClose={() => setAdjust(null)} title="Adjust Stock">
        {adjustOpen && (
          <div className="space-y-4">
            <div className="bg-app-bg rounded-2xl p-4">
              <p className="font-black text-radi-dark">{adjustOpen.name}</p>
              <p className="text-sm text-gray-400">Current stock: <span className="font-black text-radi-dark">{adjustOpen.quantity}</span></p>
              {adjustOpen.location && <p className="text-xs text-blue-500 font-bold">📍 {adjustOpen.location}</p>}
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

      {/* Add Supplier Modal */}
      <Modal open={supplierOpen} onClose={() => setSupplierOpen(false)} title="Add Supplier">
        <div className="space-y-4">
          <div><Label required>Supplier Name</Label><input className={inputCls} placeholder="e.g. Mukwano Industries" value={newSupplier.name} onChange={e => setS('name', e.target.value)} /></div>
          <div><Label>Contact Number</Label><input className={inputCls} placeholder="+256..." value={newSupplier.contact} onChange={e => setS('contact', e.target.value)} /></div>
          <div><Label>Email</Label><input className={inputCls} type="email" placeholder="supplier@email.com" value={newSupplier.email} onChange={e => setS('email', e.target.value)} /></div>
          <div><Label>Address</Label><input className={inputCls} placeholder="Physical address" value={newSupplier.address} onChange={e => setS('address', e.target.value)} /></div>
          <div><Label>Notes</Label><textarea className={inputCls} placeholder="Payment terms, lead times, etc." value={newSupplier.notes} onChange={e => setS('notes', e.target.value)} rows={2} /></div>
          <button onClick={handleAddSupplier} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Save Supplier</button>
        </div>
      </Modal>

      {/* Purchase Order Modal */}
      <Modal open={poOpen} onClose={() => setPoOpen(false)} title="Create Purchase Order">
        <div className="space-y-4">
          <div>
            <Label required>Supplier</Label>
            <select className={inputCls} value={newPO.supplier} onChange={e => setPO('supplier', e.target.value)}>
              <option value="">Select supplier…</option>
              {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div><Label>Items / Description</Label><textarea className={inputCls} placeholder="e.g. 10× Soap, 5× Sugar bags" value={newPO.items} onChange={e => setPO('items', e.target.value)} rows={2} /></div>
          <div><Label required>Total Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={newPO.totalAmount} onChange={e => setPO('totalAmount', e.target.value)} /></div>
          <div><Label>Expected Delivery</Label><input className={inputCls} type="date" value={newPO.expectedDate} onChange={e => setPO('expectedDate', e.target.value)} /></div>
          <div><Label>Notes</Label><input className={inputCls} placeholder="Special instructions" value={newPO.notes} onChange={e => setPO('notes', e.target.value)} /></div>
          <button onClick={handleAddPO} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Create Order</button>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE TAB — Pro (budgets, advanced loans, tax reporting, cash flow)
// ─────────────────────────────────────────────────────────────────────────────

function FinanceTab({ transactions, savings, loans, addTransaction, user, db, toast, budgets }) {
  const [subTab, setSubTab] = useState('overview');

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cashFlow     = totalIncome - totalExpense;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Finance <ProBadge /></p>
        <h2 className="text-xl font-black text-radi-dark tracking-tight">Money Management</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview',  label: 'Overview' },
          { id: 'expenses',  label: 'Expenses' },
          { id: 'budgets',   label: 'Budgets' },
          { id: 'savings',   label: 'Savings' },
          { id: 'loans',     label: 'Loans' },
          { id: 'tax',       label: 'Tax' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              subTab === id ? 'bg-radi-dark text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
            }`}>{label}</button>
        ))}
      </div>
      {subTab === 'overview'  && <FinanceOverview totalIncome={totalIncome} totalExpense={totalExpense} cashFlow={cashFlow} transactions={transactions} />}
      {subTab === 'expenses'  && <ExpensesPanel transactions={transactions} addTransaction={addTransaction} toast={toast} />}
      {subTab === 'budgets'   && <BudgetsPanel budgets={budgets} transactions={transactions} user={user} db={db} toast={toast} />}
      {subTab === 'savings'   && <SavingsPanel savings={savings} user={user} db={db} toast={toast} />}
      {subTab === 'loans'     && <LoansPanel loans={loans} user={user} db={db} toast={toast} />}
      {subTab === 'tax'       && <TaxPanel transactions={transactions} />}
    </div>
  );
}

function FinanceOverview({ totalIncome, totalExpense, cashFlow, transactions }) {
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});

  // Weekly trend last 8 weeks
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const end   = new Date(); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(start.getDate() - 7);
    return transactions
      .filter(t => t.type === 'income' && t.date >= start.getTime() && t.date <= end.getTime())
      .reduce((s, t) => s + t.amount, 0);
  }).reverse();

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

      {/* Weekly sales chart */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">8-Week Sales Trend</p>
        <SparkBar data={weeklyData} color="#f97316" height={60} />
        <div className="flex justify-between text-[9px] text-gray-300 font-bold mt-1">
          <span>8 weeks ago</span><span>This week</span>
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

function BudgetsPanel({ budgets, transactions, user, db, toast }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: EXPENSE_CATS[0], limit: '' });
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const createBudget = async () => {
    if (!form.limit) { toast('Limit required', 'warning'); return; }
    const existing = budgets.find(b => b.category === form.category);
    if (existing) {
      await updateDoc(doc(db, 'budgets', existing.id), { limit: parseFloat(form.limit), alerted90: false });
      toast('Budget updated!', 'success');
    } else {
      await addDoc(collection(db, 'budgets'), { uid: user.uid, category: form.category, limit: parseFloat(form.limit), alerted90: false });
      toast('Budget created!', 'success');
    }
    setForm({ category: EXPENSE_CATS[0], limit: '' }); setOpen(false);
  };

  const now = new Date();
  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(true)} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all shadow active:scale-95">
        + Set Budget Limit
      </button>
      {budgets.length === 0 && (
        <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">💰</p><p className="text-sm font-bold">No budget limits set yet</p></div>
      )}
      {budgets.map(b => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === now.getMonth())
          .reduce((s, t) => s + t.amount, 0);
        const pct = Math.min(100, Math.round((spent / b.limit) * 100));
        return (
          <div key={b.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <div className="flex justify-between items-center mb-2">
              <p className="font-black text-radi-dark">{b.category}</p>
              <span className={`text-xs font-black ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>{pct}% used</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>Spent: {UGX(spent)}</span>
              <span>Limit: {UGX(b.limit)}</span>
            </div>
            {pct >= 90 && <p className="text-[10px] text-red-500 font-black mt-1">⚠️ Budget almost exhausted!</p>}
          </div>
        );
      })}
      <Modal open={open} onClose={() => setOpen(false)} title="Set Budget Limit">
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <select className={inputCls} value={form.category} onChange={e => setF('category', e.target.value)}>
              {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><Label required>Monthly Limit (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={form.limit} onChange={e => setF('limit', e.target.value)} /></div>
          <button onClick={createBudget} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Save Budget</button>
        </div>
      </Modal>
    </div>
  );
}

function TaxPanel({ transactions }) {
  const now = new Date();
  const thisMonth = transactions.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
  const thisYear  = transactions.filter(t => new Date(t.date).getFullYear() === now.getFullYear());

  const monthIncome  = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const yearIncome   = thisYear.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const yearExpense  = thisYear.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const vatCollected = thisMonth.filter(t => t.vatAmount > 0).reduce((s, t) => s + (t.vatAmount || 0), 0);
  const whtDue       = Math.round(monthIncome * WHT_RATE);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">🇺🇬 Uganda Tax Compliance</p>
        <p className="text-xs text-blue-600 font-semibold">VAT Rate: 18% | WHT Rate: 6% | Tax Year: Jan–Dec</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-soft text-center">
          <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">VAT Collected (Month)</p>
          <p className="font-black text-blue-600 text-lg mt-1">{UGX(vatCollected)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-soft text-center">
          <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">WHT Due (Month)</p>
          <p className="font-black text-purple-600 text-lg mt-1">{UGX(whtDue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Monthly P&L</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400 font-semibold">Revenue</span><span className="font-black text-green-600">{UGX(monthIncome)}</span></div>
          <div className="flex justify-between"><span className="text-gray-400 font-semibold">Expenses</span><span className="font-black text-red-500">({UGX(monthExpense)})</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-black text-radi-dark">Net Profit</span><span className={`font-black ${monthIncome - monthExpense >= 0 ? 'text-green-600' : 'text-red-500'}`}>{UGX(monthIncome - monthExpense)}</span></div>
          <div className="flex justify-between text-xs text-gray-300"><span>Est. Tax (30% CIT on profit)</span><span>{UGX(Math.max(0, Math.round((monthIncome - monthExpense) * 0.30)))}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Annual Summary ({now.getFullYear()})</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400 font-semibold">Total Revenue</span><span className="font-black text-green-600">{UGX(yearIncome)}</span></div>
          <div className="flex justify-between"><span className="text-gray-400 font-semibold">Total Expenses</span><span className="font-black text-red-500">({UGX(yearExpense)})</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-black text-radi-dark">Annual Net Profit</span><span className={`font-black ${yearIncome - yearExpense >= 0 ? 'text-green-600' : 'text-red-500'}`}>{UGX(yearIncome - yearExpense)}</span></div>
        </div>
      </div>

      <button onClick={() => window.print()} className="w-full bg-radi-dark text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95">
        🖨️ Export Tax Report
      </button>
    </div>
  );
}

function ExpensesPanel({ transactions, addTransaction, toast }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', category: EXPENSE_CATS[0], note: '' });
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const expenses = transactions.filter(t => t.type === 'expense' && t.category !== 'loan' && t.category !== 'borrowed' && t.category !== 'refund');

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
  const [open, setOpen]     = useState(false);
  const [depOpen, setDep]   = useState(null);
  const [form, setForm]     = useState({ name: '', target: '', current: '', autoRule: '', autoAmount: '' });
  const [depAmt, setDepAmt] = useState('');
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const createGoal = async () => {
    if (!form.name.trim() || !form.target) { toast('Name and target required', 'warning'); return; }
    await addDoc(collection(db, 'savings'), {
      uid: user.uid, name: form.name, target: parseFloat(form.target),
      current: parseFloat(form.current || 0), autoRule: form.autoRule,
      autoAmount: parseFloat(form.autoAmount || 0), createdAt: Date.now(),
    });
    setForm({ name: '', target: '', current: '', autoRule: '', autoAmount: '' });
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
        const remaining = g.target - (g.current || 0);
        return (
          <div key={g.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-black text-radi-dark">{g.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Target: {UGX(g.target)}</p>
                {g.autoRule && <p className="text-[9px] text-blue-500 font-bold mt-0.5">Auto-save: {UGX(g.autoAmount)} {g.autoRule}</p>}
                {remaining > 0 && <p className="text-[9px] text-gray-400 font-semibold">Still need: {UGX(remaining)}</p>}
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
          <div><Label required>Goal Name</Label><input className={inputCls} placeholder="e.g. New Generator" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
          <div><Label required>Target Amount (UGX)</Label><input className={inputCls} type="number" placeholder="500000" value={form.target} onChange={e => setF('target', e.target.value)} /></div>
          <div><Label>Starting Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={form.current} onChange={e => setF('current', e.target.value)} /></div>
          <div>
            <Label>Auto-Save Rule</Label>
            <select className={inputCls} value={form.autoRule} onChange={e => setF('autoRule', e.target.value)}>
              <option value="">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {form.autoRule && (
            <div><Label>Auto-Save Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={form.autoAmount} onChange={e => setF('autoAmount', e.target.value)} /></div>
          )}
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
  const [form, setForm]     = useState({ type: 'borrowed', person: '', amount: '', interestRate: '', note: '', dueDate: '' });
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  // Amortization calculator
  const calcAmortization = (principal, annualRate, months) => {
    if (!annualRate || annualRate === 0) return { monthlyPayment: principal / months, totalInterest: 0 };
    const r = (annualRate / 100) / 12;
    const mp = principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    return { monthlyPayment: mp, totalInterest: mp * months - principal };
  };

  const amort = form.amount && form.interestRate
    ? calcAmortization(parseFloat(form.amount), parseFloat(form.interestRate), 12)
    : null;

  const addLoan = async () => {
    if (!form.person.trim() || !form.amount) { toast('Person/source and amount required', 'warning'); return; }
    await addDoc(collection(db, 'loans'), {
      uid: user.uid, ...form,
      amount: parseFloat(form.amount),
      interestRate: parseFloat(form.interestRate || 0),
      repaid: 0, settled: false, date: Date.now(),
    });
    setForm({ type: 'borrowed', person: '', amount: '', interestRate: '', note: '', dueDate: '' });
    setOpen(false);
    toast('Loan recorded!', 'success');
  };

  const repay = async () => {
    if (!repAmt || isNaN(repAmt)) { toast('Enter a valid amount', 'warning'); return; }
    const amt = parseFloat(repAmt);
    const totalOwed = repOpen.amount + (repOpen.amount * (repOpen.interestRate || 0) / 100);
    const newRepaid = (repOpen.repaid || 0) + amt;
    const settled = newRepaid >= totalOwed;
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
            const totalOwed = l.amount + (l.amount * (l.interestRate || 0) / 100);
            const remaining = totalOwed - (l.repaid || 0);
            const pct = Math.round(((l.repaid || 0) / totalOwed) * 100);
            return (
              <div key={l.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-radi-dark">{l.person}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${l.type === 'borrowed' ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-600'}`}>
                        {l.type === 'borrowed' ? 'I Owe' : 'Owed to Me'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 italic mt-0.5">{l.note}</p>
                    {l.dueDate && <p className="text-[9px] text-radi-orange font-bold mt-0.5">Due: {l.dueDate}</p>}
                    {l.interestRate > 0 && (
                      <p className="text-[9px] text-blue-500 font-bold mt-0.5">
                        Interest: {l.interestRate}% — Total owed: {UGX(totalOwed)}
                      </p>
                    )}
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
          <div><Label required>Principal Amount (UGX)</Label><input className={inputCls} type="number" placeholder="0" value={form.amount} onChange={e => setF('amount', e.target.value)} /></div>
          <div><Label>Annual Interest Rate (%)</Label><input className={inputCls} type="number" placeholder="0" value={form.interestRate} onChange={e => setF('interestRate', e.target.value)} /></div>
          {amort && (
            <div className="bg-blue-50 rounded-2xl p-4 text-xs font-semibold text-blue-700 space-y-1">
              <p className="font-black">Amortization (12 months):</p>
              <p>Monthly payment: {UGX(Math.round(amort.monthlyPayment))}</p>
              <p>Total interest: {UGX(Math.round(amort.totalInterest))}</p>
              <p>Total repayment: {UGX(Math.round(parseFloat(form.amount) + amort.totalInterest))}</p>
            </div>
          )}
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
              <p className="text-sm text-gray-400">Remaining: {UGX(repOpen.amount + (repOpen.amount * (repOpen.interestRate || 0) / 100) - (repOpen.repaid || 0))}</p>
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
// TEAM TAB — Pro (staff, attendance, roles, audit logs)
// ─────────────────────────────────────────────────────────────────────────────

function TeamTab({ staff, auditLogs, user, db, toast, logAudit }) {
  const [subTab, setSubTab] = useState('staff');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: ROLES.CASHIER, email: '', phone: '', startDate: '' });
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleAddStaff = async () => {
    if (!form.name.trim()) { toast('Name required', 'warning'); return; }
    await addDoc(collection(db, 'staff'), { uid: user.uid, createdAt: Date.now(), attendance: [], ...form });
    await logAudit('STAFF_ADDED', `${form.name} as ${form.role}`);
    setForm({ name: '', role: ROLES.CASHIER, email: '', phone: '', startDate: '' });
    setOpen(false);
    toast('Staff member added!', 'success');
  };

  const markAttendance = async (staffId, staffName, type) => {
    const record = { type, time: Date.now(), date: new Date().toLocaleDateString() };
    await updateDoc(doc(db, 'staff', staffId), { attendance: [...(staff.find(s => s.id === staffId)?.attendance || []), record] });
    toast(`${staffName}: ${type} marked`, 'success');
  };

  const roleColors = { Admin: 'bg-purple-50 text-purple-600', Manager: 'bg-blue-50 text-blue-600', Cashier: 'bg-green-50 text-green-600' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Team <ProBadge /></p>
          <h2 className="text-xl font-black text-radi-dark tracking-tight">Staff & Access</h2>
        </div>
        <button onClick={() => setOpen(true)} className="bg-radi-orange text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow hover:bg-orange-500 transition-all active:scale-95">
          + Add Staff
        </button>
      </div>

      <div className="flex gap-2">
        {[{ id: 'staff', label: 'Staff' }, { id: 'audit', label: 'Audit Log' }].map(({ id, label }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              subTab === id ? 'bg-radi-dark text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
            }`}>{label}</button>
        ))}
      </div>

      {subTab === 'staff' && (
        <div className="space-y-3">
          {staff.length === 0 && (
            <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">👥</p><p className="text-sm font-bold">No staff added yet</p></div>
          )}
          {staff.map(s => {
            const today_attend = (s.attendance || []).filter(a => a.date === new Date().toLocaleDateString());
            const clockedIn   = today_attend.some(a => a.type === 'Clock In') && !today_attend.some(a => a.type === 'Clock Out');
            return (
              <div key={s.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-radi-orange/10 rounded-xl flex items-center justify-center">
                        <span className="text-radi-orange font-black text-sm">{s.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-black text-radi-dark">{s.name}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${roleColors[s.role] || 'bg-gray-50 text-gray-400'}`}>{s.role}</span>
                      </div>
                    </div>
                    {s.email  && <p className="text-[10px] text-gray-400 mt-1">{s.email}</p>}
                    {s.phone  && <p className="text-[10px] text-gray-400">{s.phone}</p>}
                    {s.startDate && <p className="text-[9px] text-gray-300 font-semibold">Started: {s.startDate}</p>}
                  </div>
                  <div className={`text-[9px] font-black px-2 py-1 rounded-xl ${clockedIn ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    {clockedIn ? '● Active' : '○ Away'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => markAttendance(s.id, s.name, 'Clock In')}
                    className="flex-1 bg-green-50 text-green-700 py-2 rounded-xl text-xs font-black hover:bg-green-100 transition-colors"
                  >
                    ↗ Clock In
                  </button>
                  <button
                    onClick={() => markAttendance(s.id, s.name, 'Clock Out')}
                    className="flex-1 bg-red-50 text-red-500 py-2 rounded-xl text-xs font-black hover:bg-red-100 transition-colors"
                  >
                    ↙ Clock Out
                  </button>
                </div>
                {today_attend.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {today_attend.map((a, i) => (
                      <p key={i} className="text-[9px] text-gray-400 font-semibold">{a.type}: {new Date(a.time).toLocaleTimeString()}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'audit' && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Showing last {Math.min(50, auditLogs.length)} actions</p>
          {auditLogs.length === 0 && (
            <div className="text-center py-12 text-gray-300"><p className="text-4xl mb-2">🔍</p><p className="text-sm font-bold">No audit logs yet</p></div>
          )}
          {auditLogs.slice(0, 50).map(log => (
            <div key={log.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-soft">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-black text-radi-dark uppercase tracking-wider">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{log.details}</p>
                  <p className="text-[9px] text-gray-300 font-bold mt-0.5">by {log.by}</p>
                </div>
                <p className="text-[9px] text-gray-300 font-bold whitespace-nowrap ml-2">
                  {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Staff Member">
        <div className="space-y-4">
          <div><Label required>Full Name</Label><input className={inputCls} placeholder="e.g. Alice Nalubega" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
          <div>
            <Label required>Role</Label>
            <select className={inputCls} value={form.role} onChange={e => setF('role', e.target.value)}>
              {Object.values(ROLES).map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div><Label>Email</Label><input className={inputCls} type="email" placeholder="staff@email.com" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
          <div><Label>Phone</Label><input className={inputCls} placeholder="+256..." value={form.phone} onChange={e => setF('phone', e.target.value)} /></div>
          <div><Label>Start Date</Label><input className={inputCls} type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)} /></div>
          <div className="bg-blue-50 rounded-2xl p-3 text-xs font-semibold text-blue-700">
            <p className="font-black mb-1">Role Permissions:</p>
            <p>Cashier — POS sales only</p>
            <p>Manager — POS + Inventory + Reports</p>
            <p>Admin — Full access</p>
          </div>
          <button onClick={handleAddStaff} className="w-full bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 shadow-lg">Add Staff Member</button>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS TAB — Pro (interactive, P&L, Balance Sheet, comparisons, exports)
// ─────────────────────────────────────────────────────────────────────────────

function ReportsTab({ transactions, products, savings, loans, customers, hourlySales }) {
  const [range, setRange]     = useState('month');
  const [reportType, setReportType] = useState('summary');
  const [exportMsg, setExportMsg]   = useState('');

  const now = new Date();
  const rangeFilter = (t) => {
    const d = new Date(t.date);
    if (range === 'today') return d.toDateString() === now.toDateString();
    if (range === 'week')  return t.date >= weekAgo();
    if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered  = transactions.filter(rangeFilter);
  const income    = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense   = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const salesTxns = filtered.filter(t => t.category === 'sales');
  const net       = income - expense;

  // Top products by sales value in period
  const productSales = {};
  salesTxns.forEach(t => {
    (t.items || []).forEach(item => {
      if (!productSales[item.name]) productSales[item.name] = 0;
      productSales[item.name] += item.price * item.qty;
    });
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Profit margin calculation
  const totalCOGS = salesTxns.reduce((s, t) => s + (t.items || []).reduce((ss, i) => ss + ((i.costPrice || 0) * i.qty), 0), 0);
  const grossProfit = income - totalCOGS;
  const grossMargin = income > 0 ? ((grossProfit / income) * 100).toFixed(1) : 0;

  // Customer analytics
  const topCustomers = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5);

  // Balance sheet snapshot
  const totalAssets   = products.reduce((s, p) => s + (p.price * p.quantity), 0) + savings.reduce((s, g) => s + (g.current || 0), 0);
  const totalLiab     = loans.filter(l => !l.settled && l.type === 'borrowed').reduce((s, l) => s + (l.amount - (l.repaid || 0)), 0);
  const netWorth      = totalAssets - totalLiab;

  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount', 'Note', 'Payment Method'],
      ...filtered.map(t => [
        new Date(t.date).toLocaleDateString('en-GB'),
        t.type, t.category, t.amount, t.note || '', t.paymentMethod || '',
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `radiexpense_pro_report_${range}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg('CSV downloaded!');
    setTimeout(() => setExportMsg(''), 3000);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-radi-orange mb-1">Reports <ProBadge /></p>
        <h2 className="text-xl font-black text-radi-dark tracking-tight">Advanced Analytics</h2>
      </div>

      {/* Range filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }, { id: 'all', label: 'All Time' }].map(({ id, label }) => (
          <Pill key={id} active={range === id} onClick={() => setRange(id)}>{label}</Pill>
        ))}
      </div>

      {/* Report type selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'summary',   label: 'Summary' },
          { id: 'pnl',       label: 'P&L' },
          { id: 'balance',   label: 'Balance Sheet' },
          { id: 'products',  label: 'Products' },
          { id: 'customers', label: 'Customers' },
          { id: 'hourly',    label: 'Hourly' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setReportType(id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              reportType === id ? 'bg-radi-dark text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'
            }`}>{label}</button>
        ))}
      </div>

      {/* Summary report */}
      {reportType === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
              <p className="text-[9px] font-black uppercase text-green-600 tracking-widest">Income</p>
              <p className="font-black text-green-700 text-sm mt-1">{UGX(income)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-[9px] font-black uppercase text-red-400 tracking-widest">Expense</p>
              <p className="font-black text-red-500 text-sm mt-1">{UGX(expense)}</p>
            </div>
            <div className={`border rounded-2xl p-4 text-center ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest ${net >= 0 ? 'text-blue-600' : 'text-radi-orange'}`}>Net</p>
              <p className={`font-black text-sm mt-1 ${net >= 0 ? 'text-blue-700' : 'text-radi-orange'}`}>{UGX(net)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Sales ({salesTxns.length} transactions)</p>
              {salesTxns.length === 0 ? (
                <p className="text-sm text-gray-300 font-bold text-center py-4">No sales in this period</p>
              ) : (
                salesTxns.slice(0, 8).map(t => (
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
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Stock Summary</p>
              {products.slice(0, 8).map(p => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <p className="text-xs font-bold text-radi-dark">{p.name}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-radi-orange font-bold">{UGX(p.price)}</p>
                    <p className={`text-xs font-black ${p.quantity <= (p.lowStockAt || 5) ? 'text-red-500' : 'text-gray-400'}`}>{p.quantity} left</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* P&L Report */}
      {reportType === 'pnl' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Profit & Loss Statement</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between font-bold text-gray-400 uppercase text-[10px] tracking-widest pb-2 border-b">
              <span>Revenue</span><span></span>
            </div>
            <div className="flex justify-between"><span className="text-radi-dark font-semibold">Gross Revenue</span><span className="font-black text-green-600">{UGX(income)}</span></div>
            <div className="flex justify-between text-gray-400"><span>Cost of Goods Sold (est.)</span><span>({UGX(totalCOGS)})</span></div>
            <div className="flex justify-between font-black border-t pt-2"><span className="text-radi-dark">Gross Profit</span><span className="text-green-600">{UGX(grossProfit)}</span></div>
            <div className="flex justify-between text-xs text-gray-400"><span>Gross Margin</span><span>{grossMargin}%</span></div>
            <div className="flex justify-between font-bold text-gray-400 uppercase text-[10px] tracking-widest pt-3 pb-2 border-b">
              <span>Operating Expenses</span><span></span>
            </div>
            <div className="flex justify-between"><span className="text-radi-dark font-semibold">Total Operating Expenses</span><span className="font-black text-red-500">({UGX(expense)})</span></div>
            <div className="flex justify-between font-black border-t pt-3 text-base">
              <span className="text-radi-dark">Net Profit / (Loss)</span>
              <span className={net >= 0 ? 'text-green-600' : 'text-red-500'}>{UGX(net)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Net Margin</span><span>{income > 0 ? ((net / income) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {reportType === 'balance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Balance Sheet Snapshot</p>
            <div className="space-y-2 text-sm">
              <p className="font-black text-radi-dark uppercase text-[10px] tracking-widest">Assets</p>
              <div className="flex justify-between"><span className="text-gray-500 font-semibold">Inventory Value</span><span className="font-black">{UGX(products.reduce((s, p) => s + p.price * p.quantity, 0))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-semibold">Savings / Cash Pots</span><span className="font-black">{UGX(savings.reduce((s, g) => s + (g.current || 0), 0))}</span></div>
              <div className="flex justify-between font-black border-t pt-2"><span>Total Assets</span><span className="text-green-600">{UGX(totalAssets)}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <div className="space-y-2 text-sm">
              <p className="font-black text-radi-dark uppercase text-[10px] tracking-widest">Liabilities</p>
              <div className="flex justify-between"><span className="text-gray-500 font-semibold">Loans Outstanding</span><span className="font-black">{UGX(totalLiab)}</span></div>
              <div className="flex justify-between font-black border-t pt-2"><span>Total Liabilities</span><span className="text-red-500">{UGX(totalLiab)}</span></div>
            </div>
          </div>
          <div className={`rounded-2xl p-5 border shadow-soft ${netWorth >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex justify-between items-center">
              <p className="font-black text-radi-dark uppercase text-sm tracking-wide">Net Worth (Equity)</p>
              <p className={`text-2xl font-black ${netWorth >= 0 ? 'text-green-600' : 'text-red-500'}`}>{UGX(netWorth)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Products */}
      {reportType === 'products' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Top Products by Revenue</p>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-300 font-bold text-center py-4">No product-level data available</p>
            ) : (
              topProducts.map(([name, revenue], i) => (
                <div key={name} className="flex items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="w-6 text-[10px] font-black text-gray-300">#{i + 1}</span>
                  <p className="text-xs font-bold text-radi-dark flex-1">{name}</p>
                  <p className="font-black text-green-600 text-sm">{UGX(revenue)}</p>
                </div>
              ))
            )}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Inventory Valuation</p>
            {products.slice(0, 10).map(p => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-bold text-radi-dark">{p.name}</p>
                  {p.costPrice > 0 && <p className="text-[9px] text-gray-400">Cost: {UGX(p.costPrice)} | Margin: {Math.round(((p.price - p.costPrice) / p.price) * 100)}%</p>}
                </div>
                <div className="text-right">
                  <p className="font-black text-radi-dark text-xs">{UGX(p.price * p.quantity)}</p>
                  <p className="text-[9px] text-gray-300">{p.quantity} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Report */}
      {reportType === 'customers' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Top Customers by Spend</p>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-300 font-bold text-center py-4">No customer records yet</p>
          ) : (
            topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center py-3 border-b border-gray-50 last:border-0">
                <span className="w-6 text-[10px] font-black text-gray-300">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-radi-dark">{c.name}</p>
                  <p className="text-[9px] text-gray-400">⭐ {c.loyaltyPoints || 0} loyalty points</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-600 text-sm">{UGX(c.totalSpent || 0)}</p>
                  {c.lastPurchase && <p className="text-[9px] text-gray-300">{new Date(c.lastPurchase).toLocaleDateString('en-GB')}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Hourly performance */}
      {reportType === 'hourly' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Today's Hourly Sales</p>
            <SparkBar data={hourlySales} color="#f97316" height={80} />
            <div className="flex justify-between text-[9px] text-gray-300 font-bold mt-1">
              <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Peak Hours</p>
            {hourlySales.map((v, h) => v > 0 ? (
              <div key={h} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs font-bold text-gray-400 w-12">{h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-radi-orange rounded-full" style={{ width: `${(v / Math.max(...hourlySales, 1)) * 100}%` }} />
                </div>
                <span className="text-xs font-black text-radi-dark w-24 text-right">{UGX(v)}</span>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Export buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={exportCSV} className="bg-radi-dark text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export CSV
        </button>
        <button onClick={() => window.print()} className="bg-radi-orange text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print / PDF
        </button>
      </div>
      {exportMsg && <p className="text-center text-xs font-black text-green-500 uppercase tracking-widest">{exportMsg}</p>}
    </div>
  );
}