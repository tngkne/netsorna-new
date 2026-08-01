/**
 * Cloudflare Worker: /api/payment-intent
 * Initializes Yoco Checkout session for South African Rand transactions.
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

    // Yoco API Checkout Session Endpoint
    const yocoResponse = await fetch('https://online.yoco.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.YOCO_SECRET_KEY}`
      },
      body: JSON.stringify({
        amount: amountInCents, // Amount in cents (e.g. R1,999 = 199900)
        currency: currency,
        cancelUrl: `https://netsorna.website/checkout.html?orderId=${orderId}&status=cancelled`,
        successUrl: `https://netsorna.website/success.html?orderId=${orderId}`,
        metadata: {
          orderId: orderId
        }
      })
    });

    const yocoData = await yocoResponse.json();

    if (!yocoResponse.ok) {
      throw new Error(yocoData.errorMessage || 'Yoco session creation failed');
    }

    return new Response(
      JSON.stringify({
        redirectUrl: yocoData.redirectUrl,
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
