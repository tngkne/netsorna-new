/**
 * Cloudflare Worker: /api/checkout
 * Manages order creation & enforces the strict 40-order weekly limit.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const payload = await request.json();
    const { items, customer, customUploadKey } = payload;

    if (!items || items.length === 0 || !customer || !customer.email) {
      return new Response(JSON.stringify({ error: 'Missing required order details' }), {
        status: 400,
        headers
      });
    }

    // 1. Calculate current weekly order count from Cloudflare KV
    const currentWeekKey = getWeeklyKVKey();
    let currentCount = await env.ORDERS_KV.get(currentWeekKey);
    currentCount = currentCount ? parseInt(currentCount, 10) : 0;

    const WEEKLY_MAX_ORDERS = 40;

    if (currentCount >= WEEKLY_MAX_ORDERS) {
      return new Response(
        JSON.stringify({
          error: 'Cap Reached',
          isCapped: true,
          message: 'Weekly handcrafted order capacity (40) reached.'
        }),
        { status: 429, headers }
      );
    }

    // 2. Build unique Order ID
    const orderId = `NET-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderRecord = {
      orderId,
      createdAt: new Date().toISOString(),
      customer,
      items,
      customUploadKey: customUploadKey || null,
      status: 'PENDING_PAYMENT'
    };

    // 3. Save order record to KV
    await env.ORDERS_KV.put(`order:${orderId}`, JSON.stringify(orderRecord));

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        message: 'Order created successfully. Proceed to payment.'
      }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Checkout processing failed', details: err.message }),
      { status: 500, headers }
    );
  }
}

// Helper to check limit status via GET
export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  const currentWeekKey = getWeeklyKVKey();
  let currentCount = await env.ORDERS_KV.get(currentWeekKey);
  currentCount = currentCount ? parseInt(currentCount, 10) : 0;

  const isCapped = currentCount >= 40;

  return new Response(
    JSON.stringify({
      currentCount,
      weeklyLimit: 40,
      isCapped,
      message: isCapped ? 'Weekly capacity reached.' : 'Orders open.'
    }),
    { status: 200, headers }
  );
}

function getWeeklyKVKey() {
  const d = new Date();
  const year = d.getFullYear();
  // Simple ISO week calculator
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `orders_count_${year}_w${weekNum}`;
}
