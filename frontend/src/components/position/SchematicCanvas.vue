<script setup lang="ts">
import { computed } from 'vue'
import { GRID_CELLS, cellRowCol, placeMarkers, type MarkerInput } from '@/utils/position'

/**
 * 构件示意图：三行三列区域 + 横向起止条带 + 病害点标记。
 * - editable 时可点格选择区域（由 PositionField 包一层使用）
 * - 只读模式用于档案浏览：点标记 / 条带可查看对应病害
 */
const props = withDefaults(
  defineProps<{
    /** 参与摆放的病害标记（位置由内部归一化） */
    markers: MarkerInput[]
    /** 选中的九宫格编号（浏览筛选或编辑回显） */
    selectedCell?: number | null
    /** 编辑草稿标记（不落库的临时位置），置顶显示 */
    draftMarker?: MarkerInput | null
    /** 是否为编辑态：编辑态下格可选择（指针手型/悬浮态）；只读态仍会抛出 cell-click 供筛选 */
    editable?: boolean
    /** 紧凑模式：缩小字号与标记 */
    compact?: boolean
    /** 是否在每格左上角显示数量角标 */
    showCellCounts?: boolean
    /** showCellCounts 的角标数据：编号顺序 1~9 */
    cellCounts?: Array<{ total: number; unrepaired: number }>
  }>(),
  {
    selectedCell: null,
    draftMarker: null,
    editable: false,
    compact: false,
    showCellCounts: false,
    cellCounts: () => []
  }
)

const emit = defineEmits<{
  'cell-click': [cell: number]
  'marker-click': [decayId: string]
}>()

const placed = computed(() => placeMarkers(props.markers))

/** 草稿标记单独摆放并置顶（与已落库标记错开） */
const draftPlaced = computed(() => {
  if (!props.draftMarker) return null
  return placeMarkers([props.draftMarker]).markers[0] ?? null
})

const cells = computed(() =>
  Array.from({ length: GRID_CELLS }, (_, index) => {
    const cell = index + 1
    const { row, col } = cellRowCol(cell)
    return {
      cell,
      row,
      col,
      count: props.cellCounts[index] ?? null,
      selected: props.selectedCell === cell
    }
  })
)

function onCellClick(cell: number): void {
  // 编辑态（PositionField）与只读浏览态（殿宇/构件页）都抛出事件，由父组件决定选择还是筛选
  emit('cell-click', cell)
}

function onMarkerClick(decayId: string): void {
  emit('marker-click', decayId)
}

/** #rrggbb + 透明度 → rgba()，用于条带底色 */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
</script>

<template>
  <div class="schematic" :class="{ 'schematic--compact': compact, 'schematic--editable': editable }">
    <!-- 横向条带层 -->
    <div class="schematic__layer">
      <div
        v-for="band in placed.bands"
        :key="`band_${band.id}`"
        class="schematic__band"
        :class="{ 'is-repaired': band.repaired, 'is-pending': band.pending }"
        :style="{
          left: band.x + '%',
          top: band.y + '%',
          width: band.width + '%',
          height: band.height + '%',
          backgroundColor: hexToRgba(band.color, band.repaired ? 0.22 : 0.32),
          borderColor: hexToRgba(band.color, band.repaired ? 0.4 : 0.75)
        }"
        :title="band.label"
        @click="onMarkerClick(band.id)"
      />
    </div>

    <!-- 九宫格选择 / 展示层 -->
    <div class="schematic__layer schematic__grid">
      <button
        v-for="item in cells"
        :key="item.cell"
        type="button"
        class="schematic__cell"
        :class="{ 'is-selected': item.selected }"
        @click="onCellClick(item.cell)"
      >
        <span v-if="showCellCounts && item.count && item.count.unrepaired > 0" class="schematic__count">
          {{ item.count.unrepaired }}
        </span>
        <span v-else-if="showCellCounts && item.count && item.count.total > 0" class="schematic__count is-clear">✓</span>
      </button>
    </div>

    <!-- 病害点标记层 -->
    <div class="schematic__layer">
      <button
        v-for="marker in placed.markers"
        :key="`marker_${marker.id}`"
        type="button"
        class="schematic__marker"
        :class="{
          'is-repaired': marker.repaired,
          'is-pending': marker.pending
        }"
        :style="{
          left: marker.x + '%',
          top: marker.y + '%',
          backgroundColor: marker.repaired ? '#ffffff' : marker.color,
          borderColor: marker.color
        }"
        :title="marker.label"
        @click.stop="onMarkerClick(marker.id)"
      >
        <span v-if="marker.pending" class="schematic__marker-text">待</span>
      </button>

      <!-- 编辑草稿标记 -->
      <button
        v-if="draftPlaced"
        type="button"
        class="schematic__marker is-draft"
        :style="{
          left: draftPlaced.x + '%',
          top: draftPlaced.y + '%',
          backgroundColor: draftPlaced.color
        }"
        title="当前编辑的位置"
      />
    </div>
  </div>
