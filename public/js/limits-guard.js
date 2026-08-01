/**
 * Netsorna Limits Guard
 * Enforces weekly order thresholds (40 orders max).
 * Transforms checkout buttons into a "Get Notified" waitlist collector when capacity is reached.
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkWeeklyOrderLimit();
});

async function checkWeeklyOrderLimit() {
  const actionContainer = document.getElementById('checkoutActionContainer');
  if (!actionContainer) return;

  try {
    const response = await fetch('/api/checkout?checkLimitOnly=true');
    if (!response.ok) throw new Error('Limit check failed');
    const data = await response.json();

    if (data.isCapped) {
      renderWaitlistState(actionContainer, data.message || 'Weekly order capacity reached.');
    }
  } catch (err) {
    console.warn('Unable to verify order cap limits, falling back to client-side checks:', err);
  }
}

function renderWaitlistState(container, message) {
  container.innerHTML = `
    <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 14px; border-radius: 4px; margin-bottom: 16px; font-size: 0.85rem; color: #5d4037; line-height: 1.4;">
      <strong>Notice:</strong> ${message} High-detail handcrafting resumes next week.
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <label for="waitlistEmail" style="font-size: 0.85rem; font-weight: 600; color: var(--text-dark, #111);">Get notified when orders reopen:</label>
      <input type="email" id="waitlistEmail" placeholder="Enter your email address" style="width: 100%; padding: 12px; border: 1px solid var(--border-color, #ccc); border-radius: 4px; font-size: 0.9rem;" />
      <button type="button" class="btn btn-solid" style="width: 100%; padding: 12px;" id="submitWaitlistBtn">Notify Me First</button>
    </div>
  `;

  const btn = document.getElementById('submitWaitlistBtn');
  if (btn) {
    btn.addEventListener('click', submitWaitlistEmail);
  }
}

async function submitWaitlistEmail() {
  const emailInput = document.getElementById('waitlistEmail');
  if (!emailInput || !emailInput.value || !emailInput.value.includes('@')) {
    if (typeof showToast === 'function') {
      showToast('Please enter a valid email address.');
    } else {
      alert('Please enter a valid email address.');
    }
    return;
  }

  try {
    const res = await fetch('/api/notify-me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value.trim() })
    });

    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast('You are on the priority waitlist!');
      } else {
        alert('You are on the priority waitlist!');
      }
      emailInput.value = '';
    } else {
      throw new Error('Failed to register');
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('Something went wrong. Please try again.');
    } else {
      alert('Something went wrong. Please try again.');
    }
  }
}
