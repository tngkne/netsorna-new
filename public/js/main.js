/**
 * Netsorna Store Engine
 * Handles decoupled content, custom item rules, high-value routing, and weekly throttles.
 */

// Global thresholds & states
const LIMITS = {
  maxWeeklyOrders: 40,
  maxWeeklyWhatsApp: 10,
  whatsappThreshold: 15000,
  emailThreshold: 25000
};

// Mock product registry mirroring static JSON content files
const PRODUCTS_REGISTRY = [
  {
    sku: 'NET-FRM-001',
    title: 'FROME ART',
    price: 1999,
    type: 'ready-made',
    image: '/images/products/product1.jpg'
  },
  {
    sku: 'NET-MNR-002',
    title: 'MONO RELIEF',
    price: 2499,
    type: 'ready-made',
    image: '/images/products/product3.jpg'
  },
  {
    sku: 'NET-CUST-FACE-01',
    title: 'PORTRAIT RELIEF (1-5 FACES)',
    price: 4500,
    type: 'custom-1', // Faces / Animals
    image: '/images/products/product2.jpg'
  },
  {
    sku: 'NET-LUX-001',
    title: 'HERITAGE GRAND SCULPTURE',
    price: 18500, // Triggers WhatsApp (R15,000+)
    type: 'high-value',
    image: '/images/products/product4.jpg'
  }
];

// --- 1. LOCAL STORAGE CART MANAGEMENT ---
function getCart() {
  const cart = localStorage.getItem('netsorna_cart');
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  localStorage.setItem('netsorna_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badges = document.querySelectorAll('.cart-badge, #cartBadge');
  badges.forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

// --- 2. WEEKLY LIMITS & STORE TOGGLES GUARD ---
async function fetchStoreStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (err) {
    // Fallback safe state
    return {
      ordersThisWeek: 0,
      whatsAppThisWeek: 0,
      globalCapReached: false,
      disabledSkus: []
    };
  }
}

// --- 3. DYNAMIC PRODUCT GRID & ACTION BUTTON RENDERER ---
async function renderCatalog() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const status = await fetchStoreStatus();
  const isCapped = status.ordersThisWeek >= LIMITS.maxWeeklyOrders || status.globalCapReached;

  grid.innerHTML = PRODUCTS_REGISTRY.map(product => {
    const isProductDisabled = status.disabledSkus.includes(product.sku);
    let actionBtnHtml = '';

    if (isCapped || isProductDisabled) {
      actionBtnHtml = `<button class="btn btn-disabled notify-trigger" data-sku="${product.sku}">Get Notified</button>`;
    } else if (product.price >= LIMITS.emailThreshold) {
      actionBtnHtml = `<a href="mailto:quotes@netsorna.website?subject=Quote%20Request%20${product.sku}" class="btn btn-outline">Request Quote</a>`;
    } else if (product.price >= LIMITS.whatsappThreshold) {
      if (status.whatsAppThisWeek >= LIMITS.maxWeeklyWhatsApp) {
        actionBtnHtml = `<a href="mailto:quotes@netsorna.website?subject=Inquiry%20${product.sku}" class="btn btn-outline">Email Inquiry</a>`;
      } else {
        actionBtnHtml = `<a href="/whatsapp-inquiry.html?sku=${product.sku}" class="btn btn-outline">Message Us</a>`;
      }
    } else {
      actionBtnHtml = `<a href="/product.html?sku=${product.sku}" class="btn btn-outline">Get One</a>`;
    }

    return `
      <article class="product-card" data-sku="${product.sku}">
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.title}" class="product-img" onerror="this.outerHTML='<div class=\\'placeholder-box\\'></div>'">
        </div>
        <div class="product-info">
          <div class="product-meta">
            <h3 class="product-title">${product.title}</h3>
            <span class="price">R ${product.price.toLocaleString()}</span>
            ${product.type.startsWith('custom') ? '<span class="product-badge">Custom Upload</span>' : ''}
          </div>
          <div class="product-actions">
            ${actionBtnHtml}
          </div>
        </div>
      </article>
    `;
  }).join('');

  attachNotifyListeners();
}

// --- 4. GLASS NAVBAR & DRAWER LOGIC ---
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menuToggle');
  const navDrawer = document.getElementById('navDrawer');

  if (!menuToggle || !navbar || !navDrawer) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 0) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }, { passive: true });

  const closeDrawer = () => {
    navbar.classList.remove('expanded');
    menuToggle.classList.remove('active');
    document.body.classList.remove('menu-open');
  };

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = navbar.classList.contains('expanded');
    if (isExpanded) closeDrawer();
    else {
      navbar.classList.add('expanded');
      menuToggle.classList.add('active');
      document.body.classList.add('menu-open');
    }
  });

  document.addEventListener('click', (e) => {
    if (navbar.classList.contains('expanded') && !navbar.contains(e.target)) {
      closeDrawer();
    }
  });
}

// --- 5. CAPACITY CAP MODAL HANDLING ---
function attachNotifyListeners() {
  const modal = document.getElementById('notifyModal');
  const closeBtn = document.getElementById('closeNotifyBtn');
  const submitBtn = document.getElementById('submitNotifyBtn');
  const triggers = document.querySelectorAll('.notify-trigger');

  if (!modal) return;

  triggers.forEach(btn => {
    btn.addEventListener('click', () => modal.showModal());
  });

  if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const email = document.getElementById('notifyEmail').value;
      if (email) {
        await fetch('/api/notify-me', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        showToast('You will be notified when weekly capacity resets.');
        modal.close();
      }
    });
  }
}

// --- 6. TOAST FEEDBACK ---
function showToast(message) {
  let toast = document.getElementById('netsorna-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'netsorna-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Init Application
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateCartBadge();
  renderCatalog();
});