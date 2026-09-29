<script setup lang="ts">
import { computed } from 'vue'
import { GRID_CELLS, cellRowCol } from '@/utils/position'

/**
 * 殿宇页卡片上的构件位置九宫格：每格显示该殿未修复病害数量（条带按锚定格计入）。
 * - 数字格：仍有未修复病害，点击下钻到档案台并按该格筛选
 * - ✓ 格：该格病害均已修复
 * - 空格：该格暂无病害
 * 待定位病害落在中央格，数字旁附「待」提示，另有点条可单独筛选待定位。
 */
const props = defineProps<{
  cellCounts: Array<{ total: number; unrepaired: number }>
  /** 未修复的待定位数量（用于中央格「待」提示与单独筛选） */
  pendingUnrepaired: number
}>()

const emit = defineEmits<{
  'cell-click': [cell: number]
  'pending-click': []
}>()

const cells = computed(() =>
  Array.from({ length: GRID_CELLS }, (_, index) => {
    const cell = index + 1
    const { row, col } = cellRowCol(cell)
    const count = props.cellCounts[index] ?? { total: 0, unrepaired: 0 }
    return {
      cell,
      row,
      col,
      ...count
    }
  })
)
</script>

<template>
  <div class="hall-grid-loc">
    <div class="hall-grid-loc__board">
      <button
        v-for="item in cells"
        :key="item.cell"
        type="button"
        class="hall-grid-loc__cell"
        :class="{
          'is-active': item.unrepaired > 0,
          'is-clear': item.total > 0 && item.unrepaired === 0
        }"
        @click="emit('cell-click', item.cell)"
      >
        <template v-if="item.unrepaired > 0">{{ item.unrepaired }}</template>
        <template v-else-if="item.total > 0">✓</template>
      </button>
      <span
        v-if="pendingUnrepaired > 0"
        class="hall-grid-loc__pending-dot"
        title="中央格中有待现场定位的病害，点击单独筛选"
        @click.stop="emit('pending-click')"
      />
    </div>
    <button
      v-if="pendingUnrepaired > 0"
      type="button"
      class="hall-grid-loc__pending"
      @click="emit('pending-click')"
    >
      待定位 {{ pendingUnrepaired }}
    </button>
  </div>
</template>

<style scoped>
.hall-grid-loc {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hall-grid-loc__board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  width: 108px;
  flex: 0 0 auto;
}

.hall-grid-loc__cell {
  height: 26px;
  padding: 0;
  border: 1px solid #ddd3c2;
  border-radius: 5px;
  background: #faf7f1;
  color: #c0392b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.hall-grid-loc__cell:hover {
  border-color: #8a5a2b;
}

.hall-grid-loc__cell.is-active {
  background: #fdecea;
  border-color: #e6a99f;
}

.hall-grid-loc__cell.is-clear {
  color: #1e8449;
  background: #f0f7f2;
  border-color: #c5dfcd;
  cursor: pointer;
}

.hall-grid-loc__pending-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d68910;
  border: 1.5px solid #fff;
  cursor: pointer;
}

.hall-grid-loc__pending {
  padding: 2px 8px;
  border: 1px solid #f0d9ac;
  border-radius: 999px;
  background: #fdf7e8;
  color: #b06b00;
  font-size: 12px;
  cursor: pointer;
}
</style>
