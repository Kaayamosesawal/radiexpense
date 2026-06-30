import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
};

export default Layout;