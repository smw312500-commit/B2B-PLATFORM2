import React from 'react';
import './AIAgentPanel.css';

const FABRIC_NAMES = { C: '면', P: '폴리에스터', L: '린넨', W: '울', M: '혼방' };

export default function AIAgentPanel({ status, onRefresh }) {
  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <span>AI Agent</span>
        <button className="agent-refresh-btn" onClick={onRefresh} title="새로고침">↻</button>
      </div>

      <div className="agent-section">
        <div className="agent-section-title">납기 현황</div>
        {!status || status.orders.length === 0 ? (
          <div className="agent-empty">진행 중인 주문 없음</div>
        ) : (
          status.orders.map((o) => (
            <div key={o.release_id} className={`agent-order-item ${o.status_flag.toLowerCase()}`}>
              <div className="agent-order-code">{o.label_code}</div>
              <div className="agent-order-detail">
                {FABRIC_NAMES[o.fabric_code] || o.fabric_code} / {o.color_code}
                &nbsp;·&nbsp;{o.release_qty.toLocaleString()}야드
              </div>
              <div className="agent-order-meta">
                <span className={`flag-badge ${o.status_flag.toLowerCase()}`}>
                  {o.status_flag === 'OK' ? '✅ 가능' : o.status_flag === 'WARNING' ? '⚠ 위험' : '❌ 불가'}
                </span>
                <span className="d-day">D-{o.days_left}</span>
              </div>
              <div className="agent-order-msg">{o.message}</div>
            </div>
          ))
        )}
      </div>

      <div className="agent-section">
        <div className="agent-section-title">AI 지시사항</div>
        {!status || status.instructions.length === 0 ? (
          <div className="agent-empty">—</div>
        ) : (
          <ul className="agent-instructions">
            {status.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ul>
        )}
      </div>

      {status && status.stock_warnings.length > 0 && (
        <div className="agent-section">
          <div className="agent-section-title">재고 경고</div>
          {status.stock_warnings.map((w, i) => (
            <div key={i} className={`agent-stock-warn ${w.is_critical ? 'danger' : 'warning'}`}>
              <span>{FABRIC_NAMES[w.fabric_code] || w.fabric_code}_{w.color_code}</span>
              <span>{w.stock_qty.toLocaleString()}야드</span>
              {w.is_critical
                ? <span className="warn-label">❌ 긴급</span>
                : <span className="warn-label">⚠ 부족</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
