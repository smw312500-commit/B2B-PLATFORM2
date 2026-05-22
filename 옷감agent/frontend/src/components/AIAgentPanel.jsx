import React from 'react';
import './AIAgentPanel.css';

const FABRIC_NAMES = { C: '면', P: '폴리에스터', L: '린넨', W: '울', M: '혼방' };
const SAFE_STOCK   = { C: 500, P: 300, L: 200, W: 150, M: 250 };

export default function AIAgentPanel({ status, onRefresh }) {
  return (
    <div className="agent-panel">
      <h2 className="agent-title">AI Agent</h2>

      {/* 원자재 재고 */}
      <div className="agent-section">
        <p className="agent-section-label">원자재 재고</p>
        {!status ? (
          <p className="agent-empty">불러오는 중...</p>
        ) : status.stocks?.length === 0 ? (
          <p className="agent-empty">재고 데이터 없음</p>
        ) : (
          <div className="stock-list">
            {status.stocks?.map(s => {
              const safe = SAFE_STOCK[s.fabric_code] || 0;
              const warn = s.stock_qty <= safe;
              return (
                <div key={`${s.fabric_code}_${s.color_code}`}
                  className={`stock-badge ${warn ? 'warn' : ''}`}>
                  <span className={warn ? 'stock-name warn' : 'stock-name'}>{s.material_name}</span>
                  <span className={warn ? 'stock-qty warn' : 'stock-qty'}>
                    {s.stock_qty.toLocaleString()} {s.unit}{warn ? ' ⚠' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 납기 현황 */}
      <div className="agent-section">
        <p className="agent-section-label">납기 현황</p>
        {!status || status.active_orders?.length === 0 ? (
          <p className="agent-empty">진행 중인 주문 없음</p>
        ) : (
          status.active_orders.map(o => {
            const urgent = o.days_remaining < 2;
            const warn   = o.days_remaining < 5;
            return (
              <div key={o.id} className={`order-badge ${urgent ? 'urgent' : warn ? 'warn' : ''}`}>
                <div className="order-badge-top">
                  <span className="order-item-name">{o.item_name}</span>
                  <span className={`d-badge ${urgent ? 'urgent' : warn ? 'warn' : ''}`}>D-{o.days_remaining}</span>
                </div>
                <div className="order-badge-sub">
                  {o.release_qty.toLocaleString()}야드 · 납기 {o.due_date}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI 지시사항 */}
      {status?.stock_warnings?.length > 0 && (
        <div className="agent-section">
          <p className="agent-section-label">AI 지시사항</p>
          <div className="instructions-list">
            {status.stock_warnings.map((w, i) => (
              <p key={i} className="instruction-item">{w}</p>
            ))}
          </div>
        </div>
      )}

      <button onClick={onRefresh} className="refresh-btn">새로고침</button>
    </div>
  );
}
