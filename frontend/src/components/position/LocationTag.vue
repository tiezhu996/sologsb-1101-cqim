<script setup lang="ts">
import { computed } from 'vue'
import { Aim } from '@element-plus/icons-vue'
import type { DecayLocation } from '@/types/position'
import { cellLabel, isPendingLocation, locationText, normalizeLocation } from '@/utils/position'

/** 病害位置的只读标签：待定位突出警示；条带附锚定格说明 */
const props = withDefaults(
  defineProps<{
    location?: DecayLocation
    size?: 'small' | 'default'
    /** 是否展示完整说明（编号 + 行列），默认仅短文字 */
    detailed?: boolean
  }>(),
  {
    size: 'small',
    detailed: false
  }
)

const pending = computed(() => isPendingLocation(props.location))
const text = computed(() => {
  if (!props.location) return '待定位'
  const loc = normalizeLocation(props.location)
  if (props.detailed) {
    return loc.pending ? `待定位（暂存${cellLabel(loc.cell)}）` : loc.mode === 'range' ? `${locationText(loc)} → ${cellLabel(loc.cell)}` : cellLabel(loc.cell)
  }
  return loc.pending ? '待定位' : locationText(loc)
})
</script>

<template>
  <el-tag
    :size="size"
    :type="pending ? 'warning' : 'info'"
    :effect="pending ? 'light' : 'plain'"
    :disable-transitions="true"
  >
    <el-icon class="location-tag__icon"><Aim /></el-icon>
    {{ text }}
  </el-tag>
</template>

<style scoped>
.location-tag__icon {
  margin-right: 2px;
  vertical-align: -1.5px;
}
</style>
