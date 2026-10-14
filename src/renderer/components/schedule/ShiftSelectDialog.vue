<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScheduleDetail } from '@renderer/types/schedule'
import type { Shift } from '@renderer/types/shift'

const props = defineProps<{
  modelValue: boolean
  shifts: Shift[]
  current?: ScheduleDetail
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: { shiftId: string | null; isRest: boolean; remark: string }]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const selected = ref<string>('empty')
const remark = ref('')

watch(
  () => [props.modelValue, props.current] as const,
  () => {
    if (props.current?.isRest) selected.value = 'rest'
    else if (props.current?.shiftId) selected.value = props.current.shiftId
    else selected.value = 'empty'
    remark.value = props.current?.remark ?? ''
  },
  { immediate: true }
)

function onConfirm() {
  if (selected.value === 'rest') {
    emit('confirm', { shiftId: null, isRest: true, remark: remark.value.trim() })
  } else if (selected.value === 'empty') {
    emit('confirm', { shiftId: null, isRest: false, remark: remark.value.trim() })
  } else {
    emit('confirm', { shiftId: selected.value, isRest: false, remark: remark.value.trim() })
  }
  visible.value = false
}

function onClear() {
  selected.value = 'empty'
  remark.value = ''
  onConfirm()
}
</script>

<template>
  <el-dialog v-model="visible" title="选择班次" width="420px">
    <el-radio-group v-model="selected" class="shift-options">
      <el-radio label="rest">休息</el-radio>
      <el-radio v-for="shift in shifts" :key="shift.id" :label="shift.id">
        {{ shift.name }}（{{ shift.startTime }}-{{ shift.endTime }}）
      </el-radio>
    </el-radio-group>
    <el-form label-width="56px" style="margin-top: 12px">
      <el-form-item label="备注">
        <el-input v-model="remark" type="textarea" :rows="2" placeholder="可选，如换班原因、临时事项" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="onClear">清空</el-button>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.shift-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
</style>
