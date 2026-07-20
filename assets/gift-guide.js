/**
 * gift-guide.js
 * Handles the Gift Guide Grid popup, variant selection, and cart behavior.
 */

document.addEventListener('DOMContentLoaded', function () {
  /** @type {HTMLElement|null} */
  var gridSection = /** @type {HTMLElement|null} */ (document.querySelector('[data-gift-guide-grid]'));
  if (!gridSection) {
    return;
  }

  /** @type {HTMLElement|null} */
  var popupElement = /** @type {HTMLElement|null} */ (document.getElementById('gift-guide-popup'));
  if (!popupElement) {
    return;
  }

  /** @type {HTMLElement|null} */
  var popupOverlayElement = /** @type {HTMLElement|null} */ (popupElement.querySelector('[data-popup-close]'));
  /** @type {NodeListOf<HTMLElement>} */
  var popupCloseButtons = /** @type {NodeListOf<HTMLElement>} */ (popupElement.querySelectorAll('[data-popup-close]'));
  /** @type {HTMLElement|null} */
  var popupTitleElement = /** @type {HTMLElement|null} */ (popupElement.querySelector('.gift-guide-popup__title'));
  /** @type {HTMLImageElement|null} */
  var popupImageElement = /** @type {HTMLImageElement|null} */ (popupElement.querySelector('.gift-guide-popup__image'));
  /** @type {HTMLElement|null} */
  var popupPriceElement = /** @type {HTMLElement|null} */ (popupElement.querySelector('.gift-guide-popup__price'));
  /** @type {HTMLElement|null} */
  var popupDescriptionElement = /** @type {HTMLElement|null} */ (popupElement.querySelector('.gift-guide-popup__description'));
  /** @type {HTMLElement|null} */
  var popupOptionsElement = /** @type {HTMLElement|null} */ (popupElement.querySelector('[data-popup-options]'));
  /** @type {HTMLButtonElement|null} */
  var addToCartButtonElement = /** @type {HTMLButtonElement|null} */ (popupElement.querySelector('[data-add-to-cart]'));
  /** @type {HTMLElement|null} */
  var popupMessageElement = /** @type {HTMLElement|null} */ (popupElement.querySelector('[data-popup-message]'));

  if (!popupOverlayElement || !popupTitleElement || !popupImageElement || !popupPriceElement || !popupDescriptionElement || !popupOptionsElement || !addToCartButtonElement || !popupMessageElement) {
    return;
  }

  var popup = popupElement;
  var popupOverlay = popupOverlayElement;
  var popupTitle = popupTitleElement;
  var popupImage = popupImageElement;
  var popupPrice = popupPriceElement;
  var popupDescription = popupDescriptionElement;
  var popupOptions = popupOptionsElement;
  var addToCartButton = addToCartButtonElement;
  var popupMessage = popupMessageElement;
  var gridContainer = gridSection;
  var autoAddProductHandle = /** @type {string} */ (gridContainer.dataset.autoAddProduct || 'soft-winter-jacket');
  var storeCurrency = /** @type {string} */ (gridContainer.dataset.currency || 'USD');

  /**
   * @typedef {{ id: number, price: number, available: boolean, options: Array<string> }} VariantObject
   * @typedef {{
   *   handle: string,
   *   title?: string,
   *   description?: string,
   *   featured_image?: { src?: string },
   *   images?: Array<{ src?: string } | string>,
   *   options: Array<string>,
   *   variants: Array<VariantObject>
   * }} ProductObject
   */

  /** @type {ProductObject|null} */
  var currentProduct = null;
  /** @type {VariantObject|null} */
  var currentVariant = null;

  /**
   * @param {number} amount
   * @returns {string}
   */
  function formatMoney(amount) {
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: storeCurrency,
      }).format(amount / 100);
    } catch (error) {
      return (amount / 100).toFixed(2) + ' ' + storeCurrency;
    }
  }

  function closePopup() {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    popupMessage.textContent = '';
    addToCartButton.disabled = false;
  }

  function openPopup() {
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
  }

  /**
   * @param {Array<string>} selectedOptions
   * @returns {VariantObject|null}
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
    popupOptions.innerHTML = '';
    if (!currentProduct) {
      return;
    }

    var product = currentProduct;
    product.options.forEach(function (optionName, index) {
      var optionValues = product.variants
        .map(function (variant) {
          return variant.options[index] || '';
        })
        .filter(function (value, idx, list) {
          return value !== '' && list.indexOf(value) === idx;
        });

      var optionField = document.createElement('div');
      optionField.className = 'gift-guide-popup__option';

      var label = document.createElement('label');
      label.textContent = optionName;
      optionField.appendChild(label);

      if (optionValues.length > 3) {
        var select = document.createElement('select');
        select.dataset.optionIndex = String(index);

        optionValues.forEach(function (value) {
          var option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          if (currentVariant && currentVariant.options[index] === value) {
            option.selected = true;
          }
          select.appendChild(option);
        });

        select.addEventListener('change', function () {
          var selectedOptions = Array.from(
            /** @type {NodeListOf<HTMLSelectElement>} */ (popupOptions.querySelectorAll('select'))
          ).map(function (element) {
            return element.value;
          });

          var selectedVariant = findVariant(selectedOptions);
          if (selectedVariant) {
            currentVariant = selectedVariant;
            updateVariantDetails();
          }
        });

        optionField.appendChild(select);
      } else {
        var buttonGroup = document.createElement('div');
        buttonGroup.className = 'gift-guide-popup__button-group';

        optionValues.forEach(function (value) {
          var button = document.createElement('button');
          button.type = 'button';
          button.textContent = value;
          button.dataset.optionValue = value;
          if (currentVariant && currentVariant.options[index] === value) {
            button.classList.add('is-selected');
          }

          button.addEventListener('click', function () {
            var productForEvent = currentProduct;
            if (!productForEvent) {
              return;
            }
            var selectedOptions = /** @type {string[]} */ (productForEvent.options.map(function (_, idx) {
              if (idx === index) {
                return value;
              }

              var selectedButton = /** @type {HTMLButtonElement|null} */ (
                popupOptions.querySelector('.gift-guide-popup__option:nth-child(' + (idx + 1) + ') .gift-guide-popup__button-group button.is-selected')
              );
              if (selectedButton) {
                return selectedButton.dataset.optionValue || '';
              }

              var selectedSelect = /** @type {HTMLSelectElement|null} */ (
                popupOptions.querySelector('.gift-guide-popup__option:nth-child(' + (idx + 1) + ') select')
              );
              if (selectedSelect) {
                return selectedSelect.value;
              }

              return currentVariant ? currentVariant.options[idx] : optionValues[0];
            }));

            currentVariant = findVariant(selectedOptions);
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
      popupPrice.textContent = '';
      addToCartButton.disabled = true;
      return;
    }

    popupPrice.textContent = formatMoney(currentVariant.price);
    addToCartButton.disabled = !currentVariant.available;
    addToCartButton.textContent = currentVariant.available ? 'Add to cart' : 'Sold out';
  }

  /**
   * @param {ProductObject} product
   */
  function renderPopup(product) {
    currentProduct = product;
    currentVariant = product.variants.find(function (variant) {
      return variant.available;
    }) || product.variants[0] || null;

    popupTitle.textContent = product.title || 'Product';
    popupDescription.textContent = product.description || 'No description available.';
    popupImage.src =
      (product.featured_image && product.featured_image.src) ||
      (product.images && product.images[0] && (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].src)) ||
      '';
    popupImage.alt = product.title || 'Product image';

    buildOptionSelects();
    updateVariantDetails();
    openPopup();
  }

  /**
   * @param {string} message
   */
  function showMessage(message) {
    popupMessage.textContent = message;
  }

  /**
   * @param {VariantObject|null} variant
   * @returns {boolean}
   */
  function shouldAutoAddSoftJacket(variant) {
    if (!variant || !variant.options) {
      return false;
    }
    return variant.options.includes('Black') && variant.options.includes('Medium');
  }

  /**
   * @param {string} handle
   * @returns {Promise<ProductObject>}
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
    if (!currentProduct || !autoAddProductHandle || autoAddProductHandle === '' || autoAddProductHandle === currentProduct.handle) {
      return Promise.resolve();
    }

    return fetchProductJson(autoAddProductHandle).then(function (softProduct) {
      var variantToAdd = softProduct.variants.find(function (variant) {
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
    addToCartButton.disabled = true;
    showMessage('Adding to cart…');

    addProductToCart(currentVariant.id)
      .then(function () {
        if (shouldAutoAddSoftJacket(currentVariant)) {
          return addSoftWinterJacketIfRequired().then(function () {
            showMessage('Added gift and Soft Winter Jacket to the cart.');
          });
        }
        showMessage('Added to cart successfully.');
      })
      .catch(function (error) {
        showMessage(error.message || 'Unable to add to cart.');
      })
      .finally(function () {
        addToCartButton.disabled = false;
      });
  }

  /**
   * @param {Event} event
   */
  function openProductPopup(event) {
    var button = /** @type {HTMLElement} */ (event.currentTarget);
    var handle = /** @type {string} */ (button.dataset.productHandle || '');
    if (!handle) {
      return;
    }
    showMessage('Loading product...');
    fetchProductJson(handle)
      .then(renderPopup)
      .catch(function (error) {
        showMessage(error.message || 'Unable to load product.');
      });
  }

  function bindCardButtons() {
    var cards = gridContainer.querySelectorAll('[data-product-handle]');
    cards.forEach(function (card) {
      card.addEventListener('click', openProductPopup);
    });
  }

  popupOverlay.addEventListener('click', closePopup);
  popupCloseButtons.forEach(function (button) {
    button.addEventListener('click', closePopup);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && popup.classList.contains('is-open')) {
      closePopup();
    }
  });

  addToCartButton.addEventListener('click', handleAddToCart);
  bindCardButtons();
});
