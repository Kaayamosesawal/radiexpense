import React, { useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';

const SavingsModal = ({ isOpen, balance, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('deposit'); 
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    if (!val || val <= 0) return;
    
    // Check for insufficient funds only during withdrawal
    if (activeTab === 'withdraw' && val > balance) {
      alert("Insufficient savings balance!");
      return;
    }

    /**
     * RECTIFIED LOGIC:
     * We align the 'type' and 'category' so the engine in AddTransaction.jsx
     * can correctly calculate the PiggyBank totals.
     * 1. Amount: val
     * 2. Type: 'expense' for deposits, 'income' for withdrawals
     * 3. Note: The description
     * 4. Category: 'savings' (The specific trigger for the UI total)
     */
    onUpdate(
      val, 
      activeTab === 'deposit' ? 'expense' : 'income', 
      note || (activeTab === 'deposit' ? 'Saved to Pot' : 'Withdrawn from Pot'),
      'savings' 
    );
    
    // Reset state and close
    setAmount('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#111111]/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#FDF8F5] rounded-t-[3rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-white/20">
        
        {/* Brand Accent Top Line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#FF9800]" />

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#FF9800]/10 rounded-2xl text-[#FF9800]">
              <Wallet size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#111111] tracking-tighter uppercase leading-none mb-1">Savings Pot</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Current Pot: <span className="text-[#111111]">UGX {balance.toLocaleString()}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/50 border border-gray-100 p-1.5 rounded-[1.5rem] mb-10">
          <button 
            type="button"
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[11px] font-black uppercase transition-all ${
              activeTab === 'deposit' ? 'bg-[#111111] text-white shadow-lg' : 'text-gray-400'
            }`}
          >
            <ArrowUpCircle size={16} className={activeTab === 'deposit' ? 'text-[#FF9800]' : ''} />
            Deposit
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[11px] font-black uppercase transition-all ${
              activeTab === 'withdraw' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400'
            }`}
          >
            <ArrowDownCircle size={16} />
            Withdraw
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Amount Input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              {activeTab === 'deposit' ? 'Amount to Save' : 'Amount to Withdraw'} (UGX)
            </label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white text-4xl font-black tracking-tighter border-2 border-transparent focus:border-[#FF9800] rounded-2xl px-5 py-5 outline-none transition-all shadow-sm"
              placeholder="0"
              autoFocus
              required
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">Note (Optional)</label>
            <input 
              type="text" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white text-md font-bold border-2 border-transparent focus:border-[#FF9800] rounded-2xl px-5 py-4 outline-none transition-all shadow-sm"
              placeholder={activeTab === 'deposit' ? "What are you saving for?" : "Withdrawal reason"}
            />
          </div>

          {/* Action Button */}
          <button 
            type="submit"
            className={`w-full py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 text-white font-black uppercase tracking-widest text-[12px] ${
              activeTab === 'deposit' 
                ? 'bg-[#111111] hover:bg-black' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {activeTab === 'deposit' ? <ArrowUpCircle size={20} className="text-[#FF9800]" /> : <ArrowDownCircle size={20} />}
            {activeTab === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
          </button>
          
          {/* Logic Summary */}
          <div className="bg-[#111111]/5 p-4 rounded-2xl border border-[#111111]/5">
            <p className="text-center text-[9px] text-[#111111]/60 font-black uppercase tracking-tight leading-relaxed">
              * {activeTab === 'deposit' 
                  ? 'Funds will be moved from your wallet into the pot (Expense).' 
                  : 'Funds will be moved from the pot back to your wallet (Income).'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SavingsModal;