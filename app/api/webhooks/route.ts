/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto'

export function generateSignature(payload: unknown, secret: string): string {
  if (!secret) {
    return "sig_no_secret_configured"
  }
  // Use HMAC-SHA256 for signature generation
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")
}

export function verifySignature(payload: unknown, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret)
  try {
    return crypto.timingSafeEqual(new Uint8Array(Buffer.from(signature)), new Uint8Array(Buffer.from(expectedSignature)))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const signatureHeader = request.headers.get('x-gamepoints-signature') || request.headers.get('X-gamePoints-Signature')
  const rawBody = await request.text()

  if (!signatureHeader) {
    return new Response('Missing signature', { status: 400 })
  }

  const signature = signatureHeader.startsWith('sha256=') ? signatureHeader.split('=')[1] : signatureHeader

  // Parse body as JSON (we expect merchant/webhook payloads to be JSON)
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch (err) {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Verify signature using configured secret
  const secret = process.env.GAME_POINTS_WEBHOOK_SECRET || 'whsec_60c3an5v5tsrzckzahm7fmiexflnyzyh'
  const isVerified = verifySignature(payload, signature, secret)
  if (!isVerified) {
    return new Response('Invalid signature', { status: 401 })
  }

  // Process webhook
  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err) {
    return new Response('Invalid JSON', { status: 400 })
  }

  try {
    switch (event.event_type) {
      case 'checkout.session.completed':
        await handlePaymentCompleted(event.data)
        break
      case 'checkout.session.failed':
        await handlePaymentFailed(event.data)
        break
      default:
        console.log('Unhandled event type:', event.event_type)
    }
  } catch (err) {
    console.error('Error processing webhook:', err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

async function handlePaymentCompleted(data: any) {
  // TODO: implement idempotent processing (store event id, update DB, fulfill order, etc.)
  console.log('Webhook: checkout.session.completed', JSON.stringify(data))
}

async function handlePaymentFailed(data: any) {
  // TODO: log failure, notify user, retry if appropriate
  console.log('Webhook: checkout.session.failed', JSON.stringify(data))
}
