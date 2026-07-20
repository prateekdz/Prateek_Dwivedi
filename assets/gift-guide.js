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
  /** @type {HTMLElement | null} */
  const gridSection = document.querySelector('[data-gift-guide-grid]');
  if (!(gridSection instanceof HTMLElement)) {
    return;
  }

  /** @type {HTMLDivElement | null} */
  const popupElement = /** @type {HTMLDivElement | null} */ (document.getElementById('gift-guide-popup'));
  if (!(popupElement instanceof HTMLDivElement)) {
    return;
  }

  /** @type {HTMLElement | null} */
  const popupOverlayElement = /** @type {HTMLElement | null} */ (popupElement.querySelector('[data-popup-close]'));
  /** @type {NodeListOf<HTMLElement>} */
  const popupCloseButtons = /** @type {NodeListOf<HTMLElement>} */ (popupElement.querySelectorAll('[data-popup-close]'));
  /** @type {HTMLElement | null} */
  const popupTitleElement = /** @type {HTMLElement | null} */ (popupElement.querySelector('.gift-guide-popup__title'));
  /** @type {HTMLImageElement | null} */
  const popupImageElement = /** @type {HTMLImageElement | null} */ (popupElement.querySelector('.gift-guide-popup__image'));
  /** @type {HTMLElement | null} */
  const popupPriceElement = /** @type {HTMLElement | null} */ (popupElement.querySelector('.gift-guide-popup__price'));
  /** @type {HTMLElement | null} */
  const popupDescriptionElement = /** @type {HTMLElement | null} */ (popupElement.querySelector('.gift-guide-popup__description'));
  /** @type {HTMLElement | null} */
  const popupOptionsElement = /** @type {HTMLElement | null} */ (popupElement.querySelector('[data-popup-options]'));
  /** @type {HTMLButtonElement | null} */
  const addToCartButtonElement = /** @type {HTMLButtonElement | null} */ (popupElement.querySelector('[data-add-to-cart]'));
  /** @type {HTMLElement | null} */
  const popupMessageElement = /** @type {HTMLElement | null} */ (popupElement.querySelector('[data-popup-message]'));

  if (
    !popupOverlayElement ||
    !popupTitleElement ||
    !popupImageElement ||
    !popupPriceElement ||
    !popupDescriptionElement ||
    !popupOptionsElement ||
    !addToCartButtonElement ||
    !popupMessageElement
  ) {
    return;
  }

  // After the guard above all queried elements are non-null; cast once to satisfy TS.
  const _popupElement = /** @type {HTMLDivElement} */ (popupElement);
  const _popupMessageElement = /** @type {HTMLElement} */ (popupMessageElement);
  const _addToCartButtonElement = /** @type {HTMLButtonElement} */ (addToCartButtonElement);
  const _popupOptionsElement = /** @type {HTMLElement} */ (popupOptionsElement);
  const _popupPriceElement = /** @type {HTMLElement} */ (popupPriceElement);
  const _popupTitleElement = /** @type {HTMLElement} */ (popupTitleElement);
  const _popupDescriptionElement = /** @type {HTMLElement} */ (popupDescriptionElement);
  const _popupImageElement = /** @type {HTMLImageElement} */ (popupImageElement);

  /** @type {ShopProduct | null} */
  let currentProduct = null;
  /** @type {ShopVariant | null} */
  let currentVariant = null;
  const autoAddProductHandle = gridSection.dataset.autoAddProduct || 'soft-winter-jacket';

  /**
   * @param {number} amount
   * @param {string=} currency
   * @returns {string}
   */
  function formatMoney(amount, currency) {
    var currencyCode = currency || 'USD';
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
    _popupElement.classList.remove('is-open');
    _popupElement.setAttribute('aria-hidden', 'true');
    _popupMessageElement.textContent = '';
    _addToCartButtonElement.disabled = false;
  }

  function openPopup() {
    _popupElement.classList.add('is-open');
    _popupElement.setAttribute('aria-hidden', 'false');
  }

  /**
   * @param {string[]} selectedOptions
   * @returns {ShopVariant | null}
   */
  function findVariant(selectedOptions) {
    if (!currentProduct) {
      return null;
    }

    return currentProduct.variants.find(function (variant) {
      return variant.options.every(function (optionValue, idx) {
        return selectedOptions[idx] === optionValue;
      });
    }) || null;
  }

  function buildOptionSelects() {
    _popupOptionsElement.innerHTML = '';
    if (!currentProduct) {
      return;
    }
    const product = /** @type {ShopProduct} */ (currentProduct);

    product.options.forEach(function (optionName, index) {
      const optionValues = /** @type {string[]} */ (product.variants
        .map(function (variant) {
          return variant.options[index];
        })
        .filter(function (value, idx, list) {
          return value !== undefined && list.indexOf(value) === idx;
        }));

      const optionField = document.createElement('div');
      optionField.className = 'gift-guide-popup__option';
      const label = document.createElement('label');
      label.textContent = optionName;
      optionField.appendChild(label);

      const defaultValue = /** @type {string} */ (currentVariant ? currentVariant.options[index] : optionValues[0]);

      if (optionValues.length > 3) {
        const select = document.createElement('select');
        select.dataset.optionIndex = String(index);
        optionValues.forEach(function (value) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          option.selected = defaultValue === value;
          select.appendChild(option);
        });

        select.addEventListener('change', function () {
          const selects = /** @type {NodeListOf<HTMLSelectElement>} */ (_popupOptionsElement.querySelectorAll('select'));
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
        buttonGroup.className = 'gift-guide-popup__button-group';

        optionValues.forEach(function (value) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = value;
          button.dataset.optionValue = value;
          if (defaultValue === value) {
            button.classList.add('is-selected');
          }

          button.addEventListener('click', function () {
            const selectedOptions = /** @type {string[]} */ (product.options.map(function (_, idx) {
              if (idx === index) {
                return value;
              }

              const selectedButton = /** @type {HTMLButtonElement | null} */ (
                _popupOptionsElement.querySelector(
                  '.gift-guide-popup__option:nth-child(' + (idx + 1) + ') .gift-guide-popup__button-group button.is-selected'
                )
              );
              if (selectedButton && selectedButton.dataset.optionValue) {
                return selectedButton.dataset.optionValue;
              }

              const selectedSelect = /** @type {HTMLSelectElement | null} */ (
                _popupOptionsElement.querySelector('.gift-guide-popup__option:nth-child(' + (idx + 1) + ') select')
              );
              if (selectedSelect) {
                return selectedSelect.value;
              }

              return currentVariant ? currentVariant.options[idx] : optionValues[0];
            }));

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

      _popupOptionsElement.appendChild(optionField);
    });
  }

  function updateVariantDetails() {
    if (!currentVariant) {
      _popupPriceElement.textContent = '';
      _addToCartButtonElement.disabled = true;
      return;
    }

    const currency = currentProduct && currentProduct.currency ? currentProduct.currency : 'USD';
    _popupPriceElement.textContent = formatMoney(currentVariant.price, currency);
    _addToCartButtonElement.disabled = !currentVariant.available;
    _addToCartButtonElement.textContent = currentVariant.available ? 'Add to cart' : 'Sold out';
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

    _popupTitleElement.textContent = product.title || 'Product';
    _popupDescriptionElement.textContent = product.description || 'No description available.';
    _popupImageElement.src =
      (product.featured_image && typeof product.featured_image === 'object' && product.featured_image.src) ||
      (Array.isArray(product.images) && product.images.length > 0
        ? typeof product.images[0] === 'string'
          ? product.images[0]
          : product.images[0].src
        : '');
    _popupImageElement.alt = product.title || 'Product image';

    buildOptionSelects();
    updateVariantDetails();
    openPopup();
  }

  /**
   * @param {string} message
   */
  function showMessage(message) {
    _popupMessageElement.textContent = message;
  }

  /**
   * @param {ShopVariant} variant
   * @returns {boolean}
   */
  function shouldAutoAddSoftJacket(variant) {
    return variant.options.includes('Black') && variant.options.includes('Medium');
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
   * @param {number} variantId
   * @returns {Promise<any>}
   */
  function addProductToCart(variantId) {
    return fetch('/cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: variantId,
        quantity: 1,
      }),
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
      return Promise.resolve();
    }

    return fetchProductJson(autoAddProductHandle).then(function (softProduct) {
      const variantToAdd = softProduct.variants.find(function (variant) {
        return variant.available;
      }) || softProduct.variants[0];

      if (!variantToAdd) {
        return Promise.resolve();
      }
      return addProductToCart(variantToAdd.id);
    });
  }

  function handleAddToCart() {
    if (!currentVariant) {
      return;
    }

    _addToCartButtonElement.disabled = true;
    showMessage('Adding to cart…');

    const variantToAdd = /** @type {ShopVariant} */ (currentVariant);
    addProductToCart(variantToAdd.id)
      .then(function () {
        if (shouldAutoAddSoftJacket(variantToAdd)) {
          return addSoftWinterJacketIfRequired().then(function () {
            showMessage('Added gift and Soft Winter Jacket to the cart.');
          });
        }
        showMessage('Added to cart successfully.');
      })
      .catch(function (error) {
        showMessage(error && error.message ? error.message : 'Unable to add to cart.');
      })
      .finally(function () {
        _addToCartButtonElement.disabled = false;
      });
  }

  /**
   * @param {Event} event
   */
  function openProductPopup(event) {
    const button = /** @type {HTMLButtonElement | null} */ (event.currentTarget);
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

  const _gridSection = /** @type {HTMLElement} */ (gridSection);

  function bindCardButtons() {
    const cards = /** @type {NodeListOf<HTMLButtonElement>} */ (_gridSection.querySelectorAll('[data-product-handle]'));
    cards.forEach(function (card) {
      card.addEventListener('click', openProductPopup);
    });
  }

  popupOverlayElement.addEventListener('click', closePopup);
  popupCloseButtons.forEach(function (button) {
    button.addEventListener('click', closePopup);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && _popupElement.classList.contains('is-open')) {
      closePopup();
    }
  });

  _addToCartButtonElement.addEventListener('click', handleAddToCart);
  bindCardButtons();
});
