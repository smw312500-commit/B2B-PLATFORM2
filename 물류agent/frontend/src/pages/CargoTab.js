import React, { useEffect, useState, useCallback } from 'react';
import {
  getDeliveries, createDelivery, completeDelivery, autoDispatch,
  getDrivers, getVehicles, getAIPanel,
} from '../api/api';

const STATUS_COLOR = {
  '배차대기': 'bg-yellow-100 text-yellow-800',
  '운행중':   'bg-blue-100 text-blue-800',
  '완료':     'bg-green-100 text-green-800',
};

const EMPTY_COLOR = {
  '연결완료': 'text-green-600 font-medium',
  '빈차 귀환': 'text-red-500',
  '미정':     'text-gray-400',
};

function DeliveryForm({ drivers, vehicles, onSave, onCancel }) {
  const [form, setForm] = useState({
    company_name: '', origin_si: '', origin_gu: '',
    destination: '인천항', cargo_detail: '', weight_kg: '', due_date: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4 grid grid-cols-3 gap-3">
      <input className="border rounded px-2 py-1 text-sm" placeholder="출발 회사명" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="출발지 (시)" value={form.origin_si} onChange={e => set('origin_si', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="출발지 (구)" value={form.origin_gu} onChange={e => set('origin_gu', e.target.value)} />
      <select className="border rounded px-2 py-1 text-sm" value={form.destination} onChange={e => set('destination', e.target.value)}>
        <option>인천항</option><option>부산항</option>
      </select>
      <input className="border rounded px-2 py-1 text-sm" placeholder="화물 내용" value={form.cargo_detail} onChange={e => set('cargo_detail', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="무게 (kg)" type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm col-span-2" type="date" placeholder="납기일*" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
      <div className="flex gap-2 col-span-3">
        <button className="bg-yellow-600 text-white px-3 py-1 rounded text-sm" onClick={() => onSave(form)}>등록</button>
        <button className="bg-gray-300 px-3 py-1 rounded text-sm" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

function DriverPanel({ panel }) {
  return (
    <div className="bg-white border rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">{panel.driver_name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          panel.status === '가용' ? 'bg-green-100 text-green-700' :
          panel.status === '운행중' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
        }`}>{panel.status}</span>
      </div>
      {panel.today_jobs.length === 0 ? (
        <p className="text-xs text-gray-400">오늘 배정 없음</p>
      ) : (
        panel.today_jobs.map((j, i) => (
          <div key={i} className="text-xs border-t pt-1 mt-1">
            <div className="text-gray-700">{j.destination}</div>
            <div className="text-gray-400">픽업: {j.pickup_date || '-'}</div>
            <div className={`font-medium ${
              j.status === '완료' ? 'text-green-600' :
              j.status === '운행중' ? 'text-blue-600' : 'text-yellow-600'
            }`}>{j.status}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function CargoTab() {
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driverPanels, setDriverPanels] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [de, dr, ve, panel] = await Promise.all([
      getDeliveries(), getDrivers(), getVehicles(), getAIPanel(),
    ]);
    setDeliveries(de.data);
    setDrivers(dr.data);
    setVehicles(ve.data);
    setDriverPanels(panel.data.driver_panels || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    if (!form.due_date) return alert('납기일을 입력하세요');
    await createDelivery({
      ...form,
      weight_kg: parseFloat(form.weight_kg) || null,
    });
    setShowForm(false);
    load();
  };

  const handleComplete = async (id) => {
    if (!window.confirm('배송 완료 처리 하시겠습니까?')) return;
    await completeDelivery(id);
    load();
  };

  const handleAutoDispatch = async (id) => {
    try {
      const res = await autoDispatch(id);
      alert(res.data.message);
      load();
    } catch {
      alert('자동 배차 실패');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const getDDay = (due_date) => {
    if (!due_date) return '';
    const diff = Math.ceil((new Date(due_date) - new Date(today)) / 86400000);
    if (diff < 0) return <span className="text-red-600 font-bold">D+{Math.abs(diff)} 초과</span>;
    if (diff === 0) return <span className="text-red-500 font-bold">D-Day</span>;
    if (diff <= 1) return <span className="text-orange-500 font-bold">D-{diff}</span>;
    return <span className="text-gray-600">D-{diff}</span>;
  };

  return (
    <div className="flex gap-4 p-4 h-full overflow-hidden">
      {/* 화물 테이블 */}
      <div className="flex-1 bg-white rounded-lg shadow p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">화물 목록 / 배차 현황</h2>
          <button
            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => setShowForm(v => !v)}
          >
            + 화물 등록
          </button>
        </div>

        {showForm && (
          <DeliveryForm
            drivers={drivers}
            vehicles={vehicles}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="py-2 px-3 text-left">집하주소</th>
              <th className="py-2 px-3 text-left">가는길</th>
              <th className="py-2 px-3 text-left">빈차일지</th>
              <th className="py-2 px-3 text-left">납기일</th>
              <th className="py-2 px-3 text-left">배송현황</th>
              <th className="py-2 px-3 text-left">왕복최적화</th>
              <th className="py-2 px-3 text-left">액션</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">등록된 화물 없음</td></tr>
            )}
            {deliveries.map(d => (
              <tr key={d.id} className={`border-b hover:bg-gray-50 ${d.status === '완료' ? 'opacity-60' : ''}`}>
                <td className="py-2 px-3">
                  <div className="font-medium">{d.company_name || '-'}</div>
                  <div className="text-xs text-gray-400">{d.origin_si} {d.origin_gu}</div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-xs">
                    {d.origin_si} {d.origin_gu}
                    <br />→ <span className="font-medium text-blue-600">{d.destination}</span>
                  </div>
                  {d.driver_name && <div className="text-xs text-gray-400 mt-0.5">{d.driver_name}</div>}
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs ${EMPTY_COLOR[d.empty_return] || 'text-gray-400'}`}>
                    {d.empty_return || '미정'}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="text-xs">{d.due_date}</div>
                  <div className="text-xs mt-0.5">{getDDay(d.due_date)}</div>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[d.status] || 'bg-gray-100'}`}>
                    {d.status}
                  </span>
                  {d.pickup_date && (
                    <div className="text-xs text-gray-400 mt-0.5">픽업: {d.pickup_date}</div>
                  )}
                </td>
                <td className="py-2 px-3">
                  {d.status !== '완료' && (
                    <button
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200"
                      onClick={() => handleAutoDispatch(d.id)}
                    >
                      AI 배차
                    </button>
                  )}
                </td>
                <td className="py-2 px-3">
                  {d.status !== '완료' && (
                    <button
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                      onClick={() => handleComplete(d.id)}
                    >
                      완료
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 기사별 공지 패널 */}
      <div className="w-52 flex flex-col gap-3 overflow-auto">
        <h3 className="text-sm font-bold text-gray-600 px-1">기사 현황</h3>
        {driverPanels.length === 0 && (
          <div className="text-xs text-gray-400 px-1">기사 없음</div>
        )}
        {driverPanels.map(p => (
          <DriverPanel key={p.driver_id} panel={p} />
        ))}
      </div>
    </div>
  );
}
