import React, { useState, useEffect } from 'react';
import { stockApi } from '../api';

const FABRIC_NAMES = { C: '면(Cotton)', P: '폴리에스터', L: '린넨(Linen)', W: '울(Wool)', M: '혼방(Mixed)' };
const COLOR_NAMES  = { BK: '블랙', WH: '화이트', NV: '네이비', GY: '그레이', BE: '베이지', RD: '레드' };
const SAFE_STOCK   = { C: 500, P: 300, L: 200, W: 150, M: 250 };
const FABRIC_CODES = ['C', 'P', 'L', 'W', 'M'];
const COLOR_CODES  = ['BK', 'WH', 'NV', 'GY', 'BE', 'RD'];

export default function StockTab({ onRefreshAgent }) {
  const [stocks, setStocks] = useState([]);
  const [form, setForm] = useState({ fabric_code: 'C', color_code: 'BK', stock_qty: '' });
  const [editId, setEditId] = useState(null);
  const [editQty, setEditQty] = useState('');

  const load = async () => {
    try {
      const res = await stockApi.getAll();
      setStocks(res.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.stock_qty) return;
    try {
      await stockApi.create({ ...form, stock_qty: parseFloat(form.stock_qty) });
      setForm({ fabric_code: 'C', color_code: 'BK', stock_qty: '' });
      await load();
      onRefreshAgent();
    } catch (err) {
      alert(err.response?.data?.detail || '등록 실패');
    }
  };

  const handleEdit = async (id) => {
    if (!editQty) return;
    try {
      await stockApi.update(id, { stock_qty: parseFloat(editQty) });
      setEditId(null);
      setEditQty('');
      await load();
      onRefreshAgent();
    } catch (err) {
      alert(err.response?.data?.detail || '수정 실패');
    }
  };

  const stockStatus = (item) => {
    const safe = SAFE_STOCK[item.fabric_code] || 0;
    const qty = parseFloat(item.stock_qty);
    if (qty === 0) return 'danger';
    if (qty <= safe) return 'warning';
    return 'ok';
  };

  return (
    <div>
      <div className="section-title">재고 현황</div>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>원단</th>
              <th>컬러</th>
              <th>현재 재고 (야드)</th>
              <th>안전재고 (야드)</th>
              <th>상태</th>
              <th>최종 업데이트</th>
              <th>수정</th>
            </tr>
          </thead>
          <tbody>
            {stocks.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af' }}>재고 데이터 없음</td></tr>
            ) : stocks.map((s) => {
              const st = stockStatus(s);
              return (
                <tr key={s.id}>
                  <td>{FABRIC_NAMES[s.fabric_code] || s.fabric_code}</td>
                  <td>{COLOR_NAMES[s.color_code] || s.color_code} ({s.color_code})</td>
                  <td style={{ fontWeight: 700 }}>{parseFloat(s.stock_qty).toLocaleString()}</td>
                  <td style={{ color: '#6b7280' }}>{SAFE_STOCK[s.fabric_code] || '-'}</td>
                  <td>
                    {st === 'ok'      && <span className="badge badge-ok">정상</span>}
                    {st === 'warning' && <span className="badge badge-warning">부족</span>}
                    {st === 'danger'  && <span className="badge badge-danger">긴급</span>}
                  </td>
                  <td style={{ fontSize: 11, color: '#9ca3af' }}>
                    {s.updated_at ? s.updated_at.replace('T', ' ').slice(0, 16) : '-'}
                  </td>
                  <td>
                    {editId === s.id ? (
                      <span style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="number"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          style={{ width: 80, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4 }}
                        />
                        <button className="btn btn-success" style={{ padding: '4px 10px' }} onClick={() => handleEdit(s.id)}>저장</button>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={() => setEditId(null)}>취소</button>
                      </span>
                    ) : (
                      <button className="btn btn-primary" style={{ padding: '4px 10px' }}
                        onClick={() => { setEditId(s.id); setEditQty(String(parseFloat(s.stock_qty))); }}>
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section-title">재고 항목 추가</div>
      <form className="form-row" onSubmit={handleAdd}>
        <div className="form-group">
          <label>원단코드</label>
          <select value={form.fabric_code} onChange={e => setForm(f => ({ ...f, fabric_code: e.target.value }))}>
            {FABRIC_CODES.map(c => <option key={c} value={c}>{c} - {FABRIC_NAMES[c]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>컬러코드</label>
          <select value={form.color_code} onChange={e => setForm(f => ({ ...f, color_code: e.target.value }))}>
            {COLOR_CODES.map(c => <option key={c} value={c}>{c} - {COLOR_NAMES[c]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>수량 (야드)</label>
          <input type="number" placeholder="예: 1000" value={form.stock_qty}
            onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} style={{ width: 120 }} />
        </div>
        <div className="form-group">
          <label>&nbsp;</label>
          <button type="submit" className="btn btn-primary">추가</button>
        </div>
      </form>
    </div>
  );
}
