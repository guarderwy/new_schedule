import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * 统一的二次确认弹窗。
 * ElMessageBox.confirm 在用户点击取消时会 reject，这里统一捕获，
 * 避免调用方到处写 try/catch，同时杜绝控制台出现未处理的 Promise 拒绝。
 */
export async function confirmAction(
  message: string,
  title = '删除确认',
  type: 'warning' | 'info' = 'warning'
): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, { type })
    return true
  } catch {
    return false
  }
}

/** 统一的操作失败提示：打印日志并弹出错误消息 */
export function reportError(action: string, error: unknown): void {
  console.error(`${action}失败`, error)
  ElMessage.error(`${action}失败，请重试`)
}
