<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmAction, reportError } from '@renderer/core/feedback'
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
  try {
    await settingsStore.update({
      assistNightShiftId: assistNightShiftId.value,
      weekdayRequiredShiftIds: weekdayRequiredShiftIds.value,
      weekendRequiredShiftIds: weekendRequiredShiftIds.value
    })
    ElMessage.success('已保存')
  } catch (e) {
    reportError('保存配置', e)
  }
}

async function onExport() {
  try {
    const path = await window.storage.chooseExportFile()
    if (!path) return
    await window.storage.export(path)
    ElMessage.success('导出成功')
  } catch (e) {
    reportError('导出数据', e)
  }
}

async function onImport() {
  const ok = await confirmAction(
    '导入会覆盖当前所有数据（导入前会自动备份），确定继续？',
    '导入确认'
  )
  if (!ok) return
  try {
    const path = await window.storage.chooseImportFile()
    if (!path) return
    const success = await window.storage.import(path)
    if (!success) {
      ElMessage.error('导入失败：文件格式不正确或不是有效的排班数据包')
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
  } catch (e) {
    reportError('导入数据', e)
  }
}

async function onBackup() {
  try {
    const ok = await window.storage.backup()
    await settingsStore.update({ lastBackupAt: new Date().toISOString() })
    if (ok) {
      ElMessage.success('已备份')
    } else {
      ElMessage.warning('备份未成功完成，请检查数据目录权限')
    }
  } catch (e) {
    reportError('备份数据', e)
  }
}

async function onLoadDemo() {
  const ok = await confirmAction(
    '将覆盖当前的人员、班次、岗位、夜班规则、设置以及本周/下周排班，确定载入示例数据？',
    '载入示例数据'
  )
  if (!ok) return
  try {
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
  } catch (e) {
    reportError('载入示例数据', e)
  }
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
