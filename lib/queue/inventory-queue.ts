/**
 * Inventory Sync Queue — tránh Rate Limit khi push tồn kho lên sàn.
 *
 * Vấn đề: Shopee cho phép ~2 req/giây/shop cho updateStock.
 * Nếu có 5000 SKU thay đổi cùng lúc, gọi thẳng sẽ bị 429.
 *
 * Giải pháp: đẩy vào queue, worker xử lý tuần tự với delay.
 *
 * Setup:
 *   npm install bullmq ioredis
 *   Cần Redis (Upstash Redis free tier đủ dùng)
 *   Thêm REDIS_URL vào .env.local
 *
 * Rate limits thực tế (tham khảo từ docs):
 *   Shopee:    2 calls/giây/shop  → delay 600ms
 *   TikTok:    10 calls/giây      → delay 120ms
 *   Lazada:    1 call/giây        → delay 1100ms
 *   Facebook:  200 calls/giờ/user → delay 20s (catalog batch thay thế)
 */

// ─── Type definitions (không cần import bullmq nếu chưa install) ──────────────

export interface InventoryUpdateJob {
  channelId: string
  channelName: 'Shopee' | 'TikTok Shop' | 'Lazada' | 'Facebook' | 'Instagram'
  updates: Array<{
    channelSku: string
    quantity: number
    productId: string
  }>
  batchId: string   // dùng để deduplicate: nếu batchId đã xử lý rồi thì skip
}

// Delay (ms) giữa các API call, theo từng sàn
export const RATE_LIMIT_DELAY: Record<string, number> = {
  'Shopee':      600,
  'TikTok Shop': 120,
  'Lazada':      1100,
  'Facebook':    500,
  'Instagram':   500,
}

// ─── Simple in-memory queue (dùng khi chưa có Redis) ─────────────────────────
// Thay bằng BullMQ khi deploy production

type JobHandler = (job: InventoryUpdateJob) => Promise<void>

class SimpleInventoryQueue {
  private queue: InventoryUpdateJob[] = []
  private processing = false
  private handler: JobHandler | null = null

  setHandler(fn: JobHandler) {
    this.handler = fn
  }

  async add(job: InventoryUpdateJob) {
    this.queue.push(job)
    if (!this.processing) this.process()
  }

  private async process() {
    if (!this.handler || this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const job = this.queue.shift()!

    try {
      await this.handler(job)
    } catch (err) {
      console.error(`[InventoryQueue] Job failed for channel ${job.channelId}:`, err)
      // Tự động retry sau 30s
      setTimeout(() => this.queue.unshift(job), 30_000)
    }

    const delay = RATE_LIMIT_DELAY[job.channelName] ?? 500
    setTimeout(() => this.process(), delay)
  }
}

export const inventoryQueue = new SimpleInventoryQueue()

// ─── BullMQ implementation (production) ─────────────────────────────────────
// Uncomment khi đã có Redis:
//
// import { Queue, Worker } from 'bullmq'
// import { Redis } from 'ioredis'
//
// const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })
//
// export const inventoryBullQueue = new Queue<InventoryUpdateJob>('inventory-sync', {
//   connection: redis,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: { type: 'exponential', delay: 5000 },
//     removeOnComplete: 100,
//     removeOnFail: 500,
//   },
// })
//
// export const inventoryWorker = new Worker<InventoryUpdateJob>(
//   'inventory-sync',
//   async (job) => {
//     const { channelName, channelId, updates } = job.data
//     const delay = RATE_LIMIT_DELAY[channelName] ?? 500
//
//     for (const [i, update] of updates.entries()) {
//       await pushSingleUpdate(channelId, channelName, update)
//       if (i < updates.length - 1) {
//         await new Promise(r => setTimeout(r, delay))
//       }
//     }
//   },
//   {
//     connection: redis,
//     concurrency: 1,       // 1 job tại 1 thời điểm, tránh vượt rate limit
//     limiter: { max: 5, duration: 1000 },
//   }
// )
