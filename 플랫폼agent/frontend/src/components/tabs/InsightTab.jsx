import { useEffect, useState } from 'react'
import { getInsights, analyzeInsights } from '../../api'

const TYPE_STYLE = {
  납기위험:   { card: 'border-red-300 bg-red-50',    badge: 'bg-red-500 text-white',    icon: '🚨' },
  트렌드:     { card: 'border-purple-300 bg-purple-50', badge: 'bg-purple-500 text-white', icon: '📈' },
  물류최적화: { card: 'border-blue-300 bg-blue-50',   badge: 'bg-blue-500 text-white',   icon: '🚛' },
}

function InsightCard({ ins }) {
  const style = TYPE_STYLE[ins.insight_type] ?? {
    card: 'border-gray-200 bg-gray-50', badge: 'bg-gray-400 text-white', icon: '💡',
  }
  return (
    <div className={`border rounded-xl p-4 ${style.card}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{style.icon}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style.badge}`}>
            {ins.insight_type}
          </span>
          {ins.related_code && (
            <span className="font-mono text-xs bg-white/60 px-2 py-0.5 rounded border border-gray-200">
              {ins.related_code}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {ins.created_at ? ins.created_at.slice(0, 16).replace('T', ' ') : ''}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{ins.content}</p>
    </div>
  )
}

export default function InsightTab() {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    getInsights().then(r => setInsights(r.data)).catch(() => {})
  }

  useEffect(load, [])

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    try {
      await analyzeInsights()
      load()
    } catch (err) {
      const msg = err.response?.data?.detail || '분석 실패'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 분석 버튼 */}
      <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">AI 인사이트 분석</p>
          <p className="text-xs text-gray-400 mt-0.5">최근 30일 데이터 기반 GPT 분석 — 납기위험 / 트렌드 / 물류최적화</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              분석 중...
            </>
          ) : '✦ 인사이트 분석'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* 인사이트 목록 */}
      <div className="space-y-3">
        {insights.length === 0 && !loading && (
          <div className="text-center text-gray-400 text-sm py-10">
            인사이트가 없습니다. 위 버튼으로 분석을 시작하세요.
          </div>
        )}
        {insights.map(ins => <InsightCard key={ins.id} ins={ins} />)}
      </div>
    </div>
  )
}
