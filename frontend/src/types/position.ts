/** 病害在构件示意图上的定位方式 */
export type LocationMode = 'grid' | 'range'

/**
 * 病害位置：
 * - grid：三行三列九宫格，编号 1~9（自左而右、自上而下，5 为中央）
 * - range：横向起止比例（0~1），用于横跨多格的条带状病害，纵向上锚定中行
 *
 * 旧记录没有位置时，统一归一化为中央格并 pending=true（待定位）。
 */
export interface DecayLocation {
  mode: LocationMode
  /** mode='grid' 时的九宫格编号 1~9 */
  cell: number
  /** mode='range' 时的横向起点比例（0~1） */
  startRatio: number
  /** mode='range' 时的横向终点比例（0~1） */
  endRatio: number
  /** 是否仍待现场定位（旧记录落入中央时为 true） */
  pending: boolean
}
