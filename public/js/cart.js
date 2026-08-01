/**
 * Netsorna Cart Page Controller
 * Handles local cart parsing, quantity manipulation, subtotal math, and redirection to checkout.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCartView();
});

function renderCartView() {
  const container = document.getElementById('cartViewContainer');
  if (!container) return;

  const cart = getCart();

  if (!cart || cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 16px;">
        <p style="color: var(--text-muted); margin-bottom: 20px;">Your shopping cart is currently empty.</p>
        <a href="/shop.html" class="btn btn-solid">Explore Artworks</a>
      </div>
    `;
    return;
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr; gap: 24px;">
      <div class="cart-items-list" style="display:flex; flex-direction:column; gap:16px;">
        ${cart.map((item, index) => `
          <div style="display:flex; gap:16px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; align-items:center;">
            <img src="${item.image || '/images/products/product1.jpg'}" alt="${item.title}" style="width:72px; height:72px; object-fit:cover; border-radius:3px; background:#f5f5f5;" />
            
            <div style="flex:1;">
              <h3 style="font-size:0.95rem; font-weight:600; margin-bottom:4px;">${item.title}</h3>
              <span style="font-size:0.85rem; color:var(--text-muted); display:block;">R ${item.price.toLocaleString()}</span>
              ${item.customUploadKey ? `
                <span style="display:inline-block; margin-top:4px; font-size:0.75rem; background:#eae6df; padding:2px 6px; border-radius:2px; font-weight:500;">
                  ✓ Reference Image Attached
                </span>
              ` : ''}
            </div>

            <div class="quantity-selector">
              <button class="qty-btn" onclick="updateItemQuantity(${index}, -1)">-</button>
              <input type="number" class="qty-input" value="${item.quantity}" readonly />
              <button class="qty-btn" onclick="updateItemQuantity(${index}, 1)">+</button>
            </div>

            <button onclick="removeCartItem(${index})" style="background:none; border:none; color:#cc0000; font-size:1.1rem; cursor:pointer; padding: 4px 8px;" aria-label="Remove item">
              &times;
            </button>
          </div>
        `).join('')}
      </div>

      <div style="background: var(--accent-light); padding: 20px; border-radius: 4px; display: flex; flex-direction: column; gap: 16px;">
        <div style="display:flex; justify-content:space-between; font-weight:600; font-size:1.1rem;">
          <span>Subtotal</span>
          <span>R ${subtotal.toLocaleString()}</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">
          Shipping costs and applicable taxes calculated during checkout.
        </p>
        <button onclick="proceedToCheckout()" class="btn btn-solid btn-lg" style="width:100%;">
          Proceed to Checkout
        </button>
      </div>
    </div>
  `;
}

function updateItemQuantity(index, change) {
  const cart = getCart();
  if (!cart[index]) return;

  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  saveCart(cart);
  renderCartView();
}

function removeCartItem(index) {
  const cart = getCart();
  if (!cart[index]) return;

  cart.splice(index, 1);
  saveCart(cart);
  renderCartView();
}

function proceedToCheckout() {
  window.location.href = '/checkout.html';
}
