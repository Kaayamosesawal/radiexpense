import React from 'react';

const Download = () => {
  return (
    <section id="download" className="animate-in pt-16 pb-24">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-radi-dark mb-4 tracking-tighter">
          Get <span className="text-radi-orange">RadiExpense</span>
        </h2>
        <p className="text-gray-600 max-w-md mx-auto font-medium">
          Install the app directly on your device in seconds without an app store.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        
        {/* Android Download Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border-2 border-transparent hover:border-radi-orange transition-all group">
          <div className="bg-green-100 text-green-600 w-14 h-14 flex items-center justify-center rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.523 15.3414C18.2571 14.3986 18.7061 13.2201 18.7061 11.9332C18.7061 9.1764 16.5365 6.94238 13.8447 6.94238H11.1213V4.90479C12.4419 4.45337 13.3855 3.20312 13.3855 1.72461V1.12134H11.6601V1.72461C11.6601 2.31689 11.1824 2.79468 10.5901 2.79468C9.9978 2.79468 9.52002 2.31689 9.52002 1.72461V1.12134H7.79468V1.72461C7.79468 3.20312 8.73828 4.45337 10.0588 4.90479V6.94238H7.33545C4.64355 6.94238 2.47388 9.1764 2.47388 11.9332C2.47388 13.2201 2.92285 14.3986 3.65698 15.3414L2.47388 17.0667L3.84473 18.0083L5.05884 16.2393C5.75024 16.6343 6.52979 16.8838 7.375 16.9155V19.9231C7.375 21.0742 8.30078 22 9.44434 22H11.7341C12.8777 22 13.8035 21.0742 13.8035 19.9231V16.9155C14.6487 16.8838 15.4282 16.6343 16.1196 16.2393L17.3337 18.0083L18.7046 17.0667L17.5215 15.3414H17.523Z"/>
            </svg>
          </div>
          <h3 className="text-2xl font-black text-radi-dark mb-2">Android Download</h3>
          <p className="text-gray-500 mb-8 text-sm">Download and install the APK file directly to access all premium features.</p>
          
          <a 
            href="https://drive.google.com/uc?export=download&id=176shSPYj_xmsoY9dzfdrCvT7Rmef77Ln" 
            className="block w-full text-center bg-radi-dark text-white px-6 py-4 rounded-2xl font-bold hover:bg-radi-orange transition-colors shadow-lg active:scale-95"
          >
            Download RadiExpense APK
          </a>
        </div>

        {/* iOS / PWA Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border-2 border-transparent hover:border-radi-orange transition-all">
          <div className="bg-blue-100 text-blue-600 w-14 h-14 flex items-center justify-center rounded-2xl mb-6">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .76-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.36 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          </div>
          <h3 className="text-2xl font-black text-radi-dark mb-2">iOS Installation</h3>
          <p className="text-gray-500 mb-6 text-sm">No download required. Use the Safari browser to add it to your home screen:</p>
          
          <div className="space-y-3 font-bold">
            <div className="flex items-center gap-3 bg-app-bg/50 p-4 rounded-2xl border border-gray-100">
              <span className="bg-radi-dark text-white w-6 h-6 flex items-center justify-center rounded-full text-[10px]">1</span>
              <span className="text-xs text-gray-700 uppercase tracking-tight">Tap the <strong className="text-radi-orange">Share</strong> icon at the bottom</span>
            </div>
            <div className="flex items-center gap-3 bg-app-bg/50 p-4 rounded-2xl border border-gray-100">
              <span className="bg-radi-dark text-white w-6 h-6 flex items-center justify-center rounded-full text-[10px]">2</span>
              <span className="text-xs text-gray-700 uppercase tracking-tight">Scroll and tap <strong className="text-radi-orange">Add to Home Screen</strong></span>
            </div>
            <div className="flex items-center gap-3 bg-app-bg/50 p-4 rounded-2xl border border-gray-100">
              <span className="bg-radi-dark text-white w-6 h-6 flex items-center justify-center rounded-full text-[10px]">3</span>
              <span className="text-xs text-gray-700 uppercase tracking-tight">Tap <strong className="text-radi-orange">Add</strong> to finish</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Download;