import { useState } from 'react'
import Header from './components/Header'
import SidePanel from './components/SidePanel'
import DashboardTab from './components/tabs/DashboardTab'
import DispatchTab from './components/tabs/DispatchTab'
import InsightTab from './components/tabs/InsightTab'
import ReportChannelsTab from './components/tabs/ReportChannelsTab'

const TABS = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'dispatch',  label: '배차 현황' },
  { id: 'report',    label: '보고 채널' },
  { id: 'insight',   label: 'AI 인사이트' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* 탭 바 */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
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

      {/* 본문 + 우측 패널 */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-5">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'dispatch'  && <DispatchTab />}
          {activeTab === 'report'    && <ReportChannelsTab />}
          {activeTab === 'insight'   && <InsightTab />}
        </main>

        {/* 우측 고정 패널 */}
        <aside className="w-64 border-l border-gray-200 bg-white flex-shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">현황 요약</p>
          </div>
          <SidePanel />
        </aside>
      </div>
    </div>
  )
}
