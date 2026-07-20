/**
 * @typedef {Object} ShopVariant
 * @property {number} id
 * @property {number} price
 * @property {boolean} available
 * @property {Array<string>} options
 */

/**
 * @typedef {Object} ShopProduct
 * @property {Array<ShopVariant>} variants
 * @property {Array<string>} options
 * @property {string=} currency
 * @property {string=} title
 * @property {string=} description
 * @property {any=} featured_image
 * @property {Array<any>=} images
 * @property {string=} handle
 */

document.addEventListener('DOMContentLoaded', function () {
  const gridSection = document.querySelector('[data-gift-guide-grid]');
  if (!(gridSection instanceof HTMLElement)) {
    return;
  }

  const popupElement = document.getElementById('gift-guide-popup');
  if (!(popupElement instanceof HTMLElement)) {
    return;
  }

  /** @type {HTMLElement | null} */
  const popupOverlay = popupElement.querySelector('[data-popup-close]');
  /** @type {NodeListOf<HTMLElement>} */
  const popupCloseButtons = popupElement.querySelectorAll('[data-popup-close]');
  /** @type {HTMLElement | null} */
  const popupTitle = popupElement.querySelector('.gg-popup__title');
  /** @type {HTMLImageElement | null} */
  const popupImage = popupElement.querySelector('.gg-popup__image');
  /** @type {HTMLElement | null} */
  const popupPrice = popupElement.querySelector('.gg-popup__price');
  /** @type {HTMLElement | null} */
  const popupDescription = popupElement.querySelector('.gg-popup__description');
  /** @type {HTMLElement | null} */
  const popupOptions = popupElement.querySelector('[data-popup-options]');
  /** @type {HTMLButtonElement | null} */
  const addToCartButton = popupElement.querySelector('[data-add-to-cart]');
  /** @type {HTMLElement | null} */
  const popupMessage = popupElement.querySelector('[data-popup-message]');

  if (
    !(popupOverlay instanceof HTMLElement) ||
    !(popupTitle instanceof HTMLElement) ||
    !(popupImage instanceof HTMLImageElement) ||
    !(popupPrice instanceof HTMLElement) ||
    !(popupDescription instanceof HTMLElement) ||
    !(popupOptions instanceof HTMLElement) ||
    !(addToCartButton instanceof HTMLButtonElement) ||
    !(popupMessage instanceof HTMLElement)
  ) {
    return;
  }

  const popupElementEl = /** @type {HTMLElement} */ (popupElement);
  const popupOverlayEl = /** @type {HTMLElement} */ (popupOverlay);
  const popupTitleEl = /** @type {HTMLElement} */ (popupTitle);
  const popupImageEl = /** @type {HTMLImageElement} */ (popupImage);
  const popupPriceEl = /** @type {HTMLElement} */ (popupPrice);
  const popupDescriptionEl = /** @type {HTMLElement} */ (popupDescription);
  const popupOptionsEl = /** @type {HTMLElement} */ (popupOptions);
  const addToCartButtonEl = /** @type {HTMLButtonElement} */ (addToCartButton);
  const popupMessageEl = /** @type {HTMLElement} */ (popupMessage);
  const gridSectionEl = /** @type {HTMLElement} */ (gridSection);

  const autoAddProductHandle = gridSectionEl.dataset.autoAddProduct || 'soft-winter-jacket';
  /** @type {ShopProduct | null} */
  let currentProduct = null;
  /** @type {ShopVariant | null} */
  let currentVariant = null;

  /**
   * @param {number} amount
   * @param {string=} currency
   */
  function formatMoney(amount, currency) {
    const currencyCode = currency || 'USD';
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount / 100);
    } catch (error) {
      return (amount / 100).toFixed(2) + ' ' + currencyCode;
    }
  }

  function closePopup() {
    popupElementEl.classList.remove('is-open');
    popupElementEl.setAttribute('aria-hidden', 'true');
    popupMessageEl.textContent = '';
    addToCartButtonEl.disabled = false;
  }

  function openPopup() {
    popupElementEl.classList.add('is-open');
    popupElementEl.setAttribute('aria-hidden', 'false');
  }

  /**
   * @param {Array<string>} selectedOptions
   * @returns {ShopVariant | null}
   */
  function findVariant(selectedOptions) {
    if (!currentProduct) {
      return null;
    }

    return (
      currentProduct.variants.find(function (variant) {
        return variant.options.every(function (optionValue, idx) {
          return selectedOptions[idx] === optionValue;
        });
      }) || null
    );
  }

  function buildOptionSelects() {
    if (!popupOptions) {
      return;
    }
    popupOptions.innerHTML = '';
    const product = currentProduct;
    const activeVariant = currentVariant;
    if (!product) {
      return;
    }

    product.options.forEach(function (optionName, index) {
      const optionValues = Array.from(
        new Set(
          product.variants.map(function (variant) {
            return variant.options[index] || '';
          })
        )
      );

      const optionField = document.createElement('div');
      optionField.className = 'gg-popup__option';

      const label = document.createElement('label');
      label.textContent = optionName;
      optionField.appendChild(label);

      const defaultValue = activeVariant ? activeVariant.options[index] : optionValues[0] || '';

      if (optionValues.length > 3) {
        const select = document.createElement('select');
        select.dataset.optionIndex = String(index);

        optionValues.forEach(function (value) {
          const optionValue = value || '';
          const option = document.createElement('option');
          option.value = optionValue;
          option.textContent = optionValue;
          option.selected = defaultValue === optionValue;
          select.appendChild(option);
        });

        select.addEventListener('change', function () {
          const selects = popupOptionsEl.querySelectorAll('select');
          const selectedOptions = Array.from(selects).map(function (element) {
            return element.value;
          });

          const selectedVariant = findVariant(selectedOptions);
          if (selectedVariant) {
            currentVariant = selectedVariant;
            updateVariantDetails();
          }
        });

        optionField.appendChild(select);
      } else {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'gg-popup__button-group';

        optionValues.forEach(function (value) {
          const optionValue = value || '';
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = optionValue;
          button.dataset.optionValue = optionValue;

          if (defaultValue === optionValue) {
            button.classList.add('is-selected');
          }

          button.addEventListener('click', function () {
                  const selectedOptions = product.options.map(function (_, idx) {
              if (idx === index) {
                return optionValue;
              }

              const selectedButton = popupOptionsEl.querySelector(
                '.gg-popup__option:nth-child(' + (idx + 1) + ') .gg-popup__button-group button.is-selected'
              );

              if (selectedButton instanceof HTMLButtonElement && selectedButton.dataset.optionValue) {
                return selectedButton.dataset.optionValue;
              }

              const selectedSelect = popupOptionsEl.querySelector(
                '.gg-popup__option:nth-child(' + (idx + 1) + ') select'
              );
              if (selectedSelect instanceof HTMLSelectElement) {
                return selectedSelect.value;
              }

              return activeVariant ? activeVariant.options[idx] : optionValues[0] || '';
            }).map(function (value) {
              return value || '';
            });

            const selectedVariant = findVariant(selectedOptions);
            if (selectedVariant) {
              currentVariant = selectedVariant;
            }

            buttonGroup.querySelectorAll('button').forEach(function (btn) {
              btn.classList.toggle('is-selected', btn === button);
            });

            updateVariantDetails();
          });

          buttonGroup.appendChild(button);
        });

        optionField.appendChild(buttonGroup);
      }

      popupOptions.appendChild(optionField);
    });
  }

  function updateVariantDetails() {
    if (!currentVariant) {
      popupPriceEl.textContent = '';
      addToCartButtonEl.disabled = true;
      return;
    }

    const currency = currentProduct && currentProduct.currency ? currentProduct.currency : 'USD';
    popupPriceEl.textContent = formatMoney(currentVariant.price, currency);
    addToCartButtonEl.disabled = !currentVariant.available;
    addToCartButtonEl.textContent = currentVariant.available ? 'ADD TO CART' : 'SOLD OUT';
  }

  /**
   * @param {ShopProduct} product
   */
  function renderPopup(product) {
    currentProduct = product;
    currentVariant =
      product.variants.find(function (variant) {
        return variant.available;
      }) || product.variants[0] || null;

    popupTitleEl.textContent = product.title || 'Product';
    popupDescriptionEl.textContent = product.description || 'No description available.';

    let imageUrl = '';
    if (product.featured_image && typeof product.featured_image === 'object' && typeof product.featured_image.src === 'string') {
      imageUrl = product.featured_image.src;
    } else if (Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (typeof firstImage === 'string') {
        imageUrl = firstImage;
      } else if (firstImage && typeof firstImage === 'object' && typeof firstImage.src === 'string') {
        imageUrl = firstImage.src;
      }
    }

    popupImageEl.src = imageUrl;
    popupImageEl.alt = product.title || 'Product image';

    buildOptionSelects();
    updateVariantDetails();
    openPopup();
  }

  /**
   * @param {string} message
   */
  function showMessage(message) {
    popupMessageEl.textContent = message;
  }

  /**
   * @param {ShopVariant} variant
   * @returns {boolean}
   */
  function shouldAutoAddSoftJacket(variant) {
    if (!currentProduct || !variant || !Array.isArray(currentProduct.options)) return false;
    const optionIndex = function (name) {
      return currentProduct.options.findIndex(function (opt) {
        return typeof opt === 'string' && opt.toLowerCase() === name.toLowerCase();
      });
    };

    const colorIdx = optionIndex('color');
    const sizeIdx = optionIndex('size');

    const hasColor = colorIdx >= 0 && variant.options[colorIdx] && variant.options[colorIdx].toLowerCase() === 'black';
    const hasSize = sizeIdx >= 0 && variant.options[sizeIdx] && variant.options[sizeIdx].toLowerCase() === 'medium';

    return hasColor && hasSize;
  }

  /**
   * @param {string} handle
   * @returns {Promise<ShopProduct>}
   */
  function fetchProductJson(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js', {
      credentials: 'same-origin',
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('Unable to load product data.');
      }
      return response.json();
    });
  }

  /**
   * Add items to cart. Accepts either a single variant id or an array of {id, quantity}.
   * @param {number|Array<{id:number,quantity:number}>} variantOrItems
   * @returns {Promise<any>}
   */
  function addProductToCart(variantOrItems) {
    var isArray = Array.isArray(variantOrItems);
    var payload = isArray ? { items: variantOrItems } : { id: variantOrItems, quantity: 1 };

    return fetch('/cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (response) {
      if (!response.ok) {
        return response.json().then(function (error) {
          throw new Error(error && error.description ? error.description : 'Cart error');
        });
      }
      return response.json();
    });
  }

  function addSoftWinterJacketIfRequired() {
    if (!autoAddProductHandle || !currentProduct || autoAddProductHandle === currentProduct.handle) {
      return Promise.resolve(null);
    }

    return fetchProductJson(autoAddProductHandle).then(function (softProduct) {
      if (!softProduct || !Array.isArray(softProduct.variants)) return null;
      var variantToAdd = softProduct.variants.find(function (v) {
        return v.available;
      }) || softProduct.variants[0];

      return variantToAdd ? variantToAdd.id : null;
    }).catch(function () {
      return null;
    });
  }

  function handleAddToCart() {
    if (!currentVariant) {
      return;
    }
    addToCartButtonEl.disabled = true;
    showMessage('Adding to cart...');

    if (shouldAutoAddSoftJacket(currentVariant)) {
      addSoftWinterJacketIfRequired()
        .then(function (jacketVariantId) {
          if (jacketVariantId) {
            return addProductToCart([
              { id: currentVariant.id, quantity: 1 },
              { id: jacketVariantId, quantity: 1 },
            ]).then(function () {
              showMessage('Added product and Soft Winter Jacket to the cart.');
            });
          }
          return addProductToCart(currentVariant.id).then(function () {
            showMessage('Added to cart successfully.');
          });
        })
        .catch(function (error) {
          showMessage(error && error.message ? error.message : 'Unable to add to cart.');
        })
        .finally(function () {
          addToCartButtonEl.disabled = false;
        });
    } else {
      addProductToCart(currentVariant.id)
        .then(function () {
          showMessage('Added to cart successfully.');
        })
        .catch(function (error) {
          showMessage(error && error.message ? error.message : 'Unable to add to cart.');
        })
        .finally(function () {
          addToCartButtonEl.disabled = false;
        });
    }
  }

  /**
   * @param {Event} event
   */
  function openProductPopup(event) {
    const button = /** @type {EventTarget & HTMLButtonElement} */ (event.currentTarget);
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const handle = button.dataset.productHandle;
    if (!handle) {
      return;
    }

    showMessage('Loading product...');
    fetchProductJson(handle)
      .then(renderPopup)
      .catch(function (error) {
        showMessage(error && error.message ? error.message : 'Unable to load product.');
      });
  }

  function bindCardButtons() {
    const cards = gridSectionEl.querySelectorAll('button[data-product-handle]');
    cards.forEach(function (card) {
      card.addEventListener('click', openProductPopup);
    });
  }

  if (popupOverlay instanceof HTMLElement) {
    popupOverlay.addEventListener('click', closePopup);
  }

  popupCloseButtons.forEach(function (button) {
    button.addEventListener('click', closePopup);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && popupElementEl.classList.contains('is-open')) {
      closePopup();
    }
  });

  addToCartButton.addEventListener('click', handleAddToCart);
  bindCardButtons();
});
