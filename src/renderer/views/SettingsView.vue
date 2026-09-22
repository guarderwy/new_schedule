<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { usePostStore } from '@renderer/stores/usePostStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import { useNightRuleStore } from '@renderer/stores/useNightRuleStore'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { useScheduleStore } from '@renderer/stores/useScheduleStore'
import { buildDemoData } from '@renderer/core/demoData'

const settingsStore = useSettingsStore()
const shiftStore = useShiftStore()
const staffStore = useStaffStore()
const postStore = usePostStore()
const nightRuleStore = useNightRuleStore()
const demandStore = useDemandStore()
const scheduleStore = useScheduleStore()

const assistNightShiftId = ref<string | null>(null)
const weekdayRequiredShiftIds = ref<string[]>([])
const weekendRequiredShiftIds = ref<string[]>([])

function syncForm() {
  assistNightShiftId.value = settingsStore.settings.assistNightShiftId
  weekdayRequiredShiftIds.value = [...settingsStore.settings.weekdayRequiredShiftIds]
  weekendRequiredShiftIds.value = [...settingsStore.settings.weekendRequiredShiftIds]
}

watch(() => settingsStore.settings, syncForm, { immediate: true, deep: true })

async function onSave() {
  await settingsStore.update({
    assistNightShiftId: assistNightShiftId.value,
    weekdayRequiredShiftIds: weekdayRequiredShiftIds.value,
    weekendRequiredShiftIds: weekendRequiredShiftIds.value
  })
  ElMessage.success('已保存')
}

async function onExport() {
  const path = await window.storage.chooseExportFile()
  if (!path) return
  await window.storage.export(path)
  ElMessage.success('导出成功')
}

async function onImport() {
  const path = await window.storage.chooseImportFile()
  if (!path) return
  const ok = await window.storage.import(path)
  if (!ok) {
    ElMessage.error('导入失败')
    return
  }
  await Promise.all([
    staffStore.load(),
    postStore.load(),
    shiftStore.load(),
    scheduleStore.load(),
    nightRuleStore.load(),
    demandStore.load(),
    settingsStore.load()
  ])
  ElMessage.success('导入成功，数据已重新加载')
}

async function onBackup() {
  await window.storage.backup()
  await settingsStore.update({ lastBackupAt: new Date().toISOString() })
  ElMessage.success('已备份')
}

async function onLoadDemo() {
  await ElMessageBox.confirm(
    '将覆盖当前的人员、班次、岗位、夜班规则、设置以及本周/下周排班，确定载入示例数据？',
    '载入示例数据',
    { type: 'warning' }
  )
  const demo = buildDemoData()
  postStore.list = demo.posts
  shiftStore.list = demo.shifts
  staffStore.list = demo.staff
  nightRuleStore.rules = demo.nightRules
  settingsStore.settings = demo.settings
  scheduleStore.weeks = Object.fromEntries(demo.weeks.map((w) => [w.weekKey, w]))
  await Promise.all([
    postStore.persist(),
    shiftStore.persist(),
    staffStore.persist(),
    nightRuleStore.persist(),
    settingsStore.persist(),
    scheduleStore.persist()
  ])
  ElMessage.success('示例数据已载入')
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button @click="onExport">导出数据</el-button>
      <el-button @click="onImport">导入数据</el-button>
      <el-button @click="onBackup">立即备份</el-button>
      <el-button type="warning" plain @click="onLoadDemo">载入示例数据</el-button>
      <span class="hint">上次备份：{{ settingsStore.settings.lastBackupAt ?? '从未' }}</span>
    </div>

    <el-card header="排班规则配置" style="max-width: 720px">
      <el-form label-width="140px">
        <el-form-item label="助夜班">
          <el-select v-model="assistNightShiftId" clearable placeholder="选择助夜班班次" style="width: 100%">
            <el-option v-for="s in shiftStore.list" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="工作日必备班次">
          <el-select v-model="weekdayRequiredShiftIds" multiple placeholder="可多选" style="width: 100%">
            <el-option v-for="s in shiftStore.list" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="周末必备班次">
          <el-select v-model="weekendRequiredShiftIds" multiple placeholder="可多选" style="width: 100%">
            <el-option v-for="s in shiftStore.list" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSave">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
