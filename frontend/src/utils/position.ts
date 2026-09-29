import type { DecayLocation, LocationMode } from '@/types/position'
import type { Decay, Severity } from '@/types/decay'
import { SEVERITY_COLOR } from '@/utils/severity'

/** 九宫格行列数 */
export const GRID_SIZE = 3
/** 九宫格总数 */
export const GRID_CELLS = GRID_SIZE * GRID_SIZE
/** 中央格编号（旧记录缺位置时的落点） */
export const CENTER_CELL = 5

/** 同格多条病害时，不同严重程度的横向分槽（占格宽比例） */
const SEVERITY_ANCHOR_X: Record<Severity, number> = {
  轻度: 0.27,
  中度: 0.5,
  重度: 0.73
}
/** 同格多条病害时，不同严重程度的纵向分槽（占格高比例） */
const SEVERITY_ANCHOR_Y: Record<Severity, number> = {
  轻度: 0.3,
  中度: 0.52,
  重度: 0.74
}

/** 待定位标记单独放在格内下中位置，与按程度分槽的正式标记错开 */
const PENDING_X = 0.5
const PENDING_Y = 0.9

/** 同槽内多条标记的最大散开半径（占格宽比例） */
const SPREAD_RADIUS = 0.16

/** 构造一个九宫格位置 */
export function gridLocation(cell: number, pending = false): DecayLocation {
  return {
    mode: 'grid',
    cell: clampCell(cell),
    startRatio: 0,
    endRatio: 0,
    pending
  }
}

/** 构造一个横向起止比例位置（纵向锚定中行） */
export function rangeLocation(startRatio: number, endRatio: number, pending = false): DecayLocation {
  const start = clampRatio(Math.min(startRatio, endRatio))
  const end = clampRatio(Math.max(startRatio, endRatio))
  return {
    mode: 'range',
    cell: cellFromRange(start, end),
    startRatio: start,
    endRatio: Math.max(end, Math.min(start + 0.02, 1)),
    pending
  }
}

/** 旧记录 / 旧备份没有位置：落在中央并标明待定位 */
export function pendingCenterLocation(): DecayLocation {
  return {
    mode: 'grid',
    cell: CENTER_CELL,
    startRatio: 0,
    endRatio: 0,
    pending: true
  }
}

/**
 * 归一化任意来源（表单 / 旧版备份 / 直接写库）的位置数据：
 * 非法或缺字段均收敛为「中央 + 待定位」；range 则校正比例并回算锚定格。
 */
export function normalizeLocation(input: unknown): DecayLocation {
  if (typeof input !== 'object' || input === null) return pendingCenterLocation()
  const raw = input as Partial<DecayLocation>
  const mode: LocationMode = raw.mode === 'range' ? 'range' : 'grid'
  const pending = raw.pending === true
  if (mode === 'range') {
    if (typeof raw.startRatio !== 'number' || typeof raw.endRatio !== 'number' || !Number.isFinite(raw.startRatio) || !Number.isFinite(raw.endRatio)) {
      return pendingCenterLocation()
    }
    return rangeLocation(raw.startRatio, raw.endRatio, pending)
  }
  if (typeof raw.cell !== 'number' || !Number.isInteger(raw.cell) || raw.cell < 1 || raw.cell > GRID_CELLS) {
    return pendingCenterLocation()
  }
  return gridLocation(raw.cell, pending)
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function clampCell(cell: number): number {
  return Math.min(GRID_CELLS, Math.max(1, Math.round(cell)))
}

/** 编号 → 行列（从 0 开始）：1=(0,0) … 9=(2,2) */
export function cellRowCol(cell: number): { row: number; col: number } {
  const index = clampCell(cell) - 1
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE }
}

/** 行列（从 0 开始）→ 编号 */
export function cellFromRowCol(row: number, col: number): number {
  return row * GRID_SIZE + col + 1
}

/** 横向比例 → 所在列（0~2） */
export function colFromRatio(ratio: number): number {
  return Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(ratio * GRID_SIZE)))
}

