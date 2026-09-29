<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SchematicCanvas from '@/components/position/SchematicCanvas.vue'
import type { Severity } from '@/types/decay'
import type { DecayLocation } from '@/types/position'
import {
  CENTER_CELL,
  cellLabel,
  gridLocation,
  locationText,
  normalizeLocation,
  rangeLocation,
  type MarkerInput
} from '@/utils/position'

/**
 * 病害位置编辑控件：
 * - 九宫格点选区域（三行三列）
 * - 也可切换为填写横向起止比例（条带病害）
 * - 同构件已有病害可作为底图参考，当前草稿以脉动圆点置顶显示
 * - 「待定位」单独勾出；新建病害默认取中央格已定位
 */
const props = withDefaults(
  defineProps<{
    modelValue: DecayLocation
    /** 当前病害严重程度，决定草稿标记颜色槽位 */
    severity: Severity
    /** 同构件已有病害（不含本条），作为底图参考摆放 */
    siblingMarkers?: MarkerInput[]
    compact?: boolean
  }>(),
  {
    siblingMarkers: () => [],
    compact: false
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: DecayLocation): void
}>()

const normalized = computed(() => normalizeLocation(props.modelValue))
const pending = computed(() => normalized.value.pending)

/** 横向起止比例的百分数草稿（el-slider 使用整数 0~100） */
const rangePercent = ref<[number, number]>([
  Math.round(normalized.value.startRatio * 100),
  Math.round(Math.max(normalized.value.endRatio, normalized.value.startRatio + 0.02) * 100)
])

watch(
  () => props.modelValue,
  (value) => {
    const loc = normalizeLocation(value)
    if (loc.mode === 'range') {
      rangePercent.value = [Math.round(loc.startRatio * 100), Math.round(loc.endRatio * 100)]
    }
  }
)

const draftMarker = computed<MarkerInput>(() => ({
  id: '__draft__',
  severity: props.severity,
  location: normalized.value
}))

function selectCell(cell: number): void {
  emit('update:modelValue', gridLocation(cell, false))
}

/** 切换录入方式：不改变已有定位数据，仅在缺少对应模式数据时补一个默认值 */
function switchMode(mode: 'grid' | 'range' | 'pending'): void {
  if (mode === 'pending') {
    togglePending(true)
    return
  }
  const loc = normalized.value
  if (mode === 'range') {
    if (loc.mode === 'range' && !loc.pending) {
      onRangeChange([Math.round(loc.startRatio * 100), Math.round(loc.endRatio * 100)])
    } else {
      // 从九宫格首次切到条带：以当前格为中心给出一段默认条带，便于直接拖动两端调整
      const col = (loc.cell - 1) % 3
      const start = [20, 35, 50][col]
      onRangeChange([start, Math.min(95, start + 40)])
    }
    return
  }
  emit('update:modelValue', gridLocation(loc.cell, false))
}

function onRangeChange(value: number | number[]): void {
  const pair = (Array.isArray(value) ? value : [0, 0]) as number[]
  let [start, end] = pair
  if (end < start) end = start
  if (end - start < 2) end = Math.min(100, start + 2)
  rangePercent.value = [start, end]
  emit('update:modelValue', rangeLocation(start / 100, end / 100, false))
}

function togglePending(value: boolean): void {
  if (value) {
    emit('update:modelValue', gridLocation(CENTER_CELL, true))
  } else {
    // 取消待定位：保留原格但转为已定位；range 草稿保留比例
    const loc = normalized.value
    if (loc.mode === 'range') {
      emit('update:modelValue', rangeLocation(loc.startRatio, loc.endRatio, false))
    } else {
      emit('update:modelValue', gridLocation(loc.cell, false))
    }
  }
}

const selectedCell = computed(() => (normalized.value.mode === 'grid' && !pending.value ? normalized.value.cell : null))
const locationSummary = computed(() => {
  const loc = normalized.value
  if (loc.pending) return `待定位（暂存中央格 ${CENTER_CELL}）`
  if (loc.mode === 'range') {
    return `${locationText(loc)}，锚定 ${cellLabel(loc.cell)}`
  }
  return cellLabel(loc.cell)
})
</script>

<template>
  <div class="position-field">
    <el-radio-group
      :model-value="pending ? 'pending' : normalized.mode"
      size="small"
      @update:model-value="(value: string | number | boolean | undefined) =>
        switchMode(String(value) as 'grid' | 'range' | 'pending')"
    >
      <el-radio-button value="grid">九宫格区域</el-radio-button>
      <el-radio-button value="range">横向起止比例</el-radio-button>
      <el-radio-button value="pending">待定位</el-radio-button>
    </el-radio-group>

    <SchematicCanvas
      :markers="siblingMarkers"
      :draft-marker="draftMarker"
      :selected-cell="selectedCell"
      editable
      :compact="compact"
      @cell-click="selectCell"
    />

    <div v-if="normalized.mode === 'range' && !pending" class="position-field__range">
      <span class="position-field__hint">横向起止（占构件长度比例）</span>
      <el-slider
        :model-value="rangePercent"
        range
        :min="0"
        :max="100"
        :step="1"
        :format-tooltip="(value: number) => `${value}%`"
        style="flex: 1"
        @update:model-value="onRangeChange"
      />
      <span class="mono position-field__range-text">
        {{ rangePercent[0] }}% – {{ rangePercent[1] }}%
      </span>
    </div>

    <div class="position-field__summary">
      <el-tag size="small" :type="pending ? 'warning' : 'success'" effect="plain">
        {{ locationSummary }}
      </el-tag>
      <span v-if="siblingMarkers.length > 0" class="muted position-field__siblings">
        底图为同构件其他病害（{{ siblingMarkers.length }} 条），按严重程度分槽摆放，点击方格即可定位本病害。
      </span>
    </div>
  </div>
</template>

<style scoped>
.position-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.position-field__range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.position-field__hint {
  font-size: 12px;
  color: #6b6257;
  white-space: nowrap;
}

.position-field__range-text {
  font-size: 13px;
  white-space: nowrap;
}

.position-field__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.position-field__siblings {
  font-size: 12px;
}
</style>
