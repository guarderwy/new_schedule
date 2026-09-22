<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import { REST_RULE_SHIFT_ID, type NightShiftRule } from '@renderer/types/nightRule'
import type { Shift } from '@renderer/types/shift'

const props = defineProps<{
  modelValue: NightShiftRule[]
  shiftList: Shift[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: NightShiftRule[]]
  remove: [id: string]
}>()

const list = computed<NightShiftRule[]>({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

function shiftName(id: string): string {
  if (id === REST_RULE_SHIFT_ID) return '休息'
  return props.shiftList.find((s) => s.id === id)?.name ?? id
}

function shiftTime(id: string): string {
  if (id === REST_RULE_SHIFT_ID) return ''
  const s = props.shiftList.find((x) => x.id === id)
  return s ? `${s.startTime} - ${s.endTime}` : ''
}
</script>

<template>
  <draggable v-model="list" item-key="id" handle=".drag-handle" class="night-rule-list">
    <template #item="{ element }">
      <div class="night-rule-item">
        <span class="drag-handle">⠿</span>
        <span class="order">{{ element.sortOrder }}</span>
        <span class="name">{{ shiftName(element.shiftId) }}</span>
        <span class="time">{{ shiftTime(element.shiftId) }}</span>
        <el-button link type="danger" @click="emit('remove', element.id)">删除</el-button>
      </div>
    </template>
  </draggable>
</template>

<style scoped>
.night-rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 480px;
}
.night-rule-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}
.drag-handle {
  cursor: move;
  color: #c0c4cc;
  font-size: 18px;
}
.order {
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  background: #ecf5ff;
  color: #409eff;
  font-size: 12px;
}
.name {
  font-weight: 600;
}
.time {
  color: #909399;
  font-size: 13px;
}
</style>
