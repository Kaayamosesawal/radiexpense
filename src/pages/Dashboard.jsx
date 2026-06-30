import React, { useState, useMemo } from 'react';
import AddTransaction from '../components/AddTransaction';
import BorrowedToModal from '../components/BorrowedToModal';
import LoanModal from '../components/LoanModal';
import AddEarningModal from '../components/AddEarningModal';
import SavingsModal from '../components/SavingsModal';

const Dashboard = ({ onBack }) => {
  const [activeModal, setActiveModal] = useState(null);

  const [transactions, setTransactions] = useState([
    { id: 1, amount: 500000, category: 'Daily', type: 'income', date: '2026-04-20' },
    { id: 2, amount: 50000, category: 'Food', type: 'expense', date: '2026-04-21' },
  ]);

  const [budgetData] = useState({ monthly: 2000000, spent: 450000 });

  // Calculation for the Savings Pot Balance
  const savingsBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.category === 'Savings') {
        return t.type === 'expense' ? acc + t.amount : acc - t.amount;
      }
      return acc;
    }, 0);
  }, [transactions]);

  // Generic handler to ensure all data follows the same structure
  const handleSaveTransaction = async (amount, category, type, description) => {
    const newTx = {
      id: Date.now(),
      amount: parseFloat(amount),
      category: category, 
      type: type,         
      description: description,
      date: new Date().toISOString().split('T')[0]
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  return (
    <div className="relative min-h-screen bg-app-bg p-6">
      <div className="max-w-md mx-auto">
        <header className="mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-gray-400 hover:text-app-dark transition-colors mb-4 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Business</span>
            </button>
          )}
          <h1 className="text-3xl font-black text-app-dark mb-1 tracking-tight">My Wallet</h1>
          <p className="text-gray-400 font-bold text-sm uppercase">Thursday, 23 April 2026</p>
        </header>
        
        <div className="bg-white p-8 rounded-[3rem] shadow-sm mb-6 border border-gray-100">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Balance</p>
           <h2 className="text-4xl font-black text-app-dark">
             UGX {transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0).toLocaleString()}
           </h2>
        </div>

        <button 
          onClick={() => setActiveModal('entry')}
          className="fixed bottom-8 right-8 bg-app-dark text-white w-16 h-16 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 flex items-center justify-center"
        >
          <span className="text-3xl font-light">+</span>
        </button>
      </div>

      <AddTransaction 
        isOpen={activeModal === 'entry'} 
        onClose={() => setActiveModal(null)}
        onAdd={(amt, cat) => handleSaveTransaction(amt, cat, 'expense', cat)}
        transactions={transactions}
        budgetData={budgetData}
        openBorrowed={() => setActiveModal('borrowed')}
        openLoan={() => setActiveModal('loan')}
        openSavings={() => setActiveModal('savings')}
        openEarning={() => setActiveModal('earning')}
      />

      <AddEarningModal 
        isOpen={activeModal === 'earning'}
        onClose={() => setActiveModal('entry')}
        onAdd={(data) => handleSaveTransaction(data.amount, 'Daily', 'income', data.receivedFrom)}
      />

      <SavingsModal 
        isOpen={activeModal === 'savings'}
        balance={savingsBalance}
        onClose={() => setActiveModal('entry')}
        onUpdate={(amt, tab, note) => {
          // Deposit = Money Out (Expense) | Withdraw = Money In (Income)
          const type = tab === 'deposit' ? 'expense' : 'income';
          handleSaveTransaction(amt, 'Savings', type, note);
        }}
      />

      <BorrowedToModal 
        isOpen={activeModal === 'borrowed'} 
        onClose={() => setActiveModal('entry')}
        onSave={(amt, name, tab) => 
          // Lending = Money Out (Expense) | Recovering = Money In (Income)
          handleSaveTransaction(amt, 'Borrowed', tab === 'lend' ? 'expense' : 'income', name)
        }
      />

      <LoanModal 
        isOpen={activeModal === 'loan'} 
        onClose={() => setActiveModal('entry')}
        onSave={(amt, lender, activeTab) => 
          // Borrowing = Money In (Income) | Repaying = Money Out (Expense)
          handleSaveTransaction(amt, 'Loan', activeTab === 'borrow' ? 'income' : 'expense', lender)
        }
      />
    </div>
  );
};

export default Dashboard;