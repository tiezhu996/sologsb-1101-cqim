/** 病害记录：某彩画层位上的一处病害现状 */
export type DecayType = '起甲' | '剥落' | '空鼓' | '粉化' | '龟裂'
export type Severity = '轻度' | '中度' | '重度'

/** 三行三列区域编号：1=左上（行1列1）…9=右下（行3列3） */
export type LocationCell = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/**
 * 病害在构件示意上的位置。
 * - cell：三行三列所属格（1~9，按行序）；
 * - xStart / xEnd：横向起止比例（0~1，左→右），可在格选基础上进一步细化，缺省时取该格横向中点；
 * - pending：历史记录没有位置时落在中央格并置 true，表示「待定位」，现场补录后置为 false。
 */
export interface DecayLocation {
  cell: LocationCell
  xStart: number | null
  xEnd: number | null
  pending: boolean
}

export interface Decay {
  id: string
  layerId: string
  type: DecayType
  severity: Severity
  /** 病害面积（平方厘米） */
  areaCm2: number
  /** 病害成因初判 */
  causeGuess: string
  /** 病害在构件示意上的位置 */
  location: DecayLocation
  /** 由修复工序完成后回写 */
  repaired: boolean
  repairedAt: number | null
  createdAt: number
  updatedAt: number
}

export const DECAY_TYPES: DecayType[] = ['起甲', '剥落', '空鼓', '粉化', '龟裂']
export const SEVERITIES: Severity[] = ['轻度', '中度', '重度']

/** 三行三列格编号（按行序） */
export const LOCATION_CELLS: LocationCell[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
/** 中央格：历史记录缺位置时的落点 */
export const CENTER_CELL: LocationCell = 5

/** 格编号 → 行（1~3）、列（1~3） */
export function cellRow(cell: LocationCell): number {
  return Math.ceil(cell / 3)
}

export function cellCol(cell: LocationCell): number {
  return ((cell - 1) % 3) + 1
}

/** 行、列 → 格编号 */
export function cellFromRowCol(row: number, col: number): LocationCell {
  return ((row - 1) * 3 + col) as LocationCell
}

/** 格编号 → 方位文字，如「左上」「正中」「右下」 */
export const CELL_LABELS: Record<LocationCell, string> = {
  1: '左上',
  2: '上中',
  3: '右上',
  4: '左中',
  5: '正中',
  6: '右中',
  7: '左下',
  8: '下中',
  9: '右下'
}

/** 新建病害时的默认位置：中央格，非待定位（录入即视为已定位） */
export function defaultLocation(): DecayLocation {
  return { cell: CENTER_CELL, xStart: null, xEnd: null, pending: false }
}

/** 历史记录缺位置时的兜底位置：中央格 + 待定位 */
export function pendingLocation(): DecayLocation {
  return { cell: CENTER_CELL, xStart: null, xEnd: null, pending: true }
}

/** 病害档案台的组合筛选条件 */
export interface DecayFilterState {
  keyword: string
  halls: string[]
  elementPositions: string[]
  types: DecayType[]
  severities: Severity[]
  pigments: string[]
  /** 位置：按三行三列格筛选（可多选） */
  cells: LocationCell[]
  /** 仅看待定位（旧记录落在中央、尚未现场补录）的病害 */
  onlyPendingLocation: boolean
  onlyUnrepaired: boolean
}

export function createEmptyDecayFilter(): DecayFilterState {
  return {
    keyword: '',
    halls: [],
    elementPositions: [],
    types: [],
    severities: [],
    pigments: [],
    cells: [],
    onlyPendingLocation: false,
    onlyUnrepaired: false
  }
}
