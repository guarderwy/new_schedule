<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Shift } from '@renderer/types/shift'
import { useShiftStore } from '@renderer/stores/useShiftStore'

const props = defineProps<{
  modelValue: boolean
  shift?: Shift | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const shiftStore = useShiftStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const form = reactive({
  name: '',
  startTime: '08:00',
  endTime: '17:00',
  remark: ''
})

watch(
  () => [props.modelValue, props.shift] as const,
  () => {
    if (!props.modelValue) return
    form.name = props.shift?.name ?? ''
    form.startTime = props.shift?.startTime ?? '08:00'
    form.endTime = props.shift?.endTime ?? '17:00'
    form.remark = props.shift?.remark ?? ''
  }
)

const formRef = ref()

async function onSubmit() {
  const name = form.name.trim()
  if (!name) {
    ElMessage.warning('请输入班次名称')
    return
  }
  // 班次名称唯一性校验（编辑时排除自身）
  const duplicated = shiftStore.list.some(
    (s) => s.name.trim() === name && s.id !== props.shift?.id
  )
  if (duplicated) {
    ElMessage.warning(`班次名称「${name}」已存在`)
    return
  }
  emit('submit', { ...form, name })
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" :title="shift ? '编辑班次' : '新增班次'" width="460px">
    <el-form ref="formRef" :model="form" label-width="80px">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="开始">
        <el-time-picker v-model="form.startTime" format="HH:mm" value-format="HH:mm" style="width: 100%" />
      </el-form-item>
      <el-form-item label="结束">
        <el-time-picker v-model="form.endTime" format="HH:mm" value-format="HH:mm" style="width: 100%" />
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
