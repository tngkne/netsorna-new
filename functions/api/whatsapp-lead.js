/**
 * Cloudflare Worker: /api/whatsapp-lead
 * Logs WhatsApp lead inquiries and enforces the 10 inquiries/week limit.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { sku, title } = await request.json();

    const currentWeekKey = getWeeklyKVKey();
    let currentCount = await env.ORDERS_KV.get(currentWeekKey);
    currentCount = currentCount ? parseInt(currentCount, 10) : 0;

    const WEEKLY_MAX_WHATSAPP = 10;

    if (currentCount >= WEEKLY_MAX_WHATSAPP) {
      return new Response(
        JSON.stringify({
          isCapped: true,
          message: 'Weekly WhatsApp consultation capacity reached (10/wk max). Please email or check back next week.'
        }),
        { status: 429, headers }
      );
    }

    // Increment count in KV
    await env.ORDERS_KV.put(currentWeekKey, (currentCount + 1).toString());

    // Log individual lead timestamp
    const leadKey = `wa_lead:${Date.now()}:${sku}`;
    await env.ORDERS_KV.put(leadKey, JSON.stringify({ sku, title, timestamp: new Date().toISOString() }));

    return new Response(
      JSON.stringify({
        success: true,
        whatsappNumber: env.WHATSAPP_PHONE_NUMBER || '27000000000'
      }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to log WhatsApp lead', details: err.message }),
      { status: 500, headers }
    );
  }
}

function getWeeklyKVKey() {
  const d = new Date();
  const year = d.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `wa_leads_count_${year}_w${weekNum}`;
}
