<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CELL_LABELS, LOCATION_CELLS, type DecayLocation, type LocationCell } from '@/types/decay'
import { buildLocation, describeLocation } from '@/utils/location'

/**
 * 病害位置选择器：
 * 1. 在构件示意上按三行三列点选区域；
 * 2. 可填写横向起止比例（百分比，左→右），留空表示落在该格列中心；
 * 3. v-model 输出归一化后的 DecayLocation。
 */
const props = defineProps<{
  modelValue: DecayLocation
  /** 是否显示「待定位」提示（编辑旧记录时） */
  compact?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: DecayLocation): void
}>()

const cell = ref<LocationCell>(props.modelValue.cell)
const startText = ref<string>(props.modelValue.xStart !== null ? String(Math.round(props.modelValue.xStart * 100)) : '')
const endText = ref<string>(props.modelValue.xEnd !== null ? String(Math.round(props.modelValue.xEnd * 100)) : '')

watch(
  () => props.modelValue,
  (value) => {
    cell.value = value.cell
    startText.value = value.xStart !== null ? String(Math.round(value.xStart * 100)) : ''
    endText.value = value.xEnd !== null ? String(Math.round(value.xEnd * 100)) : ''
  }
)

/** 解析百分比输入：空串→null（未填）；非法→undefined */
function parsePercent(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const num = Number(trimmed)
  if (!Number.isFinite(num) || num < 0 || num > 100) return undefined
  return Math.round(num) / 100
}

const rangeError = computed(() => {
  const s = parsePercent(startText.value)
  const e = parsePercent(endText.value)
  if (s === undefined || e === undefined) return '请填写 0~100 的整数百分比'
  if ((s === null) !== (e === null)) return '请同时填写起止比例（或都留空）'
  if (s !== null && e !== null && s > e) return '起始比例不能大于终止比例'
  return ''
})

const preview = computed<DecayLocation>(() => {
  const s = parsePercent(startText.value)
  const e = parsePercent(endText.value)
  if (rangeError.value || s === undefined || e === undefined || s === null || e === null) {
    return { ...props.modelValue, cell: cell.value, pending: props.modelValue.pending }
  }
  return buildLocation(cell.value, s, e)
})

function emitLocation(): void {
  if (rangeError.value) return
  const s = parsePercent(startText.value)
  const e = parsePercent(endText.value)
  // 手动选过格/比例即视为已定位
  emit('update:modelValue', buildLocation(cell.value, s ?? null, e ?? null))
}

function pickCell(next: LocationCell): void {
  cell.value = next
  emitLocation()
}

watch([startText, endText], () => {
  if (!rangeError.value) emitLocation()
})

const cells = LOCATION_CELLS
const cellLabels = CELL_LABELS
</script>

<template>
  <div class="location-picker">
    <div class="location-picker__grid">
      <button
        v-for="item in cells"
        :key="item"
        type="button"
        class="location-picker__cell"
        :class="{ 'is-active': cell === item }"
        @click="pickCell(item)"
      >
        <span class="location-picker__cell-no">{{ item }}</span>
        <span class="location-picker__cell-name">{{ cellLabels[item] }}</span>
      </button>
    </div>

    <div class="location-picker__side">
      <p class="location-picker__hint">点击九宫格选择区域（1=左上，按行序至 9=右下）</p>
      <div class="location-picker__range">
        <span class="location-picker__range-label">横向起止</span>
        <el-input
          v-model="startText"
          class="location-picker__input"
          placeholder="如 20"
          maxlength="3"
        />
        <span class="location-picker__tilde">% ~</span>
        <el-input
          v-model="endText"
          class="location-picker__input"
          placeholder="如 45"
          maxlength="3"
        />
        <span class="location-picker__tilde">%</span>
      </div>
      <p v-if="rangeError" class="location-picker__error">{{ rangeError }}</p>
      <p v-else class="location-picker__preview">
        当前位置：{{ describeLocation(preview) }}
      </p>
      <p v-if="modelValue.pending && !compact" class="location-picker__pending">
        该条为旧记录，暂落中央格并标记「待定位」；重新选择位置后即完成定位。
      </p>
    </div>
  </div>
</template>

<style scoped>
.location-picker {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.location-picker__grid {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  grid-template-rows: repeat(3, 52px);
  gap: 6px;
  flex: none;
}

.location-picker__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  background: #fffdf8;
  border: 1px solid #d9c9ad;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.location-picker__cell:hover {
  background: #f5ead2;
  border-color: var(--brand, #8a5a2b);
}

.location-picker__cell.is-active {
  background: #8a5a2b;
  border-color: #8a5a2b;
  box-shadow: 0 2px 6px rgba(138, 90, 43, 0.4);
}

.location-picker__cell.is-active .location-picker__cell-no,
.location-picker__cell.is-active .location-picker__cell-name {
  color: #fff;
}

.location-picker__cell-no {
  font-size: 15px;
  font-weight: 700;
  color: #6d4a30;
  line-height: 1.2;
}

.location-picker__cell-name {
  font-size: 11px;
  color: #8c8479;
}

.location-picker__side {
  flex: 1;
  min-width: 0;
}

.location-picker__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #8c8479;
}

.location-picker__range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.location-picker__range-label {
  font-size: 13px;
  color: #6b6257;
  white-space: nowrap;
}

.location-picker__input {
  width: 78px;
}

.location-picker__tilde {
  font-size: 13px;
  color: #6b6257;
}

.location-picker__error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #c0392b;
}

.location-picker__preview {
  margin: 8px 0 0;
  font-size: 12px;
  color: #4b3226;
  font-weight: 600;
}

.location-picker__pending {
  margin: 6px 0 0;
  font-size: 12px;
  color: #b06b00;
}
</style>
