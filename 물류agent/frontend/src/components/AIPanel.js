import React, { useEffect, useState, useCallback } from 'react';
import { getAIPanel } from '../api/api';

const TYPE_STYLE = {
  error:   'text-red-400 font-semibold',
  warning: 'text-yellow-300',
  info:    'text-blue-300',
  success: 'text-green-400',
};

export default function AIPanel() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAIPanel();
      setMessages(res.data.messages || []);
    } catch {
      setMessages([{ type: 'error', icon: '⚠', text: 'AI 패널 로드 실패' }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="bg-gray-900 border-t border-gray-700 px-6 py-3 min-h-[100px]">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI 지시</span>
        {loading && <span className="text-xs text-gray-500">업데이트 중...</span>}
        <button onClick={load} className="ml-auto text-xs text-gray-500 hover:text-gray-300">↻ 새로고침</button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {messages.map((m, i) => (
          <span key={i} className={`text-sm ${TYPE_STYLE[m.type] || 'text-gray-300'}`}>
            {m.icon} {m.text}
          </span>
        ))}
      </div>
    </div>
  );
}
