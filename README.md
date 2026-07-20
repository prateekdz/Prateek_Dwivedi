# Shopify Gift Guide Theme Extension

This theme export implements a custom Shopify gift guide homepage and supporting sections on top of the Horizon theme.

## Custom functionality
- `templates/index.json` — homepage template with a custom navbar section, a gift guide hero banner, and a 6-product quick-view grid
- `templates/page.gift-guide.json` — gift guide page template with a banner and product grid
- `sections/header.liquid` — simplified custom navbar section for the gift guide homepage
- `sections/gift-guide-banner.liquid` — editable hero section with headline, copy, CTA, illustration, and ticker
- `sections/gift-guide-grid.liquid` — product grid section with quick-view popup and Add to Cart behavior
- `assets/gift-guide.css` — isolated styles for the gift guide sections and popup
- `assets/gift-guide.js` — vanilla JavaScript for quick-view interactions, variant selection, cart add behavior, and auto-add logic

## Key behaviors
- Homepage includes a simple custom navbar above the hero content
- The gift guide banner supports editable text and optional illustration uploads
- The grid shows six product cards that open a quick-view popup
- Variant selection adapts to option count with buttons or dropdowns
- Add to Cart uses Shopify AJAX `/cart/add.js`
- When the chosen variant includes both `Black` and `Medium`, the configured `Soft Winter Jacket` product is added automatically
- The popup now traps focus and restores focus on close for better accessibility

## Installation / Usage
1. Upload this theme to Shopify or use Shopify CLI to preview locally
2. Set `templates/index.json` as the homepage template, or assign `page.gift-guide.json` to a page
3. Add the `Navbar`, `Gift Guide Banner`, and `Gift Guide Grid` sections to the appropriate template
4. Select six products in the `Gift Guide Grid` blocks
5. Set the optional `Soft Winter Jacket` product under the grid settings for auto-add behavior

## Notes
- This is a Shopify theme export and is intended to run inside a Shopify storefront environment
- No additional build tooling is required for the theme assets in this repo
- The project has been cleaned for maintainability and accessibility without changing existing business logic
