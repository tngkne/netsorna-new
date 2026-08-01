export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Secure API Route handling the checkout
    if (url.pathname === "/api/create-checkout" && request.method === "POST") {
      try {
        const body = await request.json();
        
        // This securely pulls your hidden runtime secret key
        const secretKey = env.YOCO_SECRET_KEY; 

        const response = await fetch("https://yoco.com", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: body.amount,
            currency: "ZAR",
            successUrl: body.successUrl
          })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // Crucial: Fall back to serving your static repository assets
    return env.ASSETS.fetch(request);
  }
};