/** 条带的锚定格：取横向中点所在列、纵向中行 */
export function cellFromRange(startRatio: number, endRatio: number): number {
  const mid = (startRatio + endRatio) / 2
  return cellFromRowCol(1, colFromRatio(mid))
}

/** 行中文名 */
export const GRID_ROW_LABELS = ['上沿', '中部', '下沿'] as const
/** 列中文名 */
export const GRID_COL_LABELS = ['左', '中', '右'] as const

/** 九宫格编号的可读名称，如「5 · 中部·中（中央）」 */
export function cellLabel(cell: number): string {
  const { row, col } = cellRowCol(cell)
  const middle = cell === CENTER_CELL ? '（中央）' : ''
  return `${cell} · ${GRID_ROW_LABELS[row]}·${GRID_COL_LABELS[col]}${middle}`
}

/** 位置的简短文字（表格 / 标签用） */
export function locationText(location: DecayLocation): string {
  const loc = normalizeLocation(location)
  if (loc.mode === 'range') {
    return `横向 ${Math.round(loc.startRatio * 100)}%–${Math.round(loc.endRatio * 100)}%`
  }
  const { row, col } = cellRowCol(loc.cell)
  return `${GRID_ROW_LABELS[row]}·${GRID_COL_LABELS[col]}`
}

/** 是否待定位 */
export function isPendingLocation(location: DecayLocation | undefined): boolean {
  if (!location) return true
  return normalizeLocation(location).pending
}

/**
 * 位置筛选：
 * - 条带病害按其锚定格（横向中点所在的中列）计入，保证一条病害只归一格、可统计可筛选
 * - 待定位病害始终落在中央格；onlyPending 时单独保留
 */
export function locationMatches(location: DecayLocation | undefined, cells: number[], onlyPending: boolean): boolean {
  const loc = normalizeLocation(location)
  if (onlyPending) return loc.pending
  if (cells.length === 0) return true
  if (loc.pending) return cells.includes(CENTER_CELL)
  return cells.includes(loc.cell)
}

export interface MarkerInput {
  id: string
  severity: Severity
  /** 归一化后的位置 */
  location: DecayLocation
  repaired?: boolean
  /** 悬停 / 气泡展示文案 */
  label?: string
}

/** 摆放好的点标记（坐标均为示意图百分比） */
export interface PlacedMarker {
  id: string
  x: number
  y: number
  color: string
  repaired: boolean
  pending: boolean
  severity: Severity | null
  label?: string
}

/** 条带（横向起止比例）病害的渲染数据 */
export interface RangeBand {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  repaired: boolean
  pending: boolean
  label?: string
}

/** 条带高度（占示意图高比例） */
const BAND_HEIGHT = 0.09
/** 条带泳道间距（占示意图高比例） */
const BAND_GAP = 0.02
/** 条带距上下边的最小留白 */
const BAND_MARGIN = 0.04
/** 最多同时摆几条泳道（超出则循环复用） */
const MAX_BAND_LANES = 4

interface Span {
  start: number
  end: number
}

