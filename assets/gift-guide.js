document.addEventListener('DOMContentLoaded', function () {
  var gridSection = document.querySelector('[data-gg-grid]');
  if (!gridSection) return;

  var popupElement = document.getElementById('gg-quickview');
  if (!popupElement) return;

  var popupOverlay = popupElement.querySelector('[data-gg-close]');
  var popupCloseButtons = popupElement.querySelectorAll('[data-gg-close]');
  var popupTitle = popupElement.querySelector('.gg-modal__title');
  var popupImage = popupElement.querySelector('.gg-modal__image');
  var popupPrice = popupElement.querySelector('.gg-modal__price');
  var popupDescription = popupElement.querySelector('.gg-modal__description');
  var popupOptions = popupElement.querySelector('[data-gg-options]');
  var addToCartButton = popupElement.querySelector('[data-gg-add-to-cart]');
  var popupMessage = popupElement.querySelector('[data-gg-notice]');

  if (!popupOverlay || !popupTitle || !popupImage || !popupPrice || !popupDescription || !popupOptions || !addToCartButton || !popupMessage) {
    return;
  }

  var currentProduct = null;
  var currentVariant = null;
  var selectedOptions = {};

  function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    document.body.style.overflow = '';
  }

  function closePopup() {
    popupElement.classList.remove('gg-modal--open');
    popupElement.classList.add('gg-modal--closed');
    popupElement.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    popupMessage.textContent = '';
    addToCartButton.disabled = true;
    currentProduct = null;
    currentVariant = null;
    selectedOptions = {};
    popupOptions.innerHTML = '';
  }

  function openPopup() {
    popupElement.classList.remove('gg-modal--closed');
    popupElement.classList.add('gg-modal--open');
    popupElement.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
  }

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

  function getOptionValues(product, index) {
    if (product.options_with_values && product.options_with_values[index]) {
      return product.options_with_values[index].values;
    }
    return product.variants.reduce(function (values, variant) {
      var value = variant.options[index];
      if (!values.includes(value)) values.push(value);
      return values;
    }, []);
  }

  function getMatchingVariant(product, selections) {
    return product.variants.find(function (variant) {
      return variant.options.every(function (value, index) {
        var optionName = product.options[index];
        return String(selections[optionName] || '').trim() === String(value).trim();
      });
    });
  }

  function updateModalFields(product, variant) {
    popupTitle.textContent = product.title;
    popupPrice.textContent = formatMoney(variant.price, gridSection.dataset.ggCurrency || 'USD');
    popupDescription.textContent = product.description ? product.description.replace(/<[^>]+>/g, '').trim() : '';
    popupImage.src = product.featured_image ? product.featured_image.src : product.images[0] || '';
    popupImage.alt = product.title;
    currentVariant = variant;
    addToCartButton.disabled = !variant || !variant.available;
    addToCartButton.textContent = variant && variant.available ? 'ADD TO CART →' : 'SOLD OUT';
  }

  function markSelectedValues() {
    popupOptions.querySelectorAll('[data-gg-option-button]').forEach(function (button) {
      var option = button.dataset.ggOptionName;
      var value = button.dataset.ggOptionValue;
      if (selectedOptions[option] === value) {
        button.classList.add('is-selected');
      } else {
        button.classList.remove('is-selected');
      }
    });
    popupOptions.querySelectorAll('select[data-gg-option-name]').forEach(function (select) {
      var option = select.dataset.ggOptionName;
      select.value = selectedOptions[option] || '';
    });
  }

  function renderOptionFields(product) {
    selectedOptions = {};
    popupOptions.innerHTML = '';

    product.options.forEach(function (optionName, index) {
      var values = getOptionValues(product, index);
      var fieldset = document.createElement('fieldset');
      fieldset.className = 'gg-modal__option';
      var legend = document.createElement('legend');
      legend.textContent = optionName;
      fieldset.appendChild(legend);

      if (optionName.toLowerCase().includes('color')) {
        var row = document.createElement('div');
        row.className = 'gg-modal__option-row';
        values.forEach(function (value) {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'gg-modal__option-button';
          button.dataset.ggOptionButton = '';
          button.dataset.ggOptionName = optionName;
          button.dataset.ggOptionValue = value;
          button.textContent = value;
          button.addEventListener('click', function () {
            selectedOptions[optionName] = value;
            var variant = getMatchingVariant(currentProduct, selectedOptions);
            if (variant) {
              updateModalFields(currentProduct, variant);
            }
            markSelectedValues();
          });
          row.appendChild(button);
        });
        fieldset.appendChild(row);
      } else {
        var select = document.createElement('select');
        select.dataset.ggOptionName = optionName;
        select.className = 'gg-modal__option-select';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose your ' + optionName.toLowerCase();
        select.appendChild(placeholder);
        values.forEach(function (value) {
          var optionEl = document.createElement('option');
          optionEl.value = value;
          optionEl.textContent = value;
          select.appendChild(optionEl);
        });
        select.addEventListener('change', function () {
          selectedOptions[optionName] = select.value;
          var variant = getMatchingVariant(currentProduct, selectedOptions);
          updateModalFields(currentProduct, variant || currentVariant);
          markSelectedValues();
        });
        fieldset.appendChild(select);
      }

      selectedOptions[optionName] = values[0] || '';
      popupOptions.appendChild(fieldset);
    });

    currentVariant = getMatchingVariant(product, selectedOptions) || product.variants[0];
    updateModalFields(product, currentVariant);
    markSelectedValues();
  }

  function fetchProduct(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js').then(function (res) {
      if (!res.ok) {
        throw new Error('Product fetch failed');
      }
      return res.json();
    });
  }

  function renderPopup(product) {
    currentProduct = product;
    currentVariant = (product.variants && product.variants.find(function (variant) {
      return variant.available;
    })) || (product.variants && product.variants[0]) || null;

    popupTitle.textContent = product.title || '';
    popupDescription.textContent = product.description || '';
    var featuredImage = typeof product.featured_image === 'string'
      ? product.featured_image
      : product.featured_image && product.featured_image.src;
    popupImage.src = featuredImage || (product.images && product.images[0]) || '';
    popupImage.alt = product.title || '';

    renderOptionFields(product);
    openPopup();
  }

  function addToCart(item) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('Cart add failed');
      }
      return res.json();
    });
  }

  addToCartButton.addEventListener('click', function () {
    if (!currentVariant) return;
    addToCartButton.disabled = true;
    popupMessage.textContent = 'Adding to cart...';

    addToCart({ id: currentVariant.id, quantity: 1 })
      .then(function () {
        popupMessage.textContent = 'Added to cart!';
        setTimeout(closePopup, 1200);
      })
      .catch(function () {
        popupMessage.textContent = 'Error adding to cart';
        addToCartButton.disabled = false;
      });
  });

  popupCloseButtons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      closePopup();
    });
  });

  popupOverlay.addEventListener('click', closePopup);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && popupElement.classList.contains('gg-modal--open')) {
      closePopup();
    }
  });

  gridSection.querySelectorAll('[data-product-handle]').forEach(function (card) {
    card.addEventListener('click', function (event) {
      event.preventDefault();
      var handle = card.dataset.productHandle;
      popupMessage.textContent = 'Loading...';
      fetchProduct(handle)
        .then(renderPopup)
        .catch(function () {
          popupMessage.textContent = 'Error loading product';
        });
    });
  });
});
