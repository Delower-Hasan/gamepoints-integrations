/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";

const STORE_ITEMS = [
  { id: 'g1', title: 'Speed Booster', price_points: 10, price_usd: 10 },
  { id: 'g2', title: 'Double XP', price_points: 20, price_usd: 20 },
  { id: 'g3', title: 'Legendary Skin', price_points: 50, price_usd: 50 }
]

const DUMMY_USER = {
  user_id: 'user_abc123',
  email: 'player@example.com'
}

export default function Home() {
  const [cart, setCart] = useState<Record<string, number>>({})
  // eslint-disable-next-line react-hooks/purity
  const [orderId, setOrderId] = useState<string>(`ord_${Date.now()}`)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('idle')
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any } | null>(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Verify origin
      if (event.origin !== 'https://smash-pay-i-frame-checkout.vercel.app') return

      const { type, data } = event.data || {}
      setLastEvent({ type, data })
      console.log('Received message from GamePoints:', type, data)

      switch (type) {
        case 'GAMEPOINTS_CHECKOUT_READY':
          setStatus('checkout_loaded')
          break
        case 'GAMEPOINTS_PAYMENT_SUCCESS':
          setStatus('payment_success')
          // close iframe
          setTimeout(() => setIframeUrl(null), 1200)
          break
        case 'GAMEPOINTS_PAYMENT_FAILED':
          setStatus('payment_failed')
          break
        case 'GAMEPOINTS_SESSION_EXPIRED':
          setStatus('session_expired')
          setIframeUrl(null)
          break
        default:
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function addToCart(itemId: string) {
    setCart((c) => ({ ...c, [itemId]: (c[itemId] || 0) + 1 }))
  }

  function removeFromCart(itemId: string) {
    setCart((c) => {
      const copy = { ...c }
      delete copy[itemId]
      return copy
    })
  }

  function cartSummary() {
    const items = Object.entries(cart).map(([id, qty]) => {
      const it = STORE_ITEMS.find((s) => s.id === id)
      return { ...it, qty }
    }).filter((item) => item.id !== undefined)
    const totalUsd = items.reduce((s, i) => s + (i.price_usd || 0) * i.qty, 0)
    const totalPoints = items.reduce((s, i) => s + (i.price_points || 0) * i.qty, 0)
    return { items, totalUsd, totalPoints }
  }

  async function createCheckoutSession() {
    const summary = cartSummary()
    if (summary.items.length === 0) return alert('Cart is empty')

    setStatus('creating_session')

    // use `orderId` from state
    const body = {
      merchant_id: '327813',
      order_id: orderId,
      amount_usd: Math.round(summary.totalUsd * 100) / 100,
      user: DUMMY_USER,
      allowed_topup_methods: ['card', 'crypto','nft'],
      success_url: window.location.origin + '/success',
      cancel_url: window.location.origin + '/store'
    }

    try {
      const API_KEY = process.env.NEXT_PUBLIC_MERCHANT_API_KEY || 'sk_8fdc561bfab5a7a850d728558cb279ca448ce71f8e121805'
      const endpoint = '/api/checkout/sessions' // Proxy endpoint in our Next.js app
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const text = await res.text()
        setStatus('session_error')
        console.error('Checkout session creation failed', res.status, text)
        return
      }

      const { session_id, iframe_url } = await res.json()
      setStatus('session_created')
      // Use returned iframe_url directly
      setIframeUrl(iframe_url)
    } catch (err) {
      console.error(err)
      setStatus('session_error')
    }
  }

  const handleReset = () => {
    setIframeUrl(null)
    setOrderId(`ord_${Date.now()}`)
  }

  // For demonstration/testing: directly call the message handler with a forged origin object
  // This helper invokes the same logic as the real message handler but allows local testing.
  function simulateGamepointsEvent(type: string, data = {}) {
    const fakeEvent = { origin: 'https://smash-pay-i-frame-checkout.vercel.app', data: { type, data } }
    console.log('Simulating GamePoints event:', type, data)
    // Call the same handler path by dispatching a custom event to window listeners
    window.dispatchEvent(new MessageEvent('message', fakeEvent))
  }

  const summary = cartSummary()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">GamePoints Store</h1>
            <p className="text-sm muted">Demo storefront — integrate GamePoints checkout</p>
          </div>
          <div className="text-right muted text-sm">
            <div>Order: <span className="font-mono text-xs">{orderId}</span></div>
            <div className="mt-2">Status: <span className="font-medium">{status}</span></div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main className="lg:col-span-2">
            <section className="card">
              <h2 className="text-lg font-medium mb-4">Items</h2>
              <div className="space-y-4">
                {STORE_ITEMS.map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-md">
                    <div>
                      <div className="font-medium">{it.title}</div>
                      <div className="muted text-sm">{it.price_points} points — ${it.price_usd}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost" onClick={() => removeFromCart(it.id)}>Remove</button>
                      <button className="btn" onClick={() => addToCart(it.id)}>Add</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="card">
            <h3 className="text-lg font-medium">Your Cart</h3>
            <div className="mt-3">
              {summary.items.length === 0 ? (
                <p className="muted">Cart is empty</p>
              ) : (
                <ul className="space-y-2">
                  {summary.items.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>{it.title} x {it.qty}</span>
                      <span className="muted">${(it.price_usd || 0) * it.qty}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                <div className="font-semibold">Total</div>
                <div className="font-medium">${summary.totalUsd}</div>
              </div>
              <div className="muted text-sm mt-1">{summary.totalPoints} points</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn" onClick={createCheckoutSession} disabled={summary.items.length === 0}>Checkout</button>
                <button className="btn-ghost" onClick={handleReset}>Reset</button>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium">Demo controls</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => simulateGamepointsEvent('GAMEPOINTS_CHECKOUT_READY')}>Simulate Ready</button>
                <button className="btn-ghost" onClick={() => simulateGamepointsEvent('GAMEPOINTS_PAYMENT_SUCCESS', { session_id: 'sess_demo' })}>Simulate Success</button>
                <button className="btn-ghost" onClick={() => simulateGamepointsEvent('GAMEPOINTS_PAYMENT_FAILED', { error: 'declined' })}>Simulate Failure</button>
              </div>
            </div>

            {lastEvent && (
              <pre className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 text-sm rounded-md overflow-auto" style={{ maxHeight: 140 }}>
                {JSON.stringify(lastEvent, null, 2)}
              </pre>
            )}
          </aside>
        </div>

        {iframeUrl && (
          <section className="mt-6 card">
            <h3 className="text-lg font-medium mb-3">Checkout</h3>
            <div id="checkout-container" className="w-full">
              <iframe
                id="gamepoints-checkout"
                ref={iframeRef}
                src={iframeUrl}
                width="100%"
                height="600"
                title="GamePoints Checkout"
                className="w-full rounded-lg border-0"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
