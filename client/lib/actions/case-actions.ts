'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

export async function closeCase(caseId: string, reason: string, reunited?: boolean) {
  try {
    const { getToken } = await auth()
    const token = getToken ? await getToken() : undefined
    
    if (!token) {
      throw new Error('Authentication required')
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) {
      throw new Error('Backend URL not configured')
    }

    const response = await fetch(`${backendUrl}/cases/${caseId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason, reunited: Boolean(reunited) }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to close case')
    }

    // Invalidate granular cache: tag + page path
    revalidateTag(`case:${caseId}`)
    revalidatePath(`/cases/${caseId}`)
    
    const payload = await response.json().catch(() => ({})) as any
    return { success: true, message: 'Case closed successfully', data: payload?.data }
  } catch (error) {
    console.error('Error closing case:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to close case')
  }
}

export async function flagCase(caseId: string, reason: string) {
  try {
    const { getToken } = await auth()
    const token = getToken ? await getToken() : undefined

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) {
      throw new Error('Backend URL not configured')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth header if token is available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${backendUrl}/cases/${caseId}/flag`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, message: errorData.message || 'Failed to flag case' }
    }

    // Invalidate granular cache: tag + page path
    revalidateTag(`case:${caseId}`)
    revalidatePath(`/cases/${caseId}`)
    
    const payload = await response.json().catch(() => ({})) as any
    return { success: true, message: payload.message || 'Case flagged successfully', data: payload?.data }
  } catch (error) {
    console.error('Error flagging case:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to flag case' }
  }
}

export async function assignCase(caseId: string, userId: string) {
  try {
    const { getToken } = await auth()
    const token = getToken ? await getToken() : undefined

    if (!token) {
      throw new Error('Authentication required')
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) {
      throw new Error('Backend URL not configured')
    }

    const response = await fetch(`${backendUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, message: errorData.message || 'Failed to assign case' }
    }

    // Invalidate granular cache: tag + page path
    revalidateTag(`case:${caseId}`)
    revalidatePath(`/cases/${caseId}`)
    
    const payload = await response.json().catch(() => ({})) as any
    return { success: true, message: payload.message || 'Case assigned successfully', data: payload?.data }
  } catch (error) {
    console.error('Error assigning case:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to assign case' }
  }
}