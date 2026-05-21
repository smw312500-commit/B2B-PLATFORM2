import { useEffect, useState } from 'react'
import { getOrders, createOrder, getReleases, createRelease, completeRelease, analyzeOrder, validateLabelCode } from '../../services/api'

const STATUS_COLOR = {
  대기중: 'bg-yellow-100 text-yellow-800',
  입고완료: 'bg-green-100 text-green-700',
  취소: 'bg-gray-100 text-gray-500',
  생산중: 'bg-blue-100 text-blue-700',
  출고완료: 'bg-green-100 text-green-700',
}

export default function OrderTab() {
  const [orders, setOrders] = useState([])
  const [releases, setReleases] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showReleaseForm, setShowReleaseForm] = useState(false)
  const [form, setForm] = useState({ material_name: '라벨원단', order_qty: '', supplier: '', order_date: today(), due_date: '', note: '' })
  const [releaseForm, setReleaseForm] = useState({ label_code: '', release_qty: '', due_date: '' })
  const [validation, setValidation] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [completing, setCompleting] = useState(null)

  const fetchAll = async () => {
    const [o, r] = await Promise.all([getOrders(), getReleases()])
    setOrders(o.data)
    setReleases(r.data)
  }

  useEffect(() => { fetchAll() }, [])

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    await createOrder({ ...form, order_qty: Number(form.order_qty) })
    setForm({ material_name: '라벨원단', order_qty: '', supplier: '', order_date: today(), due_date: '', note: '' })
    setShowForm(false)
    fetchAll()
  }

  const handleValidate = async () => {
    if (!releaseForm.label_code) return
    try {
      const res = await validateLabelCode(releaseForm.label_code)
      setValidation(res.data)
    } catch {
      setValidation({ valid: false, message: '서버 오류' })
    }
  }

  const handleAnalyze = async () => {
    if (!releaseForm.label_code || !releaseForm.release_qty || !releaseForm.due_date) return
    try {
      const res = await analyzeOrder({
        label_code: releaseForm.label_code,
        release_qty: Number(releaseForm.release_qty),
        due_date: releaseForm.due_date,
      })
      setAnalysis(res.data)
    } catch (err) {
      setAnalysis({ deadline_status: '오류', warnings: [err.response?.data?.detail || '분석 실패'] })
    }
  }

  const handleReleaseSubmit = async (e) => {
    e.preventDefault()
    await createRelease({ ...releaseForm, release_qty: Number(releaseForm.release_qty) })
    setReleaseForm({ label_code: '', release_qty: '', due_date: '' })
    setShowReleaseForm(false)
    setValidation(null)
    setAnalysis(null)
    fetchAll()
  }

  const handleComplete = async (id) => {
    setCompleting(id)
    try {
      await completeRelease(id)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.detail || '완료 처리 실패')
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 원자재 발주 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">원자재 발주 현황</h3>
          <button onClick={() => setShowForm(!showForm)} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700">
            + 발주 등록
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleOrderSubmit} className="bg-gray-50 border rounded p-4 mb-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">품목</label>
                <select value={form.material_name} onChange={(e) => setForm({ ...form, material_name: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1">
                  <option>라벨원단</option>
                  <option>잉크</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">발주량</label>
                <input type="number" required value={form.order_qty} onChange={(e) => setForm({ ...form, order_qty: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1" placeholder="수량 입력" />
              </div>
              <div>
                <label className="text-xs text-gray-500">발주처</label>
                <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1" placeholder="발주처명" />
              </div>
              <div>
                <label className="text-xs text-gray-500">발주일</label>
                <input type="date" required value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">납기요청일</label>
                <input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">비고</label>
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1" placeholder="비고" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:underline">취소</button>
              <button type="submit" className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700">등록</button>
            </div>
          </form>
        )}

        <OrderTable orders={orders} />
      </section>

      {/* 라벨 생산 출고 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">라벨 생산 / 출고</h3>
          <button onClick={() => setShowReleaseForm(!showReleaseForm)} className="text-sm bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700">
            + 출고 등록
          </button>
        </div>

        {showReleaseForm && (
          <form onSubmit={handleReleaseSubmit} className="bg-gray-50 border rounded p-4 mb-4 space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500">라벨코드 (9자리)</label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    required
                    maxLength={9}
                    value={releaseForm.label_code}
                    onChange={(e) => { setReleaseForm({ ...releaseForm, label_code: e.target.value.toUpperCase() }); setValidation(null); setAnalysis(null) }}
                    className="flex-1 border rounded px-2 py-1.5 font-mono"
                    placeholder="W3MJW01NV"
                  />
                  <button type="button" onClick={handleValidate} className="text-xs bg-gray-200 px-2 rounded hover:bg-gray-300">검증</button>
                </div>
                {validation && (
                  <p className={`text-xs mt-1 ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.valid ? '✅ ' : '❌ '}{validation.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">주문량 (장)</label>
                <input type="number" required value={releaseForm.release_qty} onChange={(e) => setReleaseForm({ ...releaseForm, release_qty: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1" placeholder="수량" />
              </div>
              <div>
                <label className="text-xs text-gray-500">납기일</label>
                <input type="date" required value={releaseForm.due_date} onChange={(e) => setReleaseForm({ ...releaseForm, due_date: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1" />
              </div>
            </div>

            <button type="button" onClick={handleAnalyze} className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-200 border border-purple-300">
              AI 납기 분석
            </button>

            {analysis && <AnalysisResult data={analysis} />}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowReleaseForm(false); setValidation(null); setAnalysis(null) }} className="text-xs text-gray-500 hover:underline">취소</button>
              <button type="submit" className="text-xs bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700">등록</button>
            </div>
          </form>
        )}

        {/* 출고 목록 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-left">
                <th className="px-4 py-2 border">라벨코드</th>
                <th className="px-4 py-2 border">주문량</th>
                <th className="px-4 py-2 border">납기일</th>
                <th className="px-4 py-2 border">상태</th>
                <th className="px-4 py-2 border">출고일</th>
                <th className="px-4 py-2 border">완료</th>
              </tr>
            </thead>
            <tbody>
              {releases.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400 text-sm">등록된 출고 없음</td></tr>
              )}
              {releases.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-mono font-semibold">{r.label_code}</td>
                  <td className="px-4 py-2 border">{r.release_qty.toLocaleString()}장</td>
                  <td className="px-4 py-2 border">{r.due_date}</td>
                  <td className="px-4 py-2 border">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] || ''}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2 border text-gray-400 text-xs">{r.release_date || '-'}</td>
                  <td className="px-4 py-2 border">
                    {r.status === '생산중' && (
                      <button
                        onClick={() => handleComplete(r.id)}
                        disabled={completing === r.id}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {completing === r.id ? '처리중...' : '완료'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function OrderTable({ orders }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-left">
            <th className="px-4 py-2 border">발주처</th>
            <th className="px-4 py-2 border">품목</th>
            <th className="px-4 py-2 border">발주량</th>
            <th className="px-4 py-2 border">발주일</th>
            <th className="px-4 py-2 border">납기요청일</th>
            <th className="px-4 py-2 border">상태</th>
            <th className="px-4 py-2 border">비고</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-400">등록된 발주 없음</td></tr>
          )}
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border">{o.supplier || '-'}</td>
              <td className="px-4 py-2 border">{o.material_name}</td>
              <td className="px-4 py-2 border">{Number(o.order_qty).toLocaleString()}</td>
              <td className="px-4 py-2 border">{o.order_date}</td>
              <td className="px-4 py-2 border">{o.due_date}</td>
              <td className="px-4 py-2 border">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] || ''}`}>{o.status}</span>
              </td>
              <td className="px-4 py-2 border text-gray-400 text-xs">{o.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnalysisResult({ data }) {
  const statusColor = {
    납기가능: 'bg-green-50 border-green-300 text-green-800',
    납기위험: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    납기불가: 'bg-red-50 border-red-300 text-red-800',
    오류: 'bg-red-50 border-red-300 text-red-800',
  }

  return (
    <div className={`rounded border p-3 text-xs space-y-1 ${statusColor[data.deadline_status] || 'bg-gray-50 border-gray-200'}`}>
      <p className="font-bold">{data.deadline_status} {data.is_valid && `— D-${data.days_remaining}`}</p>
      {data.is_valid && (
        <>
          <p>소요시간: {data.required_hours}h ({data.required_days}일)</p>
          <p>필요 원단: {data.required_fabric_m}m · 잉크: {data.required_ink_count}통</p>
        </>
      )}
      {data.warnings?.map((w, i) => <p key={i}>{w}</p>)}
      {data.instructions?.map((ins, i) => <p key={i} className="opacity-80">{ins}</p>)}
    </div>
  )
}

function today() {
  return new Date().toISOString().split('T')[0]
}
