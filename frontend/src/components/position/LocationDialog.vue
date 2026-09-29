<script setup lang="ts">
import { ref, watch } from 'vue'
import PositionField from '@/components/position/PositionField.vue'
import type { Decay } from '@/types/decay'
import type { DecayLocation } from '@/types/position'
import { pendingCenterLocation, type MarkerInput } from '@/utils/position'

/**
 * 病害定位对话框：在构件示意图上为一条病害选择九宫格区域或横向起止比例。
 * 底图展示同构件其他病害（按严重程度分槽），避免重复点到同一位置。
 */
const props = defineProps<{
  modelValue: boolean
  decay: Decay | null
  /** 同构件其他病害标记 */
  siblingMarkers: MarkerInput[]
  /** 头部上下文描述，如「大雄宝殿 · 前檐明间额枋 · 第 1 层」 */
  contextLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: { decayId: string; location: DecayLocation }]
}>()

const draft = ref<DecayLocation>(pendingCenterLocation())

watch(
  () => [props.modelValue, props.decay?.id],
  ([visible]) => {
    if (visible === true && props.decay) {
      draft.value = { ...props.decay.location }
    }
  },
  { immediate: true }
)

function close(): void {
  emit('update:modelValue', false)
}

function save(): void {
  if (!props.decay) return
  emit('save', { decayId: props.decay.id, location: draft.value })
  close()
}

function markPending(): void {
  if (!props.decay) return
  emit('save', { decayId: props.decay.id, location: pendingCenterLocation() })
  close()
}
</script>

<template>
  <el-dialog :model-value="modelValue" title="病害现场定位" width="640px" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="decay" class="loc-dialog">
      <p class="loc-dialog__context">
        <el-tag size="small" effect="plain">{{ decay.type }}</el-tag>
        <el-tag size="small" type="warning" effect="plain">{{ decay.severity }}</el-tag>
        <span class="muted">{{ contextLabel }}</span>
      </p>

      <PositionField
        v-model="draft"
        :severity="decay.severity"
        :sibling-markers="siblingMarkers"
      />
    </div>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="warning" plain @click="markPending">暂不定位（落中央待定位）</el-button>
      <el-button type="primary" @click="save">保存位置</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.loc-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loc-dialog__context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
}
</style>
