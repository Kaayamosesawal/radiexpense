import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { db, messaging } from './firebase/config'; 
import { 
  collection, addDoc, onSnapshot, query, where, 
  orderBy, doc, setDoc, increment, getDoc
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging'; 
// --- Components & Modals ---
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import DownloadPage from './pages/Download';
import ContactPage from './pages/Contact';
import OnboardingFree from './pages/OnboardingFree';
import OnboardingPro from './pages/OnboardingPro';
import FreeTier from './pages/FreeTier';
import ProTier from './pages/ProTier';
import Dashboard from './pages/Dashboard';

const App = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('home');

  // ── User Firestore doc (contains plan, budget, mode, etc.) ─────────────────
  const [userDoc, setUserDoc] = useState(null);
  const [userDocLoading, setUserDocLoading] = useState(true);

  const [mode, setMode] = useState('free');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [transactions, setTransactions] = useState([]); 
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [notifications, setNotifications] = useState([]);

  // ── Fetch & subscribe to the Firestore user document ───────────────────────
  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      setUserDocLoading(false);
      return;
    }

    setUserDocLoading(true);
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserDoc(data);
        setMonthlyBudget(Number(data.budget) || 0);
        setMode(data.mode || 'free');
        setSavingsBalance(Number(data.savings) || 0);
        if (data.lastBudgetUpdate) checkMonthSync(data.lastBudgetUpdate);
      } else {
        // Authenticated but no Firestore doc yet — treat as unregistered
        setUserDoc(null);
      }
      setUserDocLoading(false);
    });

    return () => unsubUser();
  }, [user]);

  // ── Transactions & FCM ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      if (!('Notification' in window)) return;
      try {
        const messagingInstance = await messaging; 
        if (!messagingInstance) return;
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messagingInstance, { 
            vapidKey: "BCf7UH_FV4kONaC993nvvuvMIdQHGYX3DeF9elhBd8Crbdgf0bZRnwsGQp2iPg_HGe_QMR4e5wRN_zFokvkYCx0" 
          });
          if (token) {
            await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
          }
        }
      } catch (err) {
        console.error('Messaging token error:', err);
      }
    };

    requestPermission();

    const qTrans = query(
      collection(db, 'expenses'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      const transData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(transData);
      checkBudgetThreshold(transData);
    });

    return () => unsubTrans();
  }, [user, monthlyBudget]);

  const checkMonthSync = (lastUpdateTimestamp) => {
    const currentMonth = new Date().getMonth();
    const currentYear  = new Date().getFullYear();
    const storageKey   = `budget_notified_${currentMonth}_${currentYear}`;
    if (lastUpdateTimestamp) {
      const lastDate = new Date(lastUpdateTimestamp);
      if (lastDate.getMonth() !== currentMonth && !localStorage.getItem(storageKey)) {
        pushNotify('New Month detected', 'Please update your budget for this month!', 'warning');
        localStorage.setItem(storageKey, 'true');
      }
    }
  };

  const pushNotify = (title, message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [{ id, title, message, type }, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const checkBudgetThreshold = (trans) => {
    const safeTrans = trans || [];
    if (safeTrans.length === 0 || monthlyBudget <= 0) return;
    const spent = safeTrans
      .filter(t => t && t.type === 'expense')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    if (spent >= monthlyBudget * 0.9 && spent < monthlyBudget) {
      pushNotify('Budget Warning', "You've used 90% of your budget!", 'warning');
    } else if (spent >= monthlyBudget) {
      pushNotify('Limit Reached', 'You have exceeded your monthly budget!', 'danger');
    }
  };

  const recordToHistory = async (amount, category, type, note = '') => {
    try {
      await addDoc(collection(db, 'expenses'), {
        uid:      user.uid,
        amount:   parseFloat(amount),
        category: category.toLowerCase().trim(),
        type,
        note,
        date: new Date().getTime(),
      });
    } catch (e) { console.error('Sync failed', e); }
  };

  const handleUpdateSavings = async (amount, type, note, category) => {
    const n = Number(amount);
    await setDoc(doc(db, 'users', user.uid), { 
      savings: increment(type === 'expense' ? n : -n) 
    }, { merge: true });
    await recordToHistory(n, category || 'savings', type, note);
    pushNotify('Pot Updated', `UGX ${n.toLocaleString()} processed`, 'info');
  };

  const handleUpdateBorrowed = async (amount, person, type, note) => {
    await recordToHistory(amount, 'borrowed', type, note);
    pushNotify('Borrowed Updated', `Recorded UGX ${Number(amount).toLocaleString()}`, type === 'expense' ? 'warning' : 'info');
  };

  const handleUpdateLoan = async (amount, source, type, note) => {
    await recordToHistory(amount, 'loan', type, note);
    pushNotify('Loan Update', `UGX ${Number(amount).toLocaleString()} processed`, type === 'income' ? 'info' : 'warning');
  };

  const handleUpdateBudget = async (newBudget, newMode) => {
    try {
      await setDoc(doc(db, 'users', user.uid), { 
        budget:           Number(newBudget), 
        mode:             newMode || 'free',
        lastBudgetUpdate: new Date().getTime(),
      }, { merge: true });
      pushNotify('Settings Saved', 'Your budget preferences were updated', 'info');
    } catch (e) {
      console.error('Budget Update Error:', e);
      pushNotify('Update Failed', 'Could not save budget settings', 'danger');
    }
  };

  const getChartData = () => {
    const days = [];
    const safeTrans = transactions || []; 
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const total = safeTrans
        .filter(t => t && t.type === 'expense' && new Date(t.date).toDateString() === d.toDateString())
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      days.push(total);
    }
    return days;
  };

  // ── Loading states ─────────────────────────────────────────────────────────
  if (loading || (user && userDocLoading)) {
    return (
      <div className="h-screen flex items-center justify-center font-black italic">
        RadiExpense...
      </div>
    );
  }

  // ── Not logged in — public pages ───────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDF8F5]">
        <Navbar setView={setCurrentView} />
        {currentView === 'home'            && <Home setView={setCurrentView} />}
        {currentView === 'login'           && <Login setView={setCurrentView} />}
        {currentView === 'download'        && <DownloadPage />}
        {currentView === 'contact'         && <ContactPage setView={setCurrentView} />}
        {currentView === 'onboarding-free' && <OnboardingFree setView={setCurrentView} />}
        {currentView === 'onboarding-pro'  && <OnboardingPro  setView={setCurrentView} />}
      </div>
    );
  }

  // ── Logged in but no Firestore doc — not yet onboarded ────────────────────
  // Only intercept AFTER the user has tried to log in (i.e. user exists).
  // Public pages (Home, Download, Contact) remain accessible normally.
  // Only when the user lands on the app itself (login/home after auth) do we
  // redirect them to onboarding.
  if (!userDoc) {
    // If they're already heading to onboarding, let them through
    if (currentView === 'onboarding-free' || currentView === 'onboarding-pro') {
      return (
        <div className="min-h-screen bg-[#FDF8F5]">
          <Navbar setView={setCurrentView} />
          {currentView === 'onboarding-free' && <OnboardingFree setView={setCurrentView} />}
          {currentView === 'onboarding-pro'  && <OnboardingPro  setView={setCurrentView} />}
        </div>
      );
    }
    // Otherwise show public pages normally — Home is still the default
    return (
      <div className="min-h-screen bg-[#FDF8F5]">
        <Navbar setView={setCurrentView} />
        {currentView === 'home'     && <Home setView={setCurrentView} />}
        {currentView === 'login'    && <Login setView={setCurrentView} />}
        {currentView === 'download' && <DownloadPage />}
        {currentView === 'contact'  && <ContactPage setView={setCurrentView} />}
        {/* If they hit a protected view while not onboarded, nudge them to sign up */}
        {!['home','login','download','contact'].includes(currentView) && (
          <OnboardingFree setView={setCurrentView} />
        )}
      </div>
    );
  }

  // ── Logged in + has Firestore doc — route by plan ─────────────────────────
  const plan = userDoc.plan || 'free';

  // Free plan → Personal Wallet (Dashboard) view
  if (plan === 'free' && currentView === 'dashboard') {
    return <Dashboard onBack={() => setCurrentView('freetier')} />;
  }

  // Free plan → FreeTier business app shell (default)
  if (plan === 'free') {
    return <FreeTier setView={setCurrentView} />;
  }

  // ── Pro plan — extend here when ProTier shell is ready ────────────────────
  if (plan === 'pro') {
    return (
      <div className="h-screen flex items-center justify-center font-black text-lg" style={{ color: '#111111' }}>
        Pro dashboard coming soon.
      </div>
    );
  }

  // Fallback — unknown plan
  return null;
};

export default App;