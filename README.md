# schedule-manager 排班管理系统

医院 / 科室本地排班管理系统，基于 Electron 桌面端运行，数据全部保存在本地，无需联网。

## 技术栈

- **Electron 30** + **electron-vite** —— 桌面运行时与构建工具
- **Vue 3**（`<script setup>`）+ **TypeScript** —— 前端框架
- **Pinia** —— 状态管理
- **Element Plus** —— UI 组件库（按需自动引入）
- **vuedraggable** —— 拖拽排序（如夜班循环规则）
- **dayjs** —— 日期处理

## 功能模块

应用以标签页组织，覆盖排班全流程：

| 模块 | 说明 |
| --- | --- |
| 本周排班 | 查看 / 手工编辑 / 生成当前周排班，支持添加人员、发布、导出 CSV |
| 下周排班 | 生成排班、复制本周排班、删除排班，支持添加人员、发布、导出 CSV |
| 人员管理 | 维护排班人员及其状态、分组类型，支持搜索 / 筛选 / 排序 |
| 岗位管理 | 维护岗位信息 |
| 班次管理 | 维护班次（名称、时间等） |
| 夜班循环规则 | 配置夜班循环规则，支持拖拽排序 |
| 需求管理 | 维护员工的休息 / 指定班次需求，可手动标记已满足 / 已拒绝 |
| 系统设置 | 应用级配置、数据导入导出、备份、示例数据 |

删除类操作均通过居中、灰白风格的确认弹窗（`ElMessageBox.confirm`）进行二次确认；
涉及引用关系的删除（班次 / 岗位 / 人员）会提示影响范围并自动级联清理引用。

### 排班规则说明

- **夜班循环**：夜班组员工按规则顺序循环，每天整体向后轮换一格，保证公平轮转；
  周末自动跳过「助夜班」；规则中的「休息」项表示该员工当天休息。
- **必备班次**：可为工作日 / 周末分别配置必备班次，生成时自动补人并逐日轮换；
  校验器会报告缺失的必备班次。
- **需求**：生成 / 复制上周时会自动应用员工的休息或指定班次需求，并把满足的需求标记为「已满足」。
- **数据来源周**：复制排班与生成排班的参照周始终是**目标周的前一周**——
  在「下周排班」页即本周（正在执行的排班），在「本周排班」页即上一个自然周。
  夜班循环也从该周的最后一个夜班之后继续，保证跨周衔接。
- **员工状态**：休假 / 进修 / 停职为临时状态，超过「状态结束时间」后自动恢复可排班；
  离职为永久状态。
- **发布**：排班发布后为只读，防止误改；跨周后自动标记为「已过期」。
- **冲突检测**：除同一天多班次重叠外，还会检测夜班（23:00-08:00）与次日早班的跨天时间冲突。

## 环境要求

- Node.js 18+（建议 20 LTS）
- npm 9+
- Windows / macOS / Linux（Electron 跨平台）

## 开发 / 构建

```bash
# 安装依赖
npm install

# 启动开发模式（带热重载）
npm run dev

# 类型检查
npm run typecheck

# 打包生产版本
npm run build

# 预览生产构建
npm run preview
```

## 数据存储

数据由 Electron **主进程**负责持久化，渲染进程通过预加载脚本暴露的 `window.storage` 接口访问，所有数据保存在本地文件，不上传任何服务器。

`window.storage` 提供的方法：

- `read(fileName)` / `write(fileName, data)` —— 读写数据文件
- `list()` —— 列出已有数据文件
- `backup()` —— 自动备份
- `export(targetPath)` / `import(sourcePath)` —— 导出 / 导入数据
- `chooseExportFile()` / `chooseImportFile()` —— 弹出文件选择框

> 备份动作会在应用启动时自动执行一次（见 `App.vue` 的 `onMounted`）。

### 注意事项：IPC 边界的序列化

Electron 的 IPC 使用结构化克隆，**Vue/Pinia 的响应式代理（Proxy）无法被克隆**（会抛
`DataCloneError`）。因此 `window.storage.write` 的入参必须在预加载脚本中经
`toPlain()`（见 `src/preload/toPlain.ts`）深度转换为纯对象后再发送。
新增 IPC 方法时，凡是携带对象 / 数组入参的，都必须先过 `toPlain()`，
否则写入会失败（旧版本就存在此问题：所有持久化均未生效，数据每次重启都会丢失）。

## 项目结构

```
src/
├── main/                # Electron 主进程
│   ├── index.ts         # 主进程入口
│   ├── ipc/             # IPC 通信（storage.ts 数据读写，含文件名白名单校验）
│   └── utils/           # 工具（fileSystem.ts 等）
├── preload/             # 预加载脚本，向渲染进程暴露 window.storage
└── renderer/            # Vue 渲染进程
    ├── App.vue          # 入口与标签页布局
    ├── main.ts          # 渲染进程入口
    ├── styles.css       # 全局样式
    ├── views/           # 各功能页（本周/下周排班、人员、岗位、班次…）
    ├── components/      # 业务组件（列表、表单弹窗、排班表格等）
    ├── core/            # 纯逻辑：排班生成、校验、冲突检测、CSV 导出、反馈封装
    ├── stores/          # Pinia 状态（useStaffStore 等）
    ├── types/           # TypeScript 类型定义
    └── constants/       # 常量（状态、分组等枚举标签）
```

## 说明

- 组件与 API 经 `unplugin-vue-components` / `unplugin-auto-import` 按需自动引入，无需手动 `import` 组件。
- 删除确认弹窗的居中样式与灰白风格在 `src/renderer/styles.css` 中统一配置（`#f5f7fa` 系统灰白底）。
