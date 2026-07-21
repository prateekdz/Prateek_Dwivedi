/**
 * Gift Guide Modal and Cart Management
 * Handles product selection, variant rendering, and add-to-cart functionality
 * with bonus product auto-add for specific variant combinations
 */

class GiftGuideModal {
  constructor() {
    // Get required elements
    this.gridSection = document.querySelector('[data-gg-grid]');
    this.modal = document.getElementById('gg-quickview');
    
    // Validate elements exist
    if (!this.gridSection || !this.modal) {
      console.error('Gift Guide: Required elements not found');
      return;
    }

    // Cache modal elements
    this.modalOverlay = this.modal.querySelector('[data-gg-close]');
    this.modalClose = this.modal.querySelector('.gg-modal__close');
    this.modalImage = this.modal.querySelector('.gg-modal__image');
    this.modalTitle = this.modal.querySelector('.gg-modal__title');
    this.modalPrice = this.modal.querySelector('.gg-modal__price');
    this.modalDescription = this.modal.querySelector('.gg-modal__description');
    this.modalOptions = this.modal.querySelector('[data-gg-options]');
    this.modalNotice = this.modal.querySelector('[data-gg-notice]');
    this.addToCartBtn = this.modal.querySelector('[data-gg-add-to-cart]');

    // State variables
    this.currentProduct = null;
    this.currentVariant = null;
    this.selectedOptions = {};
    this.autoAddProductHandle = 'soft-winter-jacket';

    // Initialize
    this.init();
  }

  /**
   * Initialize event listeners
   */
  init() {
    console.log('GiftGuideModal initializing...');
    
    // Product card clicks
    const productCards = this.gridSection.querySelectorAll('.gg-grid__card[data-product-handle]');
    console.log(`Found ${productCards.length} product cards`);
    
    productCards.forEach(card => {
      card.addEventListener('click', () => this.handleCardClick(card));
    });

    // Modal close handlers
    this.modalOverlay.addEventListener('click', () => this.closeModal());
    this.modalClose.addEventListener('click', () => this.closeModal());
    this.addToCartBtn.addEventListener('click', () => this.handleAddToCart());

    // Keyboard handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    });
    
    console.log('GiftGuideModal initialized successfully');
  }

  /**
   * Check if modal is currently open
   */
  isModalOpen() {
    return !this.modal.classList.contains('gg-modal--closed');
  }

  /**
   * Open modal and set focus
   */
  openModal() {
    this.modal.classList.remove('gg-modal--closed');
    this.modal.setAttribute('aria-hidden', 'false');
    this.modal.focus();
  }

  /**
   * Close modal and reset state
   */
  closeModal() {
    this.modal.classList.add('gg-modal--closed');
    this.modal.setAttribute('aria-hidden', 'true');
    this.clearNotice();
    this.currentProduct = null;
    this.currentVariant = null;
    this.selectedOptions = {};
    this.modalOptions.innerHTML = '';
  }

  /**
   * Fetch product data from Shopify
   */
  async fetchProduct(handle) {
    try {
      const response = await fetch(`/products/${handle}.js`);
      if (!response.ok) throw new Error('Product not found');
      return await response.json();
    } catch (error) {
      this.showNotice('Unable to load product details.');
      throw error;
    }
  }

  /**
   * Handle product card click
   */
  async handleCardClick(card) {
    const handle = card.dataset.productHandle;
    try {
      const product = await this.fetchProduct(handle);
      this.currentProduct = product;
      this.currentVariant = product.variants[0];
      this.selectedOptions = {};
      this.renderOptions(product);
      this.openModal();
    } catch (error) {
      console.error('Error loading product:', error);
    }
  }

  /**
   * Render variant options dynamically based on product
   */
  renderOptions(product) {
    this.selectedOptions = {};
    this.modalOptions.innerHTML = '';

    product.options.forEach((optionName, index) => {
      // Get unique values for this option
      const optionValues = [...new Set(product.variants.map(v => v.options[index]))];

      const fieldset = document.createElement('fieldset');
      fieldset.className = 'gg-modal__option';

      const legend = document.createElement('legend');
      legend.textContent = optionName;
      fieldset.appendChild(legend);

      // Render color options as buttons
      if (optionName.toLowerCase().includes('color')) {
        const container = document.createElement('div');
        container.className = 'gg-modal__option-row';

        optionValues.forEach(value => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'gg-modal__option-button';
          button.textContent = value;
          button.addEventListener('click', () => this.selectOption(optionName, value));
          container.appendChild(button);
        });

        fieldset.appendChild(container);
      }
      // Render other options (size, etc.) as dropdown
      else {
        const select = document.createElement('select');
        select.className = 'gg-modal__option-select';
        select.innerHTML = `<option value="">Choose your ${optionName.toLowerCase()}</option>`;

        optionValues.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        });

        select.addEventListener('change', () => {
          this.selectOption(optionName, select.value);
        });

        fieldset.appendChild(select);
      }

