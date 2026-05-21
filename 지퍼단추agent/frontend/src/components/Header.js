import { useEffect, useState } from 'react';

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tracking-tight">지퍼단추사</span>
        <span className="text-xs bg-indigo-600 px-2 py-0.5 rounded-full font-medium">AI Agent</span>
      </div>
      <div className="text-sm text-gray-300 tabular-nums">
        {dateStr} &nbsp; {timeStr}
      </div>
    </header>
  );
}
