import React from 'react';

const SpendingChart = ({ transactions }) => {
  // 1. Data Processing Logic
  const getLast7DaysData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const result = [];
    
    // SAFE FALLBACK: Ensure transactions is never undefined
    const safeTransactions = transactions || [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      const dailyTotal = safeTransactions
        .filter(t => t && t.type === 'expense' && 
                new Date(t.date).toDateString() === d.toDateString())
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      result.push(dailyTotal);
    }
    return result;
  };

  const data = getLast7DaysData();
  const height = 120;
  const width = 300;
  
  // Math safety: ensure we don't divide by zero or pass empty arrays to Math.max
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  // 2. Map data to SVG coordinates
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    const paddedY = (y * 0.7) + (height * 0.15); // Add padding for the glow
    return { x, y: paddedY };
  });

  // 3. Generate Smooth Cubic Bezier Path
  const linePath = points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    return `${acc} C ${cp1x},${prev.y} ${cp1x},${point.y} ${point.x},${point.y}`;
  }, "");

  const lastPoint = points[points.length - 1] || { x: 0, y: height / 2 };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 mb-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-app-dark">Spending Flow</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Last 7 Days Activity</p>
        </div>
        <div className="bg-orange-50 px-3 py-1 rounded-full">
            <span className="text-[10px] font-black text-[#E67E22]">LIVE</span>
        </div>
      </div>

      <div className="relative w-full h-32">
        <svg 
          viewBox={`-10 -10 ${width + 20} ${height + 20}`} 
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E67E22" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#E67E22" stopOpacity="0" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Area Fill */}
          <path
            d={`${linePath} V ${height + 10} H 0 Z`}
            fill="url(#areaGradient)"
            className="transition-all duration-700 ease-in-out"
          />
          
          {/* Main Glowing Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#E67E22"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Pulsing Indicator for Today */}
          <g>
            <circle 
              cx={lastPoint.x} 
              cy={lastPoint.y} 
              r="8" 
              fill="#E67E22" 
              className="animate-ping opacity-20"
            />
            <circle 
              cx={lastPoint.x} 
              cy={lastPoint.y} 
              r="5" 
              fill="#1A1A1A" 
              stroke="#E67E22" 
              strokeWidth="3" 
            />
          </g>
        </svg>
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between mt-4 px-1">
        {['S','M','T','W','T','F','S'].map((day, i) => (
           <span key={i} className="text-[9px] font-black text-gray-300 uppercase">{day}</span>
        ))}
      </div>
    </div>
  );
};

export default SpendingChart;