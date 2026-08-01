/**
 * Cloudflare Worker: /api/payment-intent
 * Initializes Yoco Web Checkout session for South African Rand transactions.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { orderId, amountInCents, currency = 'ZAR' } = await request.json();

    if (!orderId || !amountInCents) {
      return new Response(JSON.stringify({ error: 'Order ID and amount are required' }), {
        status: 400,
        headers
      });
    }

    // Fallback secret key (Test environment key) if env.YOCO_SECRET_KEY is not defined in Wrangler/Dashboard
    const secretKey = env.YOCO_SECRET_KEY || 'sk_test_ad3574baP4560Lq3f0b40ab9d9a7';
    const origin = new URL(request.url).origin;

    // Yoco Web Checkout Instant Session Endpoint
    const yocoResponse = await fetch('https://online.yoco.com/v1/checkout/instant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        amount: amountInCents, // Amount in cents (e.g., R1,999 = 199900)
        currency: currency,
        cancelUrl: `${origin}/checkout.html?orderId=${orderId}&status=cancelled`,
        successUrl: `${origin}/success.html?orderId=${orderId}`,
        metadata: {
          orderId: orderId
        }
      })
    });

    const yocoData = await yocoResponse.json();

    if (!yocoResponse.ok) {
      throw new Error(yocoData.message || yocoData.errorMessage || 'Yoco session creation failed');
    }

    // Yoco returns redirect URL directly or as .redirectUrl / .url
    const redirectUrl = yocoData.redirectUrl || yocoData.url;

    return new Response(
      JSON.stringify({
        redirectUrl: redirectUrl,
        sessionId: yocoData.id
      }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Payment initialization failed', details: err.message }),
      { status: 500, headers }
    );
  }
}
