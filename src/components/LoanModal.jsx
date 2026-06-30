import React, { useState } from 'react';
import { X, Landmark, Building2, Wallet, Calendar, AlertCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const LoanModal = ({ isOpen, onClose, onSave }) => {
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('borrow'); // 'borrow' (income) or 'repay' (expense)
  
  const [formData, setFormData] = useState({
    lenderName: '',
    amount: '',
    dateTaken: new Date().toISOString().split('T')[0],
    repaymentDeadline: '',
    loanType: 'personal'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.lenderName || !formData.amount) {
      showNotification("Please fill in the name and amount", "error");
      return;
    }

    setLoading(true);
    try {
      /**
       * RECTIFIED LOGIC:
       * 1. Borrow = 'income' (Cash comes IN to your pocket, but you owe it)
       * 2. Repay  = 'expense' (Cash goes OUT of your pocket to clear debt)
       */
      const transactionType = activeTab === 'borrow' ? 'income' : 'expense';
      
      // Construct the note for the history list
      const note = activeTab === 'borrow' 
        ? `Borrowed from ${formData.lenderName}` 
        : `Repayment to ${formData.lenderName}`;

      /**
       * Calling onSave with parameters matching App.jsx:
       * onSave(amount, source/name, type, note)
       */
      await onSave(
        formData.amount, 
        formData.lenderName, 
        transactionType, 
        note
      );
      
      const successMsg = activeTab === 'borrow' 
        ? `Recorded UGX ${Number(formData.amount).toLocaleString()} loan from ${formData.lenderName}`
        : `Recorded UGX ${Number(formData.amount).toLocaleString()} repayment to ${formData.lenderName}`;
      
      showNotification(successMsg, "success");
      
      // Reset and Close
      setFormData({
        lenderName: '',
        amount: '',
        dateTaken: new Date().toISOString().split('T')[0],
        repaymentDeadline: '',
        loanType: 'personal'
      });
      onClose();
    } catch (error) {
      console.error("Error saving loan record:", error);
      showNotification("Failed to record transaction", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className={`relative w-full max-w-md bg-white rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border-t-[12px] transition-all ${activeTab === 'borrow' ? 'border-red-500' : 'border-emerald-500'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-8 pb-4">
          <div>
            <h2 className="text-2xl font-black text-[#111111] tracking-tight">
              {activeTab === 'borrow' ? 'Take Loan' : 'Repay Loan'}
            </h2>
            <p className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'borrow' ? 'text-red-500' : 'text-emerald-500'}`}>
              {activeTab === 'borrow' ? 'Money coming in' : 'Money going out'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-8 mb-4">
          <div className="flex bg-gray-50 border border-gray-100 p-1.5 rounded-[1.5rem]">
            <button 
              type="button"
              onClick={() => setActiveTab('borrow')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeTab === 'borrow' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              <ArrowDownCircle size={14} />
              Receive Loan
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('repay')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeTab === 'repay' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              <ArrowUpCircle size={14} />
              Repay Loan
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-5">
          {/* Name Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Person / Institution</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                required
                placeholder={activeTab === 'borrow' ? "Who is lending you?" : "Who are you paying?"}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 font-bold text-[#111111] outline-none focus:ring-2 focus:ring-gray-200"
                value={formData.lenderName}
                onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
              />
            </div>
          </div>

          {/* Amount Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount (UGX)</label>
            <div className="relative">
              <Wallet size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="number"
                required
                placeholder="0"
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-xl font-black text-[#111111] outline-none focus:ring-2 focus:ring-gray-200"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          {/* Date Grid */}
          <div className={`grid ${activeTab === 'borrow' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="date"
                  required
                  className="w-full bg-gray-50 border-none rounded-xl py-3 pl-10 pr-3 text-xs font-bold text-[#111111] outline-none"
                  value={formData.dateTaken}
                  onChange={(e) => setFormData({ ...formData, dateTaken: e.target.value })}
                />
              </div>
            </div>

            {activeTab === 'borrow' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Repay Deadline</label>
                <div className="relative">
                  <AlertCircle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400/50" />
                  <input
                    type="date"
                    className="w-full bg-gray-50 border-none rounded-xl py-3 pl-10 pr-3 text-xs font-bold text-[#111111] outline-none border-b-2 border-red-100"
                    value={formData.repaymentDeadline}
                    onChange={(e) => setFormData({ ...formData, repaymentDeadline: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-5 rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] transition-all ${
              activeTab === 'borrow' ? 'bg-red-500 shadow-red-200' : 'bg-emerald-500 shadow-emerald-200'
            }`}
          >
            <Landmark size={20} />
            {loading ? 'PROCESSING...' : activeTab === 'borrow' ? 'RECEIVE CASH' : 'PAY DEBT'}
          </button>
          
          <div className={`p-4 rounded-2xl border ${activeTab === 'borrow' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-center text-[10px] font-bold leading-tight ${activeTab === 'borrow' ? 'text-red-800' : 'text-emerald-800'}`}>
              * This counts as <strong>{activeTab === 'borrow' ? 'Income' : 'an Expense'}</strong>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanModal;