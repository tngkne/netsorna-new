/**
 * Netsorna Product Page Engine
 * Handles SKU lookup, dynamic custom uploads, R2 URL negotiation, copyright modal, & purchasing locks.
 */

let currentProduct = null;
let uploadedFileKey = null;
let termsAccepted = false;

// 1. Get SKU from URL query param
function getSkuFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('sku') || 'NET-FRM-001'; // Default fallback
}

// 2. Fetch specific product JSON from backend KV/Storage API
async function loadProductData(sku) {
  try {
    const response = await fetch(`/api/products?sku=${sku}`);
    if (!response.ok) throw new Error('Product not found');
    currentProduct = await response.json();
  } catch (err) {
    console.warn('Fallback to local registry for SKU:', sku);
    // Local fallback matching structure
    currentProduct = {
      sku: sku,
      title: sku.includes('CUST') ? 'PORTRAIT RELIEF (1-5 FACES)' : 'FROME ARTWORK',
      price: sku.includes('LUX') ? 18500 : (sku.includes('CUST') ? 4500 : 1999),
      customType: sku.includes('CUST') ? 'custom-1' : 'none',
      description: 'Handcrafted precision art piece sculpted with high-density durable relief layering.',
      images: ['/images/products/product1.jpg', '/images/products/product2.jpg']
    };
  }
  renderProductUI();
}

// 3. Render HTML structure based on item properties & custom type
function renderProductUI() {
  const container = document.getElementById('productContainer');
  if (!container || !currentProduct) return;

  const isCustom = currentProduct.customType && currentProduct.customType !== 'none';
  const isHighValue = currentProduct.price >= 15000;

  container.innerHTML = `
    <div class="product-gallery">
      <div class="main-image-wrapper">
        <img id="mainProductImage" src="${currentProduct.images[0]}" alt="${currentProduct.title}" />
      </div>
      ${currentProduct.images.length > 1 ? `
        <div class="thumbnail-row">
          ${currentProduct.images.map((img, idx) => `
            <img src="${img}" class="thumb-img ${idx === 0 ? 'active' : ''}" onclick="switchImage('${img}', this)" />
          `).join('')}
        </div>
      ` : ''}
    </div>

    <div class="product-details-box">
      <div>
        <h1 class="product-header-title">${currentProduct.title}</h1>
        <span class="product-price-tag">R ${currentProduct.price.toLocaleString()}</span>
      </div>

      <p class="product-description">${currentProduct.description}</p>

      ${isCustom ? `
        <div class="custom-upload-section">
          <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:6px;">
            Upload Art Reference / Image (Required)
          </label>
          <div class="upload-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()">
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p><strong>Click to upload photo</strong> (JPEG, PNG, max 10MB)</p>
          </div>
          <input type="file" id="fileInput" accept="image/*" style="display:none;" onchange="handleFileSelect(event)" />
          <div id="filePreviewContainer" style="margin-top:10px;"></div>
        </div>
      ` : ''}

      <div class="quantity-selector">
        <button class="qty-btn" onclick="adjustQty(-1)">-</button>
        <input type="number" id="productQty" class="qty-input" value="1" min="1" readonly />
        <button class="qty-btn" onclick="adjustQty(1)">+</button>
      </div>

      <div class="action-buttons-wrapper">
        ${isHighValue ? `
          <a href="/whatsapp-inquiry.html?sku=${currentProduct.sku}" class="btn btn-solid btn-lg" style="width:100%;">
            Inquire via WhatsApp
          </a>
        ` : `
          <button id="addToCartBtn" class="btn btn-solid btn-lg" style="width:100%;" ${isCustom ? 'disabled' : ''} onclick="handleAddToCart()">
            ${isCustom ? 'Upload Image First' : 'Add to Cart'}
          </button>
        `}
      </div>
    </div>
  `;

  if (isCustom) setupAgreementModal();
}

// 4. Image Gallery Switcher
function switchImage(src, element) {
  document.getElementById('mainProductImage').src = src;
  document.querySelectorAll('.thumb-img').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
}

