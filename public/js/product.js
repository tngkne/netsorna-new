/**
 * Netsorna Product Detail Page Controller
 * Handles query parameter routing, hero slider scrolling counter,
 * interactive mounting/finish chip selection, and cart actions.
 */

// Extended product database for deep details
const DETAILED_PRODUCTS = [
  {
    sku: 'NET-FRM-001',
    id: 'frome-art',
    title: 'FROME ART',
    price: 1999,
    type: 'ready-made',
    images: [
      '/images/products/product1.jpg',
      '/images/products/product2.jpg',
      '/images/products/product3.jpg'
    ],
    specs: [
      '60 x 80 cm / High-grade premium acrylic display',
      'Precision UV direct-to-substrate back-printing',
      'SKU: NET-FRM-001',
      'Hand-finished mounting hardware included',
      'Polished edges with high-gloss depth finish'
    ],
    description: 'A precision UV printed acrylic wall art piece designed with multi-material contrast and subtle depth. Built for high-end luxury interiors, gallery spaces, and bespoke art collections.',
    options: ['Floating Mount', 'Matte Black Frame', 'Raw Acrylic Edge']
  },
  {
    sku: 'NET-MNR-002',
    id: 'mono-relief',
    title: 'MONO RELIEF',
    price: 2499,
    type: 'ready-made',
    images: [
      '/images/products/product3.jpg',
      '/images/products/product1.jpg'
    ],
    specs: [
      '50 x 70 cm / Multi-layered relief depth',
      'Hand-cast architectural plaster & acrylic',
      'SKU: NET-MNR-002',
      'Concealed French cleat hanging system'
    ],
    description: 'Minimalist linear relief sculpture creating dynamic shadows under directional gallery lighting.',
    options: ['Natural White', 'Shadow Grey', 'Obsidian Black']
  },
  {
    sku: 'NET-CUST-FACE-01',
    id: 'portrait-relief',
    title: 'PORTRAIT RELIEF (1-5 FACES)',
    price: 4500,
    type: 'custom-1',
    images: [
      '/images/products/product2.jpg'
    ],
    specs: [
      'Custom sizing based on photo composition',
      'Supports 1 to 5 subject faces or pets',
      'SKU: NET-CUST-FACE-01',
      'Direct photo upload agreement required prior to production'
    ],
    description: 'Tailor-made wall art crafted directly from your uploaded family, partner, or pet portraits.',
    options: ['1-2 Faces', '3-4 Faces', '5+ Faces (Bespoke)']
  },
  {
    sku: 'NET-LUX-001',
    id: 'heritage-grand',
    title: 'HERITAGE GRAND SCULPTURE',
    price: 18500,
    type: 'high-value',
    images: [
      '/images/products/product4.jpg'
    ],
    specs: [
      '120 x 180 cm / Statement gallery scale',
      'Integrated brass accents & UV glass composite',
      'SKU: NET-LUX-001',
      'White-glove delivery & studio installation consultation included'
    ],
    description: 'A monumental center-piece sculpture drawing inspiration from historical Sotho-Tswana and Southern African architectural line art.',
    options: ['Brushed Brass Finish', 'Antique Bronze Finish']
  }
];

let currentProduct = null;
let selectedOption = '';

// --- 1. ROUTING & DATA POPULATION ---
function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const skuParam = params.get('sku');
  const idParam = params.get('id');

  // Match by SKU or ID (Default to NET-FRM-001 if no query param provided)
  currentProduct = DETAILED_PRODUCTS.find(p => p.sku === skuParam || p.id === idParam) || DETAILED_PRODUCTS[0];

  selectedOption = currentProduct.options[0] || '';

  // Update Metadata & Head Tags
  document.getElementById('pageTitle').textContent = `${currentProduct.title} — Netsorna`;
  document.getElementById('canonicalUrl').href = `https://netsorna.website/product.html?sku=${currentProduct.sku}`;
  document.getElementById('ogUrl').content = `https://netsorna.website/product.html?sku=${currentProduct.sku}`;
  document.getElementById('ogTitle').content = `${currentProduct.title} — Netsorna`;
  document.getElementById('ogDescription').content = currentProduct.description;
  if (currentProduct.images[0]) {
    document.getElementById('ogImage').content = `https://netsorna.website${currentProduct.images[0]}`;
  }

  // Populate Hero Images & Counter
  renderHeroSlider(currentProduct.images);

  // Populate Editorial Text
  document.getElementById('productTitle').textContent = currentProduct.title;
  document.getElementById('productPrice').textContent = `R ${currentProduct.price.toLocaleString()}`;
  document.getElementById('productDescription').textContent = currentProduct.description;

  // Specs
  const specsList = document.getElementById('productSpecs');
  specsList.innerHTML = currentProduct.specs.map(spec => `<li>${spec}</li>`).join('');

  // Variants/Options
  const chipContainer = document.getElementById('optionChips');
  chipContainer.innerHTML = currentProduct.options.map((opt, idx) => `
    <button class="chip ${idx === 0 ? 'active' : ''}" data-option="${opt}">${opt}</button>
  `).join('');

  attachChipListeners();
  applyActionRules();
  renderRelatedProducts();
}

