import React, { useState, useEffect } from 'react';
import { orderApi, releaseApi } from '../api';

const STATUS_BADGE = {
  '대기중': 'badge-blue',
  '입고완료': 'badge-ok',
  '취소': 'badge-gray',
};

const FABRIC_NAMES = { C: '면', P: '폴리에스터', L: '린넨', W: '울', M: '혼방' };
const FABRIC_CODES = ['C', 'P', 'L', 'W', 'M'];
const COLOR_CODES  = ['BK', 'WH', 'NV', 'GY', 'BE', 'RD'];

export default function OrderTab({ onRefreshAgent }) {
  const [orders, setOrders] = useState([]);
  const [releases, setReleases] = useState([]);
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
      await orderApi.create({
        ...orderForm,
        order_qty: parseFloat(orderForm.order_qty),
      });
      setOrderForm({ material_name: '', order_qty: '', supplier: '', order_date: '', due_date: '', note: '' });
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
      await releaseApi.create({
        ...releaseForm,
        release_qty: parseFloat(releaseForm.release_qty),
      });
      setReleaseForm({ label_code: '', fabric_code: 'C', color_code: 'BK', release_qty: '', due_date: '' });
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
      {/* 원자재 발주 */}
      <div className="section-title">원자재 발주 현황</div>
      <div className="table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr>
              <th>원자재명</th>
              <th>발주처</th>
              <th>발주일</th>
              <th>납기요청일</th>
              <th>수량 (kg)</th>
              <th>상태</th>
              <th>비고</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af' }}>발주 내역 없음</td></tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <td>{o.material_name}</td>
                <td>{o.supplier}</td>
                <td>{o.order_date}</td>
                <td>{o.due_date}</td>
                <td>{parseFloat(o.order_qty).toLocaleString()}</td>
                <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span></td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{o.note || '-'}</td>
                <td>
                  {o.status === '대기중' && (
                    <button className="btn btn-success" style={{ padding: '4px 10px' }}
                      onClick={() => handleOrderComplete(o.id)}>입고완료</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 발주 등록 폼 */}
      <details style={{ marginBottom: 24 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>+ 새 발주 등록</summary>
        <form className="form-row" onSubmit={handleOrderSubmit} style={{ marginTop: 8 }}>
          <div className="form-group">
            <label>원자재명</label>
            <input placeholder="예: 면 원사" value={orderForm.material_name}
              onChange={e => setOrderForm(f => ({ ...f, material_name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>발주처</label>
            <input placeholder="공급업체명" value={orderForm.supplier}
              onChange={e => setOrderForm(f => ({ ...f, supplier: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>수량 (kg)</label>
            <input type="number" placeholder="kg" value={orderForm.order_qty}
              onChange={e => setOrderForm(f => ({ ...f, order_qty: e.target.value }))} style={{ width: 100 }} required />
          </div>
          <div className="form-group">
            <label>발주일</label>
            <input type="date" value={orderForm.order_date}
              onChange={e => setOrderForm(f => ({ ...f, order_date: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>납기요청일</label>
            <input type="date" value={orderForm.due_date}
              onChange={e => setOrderForm(f => ({ ...f, due_date: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>비고</label>
            <input placeholder="선택" value={orderForm.note}
              onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))} style={{ width: 120 }} />
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button type="submit" className="btn btn-primary">등록</button>
          </div>
        </form>
      </details>

      {/* 출고 주문 */}
      <div className="section-title">출고 주문 현황</div>
      <div className="table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr>
              <th>라벨코드</th>
              <th>원단</th>
              <th>컬러</th>
              <th>주문량 (야드)</th>
              <th>납기일</th>
              <th>상태</th>
              <th>출고일</th>
              <th>완료</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af' }}>출고 주문 없음</td></tr>
            ) : releases.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700, letterSpacing: 0.5 }}>{r.label_code}</td>
                <td>{FABRIC_NAMES[r.fabric_code] || r.fabric_code}</td>
                <td>{r.color_code}</td>
                <td>{parseFloat(r.release_qty).toLocaleString()}</td>
                <td>{r.due_date}</td>
                <td>
                  <span className={`badge ${r.status === '출고완료' ? 'badge-ok' : 'badge-blue'}`}>
                    {r.status}
                  </span>
                </td>
                <td>{r.release_date || '-'}</td>
                <td>
                  {r.status === '생산중' && (
                    <button className="btn btn-success" style={{ padding: '4px 10px' }}
                      onClick={() => handleReleaseComplete(r.id)}>완료</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 출고 주문 등록 */}
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>+ 출고 주문 등록</summary>
        <form className="form-row" onSubmit={handleReleaseSubmit} style={{ marginTop: 8 }}>
          <div className="form-group">
            <label>라벨코드 (9자리)</label>
            <input placeholder="예: W3MJW01NV" maxLength={9} value={releaseForm.label_code}
              onChange={e => setReleaseForm(f => ({ ...f, label_code: e.target.value.toUpperCase() }))}
              style={{ width: 120, fontFamily: 'monospace' }} required />
          </div>
          <div className="form-group">
            <label>원단코드</label>
            <select value={releaseForm.fabric_code}
              onChange={e => setReleaseForm(f => ({ ...f, fabric_code: e.target.value }))}>
              {FABRIC_CODES.map(c => <option key={c} value={c}>{c} - {FABRIC_NAMES[c]}</option>)}
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
            <button type="submit" className="btn btn-primary">등록</button>
          </div>
        </form>
      </details>
    </div>
  );
}
