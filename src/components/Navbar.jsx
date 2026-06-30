import React from 'react';

/**
 * Navbar Component
 * Handles navigation between 'home', 'download', and 'contact' views.
 */
const Navbar = ({ setView }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        {/* Brand Logo - Resets to home */}
        <div 
          onClick={() => setView('home')} 
          className="text-2xl font-black text-[#111111] cursor-pointer flex items-center"
        >
          <span className="text-[#FF9800] mr-1">Radi</span>Expense
        </div>
        
        {/* Desktop Navigation */}
        <div className="space-x-8 hidden md:flex font-bold items-center text-sm uppercase tracking-tight">
          <button 
            onClick={() => setView('home')} 
            className="text-gray-600 hover:text-[#FF9800] transition-colors"
          >
            Home
          </button>
          <button 
            onClick={() => setView('download')} 
            className="text-gray-600 hover:text-[#FF9800] transition-colors"
          >
            Download
          </button>
          <button 
            onClick={() => setView('contact')} 
            className="text-gray-600 hover:text-[#FF9800] transition-colors"
          >
            Support
          </button>
          
          <button 
            onClick={() => setView('login')} 
            className="bg-[#FF9800] text-white px-8 py-2.5 rounded-full font-black shadow-lg hover:scale-105 transition-transform active:scale-95"
          >
            Login
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-6">
           <button 
            onClick={() => setView('contact')} 
            className="text-gray-500 font-bold text-xs uppercase tracking-tighter"
          >
            Support
          </button>
          <button 
            onClick={() => setView('login')} 
            className="text-[#FF9800] font-black text-xs uppercase tracking-widest"
          >
            Login
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;