/** 病害记录：某彩画层位上的一处病害现状 */
import type { DecayLocation } from '@/types/position'

export type DecayType = '起甲' | '剥落' | '空鼓' | '粉化' | '龟裂'
export type Severity = '轻度' | '中度' | '重度'

export interface Decay {
  id: string
  layerId: string
  type: DecayType
  severity: Severity
  /** 病害面积（平方厘米） */
  areaCm2: number
  /** 病害成因初判 */
  causeGuess: string
  /** 病害落在构件示意图上的位置；旧记录迁移后为中央格 + 待定位 */
  location: DecayLocation
  /** 由修复工序完成后回写 */
  repaired: boolean
  repairedAt: number | null
  createdAt: number
  updatedAt: number
}

export const DECAY_TYPES: DecayType[] = ['起甲', '剥落', '空鼓', '粉化', '龟裂']
export const SEVERITIES: Severity[] = ['轻度', '中度', '重度']

/** 病害档案台的组合筛选条件 */
export interface DecayFilterState {
  keyword: string
  halls: string[]
  elementPositions: string[]
  types: DecayType[]
  severities: Severity[]
  pigments: string[]
  /** 九宫格区域筛选（编号 1~9）；与待定位叠加取并集 */
  cells: number[]
  /** 仅看待定位的病害 */
  onlyPending: boolean
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
    onlyPending: false,
    onlyUnrepaired: false
  }
}
