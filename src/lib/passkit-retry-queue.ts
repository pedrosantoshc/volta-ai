import { handleStampTransaction } from './passkit-operations'

// Retry queue item interface
interface RetryQueueItem {
  id: string
  customerLoyaltyCardId: string
  stampsAdded: number
  attempts: number
  lastAttempt: Date
  maxAttempts: number
  nextRetry: Date
}

// In-memory retry queue (in production, this should be stored in Redis or database)
let retryQueue: RetryQueueItem[] = []
let retryIntervalId: NodeJS.Timeout | null = null

// Configuration
const MAX_ATTEMPTS = 3
const BASE_DELAY = 1000 // 1 second
const MAX_DELAY = 30000 // 30 seconds

// Calculate next retry delay with exponential backoff
function calculateNextRetryDelay(attempts: number): number {
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempts), MAX_DELAY)
  // Add some jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(1000, delay + jitter) // Minimum 1 second
}

// Add item to retry queue
export function addToRetryQueue(
  customerLoyaltyCardId: string, 
  stampsAdded: number
): void {
  const now = new Date()
  const queueItem: RetryQueueItem = {
    id: `${customerLoyaltyCardId}-${Date.now()}`,
    customerLoyaltyCardId,
    stampsAdded,
    attempts: 0,
    lastAttempt: now,
    maxAttempts: MAX_ATTEMPTS,
    nextRetry: new Date(now.getTime() + calculateNextRetryDelay(0))
  }

  retryQueue.push(queueItem)
  
  console.log('📋 Added PassKit update to retry queue:', {
    queueItemId: queueItem.id,
    customerLoyaltyCardId,
    stampsAdded,
    nextRetry: queueItem.nextRetry.toISOString()
  })

  // Start retry processor if not already running
  startRetryProcessor()
}

// Process retry queue
async function processRetryQueue(): Promise<void> {
  if (retryQueue.length === 0) {
    return
  }

  const now = new Date()
  const itemsToRetry = retryQueue.filter(item => item.nextRetry <= now)

  if (itemsToRetry.length === 0) {
    return
  }

  console.log(`🔄 Processing ${itemsToRetry.length} PassKit retry items`)

  for (const item of itemsToRetry) {
    try {
      // Attempt PassKit update
      await handleStampTransaction(item.customerLoyaltyCardId, item.stampsAdded)
      
      // Success - remove from queue
      retryQueue = retryQueue.filter(queueItem => queueItem.id !== item.id)
      
      console.log('✅ PassKit retry successful:', {
        queueItemId: item.id,
        customerLoyaltyCardId: item.customerLoyaltyCardId,
        attempts: item.attempts + 1
      })
      
    } catch (error) {
      item.attempts += 1
      item.lastAttempt = now
      
      if (item.attempts >= item.maxAttempts) {
        // Max attempts reached - remove from queue and log error
        retryQueue = retryQueue.filter(queueItem => queueItem.id !== item.id)
        
        console.error('❌ PassKit retry failed permanently:', {
          queueItemId: item.id,
          customerLoyaltyCardId: item.customerLoyaltyCardId,
          attempts: item.attempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        // In production, you might want to:
        // - Send alert to monitoring system
        // - Store failed item for manual review
        // - Update database to mark as failed
        
      } else {
        // Schedule next retry
        const delay = calculateNextRetryDelay(item.attempts)
        item.nextRetry = new Date(now.getTime() + delay)
        
        console.warn('⚠️ PassKit retry failed, will retry:', {
          queueItemId: item.id,
          customerLoyaltyCardId: item.customerLoyaltyCardId,
          attempts: item.attempts,
          maxAttempts: item.maxAttempts,
          nextRetry: item.nextRetry.toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }
}

// Start retry processor
function startRetryProcessor(): void {
  if (retryIntervalId) {
    return // Already running
  }

  // Process queue every 30 seconds
  retryIntervalId = setInterval(async () => {
    try {
      await processRetryQueue()
      
      // Stop processor if queue is empty
      if (retryQueue.length === 0) {
        stopRetryProcessor()
      }
    } catch (error) {
      console.error('Retry queue processor error:', error)
    }
  }, 30000) // 30 seconds

  console.log('🔄 PassKit retry processor started')
}

// Stop retry processor
function stopRetryProcessor(): void {
  if (retryIntervalId) {
    clearInterval(retryIntervalId)
    retryIntervalId = null
    console.log('⏹️ PassKit retry processor stopped')
  }
}

// Get queue statistics
export function getRetryQueueStats(): {
  totalItems: number
  pendingItems: number
  failedItems: number
  oldestItem?: Date
} {
  const now = new Date()
  const pendingItems = retryQueue.filter(item => item.nextRetry > now)
  const failedItems = retryQueue.filter(item => item.attempts >= item.maxAttempts)
  
  return {
    totalItems: retryQueue.length,
    pendingItems: pendingItems.length,
    failedItems: failedItems.length,
    oldestItem: retryQueue.length > 0 
      ? new Date(Math.min(...retryQueue.map(item => item.lastAttempt.getTime())))
      : undefined
  }
}

// Clear retry queue (for testing/admin purposes)
export function clearRetryQueue(): void {
  const itemCount = retryQueue.length
  retryQueue = []
  stopRetryProcessor()
  
  console.log(`🧹 Cleared PassKit retry queue (${itemCount} items removed)`)
}

// Manual retry of specific item (for admin purposes)
export async function manualRetry(queueItemId: string): Promise<boolean> {
  const item = retryQueue.find(queueItem => queueItem.id === queueItemId)
  
  if (!item) {
    console.warn('Manual retry failed - item not found:', queueItemId)
    return false
  }

  try {
    await handleStampTransaction(item.customerLoyaltyCardId, item.stampsAdded)
    
    // Success - remove from queue
    retryQueue = retryQueue.filter(queueItem => queueItem.id !== queueItemId)
    
    console.log('✅ Manual PassKit retry successful:', {
      queueItemId,
      customerLoyaltyCardId: item.customerLoyaltyCardId
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Manual PassKit retry failed:', {
      queueItemId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return false
  }
}