import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { getReleases, createRelease, validateLabelCode, deleteReleasesBulk } from '../../services/api'
import MachineLayout from '../MachineLayout'

function today() { return new Date().toISOString().split('T')[0] }

function inRange(dateStr, searched) {
  if (!searched || !dateStr) return true
  const d = new Date(dateStr)
  return d >= new Date(searched.from) && d <= new Date(searched.to + 'T23:59:59')
}

function excelDateToISO(val) {
  if (!val && val !== 0) return null
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,'0')}-${String(val.getDate()).padStart(2,'0')}`
  }
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/\//g, '-').trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  }
  return null
}

// 라벨코드 9자리 클라이언트 유효성 검사
const BRAND   = new Set(['W'])
const SEASON  = new Set(['1','2','3','4'])
const GENDER  = new Set(['W','M'])
const ITEM    = new Set(['T','P','J','D'])
const FABRIC  = new Set(['C','P','L','W','M'])
const COLOR   = new Set(['BK','WH','NV','GY','BE','RD'])

function validateCode(code) {
  if (!code || code.length !== 9) return '9자리가 아님'
  if (!BRAND.has(code[0]))  return `브랜드코드 오류: ${code[0]}`
  if (!SEASON.has(code[1])) return `계절코드 오류: ${code[1]}`
  if (!GENDER.has(code[2])) return `성별코드 오류: ${code[2]}`
  if (!ITEM.has(code[3]))   return `품목코드 오류: ${code[3]}`
  if (!FABRIC.has(code[4])) return `원단코드 오류: ${code[4]}`
  if (!/^\d{2}$/.test(code.slice(5,7))) return `스타일번호 오류: ${code.slice(5,7)}`
  if (!COLOR.has(code.slice(7,9))) return `컬러코드 오류: ${code.slice(7,9)}`
  return null
}

function validateRow(row, idx) {
  const errors = []
  const codeErr = validateCode(row.label_code)
  if (codeErr) errors.push(`${idx+1}행: 라벨코드 ${codeErr}`)
  if (!row.release_qty || isNaN(Number(row.release_qty)) || Number(row.release_qty) <= 0)
    errors.push(`${idx+1}행: 주문량이 올바르지 않습니다`)
  if (!row.due_date)
    errors.push(`${idx+1}행: 납기일 형식 오류 (YYYY-MM-DD)`)
  return errors
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['라벨코드', '주문량(장)', '납기일'],
    ['W3MJW01NV', 5000, '2026-06-10'],
    ['W1WTC01BK', 3000, '2026-06-15'],
  ])
  ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '생산등록')
  XLSX.writeFile(wb, '생산등록_양식.xlsx')
}

// ── 기계 state 관리 ──────────────────────────────────
const LS_KEY      = 'label_machines_v1'
const PROD_LOG_KEY = 'label_prod_log_v1'   // 기계 초기화해도 유지되는 생산 이력
const SPEED       = 800 / 3600   // 장/초

function saveProdLog(labelCode, patch) {
  try {
    const log = JSON.parse(localStorage.getItem(PROD_LOG_KEY) || '{}')
    log[labelCode] = { ...(log[labelCode] || {}), ...patch }
    localStorage.setItem(PROD_LOG_KEY, JSON.stringify(log))
  } catch {}
}

const MACHINE_INIT = [1,2,3,4,5,6].map((i) => ({
  id: i, name: `인쇄기 ${i}호`, status: '대기중',
  label_code: null, total: 0, produced: 0,
  started_at: null, finished_at: null,
}))

function loadMachines() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return MACHINE_INIT
    return JSON.parse(raw).map((m) => {
      const started  = m.started_at  ? new Date(m.started_at)  : null
      const finished = m.finished_at ? new Date(m.finished_at) : null
      if (m.status === '가동중' && started) {
        const elapsed = (Date.now() - started.getTime()) / 1000
        const next = Math.min(m.produced + elapsed * SPEED, m.total)
        if (next >= m.total) {
          const finishedAt = new Date()
          // 다른 탭에 있는 동안 완료된 경우 → prod log에 즉시 저장
          if (m.label_code) saveProdLog(m.label_code, { finished_at: finishedAt.toISOString() })
          return { ...m, produced: m.total, status: '완료', started_at: started, finished_at: finishedAt }
        }
        return { ...m, produced: next, started_at: started, finished_at: null }
      }
      return { ...m, started_at: started, finished_at: finished }
    })
  } catch { return MACHINE_INIT }
}

export default function ProductionTab({ searched }) {
  const [releases, setReleases]     = useState([])
  const [showForm, setShowForm]     = useState(false)
  const [showExcel, setShowExcel]   = useState(false)
  const [form, setForm]             = useState({ label_code: '', release_qty: '', due_date: '' })
  const [validation, setValidation] = useState(null)

  const [previewRows, setPreviewRows]   = useState([])
  const [excelErrors, setExcelErrors]   = useState([])
  const [uploading, setUploading]       = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileRef = useRef(null)

  const [checked, setChecked]   = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  // 기계 state
  const [machines, setMachines]   = useState(loadMachines)
  const [selMachine, setSelMachine] = useState(null)
  const timers = useRef({})

  // machines 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(machines))
  }, [machines])

  // 마운트 시: 가동중 타이머 재시작 + 완료된 기계 prod log 동기화
  useEffect(() => {
    machines.forEach((m) => {
      if (m.status === '가동중' && m.produced < m.total) _startTimer(m.id)
      // 완료 상태인데 prod log에 누락된 경우 보정
      if (m.status === '완료' && m.label_code) {
        saveProdLog(m.label_code, {
          ...(m.started_at  ? { started_at:  new Date(m.started_at).toISOString()  } : {}),
          ...(m.finished_at ? { finished_at: new Date(m.finished_at).toISOString() } : {}),
        })
      }
    })
    return () => Object.values(timers.current).forEach(clearInterval)
  }, []) // eslint-disable-line

  const _startTimer = (id) => {
    if (timers.current[id]) return
    timers.current[id] = setInterval(() => {
      setMachines((prev) => prev.map((m) => {
        if (m.id !== id) return m
        const next = Math.min(m.produced + SPEED, m.total)
        if (next >= m.total) {
          clearInterval(timers.current[id]); delete timers.current[id]
          const finishedAt = new Date()
          if (m.label_code) saveProdLog(m.label_code, { finished_at: finishedAt.toISOString() })
          return { ...m, produced: m.total, status: '완료', finished_at: finishedAt }
        }
        return { ...m, produced: next }
      }))
    }, 1000)
  }

  const machineHandlers = {
    onStart: (id) => {
      const startTime = new Date()
      setMachines((prev) => {
        const m = prev.find((x) => x.id === id)
        if (m?.label_code) saveProdLog(m.label_code, { started_at: startTime.toISOString(), finished_at: null })
        return prev.map((x) => x.id === id ? { ...x, status: '가동중', started_at: startTime, finished_at: null } : x)
      })
      _startTimer(id)
    },
    onStop: (id) => {
      if (timers.current[id]) { clearInterval(timers.current[id]); delete timers.current[id] }
      setMachines((prev) => prev.map((m) => m.id === id ? { ...m, status: '대기중' } : m))
    },
    onReset: (id) => {
      if (timers.current[id]) { clearInterval(timers.current[id]); delete timers.current[id] }
      setMachines((prev) => prev.map((m) => m.id === id
        ? { ...m, produced: 0, status: '대기중', label_code: null, total: 0, started_at: null, finished_at: null } : m))
    },
    onAssign: (id, labelCode) => {
      if (timers.current[id]) { clearInterval(timers.current[id]); delete timers.current[id] }
      const rel = releases.find((r) => r.label_code === labelCode)
      setMachines((prev) => prev.map((m) => m.id === id ? {
        ...m, label_code: labelCode || null,
        total: rel ? rel.release_qty : 0,
        produced: 0, status: '대기중', started_at: null, finished_at: null,
      } : m))
      setSelMachine(null)
    },
    onStatusChange: (id, st) => {
      if (timers.current[id]) { clearInterval(timers.current[id]); delete timers.current[id] }
      setMachines((prev) => prev.map((m) => m.id === id ? { ...m, status: st, label_code: st === '점검중' ? null : m.label_code } : m))
      setSelMachine(null)
    },
    onSelectToggle: (id) => setSelMachine((prev) => prev === id ? null : id),
  }

  const fetchReleases = async () => {
    const res = await getReleases()
    setReleases(res.data.filter((r) => r.status === '생산중'))
  }

  useEffect(() => { fetchReleases() }, [])

  const toggleOne = (id) => setChecked((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => {
    if (checked.size === filtered.length) setChecked(new Set())
    else setChecked(new Set(filtered.map((r) => r.id)))
  }
  const handleDelete = async () => {
    if (checked.size === 0) return
    if (!confirm(`선택한 ${checked.size}건을 삭제하시겠습니까?`)) return
    setDeleting(true)
    try {
      await deleteReleasesBulk([...checked])
      setChecked(new Set())
      fetchReleases()
    } catch (err) {
      alert(err.response?.data?.detail || '삭제 실패')
    } finally { setDeleting(false) }
  }

  const handleValidate = async () => {
    if (!form.label_code) return
    try {
      const res = await validateLabelCode(form.label_code)
      setValidation(res.data)
    } catch { setValidation({ valid: false, message: '서버 오류' }) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createRelease({ ...form, release_qty: Number(form.release_qty) })
      setForm({ label_code: '', release_qty: '', due_date: '' })
      setValidation(null); setShowForm(false)
      fetchReleases()
    } catch (err) { alert(err.response?.data?.detail || '등록 실패') }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb   = XLSX.read(evt.target.result, { type: 'array', cellDates: true })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const dataRows = raw.slice(1).filter((r) => r.some((c) => c !== ''))
      const rows = dataRows.map((r) => ({
        label_code:  String(r[0] ?? '').trim().toUpperCase(),
        release_qty: r[1],
        due_date:    excelDateToISO(r[2]),
      }))
      const errors = rows.flatMap((row, i) => validateRow(row, i))
      setPreviewRows(rows)
      setExcelErrors(errors)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleUpload = async () => {
    if (excelErrors.length > 0 || previewRows.length === 0) return
    setUploading(true)
    let success = 0
    const failDetails = []
    for (const [i, row] of previewRows.entries()) {
      try {
        await createRelease({ ...row, release_qty: Number(row.release_qty) })
        success++
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || '알 수 없는 오류'
        failDetails.push(`${i+1}행 (${row.label_code}): ${msg}`)
      }
    }
    setUploading(false)
    setUploadResult({ success, fail: failDetails.length, failDetails })
    if (failDetails.length === 0) {
      setPreviewRows([]); setExcelErrors([])
      if (fileRef.current) fileRef.current.value = ''
    }
    fetchReleases()
  }

  const handleExcelClose = () => {
    setShowExcel(false); setPreviewRows([]); setExcelErrors([]); setUploadResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = searched
    ? releases.filter((r) => inRange(r.due_date, searched))
    : releases

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          라벨 생산
          {searched && <span className="ml-2 text-xs text-blue-500 font-normal">납기일 기준 필터 적용중</span>}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => { setShowExcel(!showExcel); setShowForm(false) }}
            className={`text-sm px-4 py-1.5 rounded border transition-colors ${
              showExcel ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-400 hover:bg-green-50'
            }`}>
            📂 엑셀 업로드
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowExcel(false) }}
            className="text-sm bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700">
            + 생산 등록
          </button>
        </div>
      </div>

      {/* 직접 등록 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border rounded p-4 space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">라벨코드 (9자리)</label>
              <div className="flex gap-1 mt-1">
                <input type="text" required maxLength={9} value={form.label_code}
                  onChange={(e) => { setForm({ ...form, label_code: e.target.value.toUpperCase() }); setValidation(null) }}
                  className="flex-1 border rounded px-2 py-1.5 font-mono uppercase" placeholder="W3MJW01NV" />
                <button type="button" onClick={handleValidate}
                  className="text-xs bg-gray-200 px-2 rounded hover:bg-gray-300">검증</button>
              </div>
              {validation && (
                <p className={`text-xs mt-1 ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {validation.valid ? '✅ ' : '❌ '}{validation.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500">주문량 (장)</label>
              <input type="number" required value={form.release_qty}
                onChange={(e) => setForm({ ...form, release_qty: e.target.value })}
                className="w-full border rounded px-2 py-1.5 mt-1" placeholder="수량" />
            </div>
            <div>
              <label className="text-xs text-gray-500">납기일</label>
              <input type="date" required value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border rounded px-2 py-1.5 mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setValidation(null) }}
              className="text-xs text-gray-500 hover:underline">취소</button>
            <button type="submit" className="text-xs bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700">등록</button>
          </div>
        </form>
      )}

      {/* 엑셀 업로드 패널 */}
      {showExcel && (
        <div className="border rounded p-4 bg-gray-50 space-y-4 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-700 mb-1">엑셀 일괄 생산 등록</p>
              <div className="text-xs text-gray-400 space-y-0.5 mt-1">
                <p>• 라벨코드: <span className="font-mono font-medium text-gray-600">9자리</span> (예: W3MJW01NV)</p>
                <p>• 주문량: 숫자 (장)</p>
                <p>• 납기일: <span className="font-medium text-gray-600">YYYY-MM-DD</span> 형식</p>
              </div>
            </div>
            <button onClick={downloadTemplate}
              className="text-xs bg-white border border-gray-300 text-gray-600 px-3 py-2 rounded hover:bg-gray-100 whitespace-nowrap">
              ⬇ 양식 다운로드
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-white border border-dashed border-gray-400 rounded px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:border-green-400 transition-colors">
              📄 파일 선택 (.xlsx, .xls)
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </label>
            {previewRows.length > 0 && (
              <span className="text-xs text-green-600">{previewRows.length}행 인식됨</span>
            )}
          </div>

          {excelErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700">❌ 아래 오류를 수정 후 다시 업로드하세요</p>
              {excelErrors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}

          {previewRows.length > 0 && excelErrors.length === 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">미리보기 (총 {previewRows.length}건)</p>
              <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      {['라벨코드', '주문량', '납기일'].map((h) => (
                        <th key={h} className="px-3 py-1.5 border text-gray-600 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 border font-mono font-semibold">{r.label_code}</td>
                        <td className="px-3 py-1.5 border">{Number(r.release_qty).toLocaleString()}장</td>
                        <td className="px-3 py-1.5 border">{r.due_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {uploadResult && (
            <div className={`rounded p-3 text-xs space-y-1 ${uploadResult.fail === 0 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
              <p>✅ 등록 완료: {uploadResult.success}건{uploadResult.fail > 0 && ` / ❌ 실패: ${uploadResult.fail}건`}</p>
              {uploadResult.failDetails?.map((d, i) => <p key={i} className="text-red-600">• {d}</p>)}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={handleExcelClose} className="text-xs text-gray-500 hover:underline">닫기</button>
            <button onClick={handleUpload}
              disabled={uploading || previewRows.length === 0 || excelErrors.length > 0}
              className="text-xs bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-40">
              {uploading ? '업로드 중...' : `${previewRows.length}건 업로드`}
            </button>
          </div>
        </div>
      )}

      {/* 생산중 목록 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">생산중 목록 ({filtered.length}건)</p>
          {checked.size > 0 && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-sm bg-red-500 text-white px-4 py-1.5 rounded hover:bg-red-600 disabled:opacity-50">
              {deleting ? '삭제 중...' : `선택 삭제 (${checked.size}건)`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-left">
                <th className="px-3 py-2 border w-10">
                  <input type="checkbox"
                    checked={filtered.length > 0 && checked.size === filtered.length}
                    onChange={toggleAll} className="cursor-pointer" />
                </th>
                <th className="px-4 py-2 border">라벨코드</th>
                <th className="px-4 py-2 border">주문량</th>
                <th className="px-4 py-2 border">납기일</th>
                <th className="px-4 py-2 border">D-day</th>
                <th className="px-4 py-2 border">시작 시간</th>
                <th className="px-4 py-2 border">완료 시간</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-400">생산중인 주문 없음</td></tr>
              )}
              {filtered.map((r) => {
                const d = Math.ceil((new Date(r.due_date) - new Date(today())) / 86400000)
                const mach = machines.find((m) => m.label_code === r.label_code)
                const produced = mach ? Math.floor(mach.produced) : 0
                const total    = r.release_qty
                const pct      = total > 0 ? Math.min((produced / total) * 100, 100) : 0
                return (
                  <tr key={r.id} onClick={() => toggleOne(r.id)}
                    className={`cursor-pointer hover:bg-gray-50 ${checked.has(r.id) ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2 border text-center">
                      <input type="checkbox" checked={checked.has(r.id)} onChange={() => toggleOne(r.id)}
                        onClick={(e) => e.stopPropagation()} className="cursor-pointer" />
                    </td>
                    <td className="px-4 py-2 border font-mono font-semibold">{r.label_code}</td>
                    <td className="px-4 py-2 border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={mach?.status === '가동중' ? 'text-green-700 font-semibold' : 'text-gray-700'}>
                            {produced.toLocaleString()} / {total.toLocaleString()}장
                          </span>
                        </div>
                        {mach && mach.total > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${mach.status === '완료' ? 'bg-blue-500' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{r.due_date}</td>
                    <td className="px-4 py-2 border">
                      <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                        d < 2 ? 'bg-red-100 text-red-700' : d < 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>D-{d}</span>
                    </td>
                    <td className="px-4 py-2 border text-xs text-gray-500">
                      {mach?.started_at ? new Date(mach.started_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-4 py-2 border text-xs">
                      {mach?.finished_at
                        ? <span className="text-blue-600 font-medium">{new Date(mach.finished_at).toLocaleString('ko-KR')}</span>
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 기계 배치 */}
      <div className="border rounded-xl p-5 bg-gray-50">
        <MachineLayout
          machines={machines}
          releases={filtered}
          selected={selMachine}
          {...machineHandlers}
        />
      </div>

    </div>
  )
}
