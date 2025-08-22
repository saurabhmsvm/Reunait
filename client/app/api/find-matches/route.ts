import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { caseId, gender, status, country, date } = body

    // Validate required parameters
    if (!caseId) {
      return NextResponse.json(
        { success: false, message: 'Case ID is required' },
        { status: 400 }
      )
    }

         // Call backend API to find similar cases
    const backendUrl = process.env.BACKEND_URL
    console.log('Making request to:', `${backendUrl}/api/find-matches`)
    const backendResponse = await fetch(`${backendUrl}/api/find-matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caseId,
        gender,
        status,
        country,
        date
      })
    })

    const data = await backendResponse.json()

    if (backendResponse.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'AI search failed' },
        { status: backendResponse.status }
      )
    }

  } catch (error) {
    console.error('Find Matches API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
