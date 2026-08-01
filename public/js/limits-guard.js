/**
 * Netsorna Limits Guard
 * Enforces weekly order thresholds (40 orders max).
 * If orders are capped, transforms checkout buttons into a "Get Notified" waitlist collector.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkWeeklyOrderLimit();
});

async function checkWeeklyOrderLimit() {
  const actionContainer = document.getElementById('checkoutActionContainer');
  if (!actionContainer) return;

  try {
    const response = await fetch('/api/checkout?checkLimitOnly=true');
    const data = await response.json();

    if (data.isCapped) {
      renderWaitlistState(actionContainer, data.message || 'Weekly order capacity reached.');
    }
  } catch (err) {
    console.warn('Unable to verify order cap limits:', err);
  }
}

function renderWaitlistState(container, message) {
  container.innerHTML = `
    <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 14px; border-radius: 4px; margin-bottom: 12px; font-size: 0.85rem; color: #5d4037;">
      <strong>Notice:</strong> ${message} High-detail handcrafting resumes next week.
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <label style="font-size: 0.85rem; font-weight: 600;">Get notified when orders reopen:</label>
      <input type="email" id="waitlistEmail" placeholder="Enter your email" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;" />
      <button class="btn btn-solid" style="width: 100%;" onclick="submitWaitlistEmail()">Notify Me First</button>
    </div>
  `;
}

async function submitWaitlistEmail() {
  const emailInput = document.getElementById('waitlistEmail');
  if (!emailInput || !emailInput.value) {
    showToast('Please enter a valid email address.');
    return;
  }

  try {
    const res = await fetch('/api/notify-me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value })
    });

    if (res.ok) {
      showToast('You are on the priority waitlist!');
      emailInput.value = '';
    } else {
      throw new Error('Failed to register');
    }
  } catch (err) {
    showToast('Something went wrong. Please try again.');
  }
}
