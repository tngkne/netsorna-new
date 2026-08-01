/**
 * Netsorna Checkout Controller
 * Renders summary, checks order cap limits, and negotiates Yoco payment sessions.
 */

document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
});

function initCheckout() {
  const cart = getCart();

  if (!cart || cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  // 1. Check if any cart item is custom to show custom notes field
  const containsCustomItem = cart.some(item => item.customUploadKey);
  if (containsCustomItem) {
    const customSec = document.getElementById('customNotesSection');
    if (customSec) customSec.style.display = 'block';
  }

  // 2. Render summary list
  const listContainer = document.getElementById('summaryItemsList');
  const totalContainer = document.getElementById('summaryTotalAmount');

  let subtotal = 0;
  listContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div style="display: flex; justify-content: space-between; font-size: 0.88rem;">
        <span>${item.title} (x${item.quantity})</span>
        <span style="font-weight: 500;">R ${itemTotal.toLocaleString()}</span>
      </div>
    `;
  }).join('');

  totalContainer.textContent = `R ${subtotal.toLocaleString()}`;
}

async function submitOrder(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('payButton');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  const cart = getCart();
  const orderPayload = {
    customer: {
      name: document.getElementById('custName').value,
      email: document.getElementById('custEmail').value,
      phone: document.getElementById('custPhone').value,
      address: {
        street: document.getElementById('streetAddress').value,
        city: document.getElementById('city').value,
        postalCode: document.getElementById('postalCode').value,
        province: document.getElementById('province').value
      }
    },
    customNotes: document.getElementById('customNotes')?.value || '',
    items: cart,
    amount: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)
  };

  try {
    // 1. First check weekly order limits against Cloudflare Workers API
    const limitCheck = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const limitResult = await limitCheck.json();

    if (!limitCheck.ok || limitResult.capReached) {
      alert('Order capacity for this week has been reached. Please check back next week or join our notification list.');
      window.location.href = '/shop.html';
      return;
    }

    // 2. Initialize Yoco payment session via Worker backend endpoint
    const paymentRes = await fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountInCents: orderPayload.amount * 100,
        currency: 'ZAR',
        metadata: { orderId: limitResult.orderId }
      })
    });

    const paymentData = await paymentRes.json();

    if (paymentData.redirectUrl) {
      // Clear cart on successful handoff to payment gateway
      saveCart([]);
      window.location.href = paymentData.redirectUrl;
    } else {
      // Fallback for local sandbox or direct success routing
      saveCart([]);
      window.location.href = `/success.html?orderId=${limitResult.orderId || 'NET-DEMO-1001'}`;
    }

  } catch (err) {
    console.error('Checkout error:', err);
    alert('An unexpected error occurred. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Pay with Yoco';
  }
}
