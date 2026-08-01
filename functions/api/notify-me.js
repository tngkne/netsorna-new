/**
 * Cloudflare Worker: /api/notify-me
 * Appends waitlist emails to KV when weekly shop capacity is reached.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers });
    }

    const timestamp = new Date().toISOString();
    const entryKey = `waitlist:${Date.now()}:${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    await env.ORDERS_KV.put(
      entryKey,
      JSON.stringify({ email, registeredAt: timestamp })
    );

    return new Response(
      JSON.stringify({ success: true, message: 'Added to priority reopening list.' }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to record waitlist entry', details: err.message }),
      { status: 500, headers }
    );
  }
}
