import React, { useEffect, useState } from 'react';
import { getDrivers, createDriver, updateDriver, deleteDriver, getVehicles, createVehicle } from '../api/api';

const STATUS_BADGE = {
  '가용':    'bg-green-100 text-green-800',
  '운행중':  'bg-blue-100 text-blue-800',
  '휴무':    'bg-gray-200 text-gray-600',
};

function DriverForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', phone: '', location_si: '', location_gu: '', status: '가용' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-3 grid grid-cols-2 gap-3">
      <input className="border rounded px-2 py-1 text-sm" placeholder="기사명*" value={form.name} onChange={e => set('name', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="연락처" value={form.phone} onChange={e => set('phone', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="위치 (시)" value={form.location_si} onChange={e => set('location_si', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="위치 (구)" value={form.location_gu} onChange={e => set('location_gu', e.target.value)} />
      <select className="border rounded px-2 py-1 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
        <option>가용</option><option>운행중</option><option>휴무</option>
      </select>
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={() => onSave(form)}>등록</button>
        <button className="bg-gray-300 px-3 py-1 rounded text-sm" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

function VehicleForm({ drivers, onSave, onCancel }) {
  const [form, setForm] = useState({ driver_id: '', plate_no: '', max_weight: '', vehicle_type: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-green-50 border border-green-200 rounded p-4 mt-3 grid grid-cols-2 gap-3">
      <select className="border rounded px-2 py-1 text-sm" value={form.driver_id} onChange={e => set('driver_id', e.target.value)}>
        <option value="">기사 선택*</option>
        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <input className="border rounded px-2 py-1 text-sm" placeholder="차량번호*" value={form.plate_no} onChange={e => set('plate_no', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="최대 적재량 (kg)" type="number" value={form.max_weight} onChange={e => set('max_weight', e.target.value)} />
      <input className="border rounded px-2 py-1 text-sm" placeholder="차량종류 (트럭/탑차 등)" value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} />
      <div className="flex gap-2 col-span-2">
        <button className="bg-green-600 text-white px-3 py-1 rounded text-sm" onClick={() => onSave(form)}>등록</button>
        <button className="bg-gray-300 px-3 py-1 rounded text-sm" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

export default function DriverTab() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const load = async () => {
    const [dr, ve] = await Promise.all([getDrivers(), getVehicles()]);
    setDrivers(dr.data);
    setVehicles(ve.data);
  };

  useEffect(() => { load(); }, []);

  const handleDriverSave = async (form) => {
    if (!form.name) return alert('기사명을 입력하세요');
    await createDriver(form);
    setShowDriverForm(false);
    load();
  };

  const handleVehicleSave = async (form) => {
    if (!form.driver_id || !form.plate_no) return alert('기사와 차량번호를 입력하세요');
    await createVehicle({ ...form, driver_id: parseInt(form.driver_id), max_weight: parseFloat(form.max_weight) || null });
    setShowVehicleForm(false);
    load();
  };

  const handleStatusChange = async (driver, status) => {
    await updateDriver(driver.id, { status });
    load();
  };

  return (
    <div className="flex gap-4 p-4 h-full">
      {/* 기사 목록 */}
      <div className="flex-1 bg-white rounded-lg shadow p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">기사 목록</h2>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            onClick={() => setShowDriverForm(v => !v)}
          >
            + 기사 등록
          </button>
        </div>

        {showDriverForm && (
          <DriverForm
            onSave={handleDriverSave}
            onCancel={() => setShowDriverForm(false)}
          />
        )}

        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="py-2 px-3 text-left">기사명</th>
              <th className="py-2 px-3 text-left">연락처</th>
              <th className="py-2 px-3 text-left">현재위치</th>
              <th className="py-2 px-3 text-left">상태</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">등록된 기사 없음</td></tr>
            )}
            {drivers.map(d => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-medium">{d.name}</td>
                <td className="py-2 px-3 text-gray-500">{d.phone || '-'}</td>
                <td className="py-2 px-3 text-gray-500">{d.location_si} {d.location_gu}</td>
                <td className="py-2 px-3">
                  <select
                    value={d.status}
                    onChange={e => handleStatusChange(d, e.target.value)}
                    className={`rounded px-2 py-0.5 text-xs font-medium border-0 ${STATUS_BADGE[d.status] || ''}`}
                  >
                    <option>가용</option><option>운행중</option><option>휴무</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 차량 목록 */}
      <div className="flex-1 bg-white rounded-lg shadow p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">차량 목록</h2>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
            onClick={() => setShowVehicleForm(v => !v)}
          >
            + 차량 등록
          </button>
        </div>

        {showVehicleForm && (
          <VehicleForm
            drivers={drivers}
            onSave={handleVehicleSave}
            onCancel={() => setShowVehicleForm(false)}
          />
        )}

        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="py-2 px-3 text-left">차량번호</th>
              <th className="py-2 px-3 text-left">기사명</th>
              <th className="py-2 px-3 text-left">최대적재(kg)</th>
              <th className="py-2 px-3 text-left">차량종류</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">등록된 차량 없음</td></tr>
            )}
            {vehicles.map(v => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-mono font-medium">{v.plate_no}</td>
                <td className="py-2 px-3">{v.driver_name || '-'}</td>
                <td className="py-2 px-3">{v.max_weight ? `${v.max_weight} kg` : '-'}</td>
                <td className="py-2 px-3 text-gray-500">{v.vehicle_type || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
