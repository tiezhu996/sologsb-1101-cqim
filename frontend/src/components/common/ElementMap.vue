<script setup lang="ts">
import { computed } from 'vue'
import { Location as LocationIcon } from '@element-plus/icons-vue'
import { CELL_LABELS, LOCATION_CELLS, type Decay, type LocationCell } from '@/types/decay'
import { SEVERITY_COLOR } from '@/utils/severity'
import { markerPosition } from '@/utils/location'

/**
 * 构件示意图：3×3 九宫格 + 病害点标记。
 * - 同一格多条按严重程度分组错位摆放；
 * - 点标记 hover 显示病害卡片，点击可跳转/定位；
 * - 每格显示未修复数量徽标；
 * - selectable 时点击格子可用于筛选（selectedCells 高亮）。
 */
const props = withDefaults(
  defineProps<{
    /** 该示意范围内的病害（同一构件或同一殿宇汇总） */
    decays: Decay[]
    /** 视图边长（px），示意图始终为正方形 */
    size?: number
    /** 是否允许点选格子（筛选模式） */
    selectable?: boolean
    /** 筛选模式下已选中的格 */
    selectedCells?: LocationCell[]
    /** 是否在格内显示未修复数量徽标 */
    showCellBadges?: boolean
    /** 点标记是否可点击 */
    markerClickable?: boolean
  }>(),
  {
    size: 260,
    selectable: false,
    selectedCells: () => [],
    showCellBadges: true,
    markerClickable: false
  }
)

const emit = defineEmits<{
  (event: 'cell-click', cell: LocationCell): void
  (event: 'marker-click', decay: Decay): void
}>()

/** 按格归组，点标记错位时只与同格病害比较 */
const byCell = computed(() => {
  const map = new Map<LocationCell, Decay[]>()
  props.decays.forEach((decay) => {
    const list = map.get(decay.location.cell) ?? []
    list.push(decay)
    map.set(decay.location.cell, list)
  })
  // 同格内按严重程度排序，保证重/中/轻分组位置稳定
  const weight: Record<string, number> = { 重度: 0, 中度: 1, 轻度: 2 }
  map.forEach((list) => list.sort((a, b) => weight[a.severity] - weight[b.severity]))
  return map
})

const markers = computed(() => {
  const items: Array<{ decay: Decay; x: number; y: number; color: string }> = []
  byCell.value.forEach((list) => {
    list.forEach((decay, index) => {
      const { x, y } = markerPosition(decay.location, list, index)
      items.push({ decay, x, y, color: SEVERITY_COLOR[decay.severity] })
    })
  })
  return items
})

function cellStats(cell: LocationCell): { total: number; unrepaired: number; pending: number } {
  const list = byCell.value.get(cell) ?? []
  return {
    total: list.length,
    unrepaired: list.filter((item) => !item.repaired).length,
    pending: list.filter((item) => item.location.pending).length
  }
}

function isSelected(cell: LocationCell): boolean {
  return props.selectedCells.includes(cell)
}

function onCellClick(cell: LocationCell): void {
  if (props.selectable) emit('cell-click', cell)
}
</script>

<template>
  <div class="element-map" :style="{ width: `${size}px`, height: `${size}px` }">
    <!-- 九宫格 -->
    <button
      v-for="cell in LOCATION_CELLS"
      :key="cell"
      type="button"
      class="element-map__cell"
      :class="{
        'is-selectable': selectable,
        'is-selected': isSelected(cell),
        'has-decay': (byCell.get(cell)?.length ?? 0) > 0
      }"
      :style="{
        gridRow: Math.ceil(cell / 3),
        gridColumn: ((cell - 1) % 3) + 1
      }"
      @click="onCellClick(cell)"
    >
      <span class="element-map__cell-label">{{ CELL_LABELS[cell] }}</span>
      <span v-if="showCellBadges && cellStats(cell).unrepaired > 0" class="element-map__badge">
        {{ cellStats(cell).unrepaired }}
      </span>
    </button>

    <!-- 点标记层 -->
    <div class="element-map__markers">
      <el-tooltip
        v-for="item in markers"
        :key="item.decay.id"
        placement="top"
        :show-after="120"
        effect="dark"
      >
        <button
          type="button"
          class="element-map__marker"
          :class="{
            'is-pending': item.decay.location.pending,
            'is-repaired': item.decay.repaired,
            'is-clickable': markerClickable
          }"
          :style="{ left: `${item.x}%`, top: `${item.y}%`, '--marker-color': item.color }"
          @click.stop="markerClickable ? emit('marker-click', item.decay) : undefined"
        >
          <el-icon v-if="item.decay.location.pending"><LocationIcon /></el-icon>
        </button>
        <template #content>
          <div class="element-map__tip">
            <strong>{{ item.decay.type }} · {{ item.decay.severity }}</strong>
            <span>{{ item.decay.areaCm2 }} cm² · {{ item.decay.repaired ? '已修复' : '未修复' }}</span>
            <span v-if="item.decay.location.pending" class="is-pending-text">待定位（旧记录暂落中央）</span>
          </div>
        </template>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
.element-map {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  background: #f6efe2;
  border: 1px solid #d9c9ad;
  border-radius: 10px;
}

.element-map__cell {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 4px 6px;
  background: #fffdf8;
  border: 1px dashed #d9c9ad;
  border-radius: 6px;
  cursor: default;
}

.element-map__cell.is-selectable {
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.element-map__cell.is-selectable:hover {
  background: #f5ead2;
  border-color: var(--brand, #8a5a2b);
}

.element-map__cell.is-selected {
  background: #f3e2bf;
  border: 1px solid var(--brand, #8a5a2b);
}

.element-map__cell.has-decay {
  border-style: solid;
  border-color: #e3d2b0;
}

.element-map__cell-label {
  font-size: 11px;
  color: #a99c84;
  user-select: none;
}

.element-map__badge {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #c0392b;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.element-map__markers {
  position: absolute;
  inset: 4px;
  pointer-events: none;
}

.element-map__marker {
  position: absolute;
  width: 16px;
  height: 16px;
  padding: 0;
  transform: translate(-50%, -50%);
  background: var(--marker-color, #c0392b);
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  cursor: default;
}

.element-map__marker.is-clickable {
  cursor: pointer;
}

.element-map__marker.is-clickable:hover {
  filter: brightness(1.1);
  transform: translate(-50%, -50%) scale(1.2);
}

.element-map__marker.is-repaired {
  opacity: 0.55;
}

.element-map__marker.is-pending {
  display: grid;
  place-items: center;
  color: #fff;
  background: #8c8479;
  border-style: dashed;
}

.element-map__tip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.element-map__tip .is-pending-text {
  color: #f5c6a5;
}
</style>
