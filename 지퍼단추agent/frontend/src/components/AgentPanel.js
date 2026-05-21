import { useEffect, useState, useCallback } from 'react';
import { getAgentStatus, analyzeOrder } from '../api';

const STATUS_COLOR = {
  '납기가능': 'text-green-600',
  '납기위험': 'text-yellow-600',
  '납기불가': 'text-red-600',
};

export default function AgentPanel() {
  const [status, setStatus] = useState(null);
  const [analyzeForm, setAnalyzeForm] = useState({ label_code: '', order_qty: '', due_date: '' });
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getAgentStatus();
      setStatus(res.data);
    } catch {
      // 서버 연결 전 무시
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 30000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (analyzeForm.label_code.length !== 9) {
      setError('라벨코드는 정확히 9자리여야 합니다');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await analyzeOrder({
        label_code: analyzeForm.label_code.toUpperCase(),
        order_qty: parseInt(analyzeForm.order_qty),
        due_date: analyzeForm.due_date,
      });
      setAnalyzeResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || '분석 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="w-full h-full bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="bg-indigo-700 text-white px-4 py-2 text-sm font-semibold">
        AI Agent
      </div>

      {/* 납기 현황 */}
      <section className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2">납기 현황</p>
        {status?.priority_orders?.length > 0 ? (
          <ul className="space-y-1">
            {status.priority_orders.map((o) => (
              <li key={o.id} className="text-xs">
                <span className="font-mono text-gray-700">{o.label_code || o.item_name}</span>
                <span className={`ml-2 font-bold ${o.days_left < 0 ? 'text-red-600' : o.days_left < 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {o.days_left != null ? `D-${o.days_left}` : '-'} {o.status_icon}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">진행 중인 주문 없음</p>
        )}
      </section>

      {/* 재고 경고 */}
      {status?.stock_warnings?.length > 0 && (
        <section className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">재고 경고</p>
          <ul className="space-y-1">
            {status.stock_warnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                {w.warning}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 주문 분석 */}
      <section className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2">주문 분석</p>
        <form onSubmit={handleAnalyze} className="space-y-2">
          <input
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-mono uppercase"
            placeholder="라벨코드 9자리 (예: W3MJW01NV)"
            maxLength={9}
            value={analyzeForm.label_code}
            onChange={(e) => setAnalyzeForm({ ...analyzeForm, label_code: e.target.value })}
          />
          <input
            type="number"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            placeholder="주문량 (개)"
            min={1}
            value={analyzeForm.order_qty}
            onChange={(e) => setAnalyzeForm({ ...analyzeForm, order_qty: e.target.value })}
          />
          <input
            type="date"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            value={analyzeForm.due_date}
            onChange={(e) => setAnalyzeForm({ ...analyzeForm, due_date: e.target.value })}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-xs bg-indigo-600 text-white py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '분석 중...' : 'AI 분석'}
          </button>
        </form>
      </section>

      {/* 분석 결과 */}
      {analyzeResult && (
        <section className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">분석 결과</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">품목</span>
              <span className="font-medium">{analyzeResult.item_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">납기</span>
              <span className={`font-bold ${STATUS_COLOR[analyzeResult.deadline_status] || ''}`}>
                {analyzeResult.deadline_status} (D-{analyzeResult.days_remaining})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">필요일수</span>
              <span>{analyzeResult.total_days_needed}일</span>
            </div>

            {analyzeResult.requirements.map((r, i) => (
              <div key={i} className="bg-gray-50 rounded p-2 mt-1">
                <p className="font-medium text-gray-700">{r.item_label} ({r.item_name})</p>
                <p className="text-gray-500">{r.production_hours}h → {r.production_days}일</p>
                <p className="text-gray-500">
                  원자재 {r.raw_material}: {r.raw_material_needed}{r.raw_material_unit} 필요
                </p>
              </div>
            ))}

            {analyzeResult.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {analyzeResult.warnings.map((w, i) => (
                  <p key={i} className="text-yellow-700 bg-yellow-50 rounded px-2 py-1">{w}</p>
                ))}
              </div>
            )}

            {analyzeResult.recommendations.length > 0 && (
              <div className="mt-2 space-y-1">
                {analyzeResult.recommendations.map((r, i) => (
                  <p key={i} className="text-blue-700 bg-blue-50 rounded px-2 py-1">{r}</p>
                ))}
              </div>
            )}

            {analyzeResult.gpt_comment && (
              <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded p-2">
                <p className="text-xs text-indigo-700 font-medium">AI 지시사항</p>
                <p className="text-xs text-indigo-600 mt-0.5">{analyzeResult.gpt_comment}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-auto px-4 py-2 text-xs text-gray-400 text-center">
        30초마다 자동 갱신
      </div>
    </aside>
  );
}
