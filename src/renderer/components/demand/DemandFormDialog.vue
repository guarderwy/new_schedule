<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import type { Demand, DemandType } from '@renderer/types/demand'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'

const props = defineProps<{
  modelValue: boolean
  demand?: Demand | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: Omit<Demand, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const staffStore = useStaffStore()
const shiftStore = useShiftStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const form = reactive({
  staffId: '',
  date: '',
  type: 'rest' as DemandType,
  shiftId: null as string | null,
  remark: ''
})

watch(
  () => [props.modelValue, props.demand] as const,
  () => {
    if (!props.modelValue) return
    const d = props.demand
    form.staffId = d?.staffId ?? ''
    form.date = d?.date ?? ''
    form.type = d?.type ?? 'rest'
    form.shiftId = d?.shiftId ?? null
    form.remark = d?.remark ?? ''
  }
)

async function onSubmit() {
  if (!form.staffId || !form.date) {
    return
  }
  const payload: Omit<Demand, 'id' | 'createdAt' | 'updatedAt'> = {
    staffId: form.staffId,
    date: form.date,
    type: form.type,
    shiftId: form.type === 'shift' ? form.shiftId : null,
    remark: form.remark,
    status: 'pending'
  }
  emit('submit', payload)
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" :title="demand ? '编辑需求' : '新增需求'" width="460px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="人员" required>
        <el-select v-model="form.staffId" filterable placeholder="选择人员" style="width: 100%">
          <el-option
            v-for="s in staffStore.list"
            :key="s.id"
            :label="`${s.name}（${s.employeeNo}）`"
            :value="s.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="日期" required>
        <el-date-picker
          v-model="form.date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="类型">
        <el-radio-group v-model="form.type">
          <el-radio label="rest">休息</el-radio>
          <el-radio label="shift">指定班次</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.type === 'shift'" label="班次">
        <el-select v-model="form.shiftId" placeholder="选择班次" style="width: 100%">
          <el-option
            v-for="s in shiftStore.list"
            :key="s.id"
            :label="`${s.name}（${s.startTime}-${s.endTime}）`"
            :value="s.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
