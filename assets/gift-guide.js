/**
 * gift-guide.js
 * Handles the Gift Guide Grid modal, variant selection, and cart behavior.
 */

document.addEventListener('DOMContentLoaded', function () {
  var gridSection = document.querySelector('[data-gg-grid]');
  var modal = document.querySelector('[data-gg-modal]');
  
  if (!gridSection || !modal) {
    console.log('Gift Guide: Required elements not found');
    return;
  }

  var modalTitle = modal.querySelector('.gg-modal__title');
  var modalImage = modal.querySelector('.gg-modal__image');
  var modalPrice = modal.querySelector('.gg-modal__price');
  var modalDescription = modal.querySelector('.gg-modal__description');
  var modalOptions = modal.querySelector('[data-gg-options]');
  var addToCartBtn = modal.querySelector('[data-gg-add-to-cart]');
  var modalNotice = modal.querySelector('[data-gg-notice]');
  var closeButtons = modal.querySelectorAll('[data-gg-close]');

  if (!modalTitle || !modalImage || !modalPrice || !modalDescription || !modalOptions || !addToCartBtn || !modalNotice) {
    console.log('Gift Guide: Required modal elements not found');
    return;
  }

  var currentProduct = null;
  var currentVariant = null;

  function closeModal() {
    modal.classList.remove('gg-modal--open');
    modal.classList.add('gg-modal--closed');
    modal.setAttribute('aria-hidden', 'true');
    modalNotice.textContent = '';
    addToCartBtn.disabled = false;
  }

  function openModal() {
    modal.classList.remove('gg-modal--closed');
    modal.classList.add('gg-modal--open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function formatPrice(amount) {
    var currency = window.Shopify && Shopify.currency && Shopify.currency.active || 'USD';
    var locale = window.navigator.language || 'en-US';
    var formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount / 100);
  }

  function findMatchingVariant(selectedOptions) {
    if (!currentProduct || !currentProduct.variants) return null;
    return currentProduct.variants.find(function(variant) {
      return variant.options && variant.options.every(function(option, idx) {
        return option === selectedOptions[idx];
      });
    });
  }

  function getSelectedOptions() {
    return Array.from(modalOptions.querySelectorAll('select, .gg-modal__option-button.is-selected'))
      .sort(function(a, b) {
        return Number(a.dataset.optionIndex) - Number(b.dataset.optionIndex);
      })
      .map(function(el) {
        if (el.tagName === 'SELECT') return el.value;
        return el.dataset.optionValue;
      })
      .filter(function(value) {
        return value != null && value !== '';
      });
  }

  function getSelectedOptionPairs() {
    return Array.from(modalOptions.querySelectorAll('.gg-modal__option-label')).map(function(label) {
      var optionName = label.textContent.trim();
      var control = label.nextElementSibling;
      var value = '';

      if (!control) return { name: optionName, value: value };
      if (control.tagName === 'SELECT') {
        value = control.value;
      } else {
        var selected = control.querySelector('.gg-modal__option-button.is-selected');
        value = selected ? selected.dataset.optionValue : '';
      }

      return { name: optionName, value: value };
    });
  }

  function renderOptions(product) {
    modalOptions.innerHTML = '';
    if (!product.options || product.options.length === 0) return;

    product.options.forEach(function(optionName, optionIdx) {
      var values = [];
      product.variants.forEach(function(variant) {
        if (!variant.options || variant.options.length <= optionIdx) return;
        var optionValue = variant.options[optionIdx];
        if (optionValue == null) return;
        if (typeof optionValue === 'object') {
          optionValue = optionValue.value || optionValue.name || String(optionValue);
        }
        optionValue = String(optionValue);
        if (optionValue && !values.includes(optionValue)) {
          values.push(optionValue);
        }
      });

      if (values.length === 0) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'gg-modal__option';

      var label = document.createElement('label');
      label.textContent = optionName;
      label.className = 'gg-modal__option-label';
      wrapper.appendChild(label);

      var selectedValue = currentVariant && currentVariant.options && currentVariant.options[optionIdx] ? currentVariant.options[optionIdx] : values[0];

      if (values.length > 4) {
        var select = document.createElement('select');
        select.className = 'gg-modal__option-select';
        select.dataset.optionIndex = optionIdx;

        values.forEach(function(value) {
          var option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          if (value === selectedValue) {
            option.selected = true;
          }
          select.appendChild(option);
        });

        select.addEventListener('change', function() {
          currentVariant = findMatchingVariant(getSelectedOptions());
          updatePrice();
        });

        wrapper.appendChild(select);
      } else {
        var buttonGroup = document.createElement('div');
        buttonGroup.className = 'gg-modal__option-buttons';

        values.forEach(function(value) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = value;
          btn.className = 'gg-modal__option-button';
          btn.dataset.optionValue = value;
          btn.dataset.optionIndex = optionIdx;

          if (value === selectedValue) {
            btn.classList.add('is-selected');
          }

          btn.addEventListener('click', function() {
            var siblings = buttonGroup.querySelectorAll('button');
            siblings.forEach(function(b) { b.classList.remove('is-selected'); });
            btn.classList.add('is-selected');

            currentVariant = findMatchingVariant(getSelectedOptions());
            updatePrice();
          });

          buttonGroup.appendChild(btn);
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

  function matchesBlackMediumRule(optionPairs) {
    var color = '';
    var size = '';

    optionPairs.forEach(function(pair) {
      if (pair.name.toLowerCase().includes('color')) {
        color = pair.value.toLowerCase();
      }
      if (pair.name.toLowerCase().includes('size')) {
        size = pair.value.toLowerCase();
      }
    });

    return color === 'black' && size === 'medium';
  }

  function addMultipleItemsToCart(items) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items })
    }).then(function(res) { return res.json(); });
  }

  function loadSupportingProduct(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js').then(function(res) {
      return res.json();
    });
  }

  function fetchProduct(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function(res) { return res.json(); });
  }

  function renderModal(product) {
    currentProduct = product;
    currentVariant = product.variants && product.variants.find(function(v) { return v.available; }) || (product.variants && product.variants[0]) || null;

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
    }).then(function(res) { return res.json(); });
  }

  addToCartBtn.addEventListener('click', function() {
    if (!currentVariant) return;
    addToCartBtn.disabled = true;
    modalNotice.textContent = 'Adding to cart...';

    var selectedOptionPairs = getSelectedOptionPairs();
    var addItems = [{ id: currentVariant.id, quantity: 1 }];

    if (matchesBlackMediumRule(selectedOptionPairs)) {
      loadSupportingProduct('soft-winter-jacket')
        .then(function(product) {
          var variant = product.variants.find(function(v) { return v.available; });
          if (variant) {
            addItems.push({ id: variant.id, quantity: 1 });
          }
          return addMultipleItemsToCart(addItems);
        })
        .then(function() {
          modalNotice.textContent = 'Added to cart!';
          setTimeout(closeModal, 1500);
        })
        .catch(function(err) {
          modalNotice.textContent = 'Error adding to cart';
          addToCartBtn.disabled = false;
        });
    } else {
      addMultipleItemsToCart(addItems)
        .then(function() {
          modalNotice.textContent = 'Added to cart!';
          setTimeout(closeModal, 1500);
        })
        .catch(function(err) {
          modalNotice.textContent = 'Error adding to cart';
          addToCartBtn.disabled = false;
        });
    }
  });

  closeButtons.forEach(function(btn) {
    btn.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  var productCards = gridSection.querySelectorAll('[data-product-handle]');
  productCards.forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      var handle = card.dataset.productHandle;
      modalNotice.textContent = 'Loading...';
      fetchProduct(handle)
        .then(renderModal)
        .catch(function() { modalNotice.textContent = 'Error loading product'; });
    });
  });

});
