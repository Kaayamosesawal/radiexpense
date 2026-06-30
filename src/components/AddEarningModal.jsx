import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

const AddEarningModal = ({ isOpen, onClose, onAdd }) => {
  const [amount, setAmount] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0 || !receivedFrom) return;
    
    // UPDATED: Standardized the object to include category: 'Daily'
    // This allows the calculation engine to identify this as regular income.
    onAdd({
      amount: val,
      receivedFrom: receivedFrom,
      category: 'Daily',
      paymentMethod: paymentMethod,
      type: 'income',
      date: new Date().getTime(), 
    });
    
    setAmount('');
    setReceivedFrom('');
    setPaymentMethod('Cash');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#111111]/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#FDFDFD] rounded-t-[3rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-[#4CAF50]" />

        <div className="flex justify-between items-center mb-10">
          <h3 className="text-2xl font-black text-[#111111] tracking-tighter uppercase">
            Add <span className="text-[#4CAF50]">Earning</span>
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 bg-white rounded-full text-[#111111] shadow-sm border border-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              Amount Received (UGX)
            </label>
            <div className="relative group">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white text-4xl font-black tracking-tighter border-2 border-transparent focus:border-[#4CAF50] rounded-2xl px-5 py-4 outline-none transition-all shadow-sm"
                placeholder="0"
                autoFocus
                required
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase tracking-widest">UGX</div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              Received From
            </label>
            <input 
              type="text" 
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
              className="w-full bg-white text-md font-bold border-2 border-transparent focus:border-[#4CAF50] rounded-2xl px-5 py-4 outline-none transition-all shadow-sm"
              placeholder="e.g. Salary, Client, Side Hustle"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1">
              Payment Method
            </label>
            <div className="flex gap-2 overflow-x-auto pb-4">
              {['Cash', 'Mobile Money', 'Bank'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                    paymentMethod === method 
                      ? 'bg-[#111111] border-[#111111] text-white shadow-lg' 
                      : 'bg-white border-transparent text-gray-400 shadow-sm'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="submit"
              className="flex-1 bg-[#111111] py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              <Check size={20} className="text-[#4CAF50]" strokeWidth={4} />
              <span className="text-white font-black uppercase tracking-widest text-[12px]">Save Earning</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEarningModal;