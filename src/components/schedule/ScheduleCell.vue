<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_REMARK_COLOR } from '@/constants'
import type { ScheduleDetail } from '@/types/schedule'
import type { Shift } from '@/types/shift'

const props = defineProps<{
  detail?: ScheduleDetail
  shift?: Shift
  editable: boolean
}>()

defineEmits<{
  click: []
}>()

const text = computed(() => {
  const base = props.detail?.isRest ? '休' : props.shift ? props.shift.name : '-'
  const remark = props.detail?.remark?.trim()
  return remark ? `${base}（${remark}）` : base
})

/** 有备注时按所选颜色着色，旧数据未存颜色则用默认字体色 */
const remarkStyle = computed(() =>
  props.detail?.remark?.trim()
    ? { color: props.detail.remarkColor || DEFAULT_REMARK_COLOR }
    : undefined
)
</script>

<template>
  <div
    class="schedule-cell"
    :class="{
      'is-rest': detail?.isRest,
      'is-empty': !detail?.shiftId && !detail?.isRest,
      'is-disabled': !editable
    }"
    :style="remarkStyle"
    :title="detail?.remark || ''"
    @click="editable && $emit('click')"
  >
    {{ text }}
  </div>
</template>
