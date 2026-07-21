document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-gg-grid]');
  var modal = document.getElementById('gg-quickview');
  var modalOverlay = modal.querySelector('[data-gg-close]');
  var modalClose = modal.querySelector('.gg-modal__close');
  var modalTitle = modal.querySelector('.gg-modal__title');
  var modalImage = modal.querySelector('.gg-modal__image');
  var modalPrice = modal.querySelector('.gg-modal__price');
  var modalDescription = modal.querySelector('.gg-modal__description');
  var modalOptions = modal.querySelector('[data-gg-options]');
  var addButton = modal.querySelector('[data-gg-add-to-cart]');
  var noticeText = modal.querySelector('[data-gg-notice]');
  var currentProduct = null;
  var currentVariant = null;
  var selectedOptions = {};
  var bonusProduct = null;
  var bonusProductHandle = 'soft-winter-jacket';

  function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    document.body.style.overflow = '';
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

  function closeModal() {
    modal.classList.remove('gg-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    modalOptions.innerHTML = '';
    noticeText.textContent = '';
    addButton.disabled = true;
    currentProduct = null;
    currentVariant = null;
    selectedOptions = {};
  }

  function openModal() {
    modal.classList.add('gg-modal--open');
    modal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
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

  function getMatchingVariant(product, optionSelections) {
    return product.variants.find(function (variant) {
      return variant.options.every(function (value, index) {
        var optionName = product.options[index];
        return String(optionSelections[optionName] || '').trim() === String(value).trim();
      });
    });
  }

  function updateModalFields(product, variant) {
    modalTitle.textContent = product.title;
    modalPrice.textContent = formatMoney(variant.price, grid.dataset.ggCurrency || 'USD');
    modalDescription.textContent = product.description ? product.description.replace(/<[^>]+>/g, '').trim() : '';
    modalImage.src = product.featured_image ? product.featured_image.src : product.images[0] || '';
    modalImage.alt = product.title;
    currentVariant = variant;
    addButton.disabled = !variant || !variant.available;
    addButton.textContent = variant && variant.available ? 'ADD TO CART →' : 'SOLD OUT';
  }

  function markSelectedValues() {
    modalOptions.querySelectorAll('[data-gg-option-button]').forEach(function (button) {
      var option = button.dataset.ggOptionName;
      var value = button.dataset.ggOptionValue;
      if (selectedOptions[option] === value) {
        button.classList.add('is-selected');
      } else {
        button.classList.remove('is-selected');
      }
    });
    modalOptions.querySelectorAll('select[data-gg-option-name]').forEach(function (select) {
      var option = select.dataset.ggOptionName;
      select.value = selectedOptions[option] || '';
    });
  }

  function renderOptionFields(product) {
    selectedOptions = {};
    modalOptions.innerHTML = '';

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
      modalOptions.appendChild(fieldset);
    });

    currentVariant = getMatchingVariant(product, selectedOptions) || product.variants[0];
    updateModalFields(product, currentVariant);
    markSelectedValues();
  }

  function fetchBonusProduct() {
    if (bonusProduct) {
      return Promise.resolve(bonusProduct);
    }
    return fetch('/products/' + bonusProductHandle + '.js')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Bonus product not found');
        }
        return response.json();
      })
      .then(function (product) {
        bonusProduct = product;
        return bonusProduct;
      });
  }

  function addToCart(variantIds) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: variantIds })
    }).then(function (response) {
      if (!response.ok) {
        return response.json().then(function (errorData) {
          throw new Error(errorData.description || 'Unable to add to cart');
        });
      }
      return response.json();
    });
  }

  function handleAddToCart() {
    if (!currentVariant || !currentVariant.available) {
      noticeText.textContent = 'Please select a valid variant.';
      return;
    }

    var items = [{ id: currentVariant.id, quantity: 1 }];
    var colorMatch = String(selectedOptions.Color || selectedOptions.color || '').toLowerCase();
    var sizeMatch = String(selectedOptions.Size || selectedOptions.size || '').toLowerCase();

    if (colorMatch === 'black' && sizeMatch === 'medium') {
      fetchBonusProduct().then(function (bonus) {
        var bonusVariant = bonus.variants.find(function (variant) {
          return variant.available;
        });
        if (bonusVariant) {
          items.push({ id: bonusVariant.id, quantity: 1 });
        }
        return addToCart(items);
      }).then(function (cart) {
        noticeText.textContent = 'Soft Winter Jacket added automatically.';
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
      }).catch(function (error) {
        noticeText.textContent = error.message;
      });
    } else {
      addToCart(items).then(function (cart) {
        noticeText.textContent = 'Product added to cart.';
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
      }).catch(function (error) {
        noticeText.textContent = error.message;
      });
    }
  }

  function handleCardClick(event) {
    var button = event.currentTarget;
    var handle = button.dataset.ggProductHandle;
    if (!handle) return;

    fetch('/products/' + handle + '.js')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Product not found');
        }
        return response.json();
      })
      .then(function (product) {
        currentProduct = product;
        renderOptionFields(product);
        openModal();
      })
      .catch(function (error) {
        noticeText.textContent = error.message;
        openModal();
      });
  }

  if (grid) {
    grid.querySelectorAll('.gg-grid__card').forEach(function (card) {
      card.addEventListener('click', handleCardClick);
    });
  }

  [modalOverlay, modalClose].forEach(function (element) {
    element.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('gg-modal--open')) {
      closeModal();
    }
  });

  addButton.addEventListener('click', handleAddToCart);

  var hamburger = document.querySelector('.gg-banner__hamburger');
  var mobileMenu = document.getElementById('gg-mobile-menu');
  var mobileClose = document.querySelector('.gg-banner__mobile-close');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!expanded));
      mobileMenu.setAttribute('aria-hidden', expanded ? 'true' : 'false');
      mobileMenu.classList.toggle('gg-banner__mobile-menu--open');
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener('click', function () {
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
      mobileMenu.classList.remove('gg-banner__mobile-menu--open');
    });
  }
});