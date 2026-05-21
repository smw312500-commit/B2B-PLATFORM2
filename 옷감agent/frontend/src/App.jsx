import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import AIAgentPanel from './components/AIAgentPanel';
import StockTab from './components/StockTab';
import OrderTab from './components/OrderTab';
import CancelTab from './components/CancelTab';
import OtherTab from './components/OtherTab';
import { agentApi } from './api';
import './App.css';

const TABS = ['재고', '발주하기', '발주취소', '기타'];

export default function App() {
  const [activeTab, setActiveTab] = useState('재고');
  const [agentStatus, setAgentStatus] = useState(null);

  const refreshAgent = useCallback(async () => {
    try {
      const res = await agentApi.getStatus();
      setAgentStatus(res.data);
    } catch {
      // 서버 미연결 시 무시
    }
  }, []);

  useEffect(() => {
    refreshAgent();
    const timer = setInterval(refreshAgent, 30000);
    return () => clearInterval(timer);
  }, [refreshAgent]);

  const renderTab = () => {
    switch (activeTab) {
      case '재고':    return <StockTab onRefreshAgent={refreshAgent} />;
      case '발주하기': return <OrderTab onRefreshAgent={refreshAgent} />;
      case '발주취소': return <CancelTab onRefreshAgent={refreshAgent} />;
      case '기타':    return <OtherTab />;
      default:        return null;
    }
  };

  return (
    <div className="app">
      <Header />
      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="main-layout">
        <div className="content-area">
          {renderTab()}
        </div>
        <div className="agent-area">
          <AIAgentPanel status={agentStatus} onRefresh={refreshAgent} />
        </div>
      </div>
    </div>
  );
}
