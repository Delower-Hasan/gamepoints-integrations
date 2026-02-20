import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        try {
            const target = process.env.TARGET_API_URL || 'https://smashpoints.xyz/api/v1/checkout/sessions'
            const apiKey = process.env.SMASHPOINTS_API_KEY || 'sk_8fdc561bfab5a7a850d728558cb279ca448ce71f8e121805' // Default key for testing, replace with your own for production

            if (!apiKey) {
                return NextResponse.json({ error: 'Server missing SMASHPOINTS_API_KEY env var' }, { status: 500 })
            }

            const response = await fetch(target, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify(await request.json())
            })

            const text = await response.text()
            // Try to parse JSON, otherwise send as text
            try {
                const json = JSON.parse(text)
                return NextResponse.json(json, { status: response.status })
            } catch (e) {
                return NextResponse.json({ error: text }, { status: response.status })
            }
        } catch (err) {
            console.error('Proxy error', err)
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            return NextResponse.json({ error: 'Proxy error', detail: errorMessage }, { status: 500 })
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            { error: 'Internal server error', detail: errorMessage },
            { status: 500 }
        );
    }
}