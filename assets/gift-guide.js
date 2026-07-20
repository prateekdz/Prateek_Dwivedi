/**
 * gift-guide.js
 * Handles the Gift Guide Grid popup:
 *   - Opens on "+" button click, fetches product JSON
 *   - Builds variant pickers dynamically (button swatches ≤4 values, select >4)
 *   - Tracks selected variant, updates price
 *   - POST /cart/add.js to add to cart
 *   - Auto-adds "Soft Winter Jacket" when variant has Color=Black AND Size=Medium
 *
 * Vanilla JS only — no jQuery.
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ── DOM references ──────────────────────────────────────── */

  /** @type {HTMLElement|null} */
  const section = document.querySelector('[data-gift-guide-grid]');
  if (!section) return;

  /** @type {HTMLElement|null} */
  const popup = document.getElementById('gg-popup');
  if (!popup) return;

  // All elements inside the popup card
  const popupImage   = /** @type {HTMLImageElement}  */ (popup.querySelector('[data-popup-image]'));
  const popupTitle   = /** @type {HTMLElement}        */ (popup.querySelector('[data-popup-title]'));
  const popupPrice   = /** @type {HTMLElement}        */ (popup.querySelector('[data-popup-price]'));
  const popupDesc    = /** @type {HTMLElement}        */ (popup.querySelector('[data-popup-desc]'));
  const popupOptions = /** @type {HTMLElement}        */ (popup.querySelector('[data-popup-options]'));
  const atcBtn       = /** @type {HTMLButtonElement}  */ (popup.querySelector('[data-add-to-cart]'));
  const msgEl        = /** @type {HTMLElement}        */ (popup.querySelector('[data-popup-message]'));

  if (!popupImage || !popupTitle || !popupPrice || !popupDesc ||
      !popupOptions || !atcBtn || !msgEl) return;

  const popupElement = popup;

  /* ── State ───────────────────────────────────────────────── */

  /**
   * @typedef {{ id: number, price: number, available: boolean, options: string[] }} Variant
   * @typedef {{ title: string, description: string, price: number, featured_image: {src:string}|null, images: {src:string}[], options: string[], variants: Variant[], handle: string }} Product
   */

  /** @type {Product|null}  */ let currentProduct = null;
  /** @type {Variant|null}  */ let currentVariant = null;

  // Handle of the "Soft Winter Jacket" product to auto-add
  const autoAddHandle = section.dataset.autoAddHandle || '';

  /* ── Popup open / close ──────────────────────────────────── */

  /** Open the popup and trap focus */
  function openPopup() {
    popupElement.classList.add('is-open');
    popupElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    atcBtn.focus();
  }

  /** Close the popup and restore scroll */
  function closePopup() {
    popupElement.classList.remove('is-open');
    popupElement.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    msgEl.textContent = '';
  }

  // Close on backdrop / close-button clicks
  popupElement.addEventListener('click', function (e) {
    if (/** @type {HTMLElement} */ (e.target).closest('[data-popup-close]')) closePopup();
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) closePopup();
  });

  /* ── Grid card click → fetch product → render popup ─────── */

  section.addEventListener('click', function (e) {
    const trigger = /** @type {HTMLElement} */ (e.target).closest('[data-product-handle]');
    if (!trigger) return;

    const handle = /** @type {HTMLElement} */ (trigger).dataset.productHandle;
    if (!handle) return;

    // Show popup immediately with loading state
    resetPopup();
    msgEl.textContent = 'Loading…';
    openPopup();

    fetchProduct(handle)
      .then(renderPopup)
      .catch(function () {
        msgEl.textContent = 'Could not load product. Please try again.';
      });
  });

  /* ── Fetch product JSON from Shopify ─────────────────────── */

  /**
   * @param {string} handle
   * @returns {Promise<Product>}
   */
  function fetchProduct(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js', {
      credentials: 'same-origin',
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  /* ── Render popup with product data ─────────────────────── */

  /**
   * @param {Product} product
   */
  function renderPopup(product) {
    currentProduct = product;
    msgEl.textContent = '';

    // Thumbnail — prefer featured_image, fall back to first image
    const imgSrc = (product.featured_image && product.featured_image.src)
      || (product.images[0]?.src || '');
    popupImage.src = imgSrc;
    popupImage.alt = product.title || '';
    
    popupTitle.textContent = product.title || '';

    // Default to first available variant
    currentVariant = product.variants.find(function (v) { return v.available; })
      || product.variants[0]
      || null;

    buildVariantPickers(product);
    updatePrice();
  }

  /** Strip HTML tags from Shopify's description field */
  /** @param {string} html */
  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /* ── Build variant option pickers ───────────────────────── */

  /**
   * Builds one picker per option (e.g. Color, Size).
   * ≤ 4 values → button swatches (matches Figma).
   * > 4 values → <select> dropdown.
   *
   * @param {Product} product
   */
  function buildVariantPickers(product) {
    popupOptions.innerHTML = '';

    product.options.forEach(function (optionName, optionIndex) {
      // Collect unique values for this option position
      const values = product.variants
        .map(function (v) { return v.options[optionIndex]; })
        .filter(function (val, i, arr) { return arr.indexOf(val) === i; });

      const group = document.createElement('div');
      group.className = 'gg-opt';

      const label = document.createElement('span');
      label.className = 'gg-opt__label';
      label.textContent = optionName;
      group.appendChild(label);

      // Current selection for this option
      const currentVal = currentVariant ? currentVariant.options[optionIndex] : values[0];

      if (values.length <= 4) {
        // ── Button swatches ──
        const btnWrap = document.createElement('div');
        btnWrap.className = 'gg-opt__buttons';
        btnWrap.dataset.optionIndex = String(optionIndex);

        values.forEach(function (val) {
          const safeValue = val || '';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'gg-opt__btn' + (safeValue === currentVal ? ' is-active' : '');
          btn.textContent = safeValue;
          btn.dataset.value = safeValue;

          btn.addEventListener('click', function () {
            // Deactivate siblings, activate this
            btnWrap.querySelectorAll('.gg-opt__btn').forEach(function (b) {
              b.classList.remove('is-active');
            });
            btn.classList.add('is-active');
            resolveVariant();
          });

          btnWrap.appendChild(btn);
        });

        group.appendChild(btnWrap);

      } else {
        // ── Select dropdown ──
        const select = document.createElement('select');
        select.className = 'gg-opt__select';
        select.dataset.optionIndex = String(optionIndex);

        // Placeholder option
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose your ' + optionName.toLowerCase();
        placeholder.disabled = true;
        placeholder.selected = !currentVal;
        select.appendChild(placeholder);

        values.forEach(function (val) {
          const opt = document.createElement('option');
          const safeValue = val || '';
          opt.value = safeValue;
          opt.textContent = safeValue;
          opt.selected = safeValue === currentVal;
          select.appendChild(opt);
        });

        select.addEventListener('change', resolveVariant);
        group.appendChild(select);
      }

      popupOptions.appendChild(group);
    });
  }

  /* ── Resolve which variant matches current picker state ──── */

  function resolveVariant() {
    if (!currentProduct) return;

    // Read selected value for each option position
    const selected = currentProduct.options.map(function (_, i) {
      // Try button group first
      const activeBtn = /** @type {HTMLElement|null} */ (
        popupOptions.querySelector('.gg-opt__buttons[data-option-index="' + i + '"] .gg-opt__btn.is-active')
      );
      if (activeBtn) return activeBtn.dataset.value || '';

      // Fall back to select
      const sel = /** @type {HTMLSelectElement|null} */ (
        popupOptions.querySelector('select[data-option-index="' + i + '"]')
      );
      return sel ? sel.value : '';
    });

    // Find matching variant
    currentVariant = currentProduct.variants.find(function (v) {
      return v.options.every(function (val, i) { return val === selected[i]; });
    }) || null;

    updatePrice();
  }

  /* ── Update price display and ATC button state ───────────── */

  function updatePrice() {
    if (!currentVariant) {
      popupPrice.textContent = '';
      atcBtn.disabled = true;
      return;
    }

    // Format price (Shopify returns price in cents)
    popupPrice.textContent = formatMoney(currentVariant.price);
    atcBtn.disabled = !currentVariant.available;
    atcBtn.textContent = currentVariant.available
      ? 'ADD TO CART  →'
      : 'SOLD OUT';
  }

  /**
   * Format cents to locale currency string.
   * @param {number} cents
   * @returns {string}
   */
  function formatMoney(cents) {
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: window.Shopify && window.Shopify.currency
          ? window.Shopify.currency.active
          : 'USD',
      }).format(cents / 100);
    } catch (_) {
      return (cents / 100).toFixed(2);
    }
  }

  /* ── Add to Cart ─────────────────────────────────────────── */

  atcBtn.addEventListener('click', function () {
    if (!currentVariant || !currentVariant.available) return;

    atcBtn.disabled = true;
    msgEl.textContent = 'Adding to cart…';

    // Build items array — always includes the chosen variant
    const items = [{ id: currentVariant.id, quantity: 1 }];

    // Business rule: if Color=Black AND Size=Medium → also add Soft Winter Jacket
    const shouldAutoAdd = variantHasBlackAndMedium(currentVariant);

    /**
     * POST to /cart/add.js with the items array.
     * @param {{ id: number, quantity: number }[]} cartItems
     * @returns {Promise<any>}
     */
    function postToCart(cartItems) {
      return fetch('/cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems }),
      }).then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(err.description || 'Cart error');
          });
        }
        return res.json();
      });
    }

    // If auto-add needed, fetch the jacket's default variant first
    const cartPromise = shouldAutoAdd && autoAddHandle
      ? fetchProduct(autoAddHandle).then(function (jacket) {
          const jacketVariant = jacket.variants.find(function (v) { return v.available; })
            || jacket.variants[0];
          if (jacketVariant) items.push({ id: jacketVariant.id, quantity: 1 });
          return postToCart(items);
        })
      : postToCart(items);

    cartPromise
      .then(function () {
        msgEl.textContent = shouldAutoAdd
          ? 'Added to cart + Soft Winter Jacket!'
          : 'Added to cart!';
        atcBtn.disabled = false;
      })
      .catch(function (err) {
        msgEl.textContent = err.message || 'Could not add to cart.';
        atcBtn.disabled = false;
      });
  });

  /* ── Business rule helper ────────────────────────────────── */

  /**
   * Returns true if the variant's options include both "Black" and "Medium".
   * Matches on option VALUES, not product title.
   * @param {Variant} variant
   * @returns {boolean}
   */
  function variantHasBlackAndMedium(variant) {
    const opts = variant.options.map(function (o) { return o.toLowerCase(); });
    return opts.includes('black') && opts.includes('medium');
  }

  /* ── Reset popup to blank state ──────────────────────────── */

  function resetPopup() {
    currentProduct = null;
    currentVariant = null;
    popupImage.src = '';
    popupImage.alt = '';
    popupTitle.textContent = '';
    popupPrice.textContent = '';
    popupDesc.textContent  = '';
    popupOptions.innerHTML = '';
    atcBtn.disabled = true;
    atcBtn.textContent = 'ADD TO CART  →';
    msgEl.textContent = '';
  }

});