</template>

<style scoped>
.schematic {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 7;
  background:
    repeating-linear-gradient(0deg, rgba(138, 90, 43, 0.05) 0 6px, transparent 6px 12px),
    #fbf8f2;
  border: 1px solid #d8ccb8;
  border-radius: 10px;
  overflow: hidden;
}

.schematic--compact {
  aspect-ratio: 16 / 8;
  border-radius: 8px;
}

.schematic__layer {
  position: absolute;
  inset: 0;
}

.schematic__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.schematic__cell {
  position: relative;
  padding: 0;
  border: 0;
  border-right: 1px dashed #cbbfa9;
  border-bottom: 1px dashed #cbbfa9;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.schematic__cell:nth-child(3n) {
  border-right: 0;
}

.schematic__cell:nth-child(n + 7) {
  border-bottom: 0;
}

.schematic--editable .schematic__cell,
.schematic__cell:hover {
  transition: background-color 0.12s ease, box-shadow 0.12s ease;
}

.schematic__cell:hover {
  background: rgba(138, 90, 43, 0.1);
  box-shadow: inset 0 0 0 2px rgba(138, 90, 43, 0.35);
}

.schematic__cell.is-selected {
  background: rgba(138, 90, 43, 0.16);
  box-shadow: inset 0 0 0 2px #8a5a2b;
}

.schematic__count {
  position: absolute;
  top: 4px;
  left: 6px;
  min-width: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #c0392b;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  font-weight: 700;
  text-align: center;
}

.schematic--compact .schematic__count {
  min-width: 15px;
  padding: 0 3px;
  font-size: 10px;
  line-height: 15px;
}

.schematic__count.is-clear {
  background: #1e8449;
}

.schematic__band {
  position: absolute;
  z-index: 2;
  border: 1px solid;
  border-radius: 999px;
  cursor: pointer;
}

.schematic__band.is-repaired {
  border-style: dashed;
}

.schematic__band.is-pending {
  border-style: dotted;
}

.schematic__marker {
  position: absolute;
  z-index: 3;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
  border: 2px solid;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(47, 42, 36, 0.3);
  transition: transform 0.1s ease;
}

.schematic--compact .schematic__marker {
  width: 14px;
  height: 14px;
  border-width: 1.5px;
}

.schematic__marker:hover {
  transform: translate(-50%, -50%) scale(1.25);
  z-index: 5;
}

.schematic__marker.is-repaired {
  border-width: 2.5px;
  opacity: 0.85;
}

.schematic__marker.is-pending {
  background: #f4efe6 !important;
  border: 2px dashed #8c8479 !important;
  box-shadow: none;
}

.schematic__marker.is-draft {
  z-index: 4;
  border: 2px solid #fff;
  box-shadow:
    0 0 0 2px #8a5a2b,
    0 1px 6px rgba(47, 42, 36, 0.35);
  animation: marker-pulse 1.4s ease-in-out infinite;
  cursor: default;
}

.schematic__marker-text {
  font-size: 10px;
  font-weight: 700;
  color: #6b6257;
  line-height: 1;
}

@keyframes marker-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
  }
}
</style>
