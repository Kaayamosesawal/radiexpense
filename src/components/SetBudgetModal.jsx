import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const SetBudgetModal = ({ isOpen, onClose, currentBudget, onUpdate }) => {
  const [value, setValue] = useState(currentBudget);

  // Sync internal state when the currentBudget prop changes (e.g., loaded from Firebase)
  useEffect(() => {
    if (isOpen) {
      setValue(currentBudget);
    }
  }, [currentBudget, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Use parseFloat to ensure it's a number, fallback to 0 if empty
    onUpdate(parseFloat(value) || 0); 
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#111111]/60 backdrop-blur-md flex items-center justify-center p-6">
      {/* Clickable Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-[#FDF8F5] rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-200 shadow-2xl overflow-hidden">
        
        {/* Brand Accent Top Line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#FF9800]" />

        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-[#111111] uppercase tracking-tighter leading-none">
            Set <span className="text-[#FF9800]">Budget</span>
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 bg-white rounded-full text-gray-400 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              Monthly Limit (UGX)
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-white text-3xl font-black tracking-tighter border-2 border-transparent focus:border-[#FF9800] rounded-2xl px-5 py-5 outline-none transition-all shadow-sm"
                placeholder="0"
                autoFocus
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                UGX
              </div>
            </div>
            <p className="mt-3 text-[9px] text-gray-400 font-bold uppercase leading-relaxed ml-1">
              Your "Remaining Budget" on the dashboard will update automatically based on this value.
            </p>
          </div>

          <button 
            type="submit"
            className="w-full bg-[#111111] py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:bg-black active:scale-95 transition-all group"
          >
            <Save size={18} className="text-[#FF9800] group-hover:scale-110 transition-transform" strokeWidth={3} />
            <span className="text-white font-black uppercase tracking-widest text-[12px]">Update Budget</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetBudgetModal;