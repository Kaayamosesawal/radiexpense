import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

const AddExpenseModal = ({ isOpen, onClose, onAdd }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    
    // LOGIC UPDATE:
    // We ensure the 'type' is strictly 'expense'.
    // The 'category' remains dynamic based on the user's selection (Food, Transport, etc.)
    onAdd({
      amount: val,
      category: category, 
      type: 'expense',
      note: note || category,
      date: new Date().getTime(), 
    });
    
    setAmount('');
    setCategory('General');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#111111]/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Clickable Backdrop for Desktop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#FDF8F5] rounded-t-[3rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto overflow-x-hidden">
        
        {/* Brand Accent Top Line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#FF9800]" />

        <div className="flex justify-between items-center mb-10">
          <h3 className="text-2xl font-black text-[#111111] tracking-tighter uppercase">
            Add <span className="text-[#FF9800]">Expense</span>
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 bg-white rounded-full text-[#111111] shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Amount Input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              Amount (UGX)
            </label>
            <div className="relative group">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white text-4xl font-black tracking-tighter border-2 border-transparent focus:border-[#FF9800] rounded-2xl px-5 py-4 outline-none transition-all shadow-sm group-hover:shadow-md"
                placeholder="0"
                autoFocus
                required
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase tracking-widest">UGX</div>
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              Note (Optional)
            </label>
            <input 
              type="text" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white text-md font-bold border-2 border-transparent focus:border-[#FF9800] rounded-2xl px-5 py-4 outline-none transition-all shadow-sm"
              placeholder="What was this for?"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              Category
            </label>
            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
              {['General', 'Food', 'Transport', 'Bills', 'Shopping'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap border-2 ${
                    category === cat 
                      ? 'bg-[#111111] border-[#111111] text-white shadow-lg' 
                      : 'bg-white border-transparent text-gray-400 hover:border-gray-200 shadow-sm'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3 pt-4">
            <button 
              type="submit"
              className="flex-1 bg-[#111111] py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:bg-black active:scale-95 transition-all"
            >
              <Check size={20} className="text-[#FF9800]" strokeWidth={4} />
              <span className="text-white font-black uppercase tracking-widest text-[12px]">Save Transaction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;