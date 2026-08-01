export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sku = url.searchParams.get('sku');
  const id = url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // 1. Fetch catalog list from Cloudflare KV Namespace (PRODUCTS_KV binding)
    let catalog = await env.PRODUCTS_KV.get('CATALOG_INDEX', { type: 'json' });

    // Fallback if KV hasn't been synced yet during development
    if (!catalog) {
      catalog = [
        {
          id: "custom-portrait",
          sku: "NET-CUST-PORTRAIT",
          title: "Custom Portrait Relief (1–5 Faces)",
          price: 4500,
          customType: "custom-1",
          description: "A bespoke multi-layered acrylic and high-density relief art piece sculpted from your personal photographs.",
          images: ["/images/products/product1.jpg", "/images/products/product2.jpg"]
        },
        {
          id: "custom-object",
          sku: "NET-CUST-OBJECT",
          title: "Custom Object / Architectural Sculpt",
          price: 5200,
          customType: "custom-2",
          description: "Custom dimensional artwork focusing on structural objects, animals, or places.",
          images: ["/images/products/product1.jpg"]
        },
        {
          id: "luxury-art-piece",
          sku: "NET-LUX-001",
          title: "Grand Statement Relief Wall Art",
          price: 18500,
          customType: "none",
          description: "Exclusive museum-grade UV acrylic composite wall installation.",
          images: ["/images/products/product1.jpg"]
        },
        {
          id: "ready-made-item",
          sku: "NET-FRM-001",
          title: "Abstract Geometric Relief Panel",
          price: 1999,
          customType: "none",
          description: "Pre-crafted and ready for immediate courier dispatch across South Africa.",
          images: ["/images/products/product2.jpg"]
        }
      ];
    }

    // 2. Query filter logic (by SKU or ID)
    if (sku) {
      const match = catalog.find(p => p.sku === sku);
      if (!match) {
        return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers });
      }
      return new Response(JSON.stringify(match), { headers });
    }

    if (id) {
      const match = catalog.find(p => p.id === id);
      if (!match) {
        return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers });
      }
      return new Response(JSON.stringify(match), { headers });
    }

    // 3. Return full catalog if no filter applied
    return new Response(JSON.stringify(catalog), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to query products catalog", details: err.message }), {
      status: 500,
      headers
    });
  }
}