      this.modalOptions.appendChild(fieldset);
      // Set default selection
      this.selectedOptions[optionName] = optionValues[0] || '';
    });

    // Update with initial variant
    this.currentVariant = this.getMatchingVariant(product, this.selectedOptions) || product.variants[0];
    this.updateModalDisplay(product, this.currentVariant);
    this.markSelectedOptions();
  }

  /**
   * Find variant matching current selections
   */
  getMatchingVariant(product, optionSelections) {
    return product.variants.find(variant => {
      return variant.options.every((value, index) => {
        const optionName = product.options[index];
        return String(optionSelections[optionName] || '').trim() === String(value).trim();
      });
    });
  }

  /**
   * Update selected option and find matching variant
   */
  selectOption(optionName, value) {
    this.selectedOptions[optionName] = value;
    this.currentVariant = this.getMatchingVariant(this.currentProduct, this.selectedOptions) || this.currentVariant;
    this.updateModalDisplay(this.currentProduct, this.currentVariant);
    this.markSelectedOptions();
  }

  /**
   * Mark visually selected options in UI
   */
  markSelectedOptions() {
    const optionSets = this.modalOptions.querySelectorAll('.gg-modal__option');
    optionSets.forEach(fieldset => {
      const legend = fieldset.querySelector('legend');
      const optionName = legend.textContent;
      const selectedValue = this.selectedOptions[optionName];

      // Mark button selections
      fieldset.querySelectorAll('.gg-modal__option-button').forEach(button => {
        if (button.textContent === selectedValue) {
          button.classList.add('is-selected');
        } else {
          button.classList.remove('is-selected');
        }
      });

      // Mark select value
      const select = fieldset.querySelector('select');
      if (select) {
        select.value = selectedValue || '';
      }
    });
  }

  /**
   * Update modal display with product/variant info
   */
  updateModalDisplay(product, variant) {
    if (!variant) return;

    this.modalTitle.textContent = product.title;
    this.modalPrice.textContent = this.formatPrice(variant.price);
    this.modalDescription.textContent = product.description || '';
    this.modalImage.src = product.featured_image?.src || '';
    this.modalImage.alt = product.title;
    this.addToCartBtn.disabled = !variant.available;

    this.clearNotice();
  }

  /**
   * Format price with currency
   */
  formatPrice(amount) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount / 100);
    } catch {
      return `€${(amount / 100).toFixed(0)}`;
    }
  }

  /**
   * Add item to cart via Shopify API
   */
  async addItemToCart(variantId, quantity = 1) {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ id: variantId, quantity })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.description || 'Unable to add to cart');
    }

    return await response.json();
  }

  /**
   * Check if we should auto-add bonus product
   * Adds "Soft Winter Jacket" when product has Color: Black AND Size: Medium
   */
  async maybeAddBonusProduct() {
    if (!this.currentProduct || !this.selectedOptions) {
      return;
    }

    const color = String(this.selectedOptions.Color || this.selectedOptions.color || '').trim().toLowerCase();
    const size = String(this.selectedOptions.Size || this.selectedOptions.size || '').trim().toLowerCase();

    // Trigger bonus product add only for Black + Medium combination
    if (color === 'black' && size === 'medium') {
      try {
        const product = await this.fetchProduct(this.autoAddProductHandle);
        const variant = product.variants.find(v => v.available);
        if (variant) {
          await this.addItemToCart(variant.id, 1);
        }
      } catch (error) {
        // Silently fail if bonus product can't be added
        console.log('Bonus product auto-add failed:', error);
      }
    }
  }

  /**
   * Handle add to cart button click
   */
  async handleAddToCart() {
    if (!this.currentVariant) {
      this.showNotice('Please select valid options.');
      return;
    }

    this.addToCartBtn.disabled = true;
    this.showNotice('Adding to cart…');

    try {
      await this.addItemToCart(this.currentVariant.id, 1);
      await this.maybeAddBonusProduct();
      this.showNotice('Product added to cart.');

      // Close modal after successful add
      setTimeout(() => this.closeModal(), 800);
    } catch (error) {
      this.showNotice(error.message || 'Could not add to cart.');
      this.addToCartBtn.disabled = false;
    }
  }

  /**
   * Show notice message
   */
  showNotice(message) {
    this.modalNotice.textContent = message;
  }

  /**
   * Clear notice message
   */
  clearNotice() {
    this.modalNotice.textContent = '';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const modal = new GiftGuideModal();
});

