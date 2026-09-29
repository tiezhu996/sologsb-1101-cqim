import {
  CELL_LABELS,
  CENTER_CELL,
  cellCol,
  cellRow,
  defaultLocation,
  pendingLocation,
  type DecayLocation,
  type LocationCell
} from '@/types/decay'
import type { Severity } from '@/types/decay'

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

/**
 * 位置归一化：导入备份 / 数据库升级时统一调用。
 * 缺少 location（旧记录）→ 中央格 + 待定位；字段越界则夹取修正。
 */
export function normalizeLocation(input: unknown): DecayLocation {
  if (typeof input !== 'object' || input === null) return pendingLocation()
  const raw = input as Partial<DecayLocation>
  const cell = (
    typeof raw.cell === 'number' && Number.isInteger(raw.cell) && raw.cell >= 1 && raw.cell <= 9
      ? raw.cell
      : CENTER_CELL
  ) as LocationCell
  const hasRange =
    typeof raw.xStart === 'number' &&
    typeof raw.xEnd === 'number' &&
    Number.isFinite(raw.xStart) &&
    Number.isFinite(raw.xEnd)
  const xStart = hasRange ? clamp01(raw.xStart as number) : null
  const xEnd = hasRange ? clamp01(raw.xEnd as number) : null
  return {
    cell,
    xStart: xStart !== null && xEnd !== null ? Math.min(xStart, xEnd) : null,
    xEnd: xStart !== null && xEnd !== null ? Math.max(xStart, xEnd) : null,
    pending: typeof raw.pending === 'boolean' ? raw.pending : false
  }
}

/** 位置的横向中心比例（0~1）：有起止比例取区间中点，否则取所属格列中心 */
export function locationCenterX(location: DecayLocation): number {
  if (location.xStart !== null && location.xEnd !== null) {
    return clamp01((location.xStart + location.xEnd) / 2)
  }
  return (cellCol(location.cell) - 0.5) / 3
}

/** 位置的纵向中心比例（0~1）：取所属格行中心 */
export function locationCenterY(location: DecayLocation): number {
  return (cellRow(location.cell) - 0.5) / 3
}

/**
 * 同一格内多条病害的摆放偏移：
 * 按严重程度分组（重/中/轻各占一列），组内按序号错位，避免点标记完全重叠。
 * 返回相对格中心的偏移量（占整板宽/高的比例）。
 */
export function markerOffset(
  sameCellDecays: ReadonlyArray<{ severity: Severity }>,
  index: number
): { dx: number; dy: number } {
  const order: Severity[] = ['重度', '中度', '轻度']
  const severity = sameCellDecays[index]?.severity
  const group = order.indexOf(severity ?? '轻度')
  const indexInGroup = sameCellDecays.slice(0, index).filter((item) => item.severity === severity).length

  // 三组在格内横向错开：左 / 中 / 右
  const groupX = [-0.11, 0, 0.11][group] ?? 0
  // 组内多条沿纵向轻微错位：0 居中，其后 1 上 2 下 3 再上 4 再下，保持在格内
  const dy =
    indexInGroup === 0
      ? 0
      : Math.ceil(indexInGroup / 2) * 0.055 * (indexInGroup % 2 === 1 ? -1 : 1)
  return { dx: groupX, dy }
}

/** 点位坐标（百分比，供 SVG / 绝对定位使用） */
export function markerPosition(
  location: DecayLocation,
  sameCellDecays: ReadonlyArray<{ severity: Severity }>,
  index: number
): { x: number; y: number } {
  const { dx, dy } = markerOffset(sameCellDecays, index)
  return {
    x: clamp01(locationCenterX(location) + dx) * 100,
    y: clamp01(locationCenterY(location) + dy) * 100
  }
}

/** 位置文字描述，如「正中（横向 42%~58%）· 待定位」 */
export function describeLocation(location: DecayLocation): string {
  const parts = [CELL_LABELS[location.cell]]
  if (location.xStart !== null && location.xEnd !== null) {
    parts.push(`横向 ${Math.round(location.xStart * 100)}%~${Math.round(location.xEnd * 100)}%`)
  }
  if (location.pending) parts.push('待定位')
  return parts.join(' · ')
}

/** 起录病害时把表单值收敛为 DecayLocation */
export function buildLocation(cell: LocationCell, xStart: number | null, xEnd: number | null): DecayLocation {
  const hasRange = xStart !== null && xEnd !== null
  if (!hasRange) return { cell, xStart: null, xEnd: null, pending: false }
  const start = clamp01(xStart)
  const end = clamp01(xEnd)
  return { cell, xStart: Math.min(start, end), xEnd: Math.max(start, end), pending: false }
}

export { defaultLocation, pendingLocation }
