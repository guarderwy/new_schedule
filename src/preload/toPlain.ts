/**
 * 把 Vue/Pinia 响应式代理深度转换为纯对象。
 *
 * Electron 的 IPC 使用结构化克隆（V8 ValueSerializer），
 * 而 Proxy 对象无法被克隆（DataCloneError: An object could not be cloned）。
 * 若直接把 store 里的响应式状态传给 ipcRenderer.invoke，
 * 所有 storage:write 都会失败（且旧实现没有 catch，错误被静默吞掉）。
 * 这里在 IPC 边界统一做一次“去代理”转换，保证数据可序列化。
 */
export function toPlain<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => toPlain(item)) as unknown as T
  if (value instanceof Date) return value.toISOString() as unknown as T
  if (value instanceof Map) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of value) out[String(k)] = toPlain(v)
    return out as unknown as T
  }
  if (value instanceof Set) {
    return [...value].map((item) => toPlain(item)) as unknown as T
  }
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = toPlain(item)
  }
  return out as unknown as T
}
