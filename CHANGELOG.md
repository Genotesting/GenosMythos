# Changelog

### HTML

#### Added
- **Added — Social & SEO meta tags:** `description`, Open Graph (`og:*`) and Twitter card tags to improve link previews and search snippets.
- **Added — Loading container:** a dedicated `#loading` element with a spinner and loading text to surface load progress to users.
- **Added — Sidebar toggle control:** a button to toggle sidebar visibility for smaller screens / responsive navigation.
- **Added — Site logo placeholder:** an `<img>` element for branding/identity.
- **Added — Theme toggle control:** a button to toggle light/dark theme (UI control for theme switching).
- **Added — Message/status region:** a runtime status area for user-visible messages and notifications.
- **Added — Load-more container:** a placeholder for progressive content loading / pagination UI.
- **Added — Entry favorites container:** a placeholder container for favorite/like functionality in the entry view.
- **Added — Report Issue link:** footer link to the project’s GitHub issues for bug reports and feedback.
- **Added — `<noscript>` fallback:** a visible warning for users who have JavaScript disabled.
- **Added — Script fallback loader:** an inline script that loads a local `marked` copy if the CDN version isn’t present.

#### Changed
- **Changed — Document semantics & landmarks:** introduced explicit main/region/article landmarks and more meaningful structure to improve accessibility and screen-reader navigation.
- **Changed — List & entry semantics:** entry list and entry views updated with clearer semantic roles (e.g., role=list, role=article/region) and improved focusability (`tabindex`) for keyboard users.
- **Changed — Navigation structure:** back/navigation controls consolidated into view-specific headers to make view transitions clearer.
- **Changed — Accessibility enhancements:** broader use of ARIA attributes and attributes like `aria-live`, `aria-label`, `aria-hidden`, `aria-pressed`, and `aria-expanded` to improve assistive tech behavior.
- **Changed — Script loading strategy:** switched from a single external script expectation to CDN-first with a timed local fallback injection to improve resilience.

### CSS

#### Added
- **Added — Expanded design tokens:** introduced a richer set of CSS variables for colors, borders, shadows and interaction states (`--bg-alt`, `--border`, `--overlay`, `--shadow`, `--focus`, `--fav`, `--transition-speed`, etc.) to centralize theme control and make theming easier.
- **Added — Light theme variables:** a `[data-theme="light"]` block that flips the core tokens (background, card, text, muted, accent, focus, fav) for an alternate/light appearance.
- **Added — Smooth transitions:** transitions applied to background, color, border-color and other key properties (via `--transition-speed`) to make theme and UI state changes feel polished.
- **Added — Visual affordances & motion:** entry cards now have elevation/hover lift and subtle transforms (`box-shadow`, `transform`) for tactile feedback; hover/focus states are animated.
- **Added — Focus & accessibility helpers:** `:focus-visible` and refined `:focus` rules, larger focus outlines (`--focus`) and `#alphabet` / `#tag-list` focus styles to improve keyboard navigation and screen reader usability.
- **Added — Favorite UI styles:** `.fav-button` with a pressed state that uses the `--fav` color and decorative border/background treatment for saved/favorited entries.
- **Added — Loading UI & spinner:** centered `.loading` container with overlay, spinner animation (`@keyframes spin`) and `loading[aria-hidden="true"]` toggling to surface page-loading state.
- **Added — Message styling & load-more UI:** `.message` styling for runtime status plus `.load-more-container` and `.load-more-button` to support progressive loading/pagination.
- **Added — Tag interaction styles:** `.tag[aria-pressed="true"]` state, improved tag sizing/padding and touch-friendly tag elements.
- **Added — Responsive sidebar behavior:** media query for mobile that hides the sidebar by default, shows `.sidebar-toggle`, and provides an `.sidebar.active` state for off-canvas behavior.
- **Added — Scroll & overflow controls:** explicit `min-height:0` and `overflow` rules for `.main`, `.sidebar`, `.content` to eliminate layout/scroll-jank; scrollable `#tag-list` and `#alphabet` with improved max-heights.
- **Added — Custom scrollbar styling:** thumb styling for `.sidebar`, `.content`, `#tag-list`, and `#alphabet` for a consistent, subtle UX.
- **Added — Utility & helper classes:** `.visually-hidden` for assistive content and `.entry-header` for consistent header layout inside views.

