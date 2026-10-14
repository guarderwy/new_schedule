<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleDetail } from '@renderer/types/schedule'
import type { Shift } from '@renderer/types/shift'

const props = defineProps<{
  detail?: ScheduleDetail
  shift?: Shift
  editable: boolean
}>()

defineEmits<{
  click: []
}>()

const text = computed(() => {
  if (props.detail?.isRest) return '休'
  if (props.shift) return props.shift.name
  return '-'
})
</script>

<template>
  <div
    class="schedule-cell"
    :class="{
      'is-rest': detail?.isRest,
      'is-empty': !detail?.shiftId && !detail?.isRest,
      'is-disabled': !editable
    }"
    :title="detail?.remark || ''"
    @click="editable && $emit('click')"
  >
    {{ text }}
    <span v-if="detail?.remark" class="remark-flag" />
  </div>
</template>

<style scoped>
.remark-flag {
  position: absolute;
  top: 2px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e6a23c;
}
</style>
