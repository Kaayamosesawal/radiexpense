import React, { useState, useMemo } from 'react';
import { X, Tag, PiggyBank, Handshake, Landmark, DollarSign } from 'lucide-react';

const AddTransaction = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  openBorrowed, 
  openLoan, 
  openSavings,
  openEarning, 
  budgetData = { monthly: 0, spent: 0 },
  transactions = []
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    type: 'expense'
  });

  // THE STREAMLINED CALCULATION ENGINE
  const totals = useMemo(() => {
    return (transactions || []).reduce((acc, curr) => {
      const amt = Number(curr.amount || 0);
      const cat = curr.category?.toLowerCase().trim() || '';
      const type = curr.type?.toLowerCase().trim() || '';
      
      // 1. SAVINGS ENGINE (Listens for SavingsModal)
      if (cat === 'savings' || cat === 'saving') {
        // Money leaving wallet into pot = + to savings balance
        if (type === 'expense') acc.savings += amt;
        // Money returning to wallet from pot = - from savings balance
        else if (type === 'income') acc.savings -= amt;
      }

      // 2. LOANS (Debt tracking)
      else if (cat === 'loan') {
        if (type === 'income') acc.loans += amt;    // Took a loan
        else if (type === 'expense') acc.loans -= amt; // Paid back
      }

      // 3. BORROWED (Lending tracking)
      else if (cat === 'borrowed') {
        if (type === 'expense') acc.borrowed += amt;  // Lent money
        else if (type === 'income') acc.borrowed -= amt; // Got paid back
      }
      
      // 4. EARNINGS (Pure income only)
      // We use 'else if' to ensure that if it was caught by Savings/Loans above,
      // it is NOT added to pure earnings.
      else if (type === 'income') {
        acc.earned += amt;
      }
      
      return acc;
    }, { earned: 0, savings: 0, borrowed: 0, loans: 0 });
  }, [transactions]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;

    setLoading(true);
    try {
      // Manual entries from this specific form are treated as general expenses
      await onAdd(formData.amount, formData.category, 'expense');
      setFormData({ amount: '', category: '', type: 'expense' });
      onClose();
    } catch (error) {
      console.error("Transaction Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Status Header */}
        <div className="p-8 pb-4 bg-gray-50 border-b border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <button className="bg-[#111111] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
              Actual Status
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-black">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-1 font-bold text-[#111111] text-sm">
            <div className="flex justify-between">
              <span className="uppercase text-[10px] text-gray-500">Monthly Budget:</span>
              <span className="font-black">UGX {budgetData.monthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="uppercase text-[10px] text-gray-500">Total Spent:</span>
              <span className="text-red-500 font-black">UGX {budgetData.spent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 mt-1">
              <span className="uppercase text-[10px] text-gray-400">Available:</span>
              <span className={`font-black ${budgetData.monthly - budgetData.spent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                UGX {(budgetData.monthly - budgetData.spent).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-4 gap-2 px-6 pt-6">
          <div className="flex flex-col items-center">
            <button onClick={() => { onClose(); openEarning(); }} className="w-full flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-green-600 bg-green-50 text-green-600 active:scale-95 transition-transform">
              <DollarSign size={20} />
              <span className="text-[9px] font-black mt-1 uppercase">earning</span>
            </button>
            <span className="text-[10px] font-black mt-2 text-green-600">{totals.earned.toLocaleString()}</span>
          </div>

          <div className="flex flex-col items-center">
            <button onClick={() => { onClose(); openSavings(); }} className="w-full flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-[#111111] bg-white active:scale-95 transition-transform">
              <PiggyBank size={20} />
              <span className="text-[9px] font-black mt-1 uppercase">saving</span>
            </button>
            <span className="text-[10px] font-black mt-2 text-[#111111]">{totals.savings.toLocaleString()}</span>
          </div>
          
          <div className="flex flex-col items-center">
            <button onClick={() => { onClose(); openBorrowed(); }} className="w-full flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-[#111111] bg-white active:scale-95 transition-transform">
              <Handshake size={20} />
              <span className="text-[9px] font-black mt-1 uppercase leading-tight text-center">borrowed</span>
            </button>
            <span className="text-[10px] font-black mt-2 text-blue-600">{totals.borrowed.toLocaleString()}</span>
          </div>

          <div className="flex flex-col items-center">
            <button onClick={() => { onClose(); openLoan(); }} className="w-full flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-[#111111] bg-white active:scale-95 transition-transform">
              <Landmark size={20} />
              <span className="text-[9px] font-black mt-1 uppercase leading-tight text-center">loans</span>
            </button>
            <span className={`text-[10px] font-black mt-2 ${totals.loans <= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.loans.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Expense Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">UGX</span>
            <input 
              type="number" 
              required 
              placeholder="0" 
              disabled={loading} 
              className="w-full bg-gray-50 rounded-2xl py-5 pl-14 pr-6 text-2xl font-black text-[#111111] outline-none" 
              value={formData.amount} 
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
            />
          </div>

          <div className="relative">
            <Tag size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text" 
              required 
              placeholder="What did you buy?" 
              disabled={loading} 
              className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-6 font-bold text-sm outline-none" 
              value={formData.category} 
              onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !formData.amount || !formData.category} 
            className="w-full bg-[#111111] text-white py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'SYNCING...' : 'CONFIRM EXPENSE'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;