// --- 2. HERO SLIDER & SCROLL COUNTER ---
function renderHeroSlider(images) {
  const slider = document.getElementById('heroSlider');
  const counter = document.getElementById('imageCounter');

  if (!images || images.length === 0) {
    slider.innerHTML = `<div class="slide-item active"><div class="placeholder-hero"></div></div>`;
    counter.textContent = '1 / 1';
    return;
  }

  slider.innerHTML = images.map((img, i) => `
    <div class="slide-item ${i === 0 ? 'active' : ''}">
      <img src="${img}" alt="${currentProduct.title} view ${i + 1}" class="hero-img" onerror="this.outerHTML='<div class=\\'placeholder-hero\\'></div>'">
    </div>
  `).join('');

  counter.textContent = `1 / ${images.length}`;

  // Track active slide index on scroll
  slider.addEventListener('scroll', () => {
    const slideWidth = slider.clientWidth;
    if (slideWidth > 0) {
      const activeIdx = Math.round(slider.scrollLeft / slideWidth) + 1;
      counter.textContent = `${activeIdx} / ${images.length}`;
    }
  }, { passive: true });
}

// --- 3. VARIANT CHIP SELECTION ---
function attachChipListeners() {
  const chips = document.querySelectorAll('#optionChips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedOption = chip.getAttribute('data-option');
    });
  });
}

// --- 4. APPLY THROTTLING & ACTION BUTTON RULES ---
async function applyActionRules() {
  const actionContainer = document.getElementById('purchaseActions');
  if (!actionContainer) return;

  const status = typeof fetchStoreStatus === 'function' 
    ? await fetchStoreStatus() 
    : { ordersThisWeek: 0, whatsAppThisWeek: 0, globalCapReached: false, disabledSkus: [] };

  const isCapped = status.ordersThisWeek >= LIMITS.maxWeeklyOrders || status.globalCapReached;
  const isDisabled = status.disabledSkus.includes(currentProduct.sku);

  if (isCapped || isDisabled) {
    actionContainer.innerHTML = `
      <button class="btn btn-disabled notify-trigger" data-sku="${currentProduct.sku}">Weekly Capacity Reached — Get Notified</button>
    `;
    if (typeof attachNotifyListeners === 'function') attachNotifyListeners();
    return;
  }

  if (currentProduct.price >= LIMITS.emailThreshold) {
    actionContainer.innerHTML = `
      <a href="mailto:quotes@netsorna.website?subject=Bespoke%20Quote%20Request%20${currentProduct.sku}" class="btn btn-outline">Request Formal Quote</a>
    `;
    return;
  }

  if (currentProduct.price >= LIMITS.whatsappThreshold) {
    if (status.whatsAppThisWeek >= LIMITS.maxWeeklyWhatsApp) {
      actionContainer.innerHTML = `
        <a href="mailto:quotes@netsorna.website?subject=Inquiry%20${currentProduct.sku}" class="btn btn-outline">Email Studio Inquiry</a>
      `;
    } else {
      actionContainer.innerHTML = `
        <a href="/whatsapp-inquiry.html?sku=${currentProduct.sku}" class="btn btn-solid">Message Studio on WhatsApp</a>
      `;
    }
    return;
  }

  // Standard Ready-Made or Custom Upload Item
  actionContainer.innerHTML = `
    <button class="btn btn-outline" id="addToCartBtn">Add to Cart</button>
    <button class="btn btn-solid" id="buyNowBtn">Buy Now</button>
  `;

  document.getElementById('addToCartBtn').addEventListener('click', () => handleAddToCart(false));
  document.getElementById('buyNowBtn').addEventListener('click', () => handleAddToCart(true));
}

// --- 5. CART DISPATCHING ---
function handleAddToCart(redirectToCheckout = false) {
  if (!currentProduct) return;

  const cart = getCart();
  const cartItemId = `${currentProduct.sku}_${selectedOption.replace(/\s+/g, '-').toLowerCase()}`;
  
  const existingItemIndex = cart.findIndex(item => item.cartItemId === cartItemId);

  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += 1;
  } else {
    cart.push({
      cartItemId,
      sku: currentProduct.sku,
      title: currentProduct.title,
      price: currentProduct.price,
      option: selectedOption,
      image: currentProduct.images[0] || '',
      quantity: 1
    });
  }

  saveCart(cart);

  if (redirectToCheckout) {
    window.location.href = '/cart.html';
  } else {
    if (typeof showToast === 'function') {
      showToast(`Added "${currentProduct.title} (${selectedOption})" to your cart.`);
    }
  }
}

// --- 6. YOU MIGHT ALSO LIKE (RELATED PRODUCTS) ---
function renderRelatedProducts() {
  const relatedGrid = document.getElementById('relatedGrid');
  if (!relatedGrid) return;

  const related = DETAILED_PRODUCTS.filter(p => p.sku !== currentProduct.sku).slice(0, 3);

  relatedGrid.innerHTML = related.map(prod => `
    <article class="product-card">
      <div class="product-image-container">
        <img src="${prod.images[0] || ''}" alt="${prod.title}" class="product-img" onerror="this.outerHTML='<div class=\\'placeholder-box\\'></div>'">
      </div>
      <div class="product-info">
        <div class="product-meta">
          <h3 class="product-title">${prod.title}</h3>
          <span class="price">R ${prod.price.toLocaleString()}</span>
        </div>
        <div class="product-actions">
          <a href="/product.html?sku=${prod.sku}" class="btn btn-outline">Get One</a>
        </div>
      </div>
    </article>
  `).join('');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initProductPage();
});
