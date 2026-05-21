import { useEffect, useState } from 'react';
import { getStock, updateStock, getRawMaterials, updateRawMaterial } from '../../api';

const ITEM_LABELS = {
  WOOD_BR: '원목단추 브라운', WOOD_BK: '원목단추 블랙',
  PLASTIC_BK: '플라스틱단추 블랙', PLASTIC_WH: '플라스틱단추 화이트',
  METAL_SV: '금속단추 실버', METAL_BK: '금속단추 블랙',
  ZIPPER_S: '지퍼 소형', ZIPPER_M: '지퍼 중형', ZIPPER_L: '지퍼 대형',
};

const SAFETY = {
  원목: 50, 플라스틱원료: 100, 금속원료: 80, 지퍼테이프: 200,
};

export default function StockTab() {
  const [stock, setStock] = useState([]);
  const [raws, setRaws] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editRawId, setEditRawId] = useState(null);
  const [editRawQty, setEditRawQty] = useState('');

  async function load() {
    const [s, r] = await Promise.all([getStock(), getRawMaterials()]);
    setStock(s.data);
    setRaws(r.data);
  }

  useEffect(() => { load(); }, []);

  async function saveStock(id) {
    await updateStock(id, parseInt(editQty));
    setEditId(null);
    load();
  }

  async function saveRaw(id) {
    await updateRawMaterial(id, parseFloat(editRawQty));
    setEditRawId(null);
    load();
  }

  return (
    <div className="space-y-6">
      {/* 완제품 재고 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">완제품 재고</h3>
        <div className="overflow-auto rounded border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">품목명</th>
                <th className="text-left px-4 py-2">소재</th>
                <th className="text-right px-4 py-2">재고 (개)</th>
                <th className="text-left px-4 py-2">최종수정</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{ITEM_LABELS[s.item_name] || s.item_name}</td>
                  <td className="px-4 py-2 text-gray-500">{s.material}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {editId === s.id ? (
                      <input
                        type="number" min={0}
                        className="w-24 border rounded px-1 py-0.5 text-right text-xs"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                      />
                    ) : (
                      <span className={s.stock_qty === 0 ? 'text-red-600 font-bold' : ''}>
                        {s.stock_qty.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">
                    {s.updated_at ? new Date(s.updated_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editId === s.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => saveStock(s.id)} className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">저장</button>
                        <button onClick={() => setEditId(null)} className="text-xs bg-gray-200 px-2 py-0.5 rounded">취소</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(s.id); setEditQty(s.stock_qty); }}
                        className="text-xs text-indigo-600 hover:underline"
                      >수정</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 원자재 재고 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">원자재 재고</h3>
        <div className="overflow-auto rounded border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">원자재명</th>
                <th className="text-right px-4 py-2">재고</th>
                <th className="text-left px-4 py-2">단위</th>
                <th className="text-left px-4 py-2">안전재고</th>
                <th className="text-left px-4 py-2">상태</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {raws.map((r) => {
                const safe = SAFETY[r.material_name];
                const isCritical = safe && parseFloat(r.stock_qty) === 0;
                const isLow = safe && parseFloat(r.stock_qty) <= safe && parseFloat(r.stock_qty) > 0;
                return (
                  <tr key={r.id} className={`border-t border-gray-100 hover:bg-gray-50 ${isCritical ? 'bg-red-50' : isLow ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-2 font-medium">{r.material_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {editRawId === r.id ? (
                        <input
                          type="number" min={0} step="0.1"
                          className="w-24 border rounded px-1 py-0.5 text-right text-xs"
                          value={editRawQty}
                          onChange={(e) => setEditRawQty(e.target.value)}
                        />
                      ) : (
                        <span className={isCritical ? 'text-red-600 font-bold' : isLow ? 'text-yellow-600 font-semibold' : ''}>
                          {parseFloat(r.stock_qty).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{r.unit}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{safe ? `${safe}${r.unit}` : '-'}</td>
                    <td className="px-4 py-2 text-xs">
                      {isCritical
                        ? <span className="text-red-600 font-bold">❌ 긴급 발주</span>
                        : isLow
                        ? <span className="text-yellow-600">⚠ 발주 권고</span>
                        : <span className="text-green-600">✅ 정상</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editRawId === r.id ? (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => saveRaw(r.id)} className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">저장</button>
                          <button onClick={() => setEditRawId(null)} className="text-xs bg-gray-200 px-2 py-0.5 rounded">취소</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditRawId(r.id); setEditRawQty(r.stock_qty); }}
                          className="text-xs text-indigo-600 hover:underline"
                        >수정</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* AI 알림 영역 */}
        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500">
          <span className="font-semibold text-gray-600">AI 알림:</span>{' '}
          {raws.filter(r => SAFETY[r.material_name] && parseFloat(r.stock_qty) <= SAFETY[r.material_name]).length > 0
            ? raws
                .filter(r => SAFETY[r.material_name] && parseFloat(r.stock_qty) <= SAFETY[r.material_name])
                .map(r => `${r.material_name} 발주 필요`)
                .join(' / ')
            : '모든 원자재 재고 정상'}
        </div>
      </section>
    </div>
  );
}
