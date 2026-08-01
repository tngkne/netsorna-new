/**
 * Netsorna Store Engine
 * Handles decoupled content, custom item rules, high-value routing, header dynamic padding, and weekly throttles.
 */

// Global thresholds & states
const LIMITS = {
  maxWeeklyOrders: 40,
  maxWeeklyWhatsApp: 10,
  whatsappThreshold: 15000,
  emailThreshold: 25000
};

// Fallback catalog mirroring static JSON content files
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
  try {
    const cart = localStorage.getItem('netsorna_cart');
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem('netsorna_cart', JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
  updateCartBadge();
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const badges = document.querySelectorAll('.cart-badge, #cartBadge');
  badges.forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'inline-flex' : 'none';
  });
}

// --- 2. WEEKLY LIMITS & STORE TOGGLES GUARD ---
async function fetchStoreStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status endpoint unavailable');
    return await res.json();
  } catch (err) {
    // Safe default operational state
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
    const isProductDisabled = status.disabledSkus && status.disabledSkus.includes(product.sku);
    let actionBtnHtml = '';

    if (isCapped || isProductDisabled) {
      actionBtnHtml = `<button type="button" class="btn btn-disabled notify-trigger" data-sku="${product.sku}">Get Notified</button>`;
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
          <img src="${product.image}" alt="${product.title}" class="product-img" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\\'placeholder-box\\'>${product.title}</div>';">
        </div>
        <div class="product-info">
          <div class="product-meta">
            <h3 class="product-title">${product.title}</h3>
            <span class="price">R ${product.price.toLocaleString()}</span>
            ${product.type && product.type.startsWith('custom') ? '<span class="product-badge">Custom Upload</span>' : ''}
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

// --- 4. GLASS NAVBAR, DRAWER LOGIC & DYNAMIC TOP PADDING ---
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menuToggle');
  const navDrawer = document.getElementById('navDrawer');

  if (!navbar) return;

  // Dynamically set padding-top on body/wrapper to eliminate header overlap
  const adjustHeaderSpacing = () => {
    const navHeight = navbar.offsetHeight || 70;
    document.documentElement.style.setProperty('--nav-height', `${navHeight + 20}px`);
  };

  adjustHeaderSpacing();
  window.addEventListener('resize', adjustHeaderSpacing, { passive: true });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }, { passive: true });

  if (menuToggle && navDrawer) {
    const closeDrawer = () => {
      navbar.classList.remove('expanded');
      menuToggle.classList.remove('active');
      document.body.classList.remove('menu-open');
    };

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = navbar.classList.contains('expanded');
      if (isExpanded) {
        closeDrawer();
      } else {
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
}

// --- 5. CAPACITY CAP MODAL HANDLING ---
function attachNotifyListeners() {
  const modal = document.getElementById('notifyModal');
  const closeBtn = document.getElementById('closeNotifyBtn');
  const submitBtn = document.getElementById('submitNotifyBtn');
  const triggers = document.querySelectorAll('.notify-trigger');

  if (!modal) return;

  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.showModal();
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const emailInput = document.getElementById('notifyEmail');
      const email = emailInput ? emailInput.value.trim() : '';
      if (email && email.includes('@')) {
        try {
          await fetch('/api/notify-me', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          showToast('You will be notified when weekly capacity resets.');
          emailInput.value = '';
          modal.close();
        } catch (err) {
          showToast('Failed to subscribe. Please try again.');
        }
      } else {
        showToast('Please enter a valid email address.');
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
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateCartBadge();
  renderCatalog();
});
