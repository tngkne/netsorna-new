/**
 * Netsorna WhatsApp Inquiry Controller
 * Intercepts WhatsApp inquiry triggers, checks weekly lead limits, and formats deep links.
 */

async function handleWhatsappInquiry(sku, title) {
  try {
    const res = await fetch('/api/whatsapp-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, title })
    });

    const data = await res.json();

    if (res.status === 429 || data.isCapped) {
      showToast(data.message || 'WhatsApp consultations full for this week.');
      return;
    }

    const phone = data.whatsappNumber || '27000000000';
    const message = `Hello Netsorna, I am interested in inquiring about a custom luxury piece: ${title} (SKU: ${sku}).`;
    const encodedUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(encodedUrl, '_blank', 'noopener,noreferrer');

  } catch (err) {
    console.error('WhatsApp inquiry error:', err);
    showToast('Unable to open WhatsApp connection right now.');
  }
}