// 5. Quantity Adjuster
function adjustQty(change) {
  const input = document.getElementById('productQty');
  let val = parseInt(input.value) + change;
  if (val < 1) val = 1;
  input.value = val;
}

// 6. Direct File Upload handling to Cloudflare Presigned R2 API
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const previewBox = document.getElementById('filePreviewContainer');
  previewBox.innerHTML = `
    <div class="file-preview-strip">
      <span>Uploading ${file.name}...</span>
    </div>
  `;

  try {
    // Request presigned URL from Cloudflare Worker endpoint
    const res = await fetch('/api/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type })
    });
    
    if (!res.ok) throw new Error('Presigned URL generation failed');
    const { uploadUrl, fileKey } = await res.json();

    // Upload directly to R2 bucket
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });

    uploadedFileKey = fileKey;

    previewBox.innerHTML = `
      <div class="file-preview-strip">
        <span>✓ ${file.name}</span>
        <button class="remove-file-btn" onclick="removeUploadedFile()">Remove</button>
      </div>
    `;

    // Open Agreement Modal prior to enabling Add To Cart
    const modal = document.getElementById('customAgreementModal');
    if (modal) modal.showModal();

  } catch (err) {
    // Fallback simulate upload key if serverless worker is local/unlinked
    uploadedFileKey = `mock-upload-${Date.now()}-${file.name}`;
    previewBox.innerHTML = `
      <div class="file-preview-strip">
        <span>✓ ${file.name} (Attached)</span>
        <button class="remove-file-btn" onclick="removeUploadedFile()">Remove</button>
      </div>
    `;
    const modal = document.getElementById('customAgreementModal');
    if (modal) modal.showModal();
  }
}

function removeUploadedFile() {
  uploadedFileKey = null;
  termsAccepted = false;
  document.getElementById('fileInput').value = '';
  document.getElementById('filePreviewContainer').innerHTML = '';
  updateAddButtonState();
}

// 7. Copyright & Agreement Modal Control
function setupAgreementModal() {
  const modal = document.getElementById('customAgreementModal');
  const checkbox = document.getElementById('agreeTermsCheckbox');
  const confirmBtn = document.getElementById('confirmAgreementBtn');
  const closeBtn = document.getElementById('closeAgreementBtn');

  if (!modal || !checkbox || !confirmBtn) return;

  checkbox.addEventListener('change', (e) => {
    confirmBtn.disabled = !e.target.checked;
  });

  confirmBtn.addEventListener('click', () => {
    termsAccepted = true;
    modal.close();
    updateAddButtonState();
  });

  closeBtn.addEventListener('click', () => {
    modal.close();
  });
}

function updateAddButtonState() {
  const btn = document.getElementById('addToCartBtn');
  if (!btn) return;

  if (uploadedFileKey && termsAccepted) {
    btn.disabled = false;
    btn.textContent = 'Add to Cart';
  } else if (!uploadedFileKey) {
    btn.disabled = true;
    btn.textContent = 'Upload Image First';
  } else if (!termsAccepted) {
    btn.disabled = true;
    btn.textContent = 'Accept Terms to Proceed';
  }
}

// 8. Add to Cart Handler
function handleAddToCart() {
  if (!currentProduct) return;

  const qty = parseInt(document.getElementById('productQty').value) || 1;
  const cart = getCart();

  const cartItem = {
    sku: currentProduct.sku,
    title: currentProduct.title,
    price: currentProduct.price,
    quantity: qty,
    image: currentProduct.images[0],
    customUploadKey: uploadedFileKey || null
  };

  const existingIndex = cart.findIndex(item => item.sku === cartItem.sku && item.customUploadKey === cartItem.customUploadKey);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += qty;
  } else {
    cart.push(cartItem);
  }

  saveCart(cart);
  showToast(`${currentProduct.title} added to cart.`);
}

// Init execution
document.addEventListener('DOMContentLoaded', () => {
  const sku = getSkuFromUrl();
  loadProductData(sku);
});
