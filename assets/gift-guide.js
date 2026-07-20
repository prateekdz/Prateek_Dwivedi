document.addEventListener('DOMContentLoaded', function () {
  var gridSection = document.querySelector('[data-gift-guide-grid]');
  if (!gridSection) {
    return;
  }

  var popup = document.getElementById('gift-guide-popup');
  var popupOverlay = popup.querySelector('[data-popup-close]');
  var popupCloseButtons = popup.querySelectorAll('[data-popup-close]');
  var popupTitle = popup.querySelector('.gift-guide-popup__title');
  var popupImage = popup.querySelector('.gift-guide-popup__image');
  var popupPrice = popup.querySelector('.gift-guide-popup__price');
  var popupDescription = popup.querySelector('.gift-guide-popup__description');
  var popupOptions = popup.querySelector('[data-popup-options]');
  var addToCartButton = popup.querySelector('[data-add-to-cart]');
  var popupMessage = popup.querySelector('[data-popup-message]');
  var currentProduct = null;
  var currentVariant = null;
  var autoAddProductHandle = gridSection.dataset.autoAddProduct || 'soft-winter-jacket';

  function formatMoney(amount, currency) {
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount / 100);
    } catch (error) {
      return (amount / 100).toFixed(2) + ' ' + (currency || 'USD');
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

  function findVariant(selectedOptions) {
    if (!currentProduct) {
      return null;
    }

    return currentProduct.variants.find(function (variant) {
      return variant.options.every(function (optionValue, idx) {
        return selectedOptions[idx] === optionValue;
      });
    });
  }

  function buildOptionSelects() {
    popupOptions.innerHTML = '';
    if (!currentProduct) {
      return;
    }

    currentProduct.options.forEach(function (optionName, index) {
      var optionValues = currentProduct.variants.map(function (variant) {
        return variant.options[index];
      }).filter(function (value, idx, list) {
        return list.indexOf(value) === idx;
      });

      var optionField = document.createElement('div');
      optionField.className = 'gift-guide-popup__option';

      var label = document.createElement('label');
      label.textContent = optionName;
      optionField.appendChild(label);

      if (optionValues.length > 3) {
        var select = document.createElement('select');
        select.dataset.optionIndex = index;
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
          var selectedOptions = Array.from(popupOptions.querySelectorAll('select')).map(function (element) {
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
            var selectedOptions = currentProduct.options.map(function (_, idx) {
              if (idx === index) {
                return value;
              }

              var selectedButton = popupOptions.querySelector('.gift-guide-popup__option:nth-child(' + (idx + 1) + ') .gift-guide-popup__button-group button.is-selected');
              if (selectedButton) {
                return selectedButton.dataset.optionValue;
              }

              var selectedSelect = popupOptions.querySelector('.gift-guide-popup__option:nth-child(' + (idx + 1) + ') select');
              if (selectedSelect) {
                return selectedSelect.value;
              }

              return currentVariant ? currentVariant.options[idx] : optionValues[0];
            });

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

    popupPrice.textContent = formatMoney(currentVariant.price, currentProduct.currency);
    addToCartButton.disabled = !currentVariant.available;
    addToCartButton.textContent = currentVariant.available ? 'Add to cart' : 'Sold out';
  }

  function renderPopup(product) {
    currentProduct = product;
    currentVariant = product.variants.find(function (variant) {
      return variant.available;
    }) || product.variants[0] || null;

    popupTitle.textContent = product.title || 'Product';
    popupDescription.textContent = product.description || 'No description available.';
    popupImage.src = (product.featured_image && product.featured_image.src) || (product.images && product.images[0] && (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].src)) || '';
    popupImage.alt = product.title || 'Product image';

    buildOptionSelects();
    updateVariantDetails();
    openPopup();
  }

  function showMessage(message) {
    popupMessage.textContent = message;
  }

  function shouldAutoAddSoftJacket(variant) {
    if (!variant || !variant.options) {
      return false;
    }
    return variant.options.includes('Black') && variant.options.includes('Medium');
  }

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
    if (!autoAddProductHandle || autoAddProductHandle === '' || autoAddProductHandle === currentProduct.handle) {
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

  function openProductPopup(event) {
    var button = event.currentTarget;
    var handle = button.dataset.productHandle;
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
    var cards = gridSection.querySelectorAll('[data-product-handle]');
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