#### Changed
- **Changed — Centralized hardcoded values to tokens:** many direct `rgba(...)`/color uses were replaced by `--border`, `--overlay`, `--shadow`, etc., making further theme tweaks simpler and consistent across components.
- **Changed — Color and contrast adjustments:** muted and border colors updated for slightly different contrast in both dark and light themes to improve legibility.
- **Changed — Layout & spacing refinements:** header and control paddings adjusted; `.site-logo` constrained; grid and card spacing kept but card sizing and positioning refined for better visual balance.
- **Changed — Semantic/interactive styling:** inputs, selects and theme-toggle gained transition and pressed states; entries and article areas added role-aligned visual treatments (focusable articles, clearer back-button appearance).
- **Changed — Code/inline code background:** code block/inline code subtle background adjusted to match the new tokenized color palette.

#### Removed / Replaced
- **Replaced — Scattered rgba values with variables:** old inline `rgba(255,255,255,0.03)` style values were consolidated into `--border`, `--overlay`, etc., reducing duplicated magic numbers across the stylesheet.
- **Removed — No functional removals detected.** Changes focus on additions and refactors rather than deleting existing features.

### JavaScript

#### Added
- **Added — Favorites system:** persistent favorites stored in `localStorage` (`FAVORITES_KEY`) with `toggleFavorite()`, `loadFavorites()`, `saveFavorites()`, and favorite UI (`.fav-button`), including keyboard and ARIA accessibility support.
- **Added — Pagination / Load More:** incremental rendering with `PAGE_SIZE`, `visibleCount`, and `renderLoadMore()` for entries, preventing UI overload on large datasets.
- **Added — Loading & messages:** `showLoading()` and `showMessage()` to communicate data fetch states and errors in a more user-friendly way, including timeout handling for fetch.
- **Added — Theme toggle persistence:** `applySavedTheme()` and `toggleTheme()` functions persist user-selected theme (`light` or default dark) in `localStorage` and update ARIA attributes for accessibility.
- **Added — Sidebar toggle & responsive handling:** mobile sidebar toggle button with `aria-expanded` attribute; improves small-screen navigation.
- **Added — Sanitization:** `sanitizeHtml()` ensures loaded HTML (from entries or About markdown) is safe, removing scripts, styles, `on*` attributes, and unsafe `javascript:` URLs.
- **Added — Enhanced keyboard support:** all interactive buttons (alphabet, tags, favorites) respond to `Enter`/`Space` keys; list items respond to keyboard selection.
- **Added — Favorites filter button in tag list:** special 'Favorites' tag that toggles `filterToFavorites` state for filtering entries without interfering with other tag searches.
- **Added — Focus management:** automatically focuses content containers (`#entry-content`, `#about-content`) for accessibility when changing views.
- **Added — Star SVG icon for favorites:** consistent vector icon used in favorite buttons, enhancing visual clarity.
- **Added — Load More button ARIA & labeling:** indicates current number of displayed items vs total; updates dynamically with filtering.

#### Changed
- **Changed — renderList logic:** now prioritizes favorites at the top unless filtering exclusively for favorites; combines search, category, tag, and favorite filters.
- **Changed — Tag list handling:** now supports string or array tags, clears previously pressed states, adds ARIA `aria-pressed` management, and maintains keyboard operability.
- **Changed — Entry rendering:** entries now render sanitized HTML and include a favorite button directly in the card; ensures safe interaction and consistent UI.
- **Changed — About markdown handling:** sanitized HTML output, focusable container, and improved inline link behavior (`target="_blank" rel="noopener noreferrer"`).
- **Changed — Error handling:** improved error display for fetch failures, including timeout detection and clear message presentation using `showMessage`.
- **Changed — Keyboard accessibility:** list items respond to keyboard events; clickable areas properly distinguish between links, buttons, and the card itself.
- **Changed — Inline formatting (`inlineFmt`) updated:** markdown links open safely in a new tab, inline code and styling remain consistent with HTML sanitization.

#### Removed / Replaced
- **Replaced — Unsafe direct innerHTML usage:** all dynamic content now sanitized via `sanitizeHtml()` before insertion.
- **Replaced — Old favorites-free rendering:** list rendering now fully integrates favorites, with consistent sorting and filtering.
- **Removed — Deprecated event shortcuts:** removed some inline handlers; replaced with properly bound `keydown` handlers for accessibility and semantic correctness.

# End of first Changelog.
## Thank you so much for taking your time and reading this!