function spansOverlap(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * 计算构件示意图上全部点标记的摆放位置。
 * 规则：同一格内按严重程度分开摆放（轻/中/重各占一个固定槽位），
 * 同槽多条再绕槽心做确定性环形散开；待定位标记统一落到格内下中槽。
 */
export function placeMarkers(inputs: MarkerInput[]): { markers: PlacedMarker[]; bands: RangeBand[] } {
  const gridInputs = inputs.filter((item) => {
    const loc = normalizeLocation(item.location)
    return loc.mode === 'grid'
  })
  const rangeInputs = inputs.filter((item) => {
    const loc = normalizeLocation(item.location)
    return loc.mode === 'range'
  })

  const markers: PlacedMarker[] = []
  const groups = new Map<string, MarkerInput[]>()
  for (const item of gridInputs) {
    const loc = normalizeLocation(item.location)
    const key = `${loc.cell}#${loc.pending ? 'pending' : item.severity}`
    const list = groups.get(key) ?? []
    list.push(item)
    groups.set(key, list)
  }

  groups.forEach((list, key) => {
    const cell = Number(key.split('#')[0])
    const { row, col } = cellRowCol(cell)
    const cellLeft = col / GRID_SIZE
    const cellTop = row / GRID_SIZE
    const pending = key.endsWith('#pending')
    list.forEach((item, order) => {
      let slotX: number
      let slotY: number
      if (pending) {
        slotX = PENDING_X
        slotY = PENDING_Y
      } else {
        slotX = SEVERITY_ANCHOR_X[item.severity]
        slotY = SEVERITY_ANCHOR_Y[item.severity]
      }
      const { dx, dy } = spreadOffset(order, list.length)
      const xRatio = clamp((cellLeft + (slotX + dx) / GRID_SIZE) * 100, 3, 97)
      const yRatio = clamp((cellTop + (slotY + dy) / GRID_SIZE) * 100, 5, 95)
      markers.push({
        id: item.id,
        x: xRatio,
        y: yRatio,
        color: SEVERITY_COLOR[item.severity],
        repaired: item.repaired === true,
        pending,
        severity: pending ? null : item.severity,
        label: item.label
      })
    })
  })

  const bands: RangeBand[] = []
  const laneSpans: Span[] = []
  const orderedRanges = rangeInputs
    .map((item) => ({ item, loc: normalizeLocation(item.location) }))
    .sort((a, b) => a.loc.startRatio - b.loc.startRatio || a.loc.endRatio - b.loc.endRatio)

  orderedRanges.forEach(({ item, loc }) => {
    const span: Span = { start: loc.startRatio, end: loc.endRatio }
    let lane = laneSpans.findIndex((existing) => !spansOverlap(existing, span))
    if (lane < 0) {
      lane = laneSpans.length
      laneSpans.push(span)
    } else {
      laneSpans[lane] = span
    }
    const laneIndex = lane % MAX_BAND_LANES
    const y = clamp(
      BAND_MARGIN + laneIndex * (BAND_HEIGHT + BAND_GAP),
      BAND_MARGIN,
      1 - BAND_MARGIN - BAND_HEIGHT
    )
    bands.push({
      id: item.id,
      x: loc.startRatio * 100,
      y: y * 100,
      width: Math.max(2, (loc.endRatio - loc.startRatio) * 100),
      height: BAND_HEIGHT * 100,
      color: SEVERITY_COLOR[item.severity],
      repaired: item.repaired === true,
      pending: loc.pending,
      label: item.label
    })
  })

  return { markers, bands }
}

/** 同槽多条时的确定性环形散开：第 0 条居中，其余绕心均布 */
function spreadOffset(order: number, total: number): { dx: number; dy: number } {
  if (order === 0) return { dx: 0, dy: 0 }
  const angle = (order / Math.max(1, total - 1)) * Math.PI * 2
  return {
    dx: Math.cos(angle) * SPREAD_RADIUS,
    dy: Math.sin(angle) * SPREAD_RADIUS * 0.8
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface CellCount {
  /** 该格全部病害数（含待定位与条带锚定） */
  total: number
  /** 该格未修复病害数（殿宇页每格展示用） */
  unrepaired: number
}

/**
 * 汇总每个九宫格的病害数量。
 * 每条病害只归入一个锚定格（条带取中点所在的中列格，待定位归中央）。
 */
export function countByCell(decays: Pick<Decay, 'repaired' | 'location'>[]): CellCount[] {
  const counts: CellCount[] = Array.from({ length: GRID_CELLS }, () => ({ total: 0, unrepaired: 0 }))
  decays.forEach((decay) => {
    const loc = normalizeLocation(decay.location)
    const bucket = counts[loc.cell - 1]
    bucket.total += 1
    if (!decay.repaired) bucket.unrepaired += 1
  })
  return counts
}

/** 待定位病害数量 */
export function countPending(decays: Pick<Decay, 'location'>[]): number {
  return decays.reduce((sum, decay) => sum + (normalizeLocation(decay.location).pending ? 1 : 0), 0)
}

/** 未修复的待定位数量 */
export function countPendingUnrepaired(decays: Pick<Decay, 'repaired' | 'location'>[]): number {
  return decays.reduce(
    (sum, decay) => sum + (!decay.repaired && normalizeLocation(decay.location).pending ? 1 : 0),
    0
  )
}
