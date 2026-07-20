# Gift Guide Page Implementation

This repository includes a custom Shopify page implementation for the Ecomexperts hiring test.

## What was built
- `templates/page.gift-guide.json` — custom page template for the gift guide page
- `sections/gift-guide-banner.liquid` — editable banner section with custom text controls
- `sections/gift-guide-grid.liquid` — product grid section with six selectable product blocks and popup behavior
- `assets/gift-guide.css` — styles for the banner, grid, popup, and mobile layout
- `assets/gift-guide.js` — vanilla JavaScript for product loading, popup interaction, variant selection, and Add to Cart

## Key behaviors
- Banner text is fully editable through the Shopify theme customizer
- Grid supports six products selected from the section settings
- Product popup displays name, price, description, image, and variant controls dynamically
- Add to Cart uses Shopify AJAX API and is functional without jQuery
- If a selected variant contains both `Black` and `Medium`, the configured `Soft Winter Jacket` product is also added to the cart automatically
- Responsive mobile view is implemented

## Usage
1. Create a new page in Shopify admin
2. Assign the `gift-guide` page template
3. Add the `Gift Guide Banner` and `Gift Guide Grid` sections
4. Select six products in the grid section
5. Set the `Soft Winter Jacket` product under the grid settings if needed

## Notes
- This implementation uses only vanilla JavaScript and custom section code.
- A public GitHub repository was not created from this environment.
- Store connection and live theme publishing cannot be completed from this local environment.
