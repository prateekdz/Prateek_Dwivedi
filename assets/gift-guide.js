document.addEventListener('DOMContentLoaded', function () {
  var gridSection = document.querySelector('[data-gift-guide-grid]');
  var popup = document.getElementById('gift-guide-popup');
  var popupOverlay = popup.querySelector('[data-popup-close]');
  var popupClose = popup.querySelector('.gift-guide-popup__close');
  var popupTitle = popup.querySelector('.gift-guide-popup__title');
  var popupImage = popup.querySelector('.gift-guide-popup__image');
  var popupPrice = popup.querySelector('.gift-guide-popup__price');
  var popupDescription = popup.querySelector('.gift-guide-popup__description');
  var popupOptions = popup.querySelector('[data-popup-options]');
  var popupMessage = popup.querySelector('[data-popup-message]');
  var addToCartButton = popup.querySelector('[data-add-to-cart]');
  var currency = gridSection ? gridSection.dataset.currency || 'USD' : 'USD';
  var currentProduct = null;
  var currentVariant = null;
  var selectedOptions = {};
  var autoAddProductHandle = gridSection ? gridSection.dataset.autoAddProduct : 'soft-winter-jacket';

  function formatMoney(amount, currencyCode) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount / 100);
    } catch (error) {
      return '$' + (amount / 100).toFixed(0);
    }
  }

  function closePopup() {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    popupMessage.textContent = '';
    currentProduct = null;
    currentVariant = null;
    selectedOptions = {};
    popupOptions.innerHTML = '';
  }

  function openPopup() {
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
  }

  function getMatchingVariant(product, optionSelections) {
    return product.variants.find(function (variant) {
      return variant.options.every(function (value, index) {
        var optionName = product.options[index];
        return String(optionSelections[optionName] || '').trim() === String(value).trim();
      });
    });
  }

  function renderOptions(product) {
    selectedOptions = {};
    popupOptions.innerHTML = '';

    product.options.forEach(function (optionName, index) {
      var optionValues = product.options_with_values ? product.options_with_values[index]?.values || [] : product.variants.reduce(function (values, variant) {
        var val = variant.options[index];
        if (!values.includes(val)) values.push(val);
        return values;
      }, []);
      var fieldset = document.createElement('fieldset');
      fieldset.className = 'gift-guide-popup__option';
      fieldset.innerHTML = '<legend>' + optionName + '</legend>';

      if (optionName.toLowerCase().includes('color')) {
        var container = document.createElement('div');
        container.className = 'gift-guide-popup__option-values';
        optionValues.forEach(function (value) {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'gift-guide-popup__option-button';
          button.textContent = value;
          button.addEventListener('click', function () {
            selectOption(optionName, value);
          });
          container.appendChild(button);
        });
        fieldset.appendChild(container);
      } else if (index === 1) {
        var select = document.createElement('select');
        select.className = 'gift-guide-popup__option-select';
        select.innerHTML = '<option value="">Choose your size</option>' + optionValues.map(function (value) {
          return '<option value="' + value + '">' + value + '</option>';
        }).join('');
        select.addEventListener('change', function () {
          selectOption(optionName, select.value);
        });
        fieldset.appendChild(select);
      } else {
        var genericContainer = document.createElement('div');
        genericContainer.className = 'gift-guide-popup__option-values';
        optionValues.forEach(function (value) {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'gift-guide-popup__option-button';
          button.textContent = value;
          button.addEventListener('click', function () {
            selectOption(optionName, value);
          });
          genericContainer.appendChild(button);
        });
        fieldset.appendChild(genericContainer);
      }

      popupOptions.appendChild(fieldset);
      selectedOptions[optionName] = optionValues[0] || '';
    });

    currentVariant = getMatchingVariant(product, selectedOptions) || product.variants[0];
    updatePopupFields(product, currentVariant);
    markSelectedOptionButtons();
  }

  function markSelectedOptionButtons() {
    var optionSets = popupOptions.querySelectorAll('.gift-guide-popup__option');
    optionSets.forEach(function (fieldset) {
      var legend = fieldset.querySelector('legend');
      var optionName = legend ? legend.textContent : '';
      var selectedValue = selectedOptions[optionName];
      fieldset.querySelectorAll('.gift-guide-popup__option-button').forEach(function (button) {
        if (button.textContent === selectedValue) {
          button.classList.add('is-selected');
        } else {
          button.classList.remove('is-selected');
        }
      });
      var select = fieldset.querySelector('select');
      if (select) {
        select.value = selectedValue || '';
      }
    });
  }

  function selectOption(optionName, value) {
    selectedOptions[optionName] = value;
    currentVariant = getMatchingVariant(currentProduct, selectedOptions) || currentVariant;
    updatePopupFields(currentProduct, currentVariant);
    markSelectedOptionButtons();
  }

  function updatePopupFields(product, variant) {
    if (!variant) {
      return;
    }
    popupTitle.textContent = product.title;
    popupPrice.textContent = formatMoney(variant.price, currency);
    popupDescription.textContent = product.description || '';
    popupImage.src = product.featured_image ? product.featured_image.src : product.images[0] || '';
    popupImage.alt = product.title;
    currentVariant = variant;
  }

  function addItemToCart(variantId, quantity) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ id: variantId, quantity: quantity })
    }).then(function (response) {
      if (!response.ok) {
        return response.json().then(function (errorData) {
          throw new Error(errorData.description || 'Unable to add to cart');
        });
      }
      return response.json();
    });
  }

  function maybeAddBonusProduct() {
    if (!currentProduct || !selectedOptions) {
      return Promise.resolve();
    }
    var colorMatch = String(selectedOptions.Color || selectedOptions.color || '').trim().toLowerCase();
    var sizeMatch = String(selectedOptions.Size || selectedOptions.size || '').trim().toLowerCase();
    var targetHandle = autoAddProductHandle || 'soft-winter-jacket';
    if (colorMatch === 'black' && sizeMatch === 'medium' && targetHandle) {
      return fetch('/products/' + targetHandle + '.js')
        .then(function (response) {
          if (!response.ok) {
            return Promise.reject(new Error('Bonus product not found'));
          }
          return response.json();
        })
        .then(function (product) {
          var variant = product.variants.find(function (item) {
            return item.available;
          });
          if (variant) {
            return addItemToCart(variant.id, 1);
          }
          return Promise.resolve();
        })
        .catch(function () {
          return Promise.resolve();
        });
    }
    return Promise.resolve();
  }

  function handleCardClick(handle) {
    fetch('/products/' + handle + '.js')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Product not found');
        }
        return response.json();
      })
      .then(function (product) {
        currentProduct = product;
        currentVariant = product.variants[0];
        selectedOptions = {};
        renderOptions(product);
        openPopup();
      })
      .catch(function () {
        popupMessage.textContent = 'Unable to load product details.';
        openPopup();
      });
  }

  function handleAddToCart() {
    if (!currentVariant) {
      popupMessage.textContent = 'Please choose a valid product option.';
      return;
    }

    addToCartButton.disabled = true;
    popupMessage.textContent = 'Adding to cart…';

    addItemToCart(currentVariant.id, 1)
      .then(function () {
        return maybeAddBonusProduct();
      })
      .then(function () {
        popupMessage.textContent = 'Product added to cart.';
      })
      .catch(function (error) {
        popupMessage.textContent = error.message || 'Could not add to cart.';
      })
      .finally(function () {
        addToCartButton.disabled = false;
      });
  }

  if (gridSection) {
    var productCards = gridSection.querySelectorAll('.gift-guide-card[data-product-handle]');
    productCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var productHandle = card.dataset.productHandle;
        handleCardClick(productHandle);
      });
    });
  }

  popupOverlay.addEventListener('click', closePopup);
  popupClose.addEventListener('click', closePopup);
  addToCartButton.addEventListener('click', handleAddToCart);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && popup.classList.contains('is-open')) {
      closePopup();
    }
  });

  var anchorButtons = document.querySelectorAll('.gift-guide-banner__top-button, .gift-guide-banner__cta');
  anchorButtons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      var href = button.getAttribute('href');
      if (href && href.startsWith('#')) {
        event.preventDefault();
        var target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
});
