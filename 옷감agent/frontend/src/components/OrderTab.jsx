import React, { useState, useEffect } from 'react';
import { orderApi, releaseApi } from '../api';

const STATUS_BADGE = { '대기중': 'badge-blue', '입고완료': 'badge-ok', '취소': 'badge-gray' };
const FABRIC_NAMES = { C: '면', P: '폴리에스터', L: '린넨', W: '울', M: '혼방' };
const FABRIC_CODES = ['C', 'P', 'L', 'W', 'M'];
const COLOR_CODES  = ['BK', 'WH', 'NV', 'GY', 'BE', 'RD'];

function periodStr(start, end) {
  if (!start || !end) return '-';
  return `${start} ~ ${end}`;
}

export default function OrderTab({ onRefreshAgent }) {
  const [orders, setOrders] = useState([]);
  const [releases, setReleases] = useState([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    material_name: '', order_qty: '', supplier: '', order_date: '', due_date: '', note: ''
  });
  const [releaseForm, setReleaseForm] = useState({
    label_code: '', fabric_code: 'C', color_code: 'BK', release_qty: '', due_date: ''
  });

  const loadAll = async () => {
    try {
      const [oRes, rRes] = await Promise.all([orderApi.getAll(), releaseApi.getAll()]);
      setOrders(oRes.data);
      setReleases(rRes.data);
    } catch {}
  };

  useEffect(() => { loadAll(); }, []);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      await orderApi.create({ ...orderForm, order_qty: parseFloat(orderForm.order_qty) });
      setOrderForm({ material_name: '', order_qty: '', supplier: '', order_date: '', due_date: '', note: '' });
      setShowOrderForm(false);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.detail || '발주 등록 실패');
    }
  };

  const handleOrderComplete = async (id) => {
    try {
      await orderApi.complete(id);
      await loadAll();
      onRefreshAgent();
    } catch (err) {
      alert(err.response?.data?.detail || '완료 처리 실패');
    }
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    try {
      await releaseApi.create({ ...releaseForm, release_qty: parseFloat(releaseForm.release_qty) });
      setReleaseForm({ label_code: '', fabric_code: 'C', color_code: 'BK', release_qty: '', due_date: '' });
      setShowReleaseForm(false);
      await loadAll();
      onRefreshAgent();
    } catch (err) {
      alert(err.response?.data?.detail || '출고 등록 실패');
    }
  };

  const handleReleaseComplete = async (id) => {
    if (!window.confirm('출고 완료 처리하시겠습니까?\n재고가 차감되고 플랫폼으로 신호가 전송됩니다.')) return;
    try {
      await releaseApi.complete(id);
      await loadAll();
      onRefreshAgent();
    } catch (err) {
      alert(err.response?.data?.detail || '완료 처리 실패');
    }
  };

  return (
    <div>
      {/* ── 원자재 발주 현황 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>원자재 발주 현황</div>
        <button className="btn btn-primary" style={{ padding: '5px 14px' }}
          onClick={() => setShowOrderForm(v => !v)}>
          {showOrderForm ? '닫기' : '+ 발주 등록'}
        </button>
      </div>

      {showOrderForm && (
        <form className="form-row" onSubmit={handleOrderSubmit}
          style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div className="form-group">
            <label>품목 (원자재명)</label>
            <input placeholder="예: 면 원사" value={orderForm.material_name}
              onChange={e => setOrderForm(f => ({ ...f, material_name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>발주처</label>
            <input placeholder="공급업체명" value={orderForm.supplier}
              onChange={e => setOrderForm(f => ({ ...f, supplier: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>날짜 (발주일)</label>
            <input type="date" value={orderForm.order_date}
              onChange={e => setOrderForm(f => ({ ...f, order_date: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>납기요청일</label>
            <input type="date" value={orderForm.due_date}
              onChange={e => setOrderForm(f => ({ ...f, due_date: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>수량 (kg)</label>
            <input type="number" placeholder="kg" value={orderForm.order_qty}
              onChange={e => setOrderForm(f => ({ ...f, order_qty: e.target.value }))}
              style={{ width: 100 }} required />
          </div>
          <div className="form-group">
            <label>비고</label>
            <input placeholder="선택" value={orderForm.note}
              onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))} style={{ width: 110 }} />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button type="submit" className="btn btn-success">등록</button>
          </div>
        </form>
      )}

      {/* 표준 컬럼: 발주처 | 날짜 | 기간 | 수량 | 비고 */}
      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>품목</th>
              <th>발주처</th>
              <th>날짜</th>
              <th>기간 (발주 ~ 납기)</th>
              <th>수량 (kg)</th>
              <th>비고</th>
              <th>상태</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af' }}>발주 내역 없음</td></tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600 }}>{o.material_name}</td>
                <td>{o.supplier}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{o.order_date}</td>
                <td style={{ fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
                  {periodStr(o.order_date, o.due_date)}
                </td>
                <td style={{ textAlign: 'right' }}>{parseFloat(o.order_qty).toLocaleString()}</td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{o.note || '—'}</td>
                <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span></td>
                <td>
                  {o.status === '대기중' && (
                    <button className="btn btn-success" style={{ padding: '3px 10px' }}
                      onClick={() => handleOrderComplete(o.id)}>입고완료</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 출고 주문 현황 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>출고 주문 현황</div>
        <button className="btn btn-primary" style={{ padding: '5px 14px' }}
          onClick={() => setShowReleaseForm(v => !v)}>
          {showReleaseForm ? '닫기' : '+ 출고 등록'}
        </button>
      </div>

      {showReleaseForm && (
        <form className="form-row" onSubmit={handleReleaseSubmit}
          style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div className="form-group">
            <label>라벨코드 (9자리)</label>
            <input placeholder="예: W3MJW01NV" maxLength={9} value={releaseForm.label_code}
              onChange={e => setReleaseForm(f => ({ ...f, label_code: e.target.value.toUpperCase() }))}
              style={{ width: 120, fontFamily: 'monospace', letterSpacing: 1 }} required />
          </div>
          <div className="form-group">
            <label>원단코드</label>
            <select value={releaseForm.fabric_code}
              onChange={e => setReleaseForm(f => ({ ...f, fabric_code: e.target.value }))}>
              {FABRIC_CODES.map(c => <option key={c} value={c}>{c} — {FABRIC_NAMES[c]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>컬러코드</label>
            <select value={releaseForm.color_code}
              onChange={e => setReleaseForm(f => ({ ...f, color_code: e.target.value }))}>
              {COLOR_CODES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>주문량 (야드)</label>
            <input type="number" placeholder="야드" value={releaseForm.release_qty}
              onChange={e => setReleaseForm(f => ({ ...f, release_qty: e.target.value }))}
              style={{ width: 100 }} required />
          </div>
          <div className="form-group">
            <label>납기일</label>
            <input type="date" value={releaseForm.due_date}
              onChange={e => setReleaseForm(f => ({ ...f, due_date: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button type="submit" className="btn btn-success">등록</button>
          </div>
        </form>
      )}

      {/* 표준 컬럼: 발주처(라벨코드) | 날짜 | 기간 | 수량 | 비고 */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>라벨코드</th>
              <th>품목 (원단/컬러)</th>
              <th>날짜 (등록일)</th>
              <th>기간 (등록 ~ 납기)</th>
              <th>수량 (야드)</th>
              <th>비고 (상태)</th>
              <th>완료</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af' }}>출고 주문 없음</td></tr>
            ) : releases.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>{r.label_code}</td>
                <td>{FABRIC_NAMES[r.fabric_code] || r.fabric_code} / {r.color_code}</td>
                <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b7280' }}>
                  {r.created_at ? r.created_at.slice(0, 10) : '-'}
                </td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {periodStr(r.created_at ? r.created_at.slice(0, 10) : null, r.due_date)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{parseFloat(r.release_qty).toLocaleString()}</td>
                <td>
                  <span className={`badge ${r.status === '출고완료' ? 'badge-ok' : 'badge-blue'}`}>
                    {r.status}
                  </span>
                  {r.release_date && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>{r.release_date}</span>}
                </td>
                <td>
                  {r.status === '생산중' && (
                    <button className="btn btn-success" style={{ padding: '3px 10px' }}
                      onClick={() => handleReleaseComplete(r.id)}>완료</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
