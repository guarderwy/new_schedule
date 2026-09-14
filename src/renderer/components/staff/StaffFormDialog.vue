<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Staff, StaffStatus, GroupType } from '@renderer/types/staff'
import { usePostStore } from '@renderer/stores/usePostStore'

const props = defineProps<{
  modelValue: boolean
  staff?: Staff | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const postStore = usePostStore()
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const form = reactive({
  name: '',
  employeeNo: '',
  title: '',
  remark: '',
  status: 'active' as StaffStatus,
  statusStartTime: null as string | null,
  statusEndTime: null as string | null,
  postId: null as string | null,
  bedManagement: '',
  annualLeave: 0,
  accumulatedLeave: 0,
  groupType: 'day' as GroupType
})

watch(
  () => [props.modelValue, props.staff] as const,
  () => {
    if (!props.modelValue) return
    const s = props.staff
    form.name = s?.name ?? ''
    form.employeeNo = s?.employeeNo ?? ''
    form.title = s?.title ?? ''
    form.remark = s?.remark ?? ''
    form.status = s?.status ?? 'active'
    form.statusStartTime = s?.statusStartTime ?? null
    form.statusEndTime = s?.statusEndTime ?? null
    form.postId = s?.postId ?? null
    form.bedManagement = s?.bedManagement ?? ''
    form.annualLeave = s?.annualLeave ?? 0
    form.accumulatedLeave = s?.accumulatedLeave ?? 0
    form.groupType = s?.groupType ?? 'day'
  }
)

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  employeeNo: [{ required: true, message: '请输入工号', trigger: 'blur' }]
}

const formRef = ref()

async function onSubmit() {
  await formRef.value?.validate()
  emit('submit', { ...form })
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" :title="staff ? '编辑人员' : '新增人员'" width="560px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="工号" prop="employeeNo">
        <el-input v-model="form.employeeNo" />
      </el-form-item>
      <el-form-item label="职称">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="在职" value="active" />
          <el-option label="休假" value="leave" />
          <el-option label="离职" value="resigned" />
          <el-option label="进修" value="training" />
          <el-option label="停职" value="suspended" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态开始时间">
        <el-date-picker
          v-model="form.statusStartTime"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          clearable
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="状态结束时间">
        <el-date-picker
          v-model="form.statusEndTime"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
          clearable
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="岗位">
        <el-select v-model="form.postId" clearable style="width: 100%">
          <el-option v-for="p in postStore.list" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="管床">
        <el-input v-model="form.bedManagement" />
      </el-form-item>
      <el-form-item label="年假">
        <el-input-number v-model="form.annualLeave" :min="0" :step="0.5" />
      </el-form-item>
      <el-form-item label="积休">
        <el-input-number v-model="form.accumulatedLeave" :min="0" :step="0.5" />
      </el-form-item>
      <el-form-item label="分组">
        <el-radio-group v-model="form.groupType">
          <el-radio value="day">白班组</el-radio>
          <el-radio value="night">夜班组</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
