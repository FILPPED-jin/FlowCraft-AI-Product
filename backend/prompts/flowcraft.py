FLOWCRAFT_MARKERS = (
    "You are FlowCraft AI",
    "FlowProject",
    "Scenario template:",
    "Interaction strategy",
)


def is_flowcraft_prompt(text_prompt: str) -> bool:
    return any(marker in text_prompt for marker in FLOWCRAFT_MARKERS)


def build_flowcraft_image_reference_prompt(
    selected_stack: str,
    design_system_block: str,
    image_policy: str,
) -> str:
    return f"""
Generate code for an interactive product prototype inspired by the provided reference screenshot(s).

{selected_stack}
{design_system_block}

## FlowCraft reference policy

- Authority order is mandatory: Core task > Additional requirements > screenshot visual/layout evidence > scenario template suggestions.
- When sources conflict, obey the higher-priority source. Never force template-specific products, pages, entities, labels, CTAs, data models, or states into a user-defined task.
- Do not recreate the screenshot as an exact clone and do not copy it pixel-for-pixel.
- Treat the screenshot as layout structure plus visual language. Extract its page regions, block proportions, surface hierarchy, color direction, spacing rhythm, component shapes, button style, typography feel, density, and interaction affordances.
- Treat Core task and Additional requirements as the source of domain content: labels, entities, CTA text, state model, task flow, validation, and success/failure logic must come from the user brief. The scenario template fills only genuine omissions.
- Recompose the screenshot's layout skeleton and visual cues around the core task and requirements from the additional instructions. The selected scene and strategy are secondary guidance.
- First identify the screenshot's dominant layout pattern, such as sidebar + content + utility panel, feed + detail pane, dashboard grid, chat workspace, checkout form, or media player shell.
- Preserve useful layout logic when it supports the user-defined task. Replace the domain content, labels, state model, and task flow with the Core task and Additional requirements.
- Do not collapse a rich reference into a generic template. If the screenshot has a dark immersive app shell, multi-panel structure, sticky action bar, strong card rhythm, or prominent utility rail, translate those cues into the new prototype instead of switching to an unrelated clean beige page.
- Preserve the reference's major visible regions and convert their roles. If the reference has top navigation, left library/sidebar, central hero/content panel, right promo/detail panel, and a bottom action bar, keep a comparable composition, spacing density, panel proportions, and palette relationship while changing the text, products, CTAs, and interactions to the chosen scenario.
- For hero + central generator references, keep the hero/panel/card layout but remap the generator semantics. In ecommerce: generator tabs become Product / Cart / Checkout, prompt fields become product options or checkout fields, Create buttons become Add to cart / Proceed to checkout / Pay now, and trending media cards become products, bundles, reviews, or trust cards.
- Keep the reference's dominant background/surface contrast and accent relationships unless they conflict with readability. Do not introduce an unrelated palette. For example, a black/dark-gray interface with bright green or blue accents should remain a dark, high-contrast interface with similar accent energy.
- Do not output a sparse two-card layout when the reference has a rich multi-panel layout. Do not output oversized empty areas, placeholder emoji product art, or generic centered cards unless the reference itself uses that structure.
- It is acceptable and expected to change screen structure, content, labels, navigation, and states when the Core task or Required details call for it.
- Preserve only the useful design language from the reference; avoid copying brand-specific, private, or irrelevant details unless the user explicitly requests them.
- Do not preserve source-domain words from the screenshot when they conflict with the user brief. Do not inject ecommerce, learning, or finance terminology solely because a scenario template is selected.
- Build a functional prototype with meaningful state changes, not a static visual replica.
- Make the first viewport useful on both mobile and desktop: the hero title, primary action, and first meaningful content must be visible without relying on a large empty background area.
- Before finishing, mentally validate the generated code path: every object field referenced by JavaScript must exist in the seed data, every render function must be reachable, and initial rendering must not depend on a user click.
- If the prototype uses dynamic JavaScript rendering, include defensive defaults for optional fields and avoid reading nested properties such as product.variants.Personal unless the data definitely defines them.
- Include enough inline state data to exercise the required states from the FlowCraft brief, including at least one success path and one failure or recovery path.
- Keep the output complete and bounded. Prefer a smaller, fully working prototype over a long decorative page that risks being cut off.
- If the selected provider cannot reliably use external dependencies, write plain HTML, inline CSS, and vanilla JavaScript instead of relying on Tailwind CDN or remote assets.
- Use the following template patterns only when the user brief leaves the corresponding product flow unspecified:
  - Ecommerce should feel like product discovery, product detail, cart review, checkout, payment recovery, and order confirmation. If the reference is a media/dashboard/social/productivity app, translate its shell into ecommerce: navigation becomes category browsing, the main stage becomes featured product or collection detail, side panels become cart/recommendations/trust modules, and bottom controls become sticky cart or checkout controls.
    For a Spotify-like reference, preserve the dark app shell, left navigation/library panel, central large hero/collection panel, right promotion or cart panel, and bottom sticky action bar. Convert them into ecommerce: left category/account navigation, center featured product or collection with product rows, right cart/recommendation/trust panel, bottom checkout or cart control strip.
    For a Creati-style hero generator reference, preserve the full-bleed hero, top nav, large rounded glass control panel, mode tabs, primary CTA, and trending card rhythm. Convert them into ecommerce: brand/category nav, featured product or collection hero, Product/Cart/Checkout tabs, variant and quantity controls, Add to cart / Pay now CTA, and recommended product or trust cards.
  - Learning should feel like course overview, guided trial lesson, progress, prerequisite checks, enrollment, and resume/retry.
  - Finance should feel like goal intake, risk validation, review-before-submit, consent, and confirmation receipt.
- For ecommerce, do not default to a generic beige boutique product page unless the uploaded reference strongly indicates that visual direction.
- Before returning code, run a semantic audit: source brand and irrelevant source business terms should be gone; user-requested CTAs and states should be visible; each large reference block should be mapped to the user-defined flow rather than copied as source content.
- When available, use extract_assets only for discrete useful assets such as icons, logos, illustrations, or product imagery. Do not use extracted assets to embed the entire screenshot as the page layout.
- When available, use generate_images or edit_images only for supporting assets that fit the new prototype.
- {image_policy}

## Multiple screenshots

If multiple screenshots are provided, use them as a reference set:

- Derive a shared visual language across the screenshots.
- If they represent different steps, translate them into a coherent interactive flow.
- If they are unrelated, ask the FlowCraft brief to decide which reference cues are most relevant instead of making separate screenshot clones.
- For mobile screenshots, do not include device frames or browser chrome; focus on the UI language.
"""
