// functions/api/checkout.js
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { items, totalAmountCents, customerEmail, redirectUrl } = await request.json();

    // Validate minimum amount: R2.00 = 200 cents cite🛠web_search:3#0:~:text=Payments less than...200 cents, aren't accepted
    if (!totalAmountCents || totalAmountCents < 200) {
      return new Response(
        JSON.stringify({ error: 'Minimum payment is R2.00 (200 cents)' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      amount: totalAmountCents,
      currency: 'ZAR',
      successUrl: `${redirectUrl}/success`,
      cancelUrl: `${redirectUrl}/cancel`,
      failureUrl: `${redirectUrl}/failure`,
      metadata: {
        orderItems: JSON.stringify(items),
        customerEmail: customerEmail,
      }
    };

    const response = await fetch('https://online.yoco.com/v1/checkouts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.YOCO_SECRET_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data }), 
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ checkoutUrl: data.redirectUrl, checkoutId: data.id }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
