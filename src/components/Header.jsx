import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, X, Menu, Home, ShoppingCart, Package, DollarSign, BarChart2, Download, Printer } from 'lucide-react';

// ─── Menu items — mirror FreeTier's NAV tabs + export actions ────────────────
const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Main Dashboard',
    description: 'Overview & balance',
    Icon: Home,
    accent: '#111111',
    bg: '#F5F5F5',
  },
  {
    id: 'pos',
    label: 'Point of Sale',
    description: 'Process sales & receipts',
    Icon: ShoppingCart,
    accent: '#FF9800',
    bg: '#FFF3E0',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Manage stock & products',
    Icon: Package,
    accent: '#2196F3',
    bg: '#E3F2FD',
  },
  {
    id: 'finance',
    label: 'Finance Management',
    description: 'Savings, loans & budgets',
    Icon: DollarSign,
    accent: '#4CAF50',
    bg: '#E8F5E9',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Analytics & summaries',
    Icon: BarChart2,
    accent: '#9C27B0',
    bg: '#F3E5F5',
  },
];

const EXPORT_ITEMS = [
  {
    id: 'export-csv',
    label: 'Export as CSV',
    description: 'Download spreadsheet data',
    Icon: Download,
    accent: '#111111',
    bg: '#F5F5F5',
  },
  {
    id: 'export-pdf',
    label: 'Print / PDF',
    description: 'Print or save as PDF',
    Icon: Printer,
    accent: '#FF9800',
    bg: '#FFF3E0',
  },
];

// ─── Header ──────────────────────────────────────────────────────────────────
const Header = ({ activeTab, setTab, onExportCSV, onExportPDF }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll when menu is open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!user) return null;

  const handleNav = (id) => {
    if (id === 'export-csv') { onExportCSV?.(); }
    else if (id === 'export-pdf') { onExportPDF?.(); }
    else { setTab(id); }
    setOpen(false);
  };

  const activeItem = MENU_ITEMS.find(m => m.id === activeTab);

  return (
    <>
      {/* ── Header bar ── */}
      <header className="flex justify-between items-center px-5 py-4 pb-2 animate-in relative z-30">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="profile"
                className="w-11 h-11 rounded-full border-2 border-white shadow-md object-cover"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-black text-base"
                style={{ backgroundColor: '#FF9800' }}
              >
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none mb-0.5">
              Free Plan
            </p>
            <p className="font-black text-sm leading-tight truncate max-w-[130px]" style={{ color: '#111111' }}>
              {user.displayName || user.email?.split('@')[0] || 'User'}
            </p>
            {activeItem && (
              <p className="text-[10px] font-bold truncate max-w-[130px]" style={{ color: '#FF9800' }}>
                {activeItem.label}
              </p>
            )}
          </div>
        </div>

        {/* Hamburger button */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open menu"
          aria-expanded={open}
          className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-soft border border-gray-100"
          style={{ backgroundColor: open ? '#111111' : '#ffffff' }}
        >
          {open
            ? <X size={20} color="#ffffff" strokeWidth={2.5} />
            : <Menu size={20} color="#111111" strokeWidth={2.5} />
          }
          {/* Active tab dot */}
          {!open && (
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{ backgroundColor: activeItem?.accent || '#FF9800' }}
            />
          )}
        </button>
      </header>

      {/* ── Overlay backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-in drawer ── */}
      <div
        ref={menuRef}
        className="fixed top-0 right-0 z-50 h-full w-[88vw] max-w-[340px] flex flex-col shadow-2xl"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0 0 0 2.5rem',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer header */}
        <div className="px-6 pt-8 pb-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">RadiExpense</p>
              <p className="font-black text-lg tracking-tight" style={{ color: '#111111' }}>Navigation</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* User card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: '#FDF8F5' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="profile" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black flex-shrink-0" style={{ backgroundColor: '#FF9800' }}>
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-black text-sm truncate" style={{ color: '#111111' }}>
                {user.displayName || 'User'}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold truncate">{user.email}</p>
            </div>
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex-shrink-0"
              style={{ backgroundColor: '#FFF3E0', color: '#FF9800' }}
            >
              Free
            </span>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 px-2 mb-3">Modules</p>

          {MENU_ITEMS.map(({ id, label, description, Icon, accent, bg }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className="w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: isActive ? bg : 'transparent',
                  border: isActive ? `1.5px solid ${accent}20` : '1.5px solid transparent',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={18} color={accent} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm leading-tight" style={{ color: isActive ? accent : '#111111' }}>
                    {label}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{description}</p>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                )}
              </button>
            );
          })}

          {/* Export section */}
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 px-2 pt-4 pb-3">Export Data</p>

          {EXPORT_ITEMS.map(({ id, label, description, Icon, accent, bg }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className="w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98] hover:bg-gray-50"
              style={{ border: '1.5px solid transparent' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: bg }}
              >
                <Icon size={18} color={accent} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm leading-tight" style={{ color: '#111111' }}>{label}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div className="px-4 py-5 border-t border-gray-100">
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 border-2 border-red-100 text-red-500 hover:bg-red-50"
          >
            <LogOut size={16} strokeWidth={2.5} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;