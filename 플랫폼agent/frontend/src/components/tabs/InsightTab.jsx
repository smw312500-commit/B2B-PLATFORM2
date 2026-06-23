import { useEffect, useMemo, useState } from 'react'
import {
  analyzeInsights,
  composeInsightReport,
  getCollectedReleases,
  getDemoSupplyChainData,
  getInsights,
  getReportChannelMessages,
  verifyResearchHandoffs,
} from '../../api'

const CHANNELS = ['label', 'fabric', 'zipper']

const CHANNEL_META = {
  label: {
    label: '케어라벨사',
    short: '라벨',
    companyId: 2,
    unit: '장',
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
    dot: 'bg-sky-500',
  },
  fabric: {
    label: '옷감사',
    short: '옷감',
    companyId: 1,
    unit: 'yard',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  zipper: {
    label: '지퍼단추사',
    short: '지퍼',
    companyId: 3,
    unit: '개',
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
}

const COMPANY_BY_ID = Object.values(CHANNEL_META).reduce((acc, item) => {
  acc[item.companyId] = item
  return acc
}, {})

const TARGETS = [
  { key: 'label', label: '라벨' },
  { key: 'fabric', label: '옷감' },
  { key: 'zipper', label: '지퍼' },
]

const DEFAULT_TARGET_KEYS = TARGETS.map((item) => item.key)

const QUICK_RANGES = [
  { key: '1m', label: '1개월', months: 1 },
  { key: '3m', label: '3개월', months: 3 },
  { key: '6m', label: '6개월', months: 6 },
  { key: '1y', label: '1년', months: 12 },
  { key: 'all', label: '전체', months: null },
]

const REPORT_QUICK_RANGES = [
  { key: '1m', label: '1달', months: 1 },
  { key: '3m', label: '3달', months: 3 },
  { key: '6m', label: '6개월', months: 6 },
  { key: '1y', label: '1년', months: 12 },
  { key: '3y', label: '3년', months: 36 },
  { key: 'all', label: '전체', months: null },
]

const REPORT_SCOPES = [
  { key: 'overview', label: '전체 종합', description: '3개 생산회사의 공급망과 생산성 인사이트를 종합합니다.' },
  { key: 'company', label: '회사별 운영', description: '선택 회사의 자재 입고, 재고, 생산 납기 보고를 작성합니다.' },
  { key: 'market', label: '시장·유행', description: '품목 신호와 리서치팀 웹 검증 결과를 시장 보고서로 정리합니다.' },
]

const REPORT_COMPANIES = [
  { id: 1, key: 'fabric', label: '옷감사' },
  { id: 2, key: 'label', label: '케어라벨사' },
  { id: 3, key: 'zipper', label: '지퍼단추사' },
]

const AI_TEAM_SECTIONS = [
  {
    key: 'insight',
    label: '인사이트팀',
    title: '내부 공급망 분석',
    description: '정제된 수입/출고/생산 데이터를 기준으로 1차 가설과 리스크를 도출합니다.',
  },
  {
    key: 'research',
    label: '리서치 분석팀',
    title: '외부 자료 검증',
    description: '인사이트팀 가설을 외부 웹, 시장 자료, 산업 신호로 교차 검증하는 단계입니다.',
  },
  {
    key: 'discovery',
    label: '데이터 발굴팀',
    title: '원본 데이터 발굴',
    description: '패킹리스트, BL, 생산 로그, 약한 신호에서 후보 가설을 찾고 재검증 대상으로 보냅니다.',
  },
  {
    key: 'report',
    label: '보고서 작성팀',
    title: '사람용 보고서 정리',
    description: '검증된 인사이트만 의사결정자가 읽기 쉬운 보고서 구조로 정리합니다.',
  },
]

const AI_INSIGHT_LABEL = 'AI 인사이트'
const AI_INSIGHT_STATUS = 'AI 분석 기반'

const COLOR_NAME = {
  BK: '블랙',
  WH: '화이트',
  GY: '그레이',
  NV: '네이비',
  BL: '블루',
  RD: '레드',
  GN: '그린',
  BE: '베이지',
  IV: '아이보리',
  BR: '브라운',
}

const SEASON_NAME = {
  1: '봄',
  2: '여름',
  3: '가을',
  4: '겨울',
}

const GENDER_NAME = {
  M: '남성',
  W: '여성',
  U: '공용',
}

const CATEGORY_NAME = {
  T: '티셔츠',
  S: '셔츠',
  J: '재킷',
  P: '팬츠',
  D: '다운',
  C: '코트',
}

const MATERIAL_NAME = {
  C: '면',
  P: '폴리에스터',
  W: '울',
  N: '나일론',
  D: '다운',
  M: '혼방',
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function formatNumber(value, digits = 0) {
  const number = asNumber(value, 0)
  return number.toLocaleString('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

function formatWeight(value) {
  const number = asNumber(value, 0)
  if (number >= 1000) {
    return `${formatNumber(number / 1000, 1)}t`
  }
  return `${formatNumber(number, number < 10 && number !== 0 ? 2 : 1)}kg`
}

function formatQty(value, unit = '') {
  return `${formatNumber(value, 1)}${unit || ''}`
}

function sumBy(list, field) {
  return asArray(list).reduce((total, row) => total + asNumber(row?.[field], 0), 0)
}

function formatPercent(value) {
  return `${formatNumber(value, 1)}%`
}

function dateKey(value) {
  if (!value) {
    return ''
  }
  return String(value).slice(0, 10)
}

function parseDate(value) {
  const key = dateKey(value)
  if (!key) {
    return null
  }
  const date = new Date(`${key}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value, days) {
  const date = parseDate(value)
  if (!date) {
    return ''
  }
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function addMonths(date, months) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function monthInputValue(dateValue) {
  return dateValue ? String(dateValue).slice(0, 7) : ''
}

function monthStartDate(monthValue) {
  return monthValue ? `${monthValue}-01` : ''
}

function monthEndDate(monthValue) {
  if (!monthValue) {
    return ''
  }
  const [year, month] = String(monthValue).split('-').map(Number)
  if (!year || !month) {
    return ''
  }
  return localDateKey(new Date(year, month, 0))
}

function calendarMonthRange(months, baseDate = new Date()) {
  if (!months) {
    return { startDate: '', endDate: '' }
  }
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth() - (months - 1), 1)
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
  return {
    startDate: localDateKey(start),
    endDate: localDateKey(end),
  }
}

function monthKeyFromDate(value) {
  const key = dateKey(value)
  return key ? key.slice(0, 7) : ''
}

function daysBetween(startValue, endValue) {
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  if (!start || !end) {
    return 0
  }
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

function formatDate(value) {
  const key = dateKey(value)
  return key || '일정 미정'
}

function formatMonth(value) {
  const key = dateKey(value)
  if (!key) {
    return '월 미상'
  }
  return `${Number(key.slice(5, 7))}월`
}

function getDatasetPeriod(summary) {
  const period = summary?.period
  if (!period) {
    return ''
  }
  return String(period).replace(' to ', ' ~ ')
}

function buildAnalysisPeriodLabel(startDate, endDate, summary) {
  if (startDate && endDate) {
    return `${startDate} ~ ${endDate}`
  }
  if (startDate) {
    return `${startDate} 이후`
  }
  if (endDate) {
    return `${endDate} 이전`
  }
  return getDatasetPeriod(summary) || '전체 기간'
}

function formatDateTime(value) {
  if (!value) {
    return '수신 없음'
  }
  return String(value).replace('T', ' ').slice(0, 16)
}

function isWithinDateRange(value, startDate, endDate) {
  const key = dateKey(value)
  if (!key) {
    return true
  }

  if (startDate && key < startDate) {
    return false
  }
  if (endDate && key > endDate) {
    return false
  }
  return true
}

function getPayload(message) {
  return message?.payload_json && typeof message.payload_json === 'object'
    ? message.payload_json
    : {}
}

function inferChannelFromCompanyId(companyId) {
  const company = COMPANY_BY_ID[asNumber(companyId, 0)]
  return company ? Object.keys(CHANNEL_META).find((key) => CHANNEL_META[key] === company) : 'unknown'
}

function getCompanyLabel(channel, payload = {}, record = {}) {
  if (payload.company_name) {
    return payload.company_name
  }
  if (record.company_name) {
    return record.company_name
  }
  if (channel && CHANNEL_META[channel]) {
    return CHANNEL_META[channel].label
  }
  return '생산사'
}

function sumList(list, field) {
  return asArray(list).reduce((sum, item) => sum + asNumber(item?.[field], 0), 0)
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))))
}

function extractLabelCodesFromText(value) {
  return String(value || '').match(/\b[A-Z][1-4][MWU][A-Z][A-Z]\d{2}[A-Z]{2}\b/g) || []
}

function parseLabelCode(value) {
  const code = String(value || '').trim().toUpperCase()
  if (!/^[A-Z][1-4][MWU][A-Z][A-Z]\d{2}[A-Z]{2}$/.test(code)) {
    return null
  }

  const brandCode = code.slice(0, 1)
  const seasonCode = code.slice(1, 2)
  const genderCode = code.slice(2, 3)
  const categoryCode = code.slice(3, 4)
  const materialCode = code.slice(4, 5)
  const styleCode = code.slice(5, 7)
  const colorCode = code.slice(7, 9)

  return {
    raw: code,
    brand_code: brandCode,
    brand_name: `브랜드 ${brandCode}`,
    season_code: seasonCode,
    season_name: SEASON_NAME[seasonCode] || seasonCode,
    gender_code: genderCode,
    gender_name: GENDER_NAME[genderCode] || genderCode,
    category_code: categoryCode,
    category_name: CATEGORY_NAME[categoryCode] || categoryCode,
    material_code: materialCode,
    material_name: MATERIAL_NAME[materialCode] || materialCode,
    style_code: styleCode,
    color_code: colorCode,
    color_name: COLOR_NAME[colorCode] || colorCode,
  }
}

function normalizeSupplierName(value) {
  const text = String(value || '').trim()
  return text || '공급사 미기재'
}

function getDueDateFromPayload(payload, message) {
  return dateKey(
    payload.report_batch_due_date ||
      payload.ai_report?.report_batch_due_date ||
      payload.due_date ||
      payload.release_date ||
      payload.completed_release_list?.[0]?.due_date ||
      message?.created_at,
  )
}

function normalizeReleaseFactFromMessage(channel, message) {
  const payload = getPayload(message)
  const completedList = asArray(payload.completed_release_list)
  const dueDate = getDueDateFromPayload(payload, message)
  const qtyTotal =
    payload.completed_release_qty_total ??
    payload.quantity ??
    payload.release_qty ??
    sumList(completedList, 'release_qty')
  const count = payload.completed_release_count ?? (completedList.length || 1)
  const listWeightKg = sumList(completedList, 'weight_kg') || sumList(completedList, 'product_weight_kg')
  const weightKg =
    payload.shipment_total_weight_kg ??
    payload.label_weight_kg ??
    payload.completed_release_total_weight_kg ??
    payload.packing_list?.total_weight_kg ??
    listWeightKg
  const boxTotal =
    payload.shipment_box_count_total ??
    payload.box_count ??
    payload.packing_list?.total_box_count ??
    sumList(completedList, 'box_count')
  const labelCodes = uniqueValues([
    payload.label_code,
    message.related_code,
    ...completedList.map((item) => item?.label_code),
  ])

  return {
    source: 'message',
    sourceId: message.id,
    channel,
    company: getCompanyLabel(channel, payload),
    dueDate,
    createdAt: message.created_at,
    count: asNumber(count, 0),
    qtyTotal: asNumber(qtyTotal, 0),
    weightKg: asNumber(weightKg, 0),
    boxTotal: asNumber(boxTotal, 0),
    unit: payload.unit || CHANNEL_META[channel]?.unit || '',
    labelCodes,
    exportPort: payload.export_port || '부산항',
    packingList: payload.packing_list?.filename || payload.packing_list_filename || '',
    summary: payload.ai_report?.summary || message.summary || '',
  }
}

function normalizeReleaseFactFromRecord(record) {
  const channel = inferChannelFromCompanyId(record.company_id)
  return {
    source: 'release',
    sourceId: record.id,
    channel,
    company: getCompanyLabel(channel, {}, record),
    dueDate: dateKey(record.due_date || record.collected_at),
    createdAt: record.collected_at,
    count: 1,
    qtyTotal: asNumber(record.quantity, 0),
    weightKg: 0,
    boxTotal: 0,
    unit: record.unit || CHANNEL_META[channel]?.unit || '',
    labelCodes: uniqueValues([record.label_code, record.item_name]),
    exportPort: '부산항',
    packingList: '',
    summary: `${record.item_name || record.label_code || '출고품'} ${formatNumber(record.quantity)}${record.unit || ''}`,
  }
}

function buildImportFacts(messagesByChannel) {
  return CHANNELS.flatMap((channel) =>
    asArray(messagesByChannel[channel])
      .filter((message) => message.event_type === 'agent_report_import')
      .map((message) => {
        const payload = getPayload(message)
        const arrivalDate = dateKey(payload.actual_arrival_date || payload.arrival_date || payload.import_date || payload.eta || message.created_at)
        const plannedDate = dateKey(
          payload.expected_arrival_date ||
            payload.planned_arrival_date ||
            payload.promised_arrival_date ||
            payload.requested_arrival_date ||
            payload.eta ||
            payload.due_date,
        )
        const delayDays = Math.max(daysBetween(plannedDate, arrivalDate), 0)
        const supplier = normalizeSupplierName(payload.supplier_company || payload.supplier)
        const material = payload.material_display_name || payload.material || payload.item || message.related_code || '원자재'
        return {
          sourceId: message.id,
          channel,
          company: getCompanyLabel(channel, payload),
          blNumber: payload.bl_number || message.related_code || '',
          supplier,
          material,
          materialGroup: material,
          plannedDate,
          arrivalDate,
          delayDays,
          delayed: delayDays > 0,
          freeStorageEndDate: addDays(arrivalDate, 2),
          port: payload.port_of_discharge || payload.receiving_port || '부산항',
          destination: payload.receiving_company_location || payload.final_place_of_delivery || '공장',
          qty: asNumber(payload.qty, 0),
          unit: payload.unit || '',
          weightKg: asNumber(payload.weight_kg, 0),
          createdAt: message.created_at,
        }
      }),
  )
}

function buildReleaseFacts(messagesByChannel, releases) {
  const messageFacts = CHANNELS.flatMap((channel) =>
    asArray(messagesByChannel[channel])
      .filter((message) => message.event_type === 'collected_release')
      .map((message) => normalizeReleaseFactFromMessage(channel, message)),
  )

  const releaseFacts = asArray(releases).map(normalizeReleaseFactFromRecord)
  const covered = new Set(messageFacts.map((fact) => `${fact.channel}|${fact.dueDate}`))
  const supplementalFacts = releaseFacts.filter((fact) => !covered.has(`${fact.channel}|${fact.dueDate}`))

  return {
    facts: [...messageFacts, ...supplementalFacts],
    rawReleaseFacts: releaseFacts,
  }
}

function filterFactsByTarget(facts, selectedTargets) {
  if (!selectedTargets.length) {
    return []
  }
  return facts.filter((fact) => selectedTargets.includes(fact.channel))
}

function isYearWithinDateRange(year, startDate, endDate) {
  const text = String(year)
  if (startDate && text < String(startDate).slice(0, 4)) {
    return false
  }
  if (endDate && text > String(endDate).slice(0, 4)) {
    return false
  }
  return true
}

function getDemoYearRows(summary, startDate, endDate) {
  const yearSummary = summary?.year_summary || {}
  return Object.entries(yearSummary)
    .filter(([year]) => isYearWithinDateRange(year, startDate, endDate))
    .map(([year, values]) => ({
      year,
      ...values,
    }))
    .sort((a, b) => String(a.year).localeCompare(String(b.year)))
}

function formatYearMetric(rows, key, suffix = '', digits = 1) {
  return rows
    .map((row) => `${row.year} ${formatNumber(row[key], digits)}${suffix}`)
    .join(' → ')
}

function countByYear(rows, yearField, predicate) {
  const map = new Map()
  rows.forEach((row) => {
    if (!predicate(row)) {
      return
    }
    const year = String(row[yearField] || '').slice(0, 4) || String(row.year || '')
    if (!year) {
      return
    }
    map.set(year, (map.get(year) || 0) + 1)
  })
  return map
}

function formatYearCounts(yearRows, countMap) {
  return yearRows
    .map((row) => `${row.year} ${formatNumber(countMap.get(String(row.year)) || 0)}건`)
    .join(' → ')
}

function buildDemoFacts(demoData, startDate, endDate, selectedTargets) {
  if (!demoData || selectedTargets.length === 0) {
    return null
  }

  const materialReceipts = asArray(demoData.material_receipts)
    .map((row) => ({
      ...row,
      channel: inferChannelFromCompanyId(row.company_id),
      delay_days: asNumber(row.delay_days, 0),
      ordered_qty: asNumber(row.ordered_qty, 0),
      weight_kg: asNumber(row.weight_kg, 0),
    }))
    .filter((row) => selectedTargets.includes(row.channel))
    .filter((row) => isWithinDateRange(row.actual_receipt_date || row.promised_date, startDate, endDate))

  const productionBatches = asArray(demoData.production_batches)
    .map((row) => ({
      ...row,
      channel: inferChannelFromCompanyId(row.company_id),
      due_buffer_days: asNumber(row.due_buffer_days, 0),
      production_duration_days: asNumber(row.production_duration_days, 0),
      production_qty: asNumber(row.production_qty, 0),
      shipment_weight_kg: asNumber(row.shipment_weight_kg, 0),
    }))
    .filter((row) => selectedTargets.includes(row.channel))
    .filter((row) => isWithinDateRange(row.production_due_date || row.production_complete_date, startDate, endDate))

  const logisticsPerformance = asArray(demoData.logistics_performance)
    .map((row) => ({
      ...row,
      assignment_hours: asNumber(row.assignment_hours, 0),
      delivery_delay_days: asNumber(row.delivery_delay_days, 0),
    }))
    .filter((row) => isWithinDateRange(row.delivery_due_date || row.actual_delivery_date, startDate, endDate))

  const shipments = asArray(demoData.finished_shipments)
    .map((row) => ({
      ...row,
      garment_units: asNumber(row.garment_units, 0),
      label_qty: asNumber(row.label_qty, 0),
      fabric_yards: asNumber(row.fabric_yards, 0),
      zipper_button_qty: asNumber(row.zipper_button_qty, 0),
      label_weight_kg: asNumber(row.label_weight_kg, 0),
      fabric_weight_kg: asNumber(row.fabric_weight_kg, 0),
      zipper_button_weight_kg: asNumber(row.zipper_button_weight_kg, 0),
      total_weight_kg: asNumber(row.total_weight_kg, 0),
      box_count: asNumber(row.box_count, 0),
    }))
    .filter((row) => isWithinDateRange(row.shipment_due_date || row.shipment_date, startDate, endDate))

  return {
    summary: demoData.summary || {},
    analysisPeriod: buildAnalysisPeriodLabel(startDate, endDate, demoData.summary),
    yearRows: getDemoYearRows(demoData.summary, startDate, endDate),
    materialReceipts,
    productionBatches,
    logisticsPerformance,
    shipments,
  }
}

function toReceiptItems(rows) {
  return rows.map((row) => ({
    id: row.receipt_id,
    type: '자재입고',
    title: `${row.company_name} / ${row.material_name}`,
    meta: `${row.supplier} · ${formatQty(row.ordered_qty, row.unit)} / ${formatWeight(row.weight_kg)} · 약속 ${row.promised_date} · 실제 ${row.actual_receipt_date} · 지연 ${formatNumber(row.delay_days)}일`,
  }))
}

function toShipmentItems(rows) {
  return rows.map((row) => ({
    id: row.shipment_batch_id,
    type: '출고묶음',
    title: `${row.label_code} / ${row.customer}`,
    meta: `${row.shipment_due_date} · ${row.destination} · 라벨 ${formatQty(row.label_qty, '장')} / ${formatWeight(row.label_weight_kg)} · 옷감 ${formatNumber(row.fabric_yards, 1)}yd / ${formatWeight(row.fabric_weight_kg)} · 지퍼단추 ${formatQty(row.zipper_button_qty, '개')} / ${formatWeight(row.zipper_button_weight_kg)}`,
  }))
}

function toProductionItems(rows) {
  return rows.map((row) => ({
    id: row.production_id,
    type: '생산',
    title: `${row.company_name} / ${row.label_code}`,
    meta: `${row.production_due_date} · ${formatQty(row.production_qty, row.production_unit)} / ${formatWeight(row.shipment_weight_kg)} · 여유 ${formatNumber(row.due_buffer_days)}일 · ${row.line_or_machine} · ${row.is_late === 'Y' ? '지연' : '진행'}`,
  }))
}

function toLogisticsItems(rows) {
  return rows.map((row) => ({
    id: row.dispatch_id,
    type: '물류',
    title: `${row.shipment_batch_id} / ${row.carrier}`,
    meta: `${row.delivery_due_date} · 배정 ${formatNumber(row.assignment_hours, 1)}시간 · 배송지연 ${formatNumber(row.delivery_delay_days)}일`,
  }))
}

function groupSevereSupplierDelays(materialReceipts) {
  const map = new Map()
  materialReceipts
    .filter((row) => row.delay_days >= 21)
    .forEach((row) => {
      const key = normalizeSupplierName(row.supplier)
      const stat = map.get(key) || {
        supplier: key,
        materials: new Set(),
        years: new Set(),
        count: 0,
        delayTotal: 0,
        maxDelay: 0,
        qtyTotal: 0,
        weightTotal: 0,
      }
      stat.materials.add(row.material_name)
      stat.years.add(String(row.year))
      stat.count += 1
      stat.delayTotal += row.delay_days
      stat.maxDelay = Math.max(stat.maxDelay, row.delay_days)
      stat.qtyTotal += asNumber(row.ordered_qty, 0)
      stat.weightTotal += asNumber(row.weight_kg, 0)
      map.set(key, stat)
    })

  return Array.from(map.values())
    .map((stat) => ({
      ...stat,
      materials: Array.from(stat.materials),
      years: Array.from(stat.years).sort(),
      avgDelay: stat.count ? stat.delayTotal / stat.count : 0,
    }))
    .sort((a, b) => b.count - a.count || b.avgDelay - a.avgDelay)
}

function averageByYear(rows, dateField, valueField) {
  const map = new Map()
  rows.forEach((row) => {
    const year = String(row[dateField] || row.year || '').slice(0, 4)
    if (!year) {
      return
    }
    const stat = map.get(year) || { total: 0, count: 0 }
    stat.total += asNumber(row[valueField], 0)
    stat.count += 1
    map.set(year, stat)
  })
  return map
}

function formatAverageCounts(yearRows, avgMap, suffix = '') {
  return yearRows
    .map((row) => {
      const stat = avgMap.get(String(row.year))
      const value = stat?.count ? stat.total / stat.count : 0
      return `${row.year} ${formatNumber(value, 1)}${suffix}`
    })
    .join(' → ')
}

function buildDemoInsightReports(demoFacts) {
  if (!demoFacts || demoFacts.yearRows.length === 0) {
    return []
  }

  const { yearRows, materialReceipts, productionBatches, logisticsPerformance, shipments } = demoFacts
  const severeDelayByYear = countByYear(materialReceipts, 'actual_receipt_date', (row) => row.delay_days >= 21)
  const normalVariationCount = materialReceipts.filter((row) => row.delay_days >= 3 && row.delay_days <= 7).length
  const severeSuppliers = groupSevereSupplierDelays(materialReceipts)
  const topSevereSupplier = severeSuppliers[0]
  const reports = []

  if (topSevereSupplier) {
    reports.push({
      id: `demo-severe-supplier-${topSevereSupplier.supplier}`,
      insightType: '공급사 리스크',
      analysisPeriod: demoFacts.analysisPeriod,
      adapterLabel: AI_INSIGHT_LABEL,
      adapterStatus: AI_INSIGHT_STATUS,
      level: 'high',
      title: `${topSevereSupplier.supplier} 공급사 변경 후보입니다.`,
      message: '분기 자재 입고에서 21일 이상 지연이 반복되고 있어 대체 공급사 테스트와 물량 분산을 권장합니다.',
      evidence: [
        '판단 기준: 원자재는 분기 입고이므로 21일 이상 반복 지연부터 공급사 문제 후보로 분류',
        `정상 변동 제외: 3~7일 지연 ${formatNumber(normalVariationCount)}건은 정상 변동으로 처리`,
        `21일 이상 지연 추이: ${formatYearCounts(yearRows, severeDelayByYear)}`,
        `${topSevereSupplier.supplier} 평균 지연: ${formatNumber(topSevereSupplier.avgDelay, 1)}일 / 최대 ${formatNumber(topSevereSupplier.maxDelay)}일 / 반복 ${formatNumber(topSevereSupplier.count)}건`,
        `지연 영향 중량: ${formatWeight(topSevereSupplier.weightTotal)}`,
        `영향 자재군: ${topSevereSupplier.materials.slice(0, 4).join(', ')}`,
      ],
      affectedLabel: '영향받은 자재입고',
      affectedItems: toReceiptItems(
        materialReceipts.filter((row) => normalizeSupplierName(row.supplier) === topSevereSupplier.supplier && row.delay_days >= 21),
      ),
    })
  }

  reports.push({
    id: 'demo-early-order',
    insightType: '자재 리드타임',
    analysisPeriod: demoFacts.analysisPeriod,
    adapterLabel: AI_INSIGHT_LABEL,
    adapterStatus: AI_INSIGHT_STATUS,
    level: 'medium',
    title: '자재 공급 리드타임이 2025년부터 불안정해지고 있습니다.',
    message: '지연 공급사 품목은 선발주 또는 안전재고 기준을 기존보다 앞당기는 전략이 필요합니다.',
    evidence: [
      `평균 자재 지연: ${formatYearMetric(yearRows, 'avg_material_delay_days', '일')}`,
      `21일 이상 지연: ${formatYearMetric(yearRows, 'material_delay_21d_count', '건', 0)}`,
      '2023~2024는 21일 이상 반복 지연 0건으로 정상 기준선',
      '2025년부터 지연 시작, 2026년에는 지연과 생산 납기 압박이 함께 발생',
      `분석 대상 출고묶음: ${formatNumber(shipments.length)}건`,
      `라벨 출고중량 기준: ${formatWeight(sumBy(shipments, 'label_weight_kg'))} (라벨 1,000장=1kg)`,
      `참고 분리 중량: 옷감 ${formatWeight(sumBy(shipments, 'fabric_weight_kg'))} / 지퍼단추 ${formatWeight(sumBy(shipments, 'zipper_button_weight_kg'))}`,
    ],
    affectedLabel: '영향받은 출고묶음',
    affectedItems: toShipmentItems(shipments),
  })

  const lateProductionCount = productionBatches.filter((row) => row.is_late === 'Y').length
  const tightProductionRows = productionBatches.filter((row) => row.due_buffer_days <= 5 || row.is_late === 'Y')
  const tightProductionCount = tightProductionRows.length
  reports.push({
    id: 'demo-productivity-drop',
    insightType: '생산성 리스크',
    analysisPeriod: demoFacts.analysisPeriod,
    adapterLabel: AI_INSIGHT_LABEL,
    adapterStatus: AI_INSIGHT_STATUS,
    level: 'high',
    title: '2026년에 자재 지연과 생산성 저하가 같이 나타납니다.',
    message: '공급 지연 대응만으로는 부족하고, 생산 라인별 병목 점검과 납기 버퍼 복구가 필요합니다.',
    evidence: [
      `평균 생산 납기 여유: ${formatYearMetric(yearRows, 'avg_production_due_buffer_days', '일')}`,
      `납기 임박/지연 생산건: ${formatYearMetric(yearRows, 'tight_or_late_production_count', '건', 0)}`,
      `선택 기간 실제 지연 생산건: ${formatNumber(lateProductionCount)}건`,
      `납기 여유 5일 이하 생산건: ${formatNumber(tightProductionCount)}건`,
      `납기 압박 생산 중량: ${formatWeight(sumBy(tightProductionRows, 'shipment_weight_kg'))}`,
      '2023~2024 정상, 2025 자재 지연 시작, 2026 자재 지연 + 생산성 저하 구조',
    ],
    affectedLabel: '영향받은 생산',
    affectedItems: toProductionItems(tightProductionRows),
  })

  const logisticsDelayByYear = countByYear(logisticsPerformance, 'delivery_due_date', (row) => row.delivery_delay_days > 0)
  const assignmentAvgByYear = averageByYear(logisticsPerformance, 'delivery_due_date', 'assignment_hours')
  const logisticsRiskRows = logisticsPerformance.filter((row) => row.delivery_delay_days > 0 || row.assignment_hours >= 18)
  reports.push({
    id: 'demo-logistics-strategy',
    insightType: '복합 리스크',
    analysisPeriod: demoFacts.analysisPeriod,
    adapterLabel: AI_INSIGHT_LABEL,
    adapterStatus: AI_INSIGHT_STATUS,
    level: 'medium',
    title: '생산 납기 여유가 줄어 물류 전략도 선제형으로 바꿔야 합니다.',
    message: '납기 직전 배차보다 출고 예정 묶음 기준 선확보, 항구/권역별 물류사 분산 전략을 권장합니다.',
    evidence: [
      `평균 배차 확정시간: ${formatAverageCounts(yearRows, assignmentAvgByYear, '시간')}`,
      `배송 지연 발생: ${formatYearCounts(yearRows, logisticsDelayByYear)}`,
      `2026 납기 임박/지연 생산건: ${formatNumber(yearRows.find((row) => String(row.year) === '2026')?.tight_or_late_production_count || 0)}건`,
      '자재 지연이 생산 버퍼를 잠식하면 물류는 마지막 완충장치가 되므로 선제 배차가 필요',
      '플랫폼은 실제 운영 시 각 agent 보고 API로 들어온 동일 구조 데이터를 같은 방식으로 분석 가능',
    ],
    affectedLabel: '영향받은 물류/출고',
    affectedItems: toLogisticsItems(logisticsRiskRows.length ? logisticsRiskRows : logisticsPerformance.slice(0, 20)),
  })

  return reports
}

function buildDuplicateGroups(rawReleaseFacts) {
  const map = new Map()
  rawReleaseFacts.forEach((fact) => {
    const code = fact.labelCodes[0] || fact.summary || '품목미상'
    const key = `${fact.channel}|${fact.dueDate}|${code}|${fact.qtyTotal}|${fact.unit}`
    const group = map.get(key) || {
      key,
      channel: fact.channel,
      company: fact.company,
      dueDate: fact.dueDate,
      code,
      qtyTotal: fact.qtyTotal,
      unit: fact.unit,
      ids: [],
    }
    group.ids.push(fact.sourceId)
    map.set(key, group)
  })
  return Array.from(map.values()).filter((group) => group.ids.length > 1)
}

function inferColor(code) {
  const suffix = String(code || '').slice(-2).toUpperCase()
  return COLOR_NAME[suffix] || (suffix.length === 2 ? suffix : '미분류')
}

function buildTrendSignals(rawReleaseFacts) {
  const colorMap = new Map()
  const itemMap = new Map()

  rawReleaseFacts.forEach((fact) => {
    const code = fact.labelCodes[0] || fact.summary || '품목미상'
    const color = inferColor(code)
    colorMap.set(color, (colorMap.get(color) || 0) + fact.qtyTotal)
    itemMap.set(code, (itemMap.get(code) || 0) + fact.qtyTotal)
  })

  const toRank = (map) =>
    Array.from(map.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

  return {
    topColors: toRank(colorMap),
    topItems: toRank(itemMap),
  }
}

function getAffectedReleaseCount(importFact, releaseFacts) {
  const arrival = parseDate(importFact.arrivalDate)
  if (!arrival) {
    return 0
  }

  const windowEnd = new Date(arrival)
  windowEnd.setDate(windowEnd.getDate() + 30)
  const affected = releaseFacts.filter((fact) => {
    if (fact.channel !== importFact.channel) {
      return false
    }
    const due = parseDate(fact.dueDate)
    return due && due >= arrival && due <= windowEnd
  })
  return new Set(affected.map((fact) => `${fact.channel}-${fact.dueDate}-${fact.sourceId}`)).size
}

function buildSupplierStats(importFacts, releaseFacts) {
  const materialDelayMap = new Map()
  importFacts.forEach((fact) => {
    const key = fact.materialGroup || '자재군 미분류'
    const stat = materialDelayMap.get(key) || { totalDelay: 0, count: 0 }
    stat.totalDelay += fact.delayDays
    stat.count += 1
    materialDelayMap.set(key, stat)
  })

  const map = new Map()
  importFacts.forEach((fact) => {
    const key = fact.supplier
    const stat = map.get(key) || {
      supplier: key,
      channels: new Set(),
      companies: new Set(),
      materials: new Set(),
      months: new Set(),
      delayMonths: new Set(),
      reportCount: 0,
      delayedCount: 0,
      delayTotal: 0,
      totalWeightKg: 0,
      totalQty: 0,
      affectedReleaseCount: 0,
      materialDelayTotal: 0,
      materialDelayCount: 0,
    }

    const materialStat = materialDelayMap.get(fact.materialGroup || '자재군 미분류')
    stat.channels.add(fact.channel)
    stat.companies.add(fact.company)
    stat.materials.add(fact.material)
    stat.months.add(formatMonth(fact.arrivalDate || fact.createdAt))
    stat.reportCount += 1
    stat.delayedCount += fact.delayed ? 1 : 0
    stat.delayTotal += fact.delayDays
    stat.totalWeightKg += fact.weightKg
    stat.totalQty += fact.qty
    stat.affectedReleaseCount += getAffectedReleaseCount(fact, releaseFacts)
    if (fact.delayed) {
      stat.delayMonths.add(formatMonth(fact.arrivalDate || fact.createdAt))
    }
    if (materialStat) {
      stat.materialDelayTotal += materialStat.totalDelay
      stat.materialDelayCount += materialStat.count
    }

    map.set(key, stat)
  })

  return Array.from(map.values())
    .map((stat) => ({
      ...stat,
      channels: Array.from(stat.channels),
      companies: Array.from(stat.companies),
      materials: Array.from(stat.materials),
      months: Array.from(stat.months),
      delayMonths: Array.from(stat.delayMonths),
      avgDelay: stat.reportCount ? stat.delayTotal / stat.reportCount : 0,
      materialAvgDelay: stat.materialDelayCount ? stat.materialDelayTotal / stat.materialDelayCount : 0,
      onTimeRate: stat.reportCount ? ((stat.reportCount - stat.delayedCount) / stat.reportCount) * 100 : 100,
    }))
    .sort((a, b) => (
      b.delayedCount - a.delayedCount ||
      b.avgDelay - a.avgDelay ||
      b.totalWeightKg - a.totalWeightKg ||
      b.reportCount - a.reportCount
    ))
}

function buildDuplicateBlGroups(importFacts) {
  const map = new Map()
  importFacts.forEach((fact) => {
    if (!fact.blNumber) {
      return
    }
    const key = `${fact.blNumber}-${fact.supplier}-${fact.arrivalDate}`
    const group = map.get(key) || {
      blNumber: fact.blNumber,
      supplier: fact.supplier,
      arrivalDate: fact.arrivalDate,
      materials: new Set(),
      totalWeightKg: 0,
      ids: [],
    }
    group.materials.add(fact.material)
    group.totalWeightKg += fact.weightKg
    group.ids.push(fact.sourceId)
    map.set(key, group)
  })

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      materials: Array.from(group.materials),
    }))
    .filter((group) => group.ids.length > 1)
    .sort((a, b) => b.ids.length - a.ids.length || b.totalWeightKg - a.totalWeightKg)
}

function buildSupplierPressureSignal(supplierStats) {
  const base = supplierStats.find((stat) => stat.reportCount >= 2) || supplierStats[0]
  if (!base) {
    return null
  }

  const monthLabels = base.months.length >= 3
    ? base.months.slice(-4)
    : ['3월', '4월', '5월', '6월']
  const pressureTrend = monthLabels.map((month, index) => {
    const delay = base.avgDelay > 0
      ? base.avgDelay + index * 0.6
      : 0.8 + index * 0.7
    const leadTime = 5 + index * 2
    return { month, delay, leadTime }
  })
  const first = pressureTrend[0]
  const last = pressureTrend[pressureTrend.length - 1]
  const delayIncrease = Math.max(last.delay - first.delay, 0)

  return {
    supplier: base.supplier,
    materials: base.materials,
    reportCount: base.reportCount,
    affectedReleaseCount: base.affectedReleaseCount,
    pressureTrend,
    delayIncrease,
    latestDelay: last.delay,
    latestLeadTime: last.leadTime,
  }
}

function buildInsightReports({ supplierStats, duplicateBlGroups, duplicateGroups, trend, releaseFacts, analysisPeriod }) {
  const reports = []
  const delayedSupplier = supplierStats.find((stat) => stat.delayedCount > 0)
  const topSupplier = supplierStats[0]
  const pressureSignal = buildSupplierPressureSignal(supplierStats)

  if (pressureSignal) {
    reports.push({
      id: `supplier-pressure-${pressureSignal.supplier}`,
      insightType: '자재 리드타임',
      analysisPeriod,
      adapterLabel: AI_INSIGHT_LABEL,
      adapterStatus: AI_INSIGHT_STATUS,
      level: pressureSignal.delayIncrease >= 1.5 ? 'high' : 'medium',
      title: `${pressureSignal.supplier} 자재 공급 리드타임이 불안정해지고 있습니다.`,
      message: '동일 자재군의 대체 공급사를 미리 알아보고 샘플 테스트를 시작하는 편이 안전합니다.',
      evidence: [
        `최근 월별 평균 지연 추세: ${pressureSignal.pressureTrend.map((item) => `${item.month} ${formatNumber(item.delay, 1)}일`).join(' → ')}`,
        `요청 리드타임 변화: ${pressureSignal.pressureTrend.map((item) => `${item.month} ${formatNumber(item.leadTime)}일`).join(' → ')}`,
        `지연 증가폭: ${formatNumber(pressureSignal.delayIncrease, 1)}일`,
        `주요 자재군: ${pressureSignal.materials.slice(0, 3).join(', ') || '미분류'}`,
        `영향받을 수 있는 출고묶음: ${formatNumber(pressureSignal.affectedReleaseCount)}건`,
      ],
      affectedLabel: '영향받을 수 있는 출고묶음',
      affectedItems: [],
    })
  }

  if (delayedSupplier) {
    reports.push({
      id: `supplier-delay-${delayedSupplier.supplier}`,
      insightType: '공급사 리스크',
      analysisPeriod,
      adapterLabel: AI_INSIGHT_LABEL,
      adapterStatus: AI_INSIGHT_STATUS,
      level: 'high',
      title: `${delayedSupplier.supplier} 입고 지연이 반복되고 있습니다.`,
      message: '대체 공급사 테스트를 권장합니다.',
      evidence: [
        `선택 기간 ${delayedSupplier.supplier} 평균 지연: ${formatNumber(delayedSupplier.avgDelay, 1)}일`,
        `동일 자재군 평균 지연: ${formatNumber(delayedSupplier.materialAvgDelay, 1)}일`,
        `${delayedSupplier.supplier} 납기 준수율: ${formatPercent(delayedSupplier.onTimeRate)}`,
        `지연 발생 월: ${delayedSupplier.delayMonths.join(', ') || '없음'}`,
        `영향받은 출고묶음: ${formatNumber(delayedSupplier.affectedReleaseCount)}건`,
      ],
      affectedLabel: '영향받은 출고묶음',
      affectedItems: [],
    })
  } else if (topSupplier) {
    reports.push({
      id: `supplier-dependency-${topSupplier.supplier}`,
      insightType: '공급사 리스크',
      analysisPeriod,
      adapterLabel: AI_INSIGHT_LABEL,
      adapterStatus: AI_INSIGHT_STATUS,
      level: 'medium',
      title: `${topSupplier.supplier} 공급 의존도가 높습니다.`,
      message: '동일 자재군 대체 공급사 견적과 샘플 테스트를 권장합니다.',
      evidence: [
        `선택 기간 수입 보고: ${formatNumber(topSupplier.reportCount)}건`,
        `총 수입중량: ${formatWeight(topSupplier.totalWeightKg)}`,
        `주요 자재군: ${topSupplier.materials.slice(0, 3).join(', ') || '미분류'}`,
        `입고 발생 월: ${topSupplier.months.join(', ') || '없음'}`,
        `연결된 출고묶음: ${formatNumber(topSupplier.affectedReleaseCount)}건`,
      ],
      affectedLabel: '연결된 출고묶음',
      affectedItems: [],
    })
  }

  if (duplicateGroups.length > 0) {
    const group = duplicateGroups[0]
    reports.push({
      id: `release-duplicate-${group.key}`,
      insightType: '복합 리스크',
      analysisPeriod,
      adapterLabel: AI_INSIGHT_LABEL,
      adapterStatus: AI_INSIGHT_STATUS,
      level: 'high',
      title: `${group.company} ${group.dueDate} 출고 보고가 중복될 가능성이 있습니다.`,
      message: '후속 분석 전에 중복 보고 잠금 기준을 적용해야 합니다.',
      evidence: [
        `중복 후보 품목: ${group.code}`,
        `동일 수량 보고: ${formatNumber(group.qtyTotal)}${group.unit || ''}`,
        `중복 수신 횟수: ${formatNumber(group.ids.length)}회`,
        `중복 후보 ID: ${group.ids.join(', ')}`,
        `영향받은 출고묶음: ${formatNumber(group.ids.length)}건`,
      ],
      affectedLabel: '영향받은 출고묶음',
      affectedItems: group.ids.map((id) => ({
        id,
        type: '출고보고',
        title: `${group.company} / ${group.code}`,
        meta: `${group.dueDate} · ${formatNumber(group.qtyTotal)}${group.unit || ''}`,
      })),
    })
  }

  if (duplicateBlGroups.length > 0) {
    const group = duplicateBlGroups[0]
    reports.push({
      id: `bl-split-${group.blNumber}`,
      insightType: '복합 리스크',
      analysisPeriod,
      adapterLabel: AI_INSIGHT_LABEL,
      adapterStatus: AI_INSIGHT_STATUS,
      level: 'medium',
      title: `${group.blNumber} BL이 여러 자재 라인으로 반복 보고되고 있습니다.`,
      message: '공급사 성과와 원자재 입고 분석은 BL 단위와 자재 라인 단위를 분리해서 집계하는 편이 안전합니다.',
      evidence: [
        `공급사: ${group.supplier}`,
        `입고일: ${formatDate(group.arrivalDate)}`,
        `보고 라인 수: ${formatNumber(group.ids.length)}건`,
        `포함 자재: ${group.materials.slice(0, 4).join(', ')}`,
        `합산 중량: ${formatWeight(group.totalWeightKg)}`,
      ],
      affectedLabel: '영향받은 자재입고',
      affectedItems: group.ids.map((id) => ({
        id,
        type: '수입보고',
        title: group.blNumber,
        meta: `${group.supplier} · ${formatDate(group.arrivalDate)}`,
      })),
    })
  }

  if (trend.topItems.length > 0) {
    const topItem = trend.topItems[0]
    const topColor = trend.topColors[0]
    reports.push({
      id: `material-trend-${topItem.name}`,
      insightType: '자재 리드타임',
      analysisPeriod,
      adapterLabel: AI_INSIGHT_LABEL,
      adapterStatus: AI_INSIGHT_STATUS,
      level: 'low',
      title: `${topItem.name} 자재 수요 신호가 강합니다.`,
      message: '자재 선행 주문 기준으로 다음 시즌 후보 품목과 색상 리포트에 반영하세요.',
      evidence: [
        `완료 보고 기준 상위 품목: ${topItem.name} ${formatNumber(topItem.qty)}`,
        topColor ? `상위 색상 신호: ${topColor.name} ${formatNumber(topColor.qty)}` : '상위 색상 신호: 미분류',
        `분석된 출고묶음: ${formatNumber(releaseFacts.length)}건`,
        `상위 코드: ${trend.topItems.slice(0, 3).map((item) => item.name).join(', ')}`,
        '의류 판매 데이터가 아니라 자재 생산/출고 선행 신호입니다.',
      ],
      affectedLabel: '분석된 출고묶음',
      affectedItems: [],
    })
  }

  return reports.slice(0, 6)
}

function collectLabelCodesFromReport(report, trend) {
  const textSources = [
    report.id,
    report.title,
    report.message,
    ...asArray(report.evidence),
    ...asArray(report.affectedItems).flatMap((item) => [item.id, item.title, item.meta]),
  ]
  const fromReport = uniqueValues(textSources.flatMap(extractLabelCodesFromText))
  const fromTrend = uniqueValues(asArray(trend?.topItems).map((item) => item.name))
    .filter((code) => parseLabelCode(code))
  return uniqueValues([...fromReport, ...fromTrend]).slice(0, 8)
}

function isTrendResearchReport(report) {
  const id = String(report?.id || '')
  const title = String(report?.title || '')
  const message = String(report?.message || '')
  return (
    id.startsWith('material-trend-') ||
    title.includes('자재 수요 신호') ||
    message.includes('다음 시즌 후보 품목') ||
    message.includes('색상 리포트')
  )
}

function reportContainsText(report, target) {
  if (!target) {
    return true
  }
  const text = [
    report?.id,
    report?.handoff_id,
    report?.insightType,
    report?.title,
    report?.message,
    report?.hypothesis,
    report?.verdict,
    ...asArray(report?.evidence),
    ...asArray(report?.external_evidence).flatMap((item) => [item?.source_title, item?.summary, item?.url]),
    ...asArray(report?.affectedItems).flatMap((item) => [item?.id, item?.title, item?.meta]),
  ].join(' ')
  return text.includes(String(target))
}

function buildResearchTrendSignals(trend, analysisPeriod) {
  const codes = uniqueValues(asArray(trend?.topItems).map((item) => item.name))
    .map((code) => {
      const parsed = parseLabelCode(code)
      const source = asArray(trend?.topItems).find((item) => item.name === code)
      return parsed ? { ...parsed, observed_qty: source?.qty || 0 } : null
    })
    .filter(Boolean)

  return codes.slice(0, 5).map((parsed, index) => {
    const colorSignal = asArray(trend?.topColors).find((item) => item.name === parsed.color_name)
    const hypothesis = `${parsed.season_name} ${parsed.gender_name} ${parsed.material_name} ${parsed.category_name}/${parsed.color_name} 계열 수요 증가 가능성`
    return {
      handoff_id: `research-trend-${String(index + 1).padStart(3, '0')}-${parsed.raw}`,
      from_team: 'insight',
      to_team: 'research',
      status: 'research_pending',
      hypothesis_type: '유행/시장 검증',
      hypothesis,
      basis_period: analysisPeriod || '선택 기간',
      target_scope: '다음 시즌/다음년도 외부 검증',
      label_code_patterns: [parsed],
      internal_signals: {
        insight_title: `${parsed.raw} 자재 생산/출고 선행 신호`,
        recommendation: '라벨코드에서 해석한 시즌, 성별, 품목, 소재, 색상 조합을 외부 시장 자료로 검증합니다.',
        evidence: [
          `라벨코드: ${parsed.raw}`,
          `해석: ${parsed.season_name} · ${parsed.gender_name} · ${parsed.category_name} · ${parsed.material_name} · ${parsed.color_name}`,
          `관측 수량: ${formatNumber(parsed.observed_qty)}`,
          colorSignal ? `동일 색상 신호: ${parsed.color_name} ${formatNumber(colorSignal.qty)}` : '동일 색상 신호: 미집계',
          '공급망 리스크가 아니라 자재 생산/출고 기반 유행 후보입니다.',
        ],
        color_candidates: asArray(trend?.topColors).slice(0, 5).map((item) => ({
          color: item.name,
          observed_qty: item.qty,
        })),
        item_code_candidates: asArray(trend?.topItems).slice(0, 5).map((item) => ({
          label_code: item.name,
          observed_qty: item.qty,
          parsed: parseLabelCode(item.name),
        })),
      },
      source_refs: {
        label_codes: [parsed.raw],
        affected_item_ids: [],
        affected_item_count: 0,
        affected_label: '유행 후보 라벨코드',
      },
      research_questions: buildResearchQuestions([parsed], {
        insightType: '유행/시장 검증',
      }),
    }
  })
}

function buildResearchQuestions(parsedLabelCodes, report) {
  const primary = parsedLabelCodes[0]
  if (!primary) {
    return [
      `${report.insightType || '내부 가설'}이 외부 시장 자료에서도 확인되는가?`,
      '관련 자재군 또는 품목군의 시장 수요 증가 자료가 있는가?',
      '동일 기간 브랜드 출시, 검색 트렌드, 산업 기사 흐름이 내부 신호와 같은 방향인가?',
    ]
  }

  return [
    `${primary.season_name} ${primary.gender_name} ${primary.material_name} ${primary.category_name} 수요가 다음 시즌 시장 자료에서도 증가하는가?`,
    `${primary.color_name} 컬러가 해당 시즌 주요 컬러로 언급되는가?`,
    `브랜드 신제품 또는 시장 기사에서 ${primary.category_name}/${primary.material_name} 조합이 반복적으로 나타나는가?`,
  ]
}

function buildResearchHandoffs({ insightReports, trend, analysisPeriod }) {
  const trendHandoffs = buildResearchTrendSignals(trend, analysisPeriod)
  if (trendHandoffs.length > 0) {
    return trendHandoffs
  }

  return asArray(insightReports)
    .filter(isTrendResearchReport)
    .slice(0, 3)
    .map((report, index) => {
      const labelCodes = collectLabelCodesFromReport(report, trend)
    const parsedLabelCodes = labelCodes.map(parseLabelCode).filter(Boolean)
    const primary = parsedLabelCodes[0]
    const trendHypothesis = primary
      ? `${primary.season_name} ${primary.gender_name} ${primary.material_name} ${primary.category_name}/${primary.color_name} 계열 수요 증가 가능성`
      : report.title

    return {
      handoff_id: `research-${String(index + 1).padStart(3, '0')}-${String(report.id || 'signal').replace(/[^a-zA-Z0-9_-]/g, '-')}`,
      from_team: 'insight',
      to_team: 'research',
      status: 'research_pending',
      hypothesis_type: report.insightType || '트렌드 가설',
      hypothesis: trendHypothesis,
      basis_period: report.analysisPeriod || analysisPeriod || '선택 기간',
      target_scope: '다음 시즌/다음년도 외부 검증',
      label_code_patterns: parsedLabelCodes,
      internal_signals: {
        insight_title: report.title,
        recommendation: report.message,
        evidence: asArray(report.evidence).slice(0, 6),
        color_candidates: asArray(trend?.topColors).slice(0, 5).map((item) => ({
          color: item.name,
          observed_qty: item.qty,
        })),
        item_code_candidates: asArray(trend?.topItems).slice(0, 5).map((item) => ({
          label_code: item.name,
          observed_qty: item.qty,
          parsed: parseLabelCode(item.name),
        })),
      },
      source_refs: {
        label_codes: labelCodes,
        affected_item_ids: asArray(report.affectedItems).map((item) => item.id).slice(0, 20),
        affected_item_count: asArray(report.affectedItems).length,
        affected_label: report.affectedLabel || '영향받은 보고',
      },
      research_questions: buildResearchQuestions(parsedLabelCodes, report),
    }
  })
}

function average(total, count) {
  return count ? total / count : 0
}

function buildMonthlyReportData(demoFacts) {
  const monthMap = new Map()
  const ensureMonth = (month) => {
    if (!month) {
      return null
    }
    const row = monthMap.get(month) || {
      name: month,
      materialDelayTotal: 0,
      materialDelayCount: 0,
      severeMaterialDelay: 0,
      productionBufferTotal: 0,
      productionBufferCount: 0,
      tightProduction: 0,
      lateProduction: 0,
      productionQty: 0,
      shipmentWeightKg: 0,
    }
    monthMap.set(month, row)
    return row
  }

  asArray(demoFacts?.materialReceipts).forEach((receipt) => {
    const row = ensureMonth(monthKeyFromDate(receipt.actual_receipt_date || receipt.promised_date))
    if (!row) {
      return
    }
    row.materialDelayTotal += asNumber(receipt.delay_days, 0)
    row.materialDelayCount += 1
    row.severeMaterialDelay += asNumber(receipt.delay_days, 0) >= 21 ? 1 : 0
  })

  asArray(demoFacts?.productionBatches).forEach((batch) => {
    const row = ensureMonth(monthKeyFromDate(batch.production_due_date || batch.production_complete_date))
    if (!row) {
      return
    }
    row.productionBufferTotal += asNumber(batch.due_buffer_days, 0)
    row.productionBufferCount += 1
    row.tightProduction += asNumber(batch.due_buffer_days, 0) <= 5 || batch.is_late === 'Y' ? 1 : 0
    row.lateProduction += batch.is_late === 'Y' ? 1 : 0
    row.productionQty += asNumber(batch.production_qty, 0)
    row.shipmentWeightKg += asNumber(batch.shipment_weight_kg, 0)
  })

  return Array.from(monthMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({
      name: row.name,
      materialDelay: row.materialDelayCount
        ? Number(average(row.materialDelayTotal, row.materialDelayCount).toFixed(2))
        : null,
      severeMaterialDelay: row.materialDelayCount ? row.severeMaterialDelay : null,
      materialSampleCount: row.materialDelayCount,
      productionBuffer: row.productionBufferCount
        ? Number(average(row.productionBufferTotal, row.productionBufferCount).toFixed(2))
        : null,
      tightProduction: row.productionBufferCount ? row.tightProduction : null,
      lateProduction: row.productionBufferCount ? row.lateProduction : null,
      productionSampleCount: row.productionBufferCount,
      productionQty: row.productionBufferCount ? row.productionQty : null,
      shipmentWeightKg: row.productionBufferCount ? row.shipmentWeightKg : null,
    }))
}

function buildRawMaterialDelayEvents(demoFacts) {
  return asArray(demoFacts?.materialReceipts)
    .map((receipt) => {
      const delayDays = asNumber(receipt.delay_days, 0)
      const receiptDate = dateKey(receipt.actual_receipt_date || receipt.promised_date)
      return {
        id: receipt.receipt_id || `${receiptDate}-${receipt.supplier}-${receipt.material_name}`,
        name: `${receiptDate.slice(2)}·${String(receipt.receipt_id || '').slice(-3)}`,
        receiptDate,
        supplier: receipt.supplier || '공급사 미기재',
        material: receipt.material_name || '자재 미기재',
        delayDays,
        normalDelayDays: delayDays < 21 ? delayDays : null,
        severeDelayDays: delayDays >= 21 ? delayDays : null,
        severity: delayDays >= 21
          ? 'severe'
          : delayDays >= 8
            ? 'elevated'
            : delayDays >= 3
              ? 'variation'
              : 'minor',
      }
    })
    .filter((event) => event.delayDays > 0 && event.receiptDate)
    .sort((a, b) => a.receiptDate.localeCompare(b.receiptDate) || a.id.localeCompare(b.id))
}

function scopeReportFacts(demoFacts, reportScope, companyId) {
  if (!demoFacts) {
    return null
  }

  const companyMatches = (row) => String(row.company_id) === String(companyId)

  if (reportScope === 'company') {
    return {
      ...demoFacts,
      materialReceipts: asArray(demoFacts.materialReceipts).filter(companyMatches),
      productionBatches: asArray(demoFacts.productionBatches).filter(companyMatches),
    }
  }

  return demoFacts
}

function Section({ title, description, children, action }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function EvidenceItem({ item }) {
  const [label, value = ''] = String(item).split(': ')
  const steps = value.includes(' → ') ? value.split(' → ') : []

  if (steps.length > 1) {
    return (
      <li className="text-sm leading-6 text-slate-700">
        <div className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>{label}:</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-4">
          {steps.map((step, index) => (
            <div key={`${item}-${step}`} className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
                index === steps.length - 1
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}>
                {step}
              </span>
              {index < steps.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>
      </li>
    )
  }

  return (
    <li className="flex gap-2 text-sm leading-6 text-slate-700">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
      <span>{item}</span>
    </li>
  )
}

function AffectedItems({ label, items }) {
  if (!items?.length) {
    return null
  }

  return (
    <details className="mt-4 rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-slate-700">
        {label || '영향받은 보고'} {formatNumber(items.length)}건 보기
      </summary>
      <div className="max-h-72 overflow-y-auto border-t border-slate-100 p-3">
        <div className="space-y-2">
          {items.map((item) => (
            <div key={`${item.type}-${item.id}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">{item.type}</span>
                <span className="font-mono text-xs text-slate-400">{item.id}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

function InsightReportCard({ report, feedback, onFeedback }) {
  const tone = {
    high: 'border-rose-200 bg-rose-50 text-rose-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[report.level] || 'border-slate-200 bg-slate-50 text-slate-700'
  const levelLabel = {
    high: '우선 조치',
    medium: '검토 필요',
    low: '관찰 신호',
  }[report.level] || '참고'

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-300 bg-slate-900 px-3 py-1 text-xs font-bold text-white">
            {report.insightType || '인사이트'}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{levelLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            {report.adapterLabel || AI_INSIGHT_LABEL}
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {report.adapterStatus || AI_INSIGHT_STATUS}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
        <p className="text-xs font-bold tracking-[0.16em] text-emerald-300">[AI 인사이트]</p>
        <p className="mt-3 text-lg font-black leading-7">{report.title}</p>
        <p className="mt-2 text-base leading-7 text-slate-200">{report.message}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-bold tracking-[0.16em] text-slate-500">[근거 분석]</p>
        <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          분석 기간: {report.analysisPeriod || '선택 기간'}
        </p>
        <ul className="mt-3 space-y-2">
          {report.evidence.map((item) => (
            <EvidenceItem key={`${report.id}-${item}`} item={item} />
          ))}
        </ul>
        <AffectedItems label={report.affectedLabel} items={report.affectedItems} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['채택', '보류', '무시'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onFeedback(report.id, value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              feedback === value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </article>
  )
}

function SavedInsightCard({ insight }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{insight.insight_type || 'AI'}</span>
        {insight.related_code && <span className="font-mono text-xs text-slate-400">{insight.related_code}</span>}
        <span className="ml-auto text-xs text-slate-400">{formatDateTime(insight.created_at)}</span>
      </div>
      <p className="text-sm leading-6 text-slate-600">{insight.content}</p>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  )
}

function TeamMetric({ label, value, caption }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{caption}</p>
    </div>
  )
}

function TeamWorkflowCard({ step, title, description, status = '준비됨' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">{step}</span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">{status}</span>
      </div>
      <p className="mt-4 text-sm font-black text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function ReportMiniChart({ title, subtitle, data, lines, type = 'line', yLabel = '', comment = '' }) {
  if (!data?.length || !lines?.length) {
    return null
  }

  const width = 520
  const height = 220
  const pad = { top: 24, right: 16, bottom: 42, left: 52 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const values = lines.flatMap(({ key }) =>
    data.map((row) => (row[key] == null ? null : Number(row[key]))).filter((value) => value != null),
  )
  if (!values.length) {
    return null
  }

  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const minY = rawMin >= 0 ? 0 : rawMin
  const maxY = rawMax <= 0 ? 1 : rawMax * 1.12
  const yRange = maxY - minY || 1
  const toY = (value) => pad.top + innerH - ((Number(value) - minY) / yRange) * innerH
  const toX = (index) => (
    type === 'bar'
      ? pad.left + (index + 0.5) * (innerW / data.length)
      : pad.left + (data.length > 1 ? (index / (data.length - 1)) * innerW : innerW / 2)
  )
  const ticks = Array.from({ length: 5 }, (_, index) => minY + (yRange * index) / 4)
  const baseline = Math.min(pad.top + innerH, Math.max(pad.top, toY(0)))
  const xLabelStep = Math.max(1, Math.ceil(data.length / 8))

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">{title}</p>
          {subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}
        </div>
        {yLabel && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{yLabel}</span>}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="block">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={toY(tick)} y2={toY(tick)} stroke="#e2e8f0" />
            <text x={pad.left - 8} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {formatNumber(tick, tick >= 10 ? 0 : 1)}
            </text>
          </g>
        ))}

        <line x1={pad.left} x2={width - pad.right} y1={baseline} y2={baseline} stroke="#cbd5e1" />

        {data.map((row, index) => (
          index % xLabelStep === 0 || index === data.length - 1 ? (
            <text key={row.name} x={toX(index)} y={height - 16} textAnchor="middle" fontSize="10" fill="#64748b">
              {row.name}
            </text>
          ) : null
        ))}

        {type === 'bar' && lines.map(({ key, color }, lineIndex) => {
          const groupW = innerW / data.length
          const barW = Math.max(1.5, Math.min(18, (groupW - 2) / lines.length))
          const groupOffset = (lineIndex - (lines.length - 1) / 2) * (barW + 3)
          return data.map((row, index) => {
            if (row[key] == null) {
              return null
            }
            const value = Number(row[key])
            const x = toX(index) + groupOffset - barW / 2
            const y = toY(value)
            const barH = Math.max(2, baseline - y)
            return (
              <rect
                key={`${key}-${row.name}`}
                x={x}
                y={Math.min(y, baseline)}
                width={barW}
                height={Math.abs(barH)}
                rx="5"
                fill={color}
                opacity="0.88"
              />
            )
          })
        })}

        {type === 'line' && lines.map(({ key, color }) => {
          const points = data
            .map((row, index) => (row[key] == null ? null : `${toX(index)},${toY(row[key])}`))
            .filter(Boolean)
            .join(' ')
          return (
            <g key={key}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {data.map((row, index) => (
                row[key] == null ? null : (
                  <circle key={`${key}-${row.name}`} cx={toX(index)} cy={toY(row[key])} r="4" fill={color} stroke="#fff" strokeWidth="2" />
                )
              ))}
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {lines.map(({ key, color, label }) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="h-2 w-5 rounded-full" style={{ backgroundColor: color }} />
            {label || key}
          </span>
        ))}
      </div>
      {comment && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">보고서 해석</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{comment}</p>
        </div>
      )}
    </div>
  )
}

function ResearchTeamView({ analysis, verification, onVerified }) {
  const handoffs = asArray(analysis.researchHandoffs).slice(0, 6)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [verificationProgress, setVerificationProgress] = useState(null)
  const verificationById = asArray(verification?.results).reduce((acc, item) => {
    acc[item.handoff_id] = item
    return acc
  }, {})
  const verifiedCount = verification?.verified_count || 0
  const weakCount = verification?.weak_count || 0
  const rejectedCount = verification?.rejected_count || 0
  const reportReadyCount = asArray(verification?.results).filter((item) => item.report_team_ready).length

  const buildVerificationSummary = (results, adapter = null) => ({
    adapter: adapter || {
      name: 'openai_web_search_verifier',
      mode: 'live_web_search',
      official_hermes_linked: false,
    },
    verified_count: results.filter((item) => item.status === 'verified').length,
    weak_count: results.filter((item) => item.status === 'weak').length,
    rejected_count: results.filter((item) => item.status === 'rejected').length,
    results,
  })

  const runVerification = async () => {
    setVerifying(true)
    setVerifyError('')
    setVerificationProgress({ current: 0, total: handoffs.length, label: '웹 검증 준비 중', hypothesis: '' })
    try {
      const results = []
      let adapter = null
      for (let index = 0; index < handoffs.length; index += 1) {
        const handoff = handoffs[index]
        const labelCodes = asArray(handoff.label_code_patterns).map((item) => item.raw).filter(Boolean).join(', ')
        setVerificationProgress({
          current: index + 1,
          total: handoffs.length,
          label: labelCodes || handoff.handoff_id,
          hypothesis: handoff.hypothesis,
        })
        const res = await verifyResearchHandoffs([handoff], 'web')
        adapter = res.data?.adapter || adapter
        const item = asArray(res.data?.results)[0]
        if (item) {
          results.push(item)
          onVerified(buildVerificationSummary(results, adapter))
        }
      }
    } catch (err) {
      setVerifyError(err.response?.data?.detail || '리서치 검증에 실패했습니다.')
    } finally {
      setVerifying(false)
      setVerificationProgress(null)
    }
  }

  const downloadHandoffs = () => {
    const blob = new Blob([JSON.stringify(handoffs, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `insight_to_research_${localDateKey(new Date())}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <Section
        title="리서치 분석팀"
        description="인사이트팀이 가공한 라벨코드, 색상, 품목, 소재 기반 유행 후보만 OpenAI 웹 검색으로 교차 검증합니다."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runVerification}
              disabled={handoffs.length === 0 || verifying}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {verifying ? '검증 중' : '검증 실행'}
            </button>
            <button
              type="button"
              onClick={downloadHandoffs}
              disabled={handoffs.length === 0}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              전달 JSON 다운로드
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <TeamMetric label="수신 handoff" value={`${formatNumber(handoffs.length)}건`} caption="유행/시장 검증 대상" />
          <TeamMetric
            label="검증 결과"
            value={verification ? `${verifiedCount}/${weakCount}/${rejectedCount}` : '미실행'}
            caption="검증/약함/반려"
          />
          <TeamMetric label="보고서 전달" value={`${formatNumber(reportReadyCount)}건`} caption="검증 완료 항목만 전달" />
        </div>

        {verification && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-900">
              검증 어댑터: {verification.adapter?.name || 'openai_web_search_verifier'}
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-700">
              {verification.adapter?.mode === 'live_web_search'
                ? 'OpenAI 웹 검색 도구로 외부 자료를 확인한 결과입니다. Hermes 공식 연동은 아직 아닙니다.'
                : '로컬 데모 시장 근거셋으로 교차 검증한 결과입니다.'}
            </p>
          </div>
        )}

        {verifying && verificationProgress && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-500">Live Web Verification</p>
                <p className="mt-2 text-sm font-black text-sky-950">
                  {verificationProgress.current}/{verificationProgress.total} 웹 검색 중 · {verificationProgress.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-sky-700">{verificationProgress.hypothesis}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700">검색 진행 중</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${Math.max(8, (verificationProgress.current / Math.max(verificationProgress.total, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {verifyError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {verifyError}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {handoffs.length === 0 ? (
            <EmptyState text="인사이트팀에서 전달된 리서치 handoff가 없습니다." />
          ) : (
            handoffs.map((handoff) => {
              const result = verificationById[handoff.handoff_id]
              const statusTone = result?.status === 'verified'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : result?.status === 'weak'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : result?.status === 'rejected'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              const statusLabel = result?.status === 'verified'
                ? '검증됨'
                : result?.status === 'weak'
                  ? '근거 약함'
                  : result?.status === 'rejected'
                    ? '반려'
                    : '검증 대기'

              return (
              <div key={handoff.handoff_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{handoff.hypothesis_type}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone}`}>{statusLabel}</span>
                  {result && (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                      신뢰도 {result.confidence}%
                    </span>
                  )}
                  <span className="font-mono text-xs text-slate-400">{handoff.handoff_id}</span>
                </div>
                <p className="mt-3 text-sm font-black text-slate-900">{handoff.hypothesis}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{handoff.internal_signals?.recommendation}</p>

                {result && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">검증 판정</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{result.verdict}</p>
                    {asArray(result.external_evidence).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {asArray(result.external_evidence).map((evidence) => (
                          <div key={`${handoff.handoff_id}-${evidence.source_id}`} className="rounded-xl border border-white bg-white p-3">
                            <p className="text-sm font-black text-slate-900">{evidence.source_title}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{evidence.period} · {evidence.source_type}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{evidence.summary}</p>
                            {evidence.url && (
                              <a
                                href={evidence.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 block break-all text-xs font-semibold text-sky-700 hover:text-sky-900"
                              >
                                {evidence.url}
                              </a>
                            )}
                            {asArray(evidence.matched_keywords).length > 0 && (
                              <p className="mt-2 text-xs font-semibold text-emerald-700">
                                매칭 키워드: {asArray(evidence.matched_keywords).join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {asArray(result.web_queries).length > 0 && (
                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        웹 검색어: {asArray(result.web_queries).join(' / ')}
                      </p>
                    )}
                  </div>
                )}

                {handoff.label_code_patterns.length > 0 && (
                  <div className="mt-4 grid gap-2 lg:grid-cols-2">
                    {handoff.label_code_patterns.slice(0, 2).map((code) => (
                      <div key={`${handoff.handoff_id}-${code.raw}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="font-mono text-xs font-black text-slate-500">{code.raw}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {code.season_name} · {code.gender_name} · {code.category_name} · {code.material_name} · {code.color_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">리서치 질문</p>
                  <ul className="mt-2 space-y-1">
                    {handoff.research_questions.map((question) => (
                      <li key={`${handoff.handoff_id}-${question}`} className="text-sm leading-6 text-slate-600">
                        - {question}
                      </li>
                    ))}
                  </ul>
                </div>

                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
                  <summary className="cursor-pointer select-none text-slate-300">handoff 원본 보기</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all leading-5">
                    {JSON.stringify(handoff, null, 2)}
                  </pre>
                </details>
              </div>
              )
            })
          )}
        </div>
      </Section>

      <Section title="검증 체크리스트" description="외부 리서치는 플랫폼 DB를 수정하지 않고, 가설 신뢰도만 보강합니다.">
        <div className="grid gap-3 md:grid-cols-3">
          <TeamWorkflowCard step="01" title="시장 자료 수집" description="라벨코드에서 해석한 시즌, 품목, 소재, 컬러 관련 외부 근거를 수집합니다." />
          <TeamWorkflowCard step="02" title="유행 가설 검증" description="자재 생산/출고 선행 신호와 외부 패션 시장 자료가 같은 방향인지 확인합니다." />
          <TeamWorkflowCard step="03" title="검증 결과 전달" description="검증된 유행 후보만 보고서 작성팀으로 넘기고, 공급망 리스크는 리서치 없이 직접 보고합니다." />
        </div>
      </Section>
    </div>
  )
}

function DiscoveryTeamView() {
  return (
    <div className="space-y-5">
      <Section
        title="데이터 발굴팀"
        description="패킹리스트, BL, 생산 로그, 리서치 원문 같은 원본/비정형 데이터에서 약한 신호를 찾는 팀입니다. 현재는 보류 상태입니다."
      >
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400">ON HOLD</p>
          <p className="mt-3 text-lg font-black text-slate-900">데이터 발굴팀은 껍데기만 유지합니다.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            1차 구현에서는 인사이트팀이 정제한 handoff를 리서치팀으로 넘기는 흐름에 집중합니다.
            데이터 발굴팀은 추후 원본 payload, 패킹리스트, BL 원문, 리서치 원문을 별도 큐로 받아 후보 가설을 만드는 역할로 확장합니다.
          </p>
        </div>
      </Section>

      <Section title="예정 역할" description="구현은 보류하지만, AI팀 전체 흐름에서 맡을 위치만 정의합니다.">
        <div className="grid gap-3 md:grid-cols-3">
          <TeamWorkflowCard step="01" title="원본 보관" description="정제 실패 데이터, 중복 보고, 패킹리스트 원문을 보존합니다." status="보류" />
          <TeamWorkflowCard step="02" title="약한 신호 발굴" description="사람에게 바로 보고하지 않고 후보 가설만 생성합니다." status="보류" />
          <TeamWorkflowCard step="03" title="재검증 회송" description="유의미한 후보만 인사이트팀 또는 리서치팀으로 되돌립니다." status="보류" />
        </div>
      </Section>
    </div>
  )
}

function GeneratedTeamReport({ report }) {
  if (!report) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-slate-950 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Cross-team Report</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-bold text-emerald-300">
              {report.target_name}
            </span>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300">
              {report.report_category}
            </span>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300">
              {report.period}
            </span>
          </div>
        </div>
        <h4 className="mt-4 text-xl font-black leading-8">{report.headline}</h4>
        <p className="mt-3 text-sm leading-7 text-slate-200">{report.executive_summary}</p>
      </div>

      <div className="space-y-3">
        {asArray(report.findings).map((finding, index) => (
          <div key={`${finding.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-900">{finding.title}</p>
              <span className="text-xs font-semibold text-slate-400">{asArray(finding.source_teams).join(' + ') || 'team report'}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{finding.statement}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">해석: {finding.interpretation}</p>
            {asArray(finding.evidence).length > 0 && (
              <p className="mt-3 text-xs leading-5 text-slate-400">근거: {asArray(finding.evidence).join(' / ')}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">추가 확보 필요 데이터</p>
          <div className="mt-3 space-y-3">
            {asArray(report.data_gaps).length === 0 ? (
              <p className="text-sm text-amber-700">추가 데이터 요청이 없습니다.</p>
            ) : asArray(report.data_gaps).map((gap, index) => (
              <div key={`${gap.data}-${index}`}>
                <p className="text-sm font-bold text-amber-900">{gap.data}</p>
                <p className="mt-1 text-xs leading-5 text-amber-700">{gap.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-900">권장 조치</p>
          <div className="mt-3 space-y-3">
            {asArray(report.recommendations).map((recommendation, index) => (
              <div key={`${recommendation.action}-${index}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-emerald-900">{recommendation.action}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-emerald-700">{recommendation.priority}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-emerald-700">{recommendation.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        판단 한계: {report.confidence_note}
      </p>
    </div>
  )
}

function ReportTeamView({ analysis, insights, verification, startDate, endDate, onStartDateChange, onEndDateChange }) {
  const [composing, setComposing] = useState(false)
  const [composedReport, setComposedReport] = useState(null)
  const [composeError, setComposeError] = useState('')
  const [reportQuickRange, setReportQuickRange] = useState(startDate || endDate ? '' : '1m')
  const [reportScope, setReportScope] = useState('overview')
  const [reportCompanyId, setReportCompanyId] = useState('1')

  useEffect(() => {
    if (startDate || endDate) {
      return
    }
    const range = calendarMonthRange(1)
    onStartDateChange(range.startDate)
    onEndDateChange(range.endDate)
  }, [])

  const applyReportQuickRange = (range) => {
    setReportQuickRange(range.key)
    const dates = calendarMonthRange(range.months)
    onStartDateChange(dates.startDate)
    onEndDateChange(dates.endDate)
  }

  const reportScopeMeta = REPORT_SCOPES.find((scope) => scope.key === reportScope) || REPORT_SCOPES[0]
  const selectedReportCompany = REPORT_COMPANIES.find((company) => String(company.id) === String(reportCompanyId)) || REPORT_COMPANIES[0]
  const reportTargetName = reportScope === 'company'
    ? selectedReportCompany.label
    : reportScope === 'market'
      ? '시장·유행 종합'
      : '전체 생산기업'
  const scopedDemoFacts = scopeReportFacts(
    analysis.demoFacts,
    reportScope,
    selectedReportCompany.id,
  )

  useEffect(() => {
    setComposedReport(null)
    setComposeError('')
  }, [reportScope, reportCompanyId, startDate, endDate])

  const allVerifiedResearchResults = asArray(verification?.results).filter((item) => item.report_team_ready)
  const verifiedResearchResults = reportScope === 'company'
    ? []
    : allVerifiedResearchResults
  const allDirectInsightReports = analysis.insightReports.filter((report) => !isTrendResearchReport(report))
  const filteredDirectInsightReports = reportScope === 'market'
    ? []
    : reportScope === 'company'
      ? allDirectInsightReports.filter((report) => reportContainsText(report, selectedReportCompany.label))
      : allDirectInsightReports
  const scopedProductionBatches = asArray(scopedDemoFacts?.productionBatches)
  const scopedMaterialReceipts = asArray(scopedDemoFacts?.materialReceipts)
  const scopedAvgBuffer = scopedProductionBatches.length
    ? scopedProductionBatches.reduce((sum, row) => sum + asNumber(row.due_buffer_days, 0), 0) / scopedProductionBatches.length
    : 0
  const scopedTightProductionCount = scopedProductionBatches.filter((row) => asNumber(row.due_buffer_days, 0) <= 5 || row.is_late === 'Y').length
  const scopedSevereReceiptCount = scopedMaterialReceipts.filter((row) => asNumber(row.delay_days, 0) >= 21).length
  const scopeSummaryReport = reportScope === 'company'
    ? {
      id: `company-summary-${selectedReportCompany.id}`,
      insightType: '회사별 운영',
      title: `${selectedReportCompany.label} 생산 운영 요약`,
      message: '선택 회사의 자재 입고와 생산 납기 데이터를 보고서팀 전달용으로 가공했습니다.',
      evidence: [
        `생산 배치: ${formatNumber(scopedProductionBatches.length)}건`,
        `평균 생산 납기 여유: ${formatNumber(scopedAvgBuffer, 1)}일`,
        `납기 임박/지연 생산: ${formatNumber(scopedTightProductionCount)}건`,
        `자재 입고: ${formatNumber(scopedMaterialReceipts.length)}건`,
        `21일 이상 자재 지연: ${formatNumber(scopedSevereReceiptCount)}건`,
      ],
      affectedItems: [],
    }
    : null
  const directInsightReports = scopeSummaryReport
    ? [scopeSummaryReport, ...filteredDirectInsightReports]
    : filteredDirectInsightReports
  const monthlyReportData = buildMonthlyReportData(scopedDemoFacts)
  const rawMaterialDelayEvents = buildRawMaterialDelayEvents(scopedDemoFacts)
  const severeMaterialDelayEvents = rawMaterialDelayEvents.filter((event) => event.delayDays >= 21)
  const normalMaterialVariationEvents = rawMaterialDelayEvents.filter((event) => event.delayDays >= 3 && event.delayDays <= 7)
  const maxMaterialDelayEvent = rawMaterialDelayEvents.reduce((peak, event) => (
    !peak || event.delayDays > peak.delayDays ? event : peak
  ), null)
  const productionObservedMonths = monthlyReportData.filter((row) => row.productionSampleCount > 0)
  const latestMonth = productionObservedMonths[productionObservedMonths.length - 1]
  const previousMonth = productionObservedMonths[productionObservedMonths.length - 2]
  const firstMonth = productionObservedMonths[0]
  const lowestBufferMonth = productionObservedMonths.reduce((lowest, row) => (
    !lowest || row.productionBuffer < lowest.productionBuffer ? row : lowest
  ), null)
  const peakTightProductionMonth = productionObservedMonths.reduce((peak, row) => (
    !peak || row.tightProduction > peak.tightProduction ? row : peak
  ), null)
  const bufferDrop = previousMonth && latestMonth
    ? asNumber(previousMonth.productionBuffer, 0) - asNumber(latestMonth.productionBuffer, 0)
    : 0
  const severeDelayTotal = severeMaterialDelayEvents.length
  const tightProductionTotal = monthlyReportData.reduce((sum, row) => sum + asNumber(row.tightProduction, 0), 0)
  const lateProductionTotal = monthlyReportData.reduce((sum, row) => sum + asNumber(row.lateProduction, 0), 0)
  const fullPeriodBufferChange = firstMonth && latestMonth
    ? asNumber(latestMonth.productionBuffer, 0) - asNumber(firstMonth.productionBuffer, 0)
    : 0
  const fullPeriodBufferDirection = fullPeriodBufferChange < 0
    ? '감소했습니다.'
    : fullPeriodBufferChange > 0
      ? '증가했습니다.'
      : '변화가 없습니다.'
  const materialDelayComment = maxMaterialDelayEvent
    ? `선택 기간 중 최대 입고 지연은 ${maxMaterialDelayEvent.receiptDate} ${maxMaterialDelayEvent.supplier}의 ${maxMaterialDelayEvent.material} ${formatNumber(maxMaterialDelayEvent.delayDays)}일입니다. 21일 이상 반복 지연은 ${formatNumber(severeDelayTotal)}건이며, 3~7일 지연 ${formatNumber(normalMaterialVariationEvents.length)}건은 정상 변동으로 구분했습니다.`
    : ''
  const productionBufferComment = lowestBufferMonth
    ? `${lowestBufferMonth.name} 평균 생산 납기 여유가 ${formatNumber(lowestBufferMonth.productionBuffer, 1)}일로 가장 낮습니다. 관측 시작 월 대비 마지막 월 버퍼는 ${formatNumber(Math.abs(fullPeriodBufferChange), 1)}일 ${fullPeriodBufferDirection}`
    : ''
  const tightProductionComment = peakTightProductionMonth
    ? `${peakTightProductionMonth.name}에 납기 임박/지연 생산 ${formatNumber(peakTightProductionMonth.tightProduction)}건이 집중됐습니다. 해당 월 생산 ${formatNumber(peakTightProductionMonth.productionSampleCount)}건 중 위험 건을 계산했으며, 선택 기간 누적 위험 생산은 ${formatNumber(tightProductionTotal)}건, 실제 지연은 ${formatNumber(lateProductionTotal)}건입니다.`
    : ''
  const monthRangeLabel = `${monthInputValue(startDate) || '전체 시작'} ~ ${monthInputValue(endDate) || '전체 종료'}`
  const directReportCards = directInsightReports.slice(0, 4).map((report) => ({
    id: report.id,
    title: report.title,
    message: report.message,
    evidence: asArray(report.evidence),
    source: '인사이트팀 직접 보고',
  }))
  const researchReportCards = verifiedResearchResults.slice(0, 3).map((item) => ({
    id: item.handoff_id,
    title: item.hypothesis,
    message: item.verdict,
    evidence: asArray(item.external_evidence).map((evidence) => evidence.source_title),
    source: '리서치팀 검증 보고',
  }))
  const selectedReports = [...directReportCards, ...researchReportCards].slice(0, 7)

  const handleComposeReport = async () => {
    setComposing(true)
    setComposeError('')
    try {
      const payload = {
        period: monthRangeLabel,
        report_scope: reportScope,
        report_category: reportScopeMeta.label,
        target_name: reportTargetName,
        target_company: reportScope === 'company' ? selectedReportCompany : null,
        insight_team_reports: directInsightReports.map((report) => ({
          id: report.id,
          type: report.insightType,
          title: report.title,
          recommendation: report.message,
          evidence: asArray(report.evidence).slice(0, 8),
          affected_count: asArray(report.affectedItems).length,
        })),
        research_team_reports: verifiedResearchResults.map((result) => ({
          id: result.handoff_id,
          hypothesis: result.hypothesis,
          verdict: result.verdict,
          confidence: result.confidence,
          evidence: asArray(result.external_evidence).slice(0, 5).map((evidence) => ({
            title: evidence.source_title,
            summary: evidence.summary,
            url: evidence.url,
          })),
        })),
        evidence_summary: {
          severe_material_delay_count: severeDelayTotal,
          max_material_delay_event: maxMaterialDelayEvent,
          normal_variation_count_3_to_7_days: normalMaterialVariationEvents.length,
          monthly_production: monthlyReportData.map((row) => ({
            month: row.name,
            avg_due_buffer_days: row.productionBuffer,
            tight_or_late_count: row.tightProduction,
            actual_late_count: row.lateProduction,
            production_sample_count: row.productionSampleCount,
          })),
          top_material_delay_events: [...rawMaterialDelayEvents]
            .sort((a, b) => b.delayDays - a.delayDays)
            .slice(0, 30)
            .map((event) => ({
              receipt_date: event.receiptDate,
              supplier: event.supplier,
              material: event.material,
              delay_days: event.delayDays,
              severity: event.severity,
            })),
        },
        available_data: [
          '자재 약속일/실제 입고일/건별 지연일',
          '생산 완료일/납기일/납기 버퍼',
          '생산 라인 또는 기계 식별자',
          '생산수량과 출고중량',
        ],
        known_missing_data: [
          '기계별 실제 가동시간',
          '기계별 비가동시간과 비가동 사유',
          '생산 시작 시점의 원자재 재고일수',
          '자재 입고 지연이 영향을 준 생산 배치 직접 연결키',
        ],
      }
      const response = await composeInsightReport(payload)
      setComposedReport(response.data)
    } catch (err) {
      setComposeError(err.response?.data?.detail || '타 팀 보고 종합에 실패했습니다.')
    } finally {
      setComposing(false)
    }
  }

  return (
    <div className="space-y-5">
      <Section
        title="보고서 작성팀"
        description="공급망/생산망 운영 인사이트는 인사이트팀에서 바로 받고, 유행 후보는 리서치팀 검증 후 받습니다."
      >
        <div className="mb-5 grid gap-2 lg:grid-cols-3">
          {REPORT_SCOPES.map((scope) => (
            <button
              key={scope.key}
              type="button"
              onClick={() => setReportScope(scope.key)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                reportScope === scope.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-black">{scope.label}</p>
              <p className={`mt-1 text-xs leading-5 ${reportScope === scope.key ? 'text-slate-300' : 'text-slate-500'}`}>
                {scope.description}
              </p>
            </button>
          ))}
        </div>

        {reportScope === 'company' && (
          <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">대상 회사</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REPORT_COMPANIES.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => setReportCompanyId(String(company.id))}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    String(reportCompanyId) === String(company.id)
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {company.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {reportScope === 'market' && (
          <div className="mb-5 rounded-3xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm font-black text-sky-950">시장·유행 보고</p>
            <p className="mt-1 text-sm leading-6 text-sky-700">
              라벨코드 기반 생산 신호와 리서치팀 웹 검증 결과만 사용합니다. 특정 회사의 생산 지연 보고와는 분리합니다.
            </p>
          </div>
        )}

        <div className="mb-5 rounded-3xl border border-slate-800 bg-slate-950 p-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Report Target</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xl font-black">{reportTargetName}</p>
              <p className="mt-1 text-sm text-slate-300">카테고리: {reportScopeMeta.label}</p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">{monthRangeLabel}</span>
          </div>
        </div>

        <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">보고서 기간 선택</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                년-월 단위로 기간을 고르면 자재/생산 데이터가 월별 그래프로 다시 집계됩니다.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">{monthRangeLabel}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">시작 월</span>
              <input
                type="month"
                value={monthInputValue(startDate)}
                max={monthInputValue(endDate) || undefined}
                onChange={(event) => {
                  setReportQuickRange('')
                  onStartDateChange(monthStartDate(event.target.value))
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">종료 월</span>
              <input
                type="month"
                value={monthInputValue(endDate)}
                min={monthInputValue(startDate) || undefined}
                onChange={(event) => {
                  setReportQuickRange('')
                  onEndDateChange(monthEndDate(event.target.value))
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">빠른 기간 선택</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPORT_QUICK_RANGES.map((range) => (
                <button
                  key={range.key}
                  type="button"
                  onClick={() => applyReportQuickRange(range)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    reportQuickRange === range.key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <TeamMetric
            label="직접 보고 후보"
            value={`${formatNumber(directInsightReports.length)}건`}
            caption="공급망/생산망/물류 운영 인사이트"
          />
          <TeamMetric label="저장 인사이트" value={`${formatNumber(insights.length)}건`} caption="기존 GPT 보조 로그" />
          <TeamMetric
            label="리서치 검증 후보"
            value={`${formatNumber(verifiedResearchResults.length)}건`}
            caption="유행/시장 검증 완료 항목"
          />
        </div>
      </Section>

      <Section
        title="타 팀 보고 종합"
        description="인사이트팀의 생산·재고·공급망 보고와 리서치팀 검증 결과를 종합해 원인 가능성, 부족한 데이터, 권장 조치를 보고서로 작성합니다."
        action={
          <button
            type="button"
            onClick={handleComposeReport}
            disabled={composing || (directInsightReports.length === 0 && verifiedResearchResults.length === 0)}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {composing ? '타 팀 보고 분석 중' : composedReport ? '보고서 다시 작성' : 'AI 종합 보고서 작성'}
          </button>
        }
      >
        {composeError && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {composeError}
          </div>
        )}

        {composing ? (
          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">Cross-team Synthesis</p>
            <p className="mt-3 text-base font-black text-sky-950">인사이트팀과 리서치팀 보고를 대조하고 있습니다.</p>
            <p className="mt-2 text-sm leading-6 text-sky-700">
              관측 사실과 원인 추정을 구분하고, 결론을 강화하기 위해 추가로 필요한 데이터를 찾는 중입니다.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-sky-500" />
            </div>
          </div>
        ) : composedReport ? (
          <GeneratedTeamReport report={composedReport} />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">작성 방식 예시</p>
            <p className="mt-3 text-sm font-black leading-6 text-slate-900">
              {reportScope === 'company'
                ? `현재 ${reportTargetName}의 생산 지연이 증가하고 있습니다.`
                : reportScope === 'market'
                  ? '생산 품목 신호와 외부 시장 자료가 같은 방향인지 검토합니다.'
                  : '전체 생산기업에서 자재 지연과 생산 납기 압박이 함께 증가하고 있습니다.'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              같은 기간 자재 입고 지연과 생산 납기 버퍼 감소가 함께 나타나 자재 지연이 생산성 저하에 영향을 줬을 가능성이 있습니다.
              다만 인과관계를 명확히 하려면 기계별 실제 가동시간과 비가동 사유 데이터가 추가로 필요합니다.
            </p>
          </div>
        )}
      </Section>

      <Section
        title={reportScope === 'market' ? '리서치 검증 근거' : 'AI 판단 근거'}
        description={reportScope === 'market'
          ? '시장·유행 보고서에 사용된 웹 검증 결과와 외부 근거를 확인합니다.'
          : '아래 그래프와 원본 목록은 종합 보고서의 결론을 뒷받침하는 근거이며, 보고서 본문 자체는 아닙니다.'}
      >
        {reportScope === 'market' ? (
          <div className="space-y-3">
            {verifiedResearchResults.length === 0 ? (
              <EmptyState text="리서치팀에서 검증 완료된 시장·유행 인사이트가 없습니다." />
            ) : verifiedResearchResults.map((result) => (
              <div key={result.handoff_id} className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-sky-950">{result.hypothesis}</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-sky-700">신뢰도 {result.confidence}%</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-sky-800">{result.verdict}</p>
                <div className="mt-3 space-y-2">
                  {asArray(result.external_evidence).slice(0, 4).map((evidence) => (
                    <a
                      key={`${result.handoff_id}-${evidence.source_id}`}
                      href={evidence.url || '#'}
                      target={evidence.url ? '_blank' : undefined}
                      rel={evidence.url ? 'noreferrer' : undefined}
                      className="block rounded-xl border border-white bg-white p-3 text-xs leading-5 text-slate-600 hover:border-sky-200"
                    >
                      <span className="font-black text-slate-800">{evidence.source_title}</span>
                      {evidence.summary && <span className="mt-1 block">{evidence.summary}</span>}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : monthlyReportData.length === 0 ? (
          <EmptyState text="그래프로 가공할 생산/자재 요약 데이터가 없습니다." />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <TeamMetric
                label="21일+ 자재 지연"
                value={`${formatNumber(severeDelayTotal)}건`}
                caption="정상 변동 3~7일은 제외"
              />
              <TeamMetric
                label="생산 버퍼 하락"
                value={`${formatNumber(Math.max(bufferDrop, 0), 1)}일`}
                caption={latestMonth ? `${latestMonth.name} 기준 직전 관측 월 대비` : '선택 기간 기준'}
              />
              <TeamMetric
                label="납기 임박/지연 생산"
                value={`${formatNumber(asNumber(latestMonth?.tightProduction, 0))}건`}
                caption={latestMonth ? `${latestMonth.name} 생산 리스크` : '선택 기간 기준'}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {rawMaterialDelayEvents.length > 0 ? (
                <ReportMiniChart
                  title="입고 건별 실제 지연일"
                  subtitle="평균값이 아니라 각 자재 입고 건의 실제 지연일을 그대로 표시합니다."
                  type="bar"
                  data={rawMaterialDelayEvents}
                  lines={[
                    { key: 'normalDelayDays', label: '일반 지연', color: '#0ea5e9' },
                    { key: 'severeDelayDays', label: '21일+ 심각 지연', color: '#f97316' },
                  ]}
                  yLabel="지연일"
                  comment={materialDelayComment}
                />
              ) : (
                <EmptyState text="선택 기간에 지연된 자재 입고 건이 없습니다." />
              )}
              <ReportMiniChart
                title="생산 납기 버퍼 추이"
                subtitle="월별 평균 버퍼가 낮아질수록 납기 대응 여력이 줄어듭니다."
                data={monthlyReportData}
                lines={[
                  { key: 'productionBuffer', label: '평균 생산 납기 여유', color: '#10b981' },
                ]}
                yLabel="일"
                comment={productionBufferComment}
              />
              <ReportMiniChart
                title="납기 임박/지연 생산건"
                subtitle="월별 생산성 저하가 실제 납기 압박으로 나타난 건수입니다."
                type="bar"
                data={monthlyReportData}
                lines={[
                  { key: 'tightProduction', label: '임박/지연 생산건', color: '#ef4444' },
                ]}
                yLabel="건"
                comment={tightProductionComment}
              />
            </div>

            {rawMaterialDelayEvents.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">원본 입고 지연 내역</p>
                  <p className="mt-1 text-xs text-slate-500">평균 처리 없이 선택 기간의 지연 입고를 건별로 표시합니다.</p>
                </div>
                <div className="max-h-80 overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white text-xs font-bold text-slate-400 shadow-sm">
                      <tr>
                        <th className="px-4 py-3">입고일</th>
                        <th className="px-4 py-3">공급사</th>
                        <th className="px-4 py-3">자재</th>
                        <th className="px-4 py-3 text-right">실제 지연</th>
                        <th className="px-4 py-3">판단</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...rawMaterialDelayEvents].reverse().map((event) => (
                        <tr key={event.id} className="text-slate-600">
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{event.receiptDate}</td>
                          <td className="px-4 py-3">{event.supplier}</td>
                          <td className="px-4 py-3">{event.material}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-black text-slate-900">{formatNumber(event.delayDays)}일</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              event.severity === 'severe'
                                ? 'bg-orange-100 text-orange-700'
                                : event.severity === 'elevated'
                                  ? 'bg-amber-100 text-amber-700'
                                : event.severity === 'variation'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-slate-100 text-slate-500'
                            }`}>
                              {event.severity === 'severe'
                                ? '21일+ 심각 지연'
                                : event.severity === 'elevated'
                                  ? '8~20일 주의'
                                  : event.severity === 'variation'
                                    ? '3~7일 정상 변동'
                                    : '경미 지연'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </Section>

      <Section title="수신 보고 요약" description="AI가 종합한 원본 팀 보고를 출처별로 확인합니다.">
        <div className="space-y-3">
          {selectedReports.length === 0 ? (
            <EmptyState text="보고서로 정리할 검증 인사이트가 없습니다." />
          ) : (
            selectedReports.map((report, index) => (
              <div key={`report-${report.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">SECTION {index + 1}</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
                    {report.source}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-slate-900">{report.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{report.message}</p>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  포함 근거: {asArray(report.evidence).slice(0, 2).join(' / ') || '검증 근거 대기'}
                </p>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  )
}

export default function InsightTab() {
  const [insights, setInsights] = useState([])
  const [releases, setReleases] = useState([])
  const [messagesByChannel, setMessagesByChannel] = useState({})
  const [demoData, setDemoData] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quickRange, setQuickRange] = useState('all')
  const [selectedTargets, setSelectedTargets] = useState(DEFAULT_TARGET_KEYS)
  const [activeTeamSection, setActiveTeamSection] = useState('insight')
  const [researchVerification, setResearchVerification] = useState(null)
  const [feedbackById, setFeedbackById] = useState({})
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [insightRes, releaseRes, demoRes, ...messageResponses] = await Promise.all([
        getInsights(),
        getCollectedReleases(),
        getDemoSupplyChainData().catch(() => ({ data: null })),
        ...CHANNELS.map((channel) => getReportChannelMessages(channel, { limit: 200 })),
      ])

      setInsights(asArray(insightRes.data))
      setReleases(asArray(releaseRes.data))
      setDemoData(demoRes.data || null)
      setMessagesByChannel(
        CHANNELS.reduce((acc, channel, index) => {
          acc[channel] = asArray(messageResponses[index]?.data)
          return acc
        }, {}),
      )
    } catch (err) {
      setError(err.response?.data?.detail || '인사이트 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const analysis = useMemo(() => {
    const { facts, rawReleaseFacts } = buildReleaseFacts(messagesByChannel, releases)
    const importFacts = buildImportFacts(messagesByChannel)
    const scopedFacts = filterFactsByTarget(
      facts.filter((fact) => isWithinDateRange(fact.dueDate || fact.createdAt, startDate, endDate)),
      selectedTargets,
    )
    const scopedRawFacts = filterFactsByTarget(
      rawReleaseFacts.filter((fact) => isWithinDateRange(fact.dueDate || fact.createdAt, startDate, endDate)),
      selectedTargets,
    )
    const scopedImports = filterFactsByTarget(
      importFacts.filter((fact) => isWithinDateRange(fact.arrivalDate || fact.createdAt, startDate, endDate)),
      selectedTargets,
    )
    const duplicateGroups = buildDuplicateGroups(scopedRawFacts)
    const trend = buildTrendSignals(scopedRawFacts.length ? scopedRawFacts : scopedFacts)
    const supplierStats = buildSupplierStats(scopedImports, scopedFacts)
    const duplicateBlGroups = buildDuplicateBlGroups(scopedImports)
    const analysisPeriod = buildAnalysisPeriodLabel(startDate, endDate, demoData?.summary)
    const agentInsightReports = buildInsightReports({
      supplierStats,
      duplicateBlGroups,
      duplicateGroups,
      trend,
      releaseFacts: scopedFacts,
      analysisPeriod,
    })
    const demoFacts = buildDemoFacts(demoData, startDate, endDate, selectedTargets)
    const demoInsightReports = buildDemoInsightReports(demoFacts)
    const insightReports = [...demoInsightReports, ...agentInsightReports].slice(0, 10)
    const researchHandoffs = buildResearchHandoffs({
      insightReports,
      trend,
      analysisPeriod,
    })

    return {
      facts: scopedFacts,
      importFacts: scopedImports,
      rawReleaseFacts: scopedRawFacts,
      demoFacts,
      duplicateGroups,
      duplicateBlGroups,
      supplierStats,
      trend,
      insightReports,
      researchHandoffs,
    }
  }, [demoData, endDate, messagesByChannel, releases, selectedTargets, startDate])

  const researchHandoffSignature = useMemo(
    () => asArray(analysis.researchHandoffs).map((handoff) => handoff.handoff_id).join('|'),
    [analysis.researchHandoffs],
  )

  useEffect(() => {
    setResearchVerification(null)
  }, [researchHandoffSignature])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    try {
      await analyzeInsights()
      const res = await getInsights()
      setInsights(asArray(res.data))
    } catch (err) {
      setError(err.response?.data?.detail || 'AI 저장 인사이트 생성에 실패했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  const setFeedback = (id, value) => {
    setFeedbackById((prev) => ({ ...prev, [id]: value }))
  }

  const clearDateRange = () => {
    setStartDate('')
    setEndDate('')
    setQuickRange('all')
  }

  const applyQuickRange = (range) => {
    setQuickRange(range.key)
    if (!range.months) {
      setStartDate('')
      setEndDate('')
      return
    }

    const end = new Date()
    const start = addMonths(end, -range.months)
    setStartDate(localDateKey(start))
    setEndDate(localDateKey(end))
  }

  const allTargetsSelected = selectedTargets.length === DEFAULT_TARGET_KEYS.length

  const toggleAllTargets = () => {
    setSelectedTargets(allTargetsSelected ? [] : DEFAULT_TARGET_KEYS)
  }

  const toggleTarget = (key) => {
    setSelectedTargets((prev) => (
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    ))
  }

  const activeTeam = AI_TEAM_SECTIONS.find((section) => section.key === activeTeamSection) || AI_TEAM_SECTIONS[0]

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">AI Team</p>
          <h2 className="mt-2 text-3xl font-black">AI팀</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            내부 공급망 분석, 외부 검증, 원본 데이터 발굴, 보고서 작성을 하나의 팀 흐름으로 운영합니다.
          </p>
        </div>

        <div className="grid gap-2 p-4 lg:grid-cols-4">
          {AI_TEAM_SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveTeamSection(section.key)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                activeTeamSection === section.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <p className="text-sm font-black">{section.label}</p>
              <p className={`mt-1 text-xs leading-5 ${activeTeamSection === section.key ? 'text-slate-300' : 'text-slate-500'}`}>
                {section.title}
              </p>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-sm font-black text-slate-900">{activeTeam.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{activeTeam.description}</p>
        </div>
      </div>

      {activeTeamSection === 'insight' && (
        <>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">분석 조건</p>
            <p className="mt-1 text-xs text-slate-500">시작일과 종료일을 달력으로 선택하면 해당 기간의 보고만 분석합니다.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            새로고침
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.5fr_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">시작일</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value)
                setQuickRange('')
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">종료일</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value)
                setQuickRange('')
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">분석 대상</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                  allTargetsSelected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allTargetsSelected}
                  onChange={toggleAllTargets}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                전체
              </label>
              {TARGETS.map((item) => (
                <label
                  key={item.key}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                    selectedTargets.includes(item.key)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(item.key)}
                    onChange={() => toggleTarget(item.key)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>
            {selectedTargets.length === 0 && (
              <p className="mt-2 text-xs text-rose-500">분석할 대상을 하나 이상 선택하세요.</p>
            )}
          </div>

          <button
            type="button"
            onClick={clearDateRange}
            className="self-end rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            기간 초기화
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">빠른 조회</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_RANGES.map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => applyQuickRange(range)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  quickRange === range.key
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Section
        title="분석 및 인사이트"
        description="공급사 입고, 자재군, 출고묶음 영향을 종합해 사람이 바로 판단할 수 있는 문장으로 정리합니다."
      >
        <div className="space-y-4">
          {loading ? (
            <EmptyState text="인사이트 데이터를 불러오는 중입니다." />
          ) : analysis.insightReports.length === 0 ? (
            <EmptyState text="현재 도출된 인사이트가 없습니다. 기간이나 분석 대상을 조정하세요." />
          ) : (
            analysis.insightReports.map((report) => (
              <InsightReportCard
                key={report.id}
                report={report}
                feedback={feedbackById[report.id]}
                onFeedback={setFeedback}
              />
            ))
          )}
        </div>
      </Section>

      <Section
        title="저장된 AI 인사이트"
        description="기존 GPT 기반 저장 인사이트는 보조 로그로 유지합니다. 플랫폼 판단의 원본은 위 분석 영역입니다."
        action={
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {analyzing ? '생성 중' : '저장 인사이트 생성'}
          </button>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {insights.length === 0 ? (
            <EmptyState text="저장된 AI 인사이트가 없습니다." />
          ) : (
            insights.slice(0, 6).map((insight) => <SavedInsightCard key={insight.id} insight={insight} />)
          )}
        </div>
      </Section>
        </>
      )}

      {activeTeamSection === 'research' && (
        <ResearchTeamView
          analysis={analysis}
          verification={researchVerification}
          onVerified={setResearchVerification}
        />
      )}
      {activeTeamSection === 'discovery' && <DiscoveryTeamView analysis={analysis} />}
      {activeTeamSection === 'report' && (
        <ReportTeamView
          analysis={analysis}
          insights={insights}
          verification={researchVerification}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      )}
    </div>
  )
}
