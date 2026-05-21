import React, { useState } from 'react';
import Header from './components/Header';
import AIPanel from './components/AIPanel';
import DriverTab from './pages/DriverTab';
import CargoTab from './pages/CargoTab';
import OtherTab from './pages/OtherTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('화물관리/배차관리');

  const renderTab = () => {
    if (activeTab === '기사관리') return <DriverTab />;
    if (activeTab === '화물관리/배차관리') return <CargoTab />;
    return <OtherTab />;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 헤더 + 탭바 */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 메인 콘텐츠 (약 75%) */}
      <div className="flex-1 overflow-hidden">
        {renderTab()}
      </div>

      {/* AI 지시 패널 (하단 고정) */}
      <AIPanel />
    </div>
  );
}
