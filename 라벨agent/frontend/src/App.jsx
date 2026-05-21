import { useState } from 'react'
import Header from './components/Header'
import StockTab from './components/tabs/StockTab'
import OrderTab from './components/tabs/OrderTab'
import CancelTab from './components/tabs/CancelTab'
import OtherTab from './components/tabs/OtherTab'
import AgentPanel from './components/AgentPanel'

const TABS = [
  { id: 'stock',  label: '재고' },
  { id: 'order',  label: '발주하기' },
  { id: 'cancel', label: '발주취소' },
  { id: 'other',  label: '기타' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('stock')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* 탭 바 */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 70% - 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'stock'  && <StockTab />}
          {activeTab === 'order'  && <OrderTab />}
          {activeTab === 'cancel' && <CancelTab />}
          {activeTab === 'other'  && <OtherTab />}
        </div>

        {/* 우측 30% - AI Agent 패널 (고정) */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          <AgentPanel />
        </div>
      </div>
    </div>
  )
}
