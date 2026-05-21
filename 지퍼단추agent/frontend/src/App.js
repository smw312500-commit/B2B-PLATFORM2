import { useState } from 'react';
import Header from './components/Header';
import AgentPanel from './components/AgentPanel';
import StockTab from './components/tabs/StockTab';
import OrderTab from './components/tabs/OrderTab';
import CancelTab from './components/tabs/CancelTab';
import ReleaseTab from './components/tabs/ReleaseTab';
import EtcTab from './components/tabs/EtcTab';

const TABS = [
  { id: 'stock',   label: '재고' },
  { id: 'release', label: '출고' },
  { id: 'order',   label: '발주하기' },
  { id: 'cancel',  label: '발주취소' },
  { id: 'etc',     label: '기타' },
];

function TabContent({ tab }) {
  switch (tab) {
    case 'stock':   return <StockTab />;
    case 'release': return <ReleaseTab />;
    case 'order':   return <OrderTab />;
    case 'cancel':  return <CancelTab />;
    case 'etc':     return <EtcTab />;
    default:        return null;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('stock');

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {/* 탭 바 */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 메인 영역: 좌 70% + 우 30% (AI Agent) */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 104px)' }}>
        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50" style={{ width: '70%' }}>
          <TabContent tab={activeTab} />
        </main>

        {/* AI Agent 패널 (고정) */}
        <aside className="overflow-y-auto bg-white border-l border-gray-200" style={{ width: '30%', minWidth: '280px' }}>
          <AgentPanel />
        </aside>
      </div>
    </div>
  );
}
