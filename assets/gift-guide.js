/**
 * gift-guide.js
 * Handles the Gift Guide Grid modal, variant selection, and add-to-cart behavior.
 */

document.addEventListener('DOMContentLoaded', function () {
  var gridSection = document.querySelector('[data-gg-grid]');
  var modal = document.querySelector('[data-gg-modal]');

  if (!gridSection || !modal) {
    console.log('Gift Guide: required elements not found');
    return;
  }

  var modalTitle = modal.querySelector('.gift-guide-modal__title');
  var modalImage = modal.querySelector('.gift-guide-modal__image');
  var modalPrice = modal.querySelector('.gift-guide-modal__price');
  var modalDescription = modal.querySelector('.gift-guide-modal__description');
  var modalOptions = modal.querySelector('[data-gg-options]');
  var addToCartBtn = modal.querySelector('[data-gg-add-to-cart]');
  var modalNotice = modal.querySelector('[data-gg-notice]');
  var closeButtons = modal.querySelectorAll('[data-gg-close]');

  if (!modalTitle || !modalImage || !modalPrice || !modalDescription || !modalOptions || !addToCartBtn || !modalNotice) {
    console.log('Gift Guide: required modal elements not found');
    return;
  }

  var currentProduct = null;
  var currentVariant = null;

  function closeModal() {
    modal.classList.remove('gift-guide-modal--open');
    modal.classList.add('gift-guide-modal--closed');
    modal.setAttribute('aria-hidden', 'true');
    modalNotice.textContent = '';
    addToCartBtn.disabled = false;
  }

  function openModal() {
    modal.classList.remove('gift-guide-modal--closed');
    modal.classList.add('gift-guide-modal--open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function formatPrice(amount) {
    var currency = window.Shopify && Shopify.currency && Shopify.currency.active || 'USD';
    var locale = window.navigator.language || 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  }

  function findMatchingVariant(selectedOptions) {
    if (!currentProduct || !currentProduct.variants) return null;
    return currentProduct.variants.find(function (variant) {
      return variant.options && variant.options.every(function (option, idx) {
        return option === selectedOptions[idx];
      });
    });
  }

  function getSelectedOptions() {
    return Array.from(modalOptions.querySelectorAll('select, .gift-guide-modal__option-button.is-selected'))
      .sort(function (a, b) {
        return Number(a.dataset.optionIndex) - Number(b.dataset.optionIndex);
      })
      .map(function (el) {
        return el.tagName === 'SELECT' ? el.value : el.dataset.optionValue;
      })
      .filter(function (value) {
        return value != null && value !== '';
      });
  }

  function renderOptions(product) {
    modalOptions.innerHTML = '';

    if (!product.options || product.options.length === 0) return;

    product.options.forEach(function (optionName, optionIdx) {
      var values = [];

      product.variants.forEach(function (variant) {
        var optionValue = variant.options && variant.options[optionIdx];
        if (optionValue == null) return;
        if (typeof optionValue === 'object') {
          optionValue = optionValue.value || optionValue.name || String(optionValue);
        }
        optionValue = String(optionValue);
        if (optionValue && values.indexOf(optionValue) === -1) {
          values.push(optionValue);
        }
      });

      if (values.length === 0) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'gift-guide-modal__option';

      var label = document.createElement('label');
      label.textContent = optionName;
      label.className = 'gift-guide-modal__option-label';
      wrapper.appendChild(label);

      var selectedValue = currentVariant && currentVariant.options && currentVariant.options[optionIdx] ? currentVariant.options[optionIdx] : values[0];

      if (values.length > 4) {
        var select = document.createElement('select');
        select.className = 'gift-guide-modal__option-select';
        select.dataset.optionIndex = optionIdx;

        values.forEach(function (value) {
          var option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          if (value === selectedValue) {
            option.selected = true;
          }
          select.appendChild(option);
        });

        select.addEventListener('change', function () {
          currentVariant = findMatchingVariant(getSelectedOptions());
          updatePrice();
        });

        wrapper.appendChild(select);
      } else {
        var buttonGroup = document.createElement('div');
        buttonGroup.className = 'gift-guide-modal__option-buttons';

        values.forEach(function (value) {
          var button = document.createElement('button');
          button.type = 'button';
          button.textContent = value;
          button.className = 'gift-guide-modal__option-button';
          button.dataset.optionValue = value;
          button.dataset.optionIndex = optionIdx;

          if (value === selectedValue) {
            button.classList.add('is-selected');
          }

          button.addEventListener('click', function () {
            buttonGroup.querySelectorAll('button').forEach(function (btn) {
              btn.classList.remove('is-selected');
            });
            button.classList.add('is-selected');

            currentVariant = findMatchingVariant(getSelectedOptions());
            updatePrice();
          });

          buttonGroup.appendChild(button);
        });

        wrapper.appendChild(buttonGroup);
      }

      modalOptions.appendChild(wrapper);
    });
  }

  function updatePrice() {
    if (currentVariant) {
      modalPrice.textContent = formatPrice(currentVariant.price);
      addToCartBtn.disabled = !currentVariant.available;
    } else {
      modalPrice.textContent = '';
      addToCartBtn.disabled = true;
    }
  }

  function fetchProduct(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js').then(function (res) {
      if (!res.ok) {
        throw new Error('Product fetch failed');
      }
      return res.json();
    });
  }

  function renderModal(product) {
    currentProduct = product;
    currentVariant = (product.variants && product.variants.find(function (variant) {
      return variant.available;
    })) || (product.variants && product.variants[0]) || null;

    modalTitle.textContent = product.title || '';
    modalDescription.textContent = product.description || '';
    modalImage.src = (product.featured_image && product.featured_image.src) || (product.images && product.images[0]) || '';
    modalImage.alt = product.title || '';

    renderOptions(product);
    updatePrice();
    openModal();
  }

  function addToCart(variantId) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('Cart add failed');
      }
      return res.json();
    });
  }

  addToCartBtn.addEventListener('click', function () {
    if (!currentVariant) return;
    addToCartBtn.disabled = true;
    modalNotice.textContent = 'Adding to cart...';

    addToCart(currentVariant.id)
      .then(function () {
        modalNotice.textContent = 'Added to cart!';
        setTimeout(closeModal, 1200);
      })
      .catch(function () {
        modalNotice.textContent = 'Error adding to cart';
        addToCartBtn.disabled = false;
      });
  });

  closeButtons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      closeModal();
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  var productCards = gridSection.querySelectorAll('[data-product-handle]');
  productCards.forEach(function (card) {
    card.addEventListener('click', function (event) {
      event.preventDefault();
      var handle = card.dataset.productHandle;
      modalNotice.textContent = 'Loading...';

      fetchProduct(handle)
        .then(renderModal)
        .catch(function () {
          modalNotice.textContent = 'Error loading product';
        });
    });
  });
});
