/**
 * gift-guide.js
 * Handles the Gift Guide Grid popup, variant selection, and cart behavior.
 */

document.addEventListener('DOMContentLoaded', function () {
  /** @type {HTMLElement|null} */
  const section = /** @type {HTMLElement|null} */ (document.querySelector('[data-gift-guide-grid]'));
  if (!section) return;

  /** @type {HTMLElement|null} */
  const popup = /** @type {HTMLElement|null} */ (document.getElementById('gg-popup'));
  if (!popup) return;

  /** @type {HTMLImageElement|null} */
  const popupImage = /** @type {HTMLImageElement|null} */ (popup.querySelector('[data-popup-image]'));
  /** @type {HTMLElement|null} */
  const popupTitle = /** @type {HTMLElement|null} */ (popup.querySelector('[data-popup-title]'));
  /** @type {HTMLElement|null} */
  const popupPrice = /** @type {HTMLElement|null} */ (popup.querySelector('[data-popup-price]'));
  /** @type {HTMLElement|null} */
  const popupDesc = /** @type {HTMLElement|null} */ (popup.querySelector('[data-popup-desc]'));
  /** @type {HTMLElement|null} */
  const popupOptions = /** @type {HTMLElement|null} */ (popup.querySelector('[data-popup-options]'));
  /** @type {HTMLButtonElement|null} */
  const atcBtn = /** @type {HTMLButtonElement|null} */ (popup.querySelector('[data-add-to-cart]'));
  /** @type {HTMLElement|null} */
  const msgEl = /** @type {HTMLElement|null} */ (popup.querySelector('[data-popup-message]'));

  if (!popupImage || !popupTitle || !popupPrice || !popupDesc || !popupOptions || !atcBtn || !msgEl) return;

  const popupElement = popup;
  const autoAddHandle = section.dataset.autoAddHandle || '';
  let currentProduct = null;
  let currentVariant = null;
  let lastFocusedElement = null;

  const focusableSelectors = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  function getPopupFocusableElements() {
    return Array.from(popupElement.querySelectorAll(focusableSelectors));
  }

  /**
   * @param {HTMLElement|null} [trigger]
   */
  function openPopup(trigger = null) {
    lastFocusedElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
    popupElement.classList.add('is-open');
    popupElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const focusable = getPopupFocusableElements();
    if (focusable.length) {
      focusable[0].focus();
    } else {
      atcBtn.focus();
    }

    document.addEventListener('keydown', trapPopupFocus);
  }

  function closePopup() {
    popupElement.classList.remove('is-open');
    popupElement.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', trapPopupFocus);
    msgEl.textContent = '';
    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  }

  /**
   * @param {KeyboardEvent} event
   */
  function trapPopupFocus(event) {
    if (event.key !== 'Tab') return;

    const focusable = getPopupFocusableElements();
    if (!focusable.length) return;

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstFocusable || activeElement === popupElement) {
        lastFocusable.focus();
        event.preventDefault();
      }
      return;
    }

    if (activeElement === lastFocusable) {
      firstFocusable.focus();
      event.preventDefault();
    }
  }

  popupElement.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-popup-close]')) closePopup();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && popup.classList.contains('is-open')) closePopup();
  });

  section.addEventListener('click', function (event) {
    const trigger = event.target instanceof Element ? event.target.closest('[data-product-handle]') : null;
    if (!trigger) return;

    /** @type {string} */
    const handle = trigger instanceof HTMLElement ? trigger.dataset.productHandle || '' : '';
    if (!handle) return;

    resetPopup();
    msgEl.textContent = 'Loading…';
    openPopup(trigger);

    fetchProduct(handle)
      .then(renderPopup)
      .catch(function () {
        msgEl.textContent = 'Could not load product. Please try again.';
      });
  });

  /**
   * @param {string} handle
   * @returns {Promise<any>}
   */
  function fetchProduct(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js', {
      credentials: 'same-origin'
    }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  /**
   * @param {{ featured_image?: { src?: string }, images?: Array<{ src?: string }>, title?: string, description?: string, variants?: Array<any>, options?: Array<string> }} product
   */
  function renderPopup(product) {
    currentProduct = product;
    msgEl.textContent = '';

    const imgSrc = product.featured_image?.src || product.images?.[0]?.src || '';
    popupImage.src = imgSrc;
    popupImage.alt = product.title || '';
    popupTitle.textContent = product.title || '';
    popupDesc.textContent = stripHtml(product.description || '');

    currentVariant = product.variants.find(function (variant) {
      return variant.available;
    }) || product.variants[0] || null;

    buildVariantPickers(product);
    updatePrice();
  }

  /**
   * @param {string} html
   * @returns {string}
   */
  function stripHtml(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.textContent || container.innerText || '';
  }

  /**
   * @param {{ options?: Array<string>, variants?: Array<any> }} product
   */
  function buildVariantPickers(product) {
    popupOptions.innerHTML = '';

    product.options.forEach(function (optionName, optionIndex) {
      const values = product.variants
        .map(function (variant) { return variant.options[optionIndex]; })
        .filter(function (value, index, array) {
          return array.indexOf(value) === index;
        });

      const group = document.createElement('div');
      group.className = 'gg-opt';

      const label = document.createElement('span');
      label.className = 'gg-opt__label';
      label.textContent = optionName;
      group.appendChild(label);

      const currentValue = currentVariant ? currentVariant.options[optionIndex] : values[0];

      if (values.length <= 4) {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'gg-opt__buttons';
        buttonGroup.dataset.optionIndex = String(optionIndex);

        values.forEach(function (value) {
          const safeValue = value || '';
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'gg-opt__btn' + (safeValue === currentValue ? ' is-active' : '');
          button.textContent = safeValue;
          button.dataset.value = safeValue;

          button.addEventListener('click', function () {
            buttonGroup.querySelectorAll('.gg-opt__btn').forEach(function (btn) {
              btn.classList.remove('is-active');
            });
            button.classList.add('is-active');
            resolveVariant();
          });

          buttonGroup.appendChild(button);
        });

        group.appendChild(buttonGroup);
      } else {
        const select = document.createElement('select');
        select.className = 'gg-opt__select';
        select.dataset.optionIndex = String(optionIndex);

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose your ' + optionName.toLowerCase();
        placeholder.disabled = true;
        placeholder.selected = !currentValue;
        select.appendChild(placeholder);

        values.forEach(function (value) {
          const option = document.createElement('option');
          const safeValue = value || '';
          option.value = safeValue;
          option.textContent = safeValue;
          option.selected = safeValue === currentValue;
          select.appendChild(option);
        });

        select.addEventListener('change', resolveVariant);
        group.appendChild(select);
      }

      popupOptions.appendChild(group);
    });
  }

  function resolveVariant() {
    if (!currentProduct) return;

    const selectedOptions = currentProduct.options.map(function (_, index) {
      const activeButton = popupOptions.querySelector('.gg-opt__buttons[data-option-index="' + index + '"] .gg-opt__btn.is-active');
      if (activeButton instanceof HTMLElement) return activeButton.dataset.value || '';

      const select = popupOptions.querySelector('select[data-option-index="' + index + '"]');
      return select instanceof HTMLSelectElement ? select.value : '';
    });

    currentVariant = currentProduct.variants.find(function (variant) {
      return variant.options.every(function (value, optionIndex) {
        return value === selectedOptions[optionIndex];
      });
    }) || null;

    updatePrice();
  }

  function updatePrice() {
    if (!currentVariant) {
      popupPrice.textContent = '';
      atcBtn.disabled = true;
      atcBtn.textContent = 'ADD TO CART  →';
      return;
    }

    popupPrice.textContent = formatMoney(currentVariant.price);
    atcBtn.disabled = !currentVariant.available;
    atcBtn.textContent = currentVariant.available ? 'ADD TO CART  →' : 'SOLD OUT';
  }

  function formatMoney(cents) {
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'USD'
      }).format(cents / 100);
    } catch (_) {
      return (cents / 100).toFixed(2);
    }
  }

  function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count-bubble, [data-cart-count], .cart-count');
    cartCountElements.forEach(function (element) {
      if (element.textContent.trim()) {
        element.textContent = String(Number(element.textContent) + 1);
      }
    });
  }

  atcBtn.addEventListener('click', function () {
    if (!currentVariant || !currentVariant.available) return;

    atcBtn.disabled = true;
    msgEl.textContent = 'Adding to cart…';

    const items = [{ id: currentVariant.id, quantity: 1 }];
    const shouldAutoAdd = variantHasBlackAndMedium(currentVariant);

    function postToCart(cartItems) {
      return fetch('/cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems })
      }).then(function (response) {
        if (!response.ok) {
          return response.json().then(function (error) {
            throw new Error(error.description || 'Cart error');
          });
        }
        return response.json();
      });
    }

    const cartPromise = shouldAutoAdd && autoAddHandle
      ? fetchProduct(autoAddHandle).then(function (jacket) {
          const jacketVariant = jacket.variants.find(function (variant) {
            return variant.available;
          }) || jacket.variants[0];
          if (jacketVariant) {
            items.push({ id: jacketVariant.id, quantity: 1 });
          }
          return postToCart(items);
        })
      : postToCart(items);

    cartPromise
      .then(function () {
        msgEl.textContent = shouldAutoAdd ? 'Added to cart + Soft Winter Jacket!' : 'Added to cart!';
        atcBtn.textContent = 'ADDED  ✓';
        updateCartCount();
        atcBtn.disabled = false;
      })
      .catch(function (error) {
        msgEl.textContent = error.message || 'Could not add to cart.';
        atcBtn.textContent = 'ADD TO CART  →';
        atcBtn.disabled = false;
      });
  });

  /**
   * @param {{ options?: Array<string> }} variant
   * @returns {boolean}
   */
  function variantHasBlackAndMedium(variant) {
    const values = variant.options.map(function (option) {
      return option.toLowerCase();
    });
    return values.includes('black') && values.includes('medium');
  }

  function resetPopup() {
    currentProduct = null;
    currentVariant = null;
    popupImage.src = '';
    popupImage.alt = '';
    popupTitle.textContent = '';
    popupPrice.textContent = '';
    popupDesc.textContent = '';
    popupOptions.innerHTML = '';
    atcBtn.disabled = true;
    atcBtn.textContent = 'ADD TO CART  →';
    msgEl.textContent = '';
  }
});
