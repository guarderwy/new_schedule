import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'

/**
 * 每分钟推进一次的响应式时钟。
 * “本周 / 下周 / 今天”这类派生值依赖当前日期，
 * 应用长时间不重启时（跨天、跨周）需要自动刷新，否则视图会停留在旧周期。
 */
export function useNowTick(): Ref<number> {
  const tick = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(() => {
      tick.value = Date.now()
    }, 60_000)
  })
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return tick
}
