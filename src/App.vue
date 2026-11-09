<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { ElIcon } from 'element-plus'
import dayjs from 'dayjs'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import {
  Calendar,
  Clock,
  Expand,
  Fold,
  Moon,
  Notebook,
  OfficeBuilding,
  Setting,
  Tickets,
  User
} from '@element-plus/icons-vue'
import CurrentWeekView from './views/CurrentWeekView.vue'
import NextWeekView from './views/NextWeekView.vue'
import StaffView from './views/StaffView.vue'
import PostView from './views/PostView.vue'
import ShiftView from './views/ShiftView.vue'
import NightRuleView from './views/NightRuleView.vue'
import DemandView from './views/DemandView.vue'
import SettingsView from './views/SettingsView.vue'
import { buildDemoData } from './core/demoData'
import { storage } from './storage'
import { getCurrentWeekKey, parseWeekKey, todayStr, weekdayName } from './core/weekUtils'
import { useNowTick } from './core/useNowTick'
import { useStaffStore } from './stores/useStaffStore'
import { usePostStore } from './stores/usePostStore'
import { useShiftStore } from './stores/useShiftStore'
import { useScheduleStore } from './stores/useScheduleStore'
import { useNightRuleStore } from './stores/useNightRuleStore'
import { useDemandStore } from './stores/useDemandStore'
import { useSettingsStore } from './stores/useSettingsStore'

interface NavItem {
  key: string
  label: string
  desc: string
  icon: Component
}

const navItems: NavItem[] = [
  { key: 'current', label: '本周排班', desc: '查看、编辑并发布本周排班', icon: Calendar },
  { key: 'next', label: '下周排班', desc: '生成下周计划并承接本周数据', icon: Notebook },
  { key: 'staff', label: '人员管理', desc: '维护人员档案、状态与分组', icon: User },
  { key: 'post', label: '岗位管理', desc: '维护排班使用的岗位信息', icon: OfficeBuilding },
  { key: 'shift', label: '班次管理', desc: '配置班次名称与起止时间', icon: Clock },
  { key: 'nightRule', label: '夜班循环规则', desc: '调整夜班轮换顺序', icon: Moon },
  { key: 'demand', label: '需求管理', desc: '处理休息与指定班次申请', icon: Tickets },
  { key: 'settings', label: '系统设置', desc: '规则配置、备份与数据导入导出', icon: Setting }
]

const componentMap: Record<string, Component> = {
  current: CurrentWeekView,
  next: NextWeekView,
  staff: StaffView,
  post: PostView,
  shift: ShiftView,
  nightRule: NightRuleView,
  demand: DemandView,
  settings: SettingsView
}

const activeTab = ref('current')
const collapsed = ref(false)
const currentNav = computed(() => navItems.find((item) => item.key === activeTab.value) ?? navItems[0])
const currentComponent = computed(() => componentMap[activeTab.value])

const tick = useNowTick()
const todayLabel = computed(() => {
  void tick.value
  return `${dayjs().format('MM月DD日')} 周${weekdayName(todayStr())}`
})
const weekLabel = computed(() => {
  void tick.value
  const { weekStart, weekEnd } = parseWeekKey(getCurrentWeekKey())
  return `${dayjs(weekStart).format('MM.DD')} - ${dayjs(weekEnd).format('MM.DD')}`
})

const staffStore = useStaffStore()
const postStore = usePostStore()
const shiftStore = useShiftStore()
const scheduleStore = useScheduleStore()
const nightRuleStore = useNightRuleStore()
const demandStore = useDemandStore()
const settingsStore = useSettingsStore()

const pendingDemands = computed(() =>
  demandStore.list.filter((d) => d.status === 'pending').length
)

async function seedDemoData() {
  const demo = buildDemoData()
  staffStore.list = demo.staff
  postStore.list = demo.posts
  shiftStore.list = demo.shifts
  nightRuleStore.rules = demo.nightRules
  settingsStore.settings = demo.settings
  scheduleStore.weeks = Object.fromEntries(demo.weeks.map((w) => [w.weekKey, w]))
  await Promise.all([
    staffStore.persist(),
    postStore.persist(),
    shiftStore.persist(),
    nightRuleStore.persist(),
    settingsStore.persist(),
    scheduleStore.persist()
  ])
}

onMounted(async () => {
  await Promise.all([
    staffStore.load(),
    postStore.load(),
    shiftStore.load(),
    scheduleStore.load(),
    nightRuleStore.load(),
    demandStore.load(),
    settingsStore.load()
  ])

  // 首次打开且数据为空时，自动载入模拟数据
  if (staffStore.list.length === 0 && Object.keys(scheduleStore.weeks).length === 0) {
    try {
      await seedDemoData()
    } catch (e) {
      console.error('载入示例数据失败', e)
    }
  }

  // 自动备份：仅记录日志，不再弹窗打扰
  try {
    const ok = await storage.backup()
    if (ok) {
      await settingsStore.update({ lastBackupAt: new Date().toISOString() })
    } else {
      console.warn('自动备份未成功完成（已忽略）')
    }
  } catch (e) {
    console.error('自动备份失败', e)
  }
})
</script>

<template>
  <el-config-provider :locale="zhCn">
    <div class="app-shell" :class="{ 'is-collapsed': collapsed }">
      <aside class="app-sidebar">
        <div class="brand">
          <div class="brand-mark">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="brand-text">
            <strong>排班管理系统</strong>
            <span>Schedule Manager</span>
          </div>
        </div>

        <nav class="nav-list" aria-label="主导航">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            class="nav-item"
            :class="{ 'is-active': activeTab === item.key }"
            :title="item.label"
            @click="activeTab = item.key"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            <span class="nav-label">{{ item.label }}</span>
            <span v-if="item.key === 'demand' && pendingDemands > 0" class="nav-badge">
              {{ pendingDemands }}
            </span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <span class="status-dot" />
          <span class="footer-text">数据保存在本机浏览器</span>
        </div>
      </aside>

      <div class="app-main">
        <header class="app-header">
          <button
            type="button"
            class="icon-btn"
            :aria-label="collapsed ? '展开导航' : '收起导航'"
            @click="collapsed = !collapsed"
          >
            <el-icon><component :is="collapsed ? Expand : Fold" /></el-icon>
          </button>

          <div class="header-heading">
            <span class="eyebrow">工作台 / {{ currentNav.label }}</span>
            <h1>{{ currentNav.label }}</h1>
            <p>{{ currentNav.desc }}</p>
          </div>

          <div class="header-metrics">
            <div class="metric">
              <span>今天</span>
              <strong>{{ todayLabel }}</strong>
            </div>
            <div class="metric">
              <span>本周</span>
              <strong>{{ weekLabel }}</strong>
            </div>
            <div class="metric">
              <span>在册人员</span>
              <strong>{{ staffStore.list.length }} 人</strong>
            </div>
            <div class="metric">
              <span>待处理需求</span>
              <strong>{{ pendingDemands }} 条</strong>
            </div>
          </div>
        </header>

        <main class="page-body">
          <div class="page-inner">
            <component :is="currentComponent" :key="activeTab" />
          </div>
        </main>
      </div>
    </div>
  </el-config-provider>
</template>
