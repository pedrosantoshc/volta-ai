import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentBusinessId } from '@/lib/business'
import { 
  getRetryQueueStats, 
  clearRetryQueue, 
  manualRetry 
} from '@/lib/passkit-retry-queue'

interface RetryQueueResponse {
  success: boolean
  data?: any
  error?: string
  details?: string
}

// GET method to check retry queue status
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as RetryQueueResponse,
        { status: 401 }
      )
    }

    // Get business ID for the user
    try {
      await getCurrentBusinessId(authSupabase, user.email!)
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Business not found for user', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        } as RetryQueueResponse,
        { status: 404 }
      )
    }

    // Get retry queue statistics
    const stats = getRetryQueueStats()

    return NextResponse.json({
      success: true,
      data: {
        queueStats: stats,
        status: stats.totalItems === 0 
          ? 'idle' 
          : stats.pendingItems > 0 
            ? 'processing' 
            : 'failed',
        message: stats.totalItems === 0 
          ? 'No items in retry queue' 
          : `${stats.totalItems} items in queue, ${stats.pendingItems} pending, ${stats.failedItems} failed`,
        timestamp: new Date().toISOString()
      }
    } as RetryQueueResponse, { status: 200 })

  } catch (error) {
    console.error('Retry queue status error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as RetryQueueResponse,
      { status: 500 }
    )
  }
}

// POST method for retry queue operations
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authSupabase = await createClient(false)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as RetryQueueResponse,
        { status: 401 }
      )
    }

    // Get business ID for the user
    try {
      await getCurrentBusinessId(authSupabase, user.email!)
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Business not found for user', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        } as RetryQueueResponse,
        { status: 404 }
      )
    }

    // Parse request body
    let body: { action: string, queueItemId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' } as RetryQueueResponse,
        { status: 400 }
      )
    }

    const { action, queueItemId } = body

    let response: RetryQueueResponse

    switch (action) {
      case 'clear':
        clearRetryQueue()
        response = {
          success: true,
          data: { message: 'Retry queue cleared successfully' }
        }
        break

      case 'retry':
        if (!queueItemId) {
          return NextResponse.json(
            { success: false, error: 'queueItemId is required for retry action' } as RetryQueueResponse,
            { status: 400 }
          )
        }

        const retrySuccess = await manualRetry(queueItemId)
        response = {
          success: retrySuccess,
          data: { 
            queueItemId,
            message: retrySuccess 
              ? 'Manual retry successful' 
              : 'Manual retry failed'
          }
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use "clear" or "retry"' } as RetryQueueResponse,
          { status: 400 }
        )
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Retry queue operation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as RetryQueueResponse,
      { status: 500 }
    )
  }
}