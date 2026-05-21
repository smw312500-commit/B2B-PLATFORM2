import React, { useState, useEffect } from 'react';
import { orderApi } from '../api';

export default function CancelTab({ onRefreshAgent }) {
  const [orders, setOrders] = useState([]);

  const load = async () => {
    try {
      const res = await orderApi.getActive();
      setOrders(res.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id, name) => {
    if (!window.confirm(`[${name}] 발주를 취소하시겠습니까?`)) return;
    try {
      await orderApi.cancel(id);
      await load();
      onRefreshAgent();
    } catch (err) {
      alert(err.response?.data?.detail || '취소 실패');
    }
  };

  return (
    <div>
      <div className="section-title">발주 취소 가능 목록</div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        대기중 상태의 발주만 취소 가능합니다.
      </p>
      <div className="table-wrap">
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
              <th>취소</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  취소 가능한 발주 없음
                </td>
              </tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <td>{o.material_name}</td>
                <td>{o.supplier}</td>
                <td>{o.order_date}</td>
                <td>{o.due_date}</td>
                <td>{parseFloat(o.order_qty).toLocaleString()}</td>
                <td><span className="badge badge-blue">{o.status}</span></td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{o.note || '-'}</td>
                <td>
                  <button className="btn btn-danger" style={{ padding: '4px 10px' }}
                    onClick={() => handleCancel(o.id, o.material_name)}>
                    취소
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
