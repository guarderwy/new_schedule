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
    @click="editable && $emit('click')"
  >
    {{ text }}
  </div>
</template>
