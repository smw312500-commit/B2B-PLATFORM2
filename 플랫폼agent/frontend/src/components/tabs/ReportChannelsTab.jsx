import { useEffect, useMemo, useState } from 'react'
import { getReportChannelMessages, getReportChannels } from '../../api'

const STATUS_CLS = {
  출고완료: 'bg-emerald-100 text-emerald-700',
  진행중: 'bg-sky-100 text-sky-700',
  재조정: 'bg-amber-100 text-amber-800',
  입고완료: 'bg-indigo-100 text-indigo-700',
  완료: 'bg-emerald-100 text-emerald-700',
  미매칭: 'bg-rose-100 text-rose-700',
  전송완료: 'bg-blue-100 text-blue-700',
  전송실패: 'bg-rose-100 text-rose-700',
}

function formatDateTime(value) {
  if (!value) return '시각 없음'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16)
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function EventChip({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {children}
    </span>
  )
}

function StatusBadge({ status }) {
  if (!status) return null

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

function MessageCard({ message }) {
  const isOutbound = message.direction === 'outbound'

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-full max-w-3xl rounded-2xl border px-4 py-3 shadow-sm ${
        isOutbound
          ? 'border-blue-200 bg-blue-50/90'
          : 'border-slate-200 bg-white'
      }`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <EventChip>{isOutbound ? '플랫폼 발신' : 'Agent 수신'}</EventChip>
          <EventChip>{message.event_type}</EventChip>
          {message.related_code && <EventChip>{message.related_code}</EventChip>}
          <StatusBadge status={message.status} />
          <span className="ml-auto text-[11px] text-slate-400">{formatDateTime(message.created_at)}</span>
        </div>

        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{message.source_agent}</span>
          <span>→</span>
          <span className="font-semibold text-slate-700">{message.target_agent}</span>
        </div>

        <h3 className="text-sm font-semibold text-slate-800">{message.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{message.summary}</p>

        {message.payload_json && (
          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-950/95 p-3 text-xs text-slate-100">
            <summary className="cursor-pointer select-none text-slate-300">원본 API payload</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all leading-5">
              {JSON.stringify(message.payload_json, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default function ReportChannelsTab() {
  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState('label')
  const [messages, setMessages] = useState([])

  useEffect(() => {
    let alive = true

    const loadChannels = async () => {
      try {
        const response = await getReportChannels()
        if (!alive) return
        setChannels(response.data)
        setActiveChannel((current) => {
          if (response.data.some((channel) => channel.channel === current)) return current
          return response.data[0]?.channel || current
        })
      } catch {}
    }

    loadChannels()
    const timer = setInterval(loadChannels, 30000)

    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!activeChannel) return

    let alive = true

    const loadMessages = async () => {
      try {
        const response = await getReportChannelMessages(activeChannel)
        if (!alive) return
        setMessages(response.data)
      } catch {
        if (alive) setMessages([])
      }
    }

    loadMessages()
    const timer = setInterval(loadMessages, 15000)

    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [activeChannel])

  const activeInfo = useMemo(
    () => channels.find((channel) => channel.channel === activeChannel),
    [activeChannel, channels],
  )

  return (
    <div className="grid min-h-[720px] grid-cols-[280px_minmax(0,1fr)] gap-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Agent Channels</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-800">1:1 보고 채널</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">플랫폼이 받은 API 보고 이벤트만 채널별로 표시합니다.</p>
        </div>

        <div className="divide-y divide-slate-100">
          {channels.map((channel) => {
            const active = channel.channel === activeChannel
            return (
              <button
                key={channel.channel}
                onClick={() => setActiveChannel(channel.channel)}
                className={`w-full px-4 py-4 text-left transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-800'}`}>{channel.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {channel.message_count}건
                  </span>
                </div>
                <p className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{channel.last_summary || '아직 기록 없음'}</p>
                <p className={`mt-2 text-[11px] ${active ? 'text-slate-400' : 'text-slate-400'}`}>
                  {channel.last_message_at ? formatDateTime(channel.last_message_at) : '기록 없음'}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm">
        <div className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Current Channel</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-800">{activeInfo?.label || '보고 채널'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeInfo ? `${activeInfo.counterparty} agent와 플랫폼 간 API 보고 이벤트 타임라인` : '채널을 선택하세요.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Messages</p>
              <p className="text-2xl font-semibold text-slate-800">{activeInfo?.message_count ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-600">이 채널에 아직 기록된 보고 이벤트가 없습니다.</p>
              <p className="mt-2 text-xs text-slate-400">기존 API를 통해 이벤트가 들어오면 여기 타임라인에 자동으로 쌓입니다.</p>
            </div>
          )}

          {messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
        </div>
      </section>
    </div>
  )
}
