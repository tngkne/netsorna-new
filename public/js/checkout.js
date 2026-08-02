// public/js/checkout.js

// Your test public key (safe to expose in frontend)
const YOCO_PUBLIC_KEY = 'pk_test_9e87d40f5E4Mmokee984';

async function initiateCheckout() {
  // Example cart
  const cart = [
    { name: 'T-Shirt', quantity: 1, price: 25000 } // price in cents = R250.00
  ];
  const totalAmount = 250; // Rands
  const customerEmail = document.getElementById('email').value || 'test@example.com';
  const redirectBase = window.location.origin;

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart,
        totalAmountCents: totalAmount * 100, // Convert to cents
        customerEmail: customerEmail,
        redirectUrl: redirectBase
      })
    });

    const data = await response.json();

    if (data.checkoutUrl) {
      // Redirect to Yoco's secure payment page
      window.location.href = data.checkoutUrl;
    } else {
      console.error('Checkout failed:', data.error);
      alert('Payment failed: ' + (data.error?.message || 'Unknown error'));
    }

  } catch (error) {
    console.error('Network error:', error);
    alert('Could not connect to payment server.');
  }
}

// Attach to button
document.getElementById('pay-button').addEventListener('click', initiateCheckout);
