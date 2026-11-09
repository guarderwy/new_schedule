<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DEFAULT_REMARK_COLOR } from '@/constants'
import type { ScheduleDetail } from '@/types/schedule'
import type { Shift } from '@/types/shift'

const props = defineProps<{
  modelValue: boolean
  shifts: Shift[]
  current?: ScheduleDetail
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [
    payload: { shiftId: string | null; isRest: boolean; remark: string; remarkColor: string }
  ]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

/** 预置色第一项为默认字体色，便于随时恢复 */
const remarkColorPresets = [
  DEFAULT_REMARK_COLOR,
  '#f56c6c',
  '#e6a23c',
  '#67c23a',
  '#2f6fed',
  '#909399'
]

const selected = ref<string>('empty')
const remark = ref('')
const remarkColor = ref<string | null>(DEFAULT_REMARK_COLOR)

watch(
  () => [props.modelValue, props.current] as const,
  () => {
    if (props.current?.isRest) selected.value = 'rest'
    else if (props.current?.shiftId) selected.value = props.current.shiftId
    else selected.value = 'empty'
    remark.value = props.current?.remark ?? ''
    remarkColor.value = props.current?.remarkColor || DEFAULT_REMARK_COLOR
  },
  { immediate: true }
)

function onConfirm() {
  const common = {
    remark: remark.value.trim(),
    remarkColor: remarkColor.value || DEFAULT_REMARK_COLOR
  }
  if (selected.value === 'rest') {
    emit('confirm', { ...common, shiftId: null, isRest: true })
  } else if (selected.value === 'empty') {
    emit('confirm', { ...common, shiftId: null, isRest: false })
  } else {
    emit('confirm', { ...common, shiftId: selected.value, isRest: false })
  }
  visible.value = false
}

function onClear() {
  selected.value = 'empty'
  remark.value = ''
  remarkColor.value = DEFAULT_REMARK_COLOR
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
    <el-form label-width="70px" style="margin-top: 12px">
      <el-form-item label="备注">
        <el-input v-model="remark" type="textarea" :rows="2" placeholder="可选，如换班原因、临时事项" />
      </el-form-item>
      <el-form-item label="备注颜色">
        <div class="remark-color-field">
          <el-color-picker v-model="remarkColor" :predefine="remarkColorPresets" />
          <span class="color-hint">默认与表格字体颜色一致</span>
        </div>
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

.remark-color-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-hint {
  color: var(--muted);
  font-size: 12px;
}
</style>
