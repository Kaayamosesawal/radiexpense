import React, { useState } from 'react';
import { X, Handshake, User, Coins, Calendar, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const BorrowedToModal = ({ isOpen, onClose, onSave }) => {
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('lend'); // 'lend' (expense) or 'recover' (income)
  
  const [formData, setFormData] = useState({
    personName: '',
    amount: '',
    dateGiven: new Date().toISOString().split('T')[0],
    repaymentDate: '',
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.personName || !formData.amount || !formData.dateGiven) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      /**
       * RECTIFIED LOGIC:
       * 1. Lend Money = 'expense' (Money leaving your wallet)
       * 2. Collect Back = 'income' (Money returning to your wallet)
       */
      const transactionType = activeTab === 'lend' ? 'expense' : 'income';
      const note = activeTab === 'lend' 
        ? `Lent to ${formData.personName}` 
        : `Collected from ${formData.personName}`;

      // Pass all 4 parameters to parent: amount, person, type, and note
      await onSave(formData.amount, formData.personName, transactionType, note);
      
      const actionText = activeTab === 'lend' ? 'lent to' : 'recovered from';
      showNotification(`Recorded: UGX ${Number(formData.amount).toLocaleString()} ${actionText} ${formData.personName}`, "success");
      
      // Reset form and close
      setFormData({
        personName: '',
        amount: '',
        dateGiven: new Date().toISOString().split('T')[0],
        repaymentDate: '',
        notes: ''
      });
      setActiveTab('lend');
      onClose();
    } catch (error) {
      console.error("Error saving borrowed record:", error);
      showNotification("Failed to save record", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-app-dark/60 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header & Tab Switcher */}
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-app-dark tracking-tight">Borrowed</h2>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Money given to others</p>
            </div>
            <button onClick={onClose} className="p-2 bg-app-bg rounded-full text-gray-400 hover:text-app-dark transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex bg-app-bg p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('lend')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeTab === 'lend' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
              }`}
            >
              <ArrowUpRight size={14} />
              Lend Money
            </button>
            <button
              onClick={() => setActiveTab('recover')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                activeTab === 'recover' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'
              }`}
            >
              <ArrowDownLeft size={14} />
              Collect Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-5">
          {/* Person Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Person's Name</label>
            <div className="relative">
              <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-app-dark/30" />
              <input
                type="text"
                required
                placeholder={activeTab === 'lend' ? "Who is borrowing?" : "Who is paying back?"}
                className="w-full bg-app-bg border-none rounded-2xl py-4 pl-12 pr-6 font-bold text-app-dark focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.personName}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount (UGX)</label>
            <div className="relative">
              <Coins size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-app-dark/30" />
              <input
                type="number"
                required
                placeholder="0"
                className="w-full bg-app-bg border-none rounded-2xl py-4 pl-12 pr-6 text-xl font-black text-app-dark focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-dark/30" />
                <input
                  type="date"
                  required
                  className="w-full bg-app-bg border-none rounded-xl py-3 pl-10 pr-3 text-xs font-bold text-app-dark outline-none"
                  value={formData.dateGiven}
                  onChange={(e) => setFormData({ ...formData, dateGiven: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Deadline</label>
              <div className="relative">
                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-app-dark/30" />
                <input
                  type="date"
                  className="w-full bg-app-bg border-none rounded-xl py-3 pl-10 pr-3 text-xs font-bold text-app-dark outline-none"
                  value={formData.repaymentDate}
                  onChange={(e) => setFormData({ ...formData, repaymentDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-5 rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 ${
              activeTab === 'lend' ? 'bg-blue-600 shadow-blue-200' : 'bg-green-600 shadow-green-200'
            }`}
          >
            <Handshake size={20} />
            {loading ? 'Recording...' : activeTab === 'lend' ? 'Confirm Lending' : 'Confirm Collection'}
          </button>
          
          <div className={`p-4 rounded-2xl border ${activeTab === 'lend' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
            <p className={`text-center text-[10px] font-bold px-4 leading-tight ${activeTab === 'lend' ? 'text-blue-800' : 'text-green-800'}`}>
              * This will be recorded as <strong>{activeTab === 'lend' ? 'an Expense' : 'Income'}</strong> in your history.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BorrowedToModal;