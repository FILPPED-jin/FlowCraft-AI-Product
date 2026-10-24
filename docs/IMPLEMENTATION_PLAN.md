# FlowCraft AI Implementation Plan

## Stage 0 Audit

FlowCraft AI v1.0 is built as a product layer on top of `screenshot-to-code`.
The current system can already accept a reference image, video, URL screenshot,
or text prompt, send the request through the existing generation pipeline, and
render the generated result in the preview pane.

### Current Architecture

- `frontend/`: React + Vite app. It owns upload, URL, text, import, preview,
  settings, local project history, and FlowCraft-specific controls.
- `backend/`: FastAPI backend. It exposes screenshot capture and WebSocket code
  generation endpoints.
- `backend/routes/generate_code.py`: Main screenshot-to-code generation route.
  FlowCraft currently reuses this instead of creating a separate AI pipeline.
- `backend/llm.py` and `backend/config.py`: Model/provider configuration,
  including the current DeepSeek OpenAI-compatible path.
- `frontend/src/components/unified-input/`: Main creation entry points.
- `frontend/src/components/preview/`: Generated prototype rendering and editing
  experience.
- `frontend/src/lib/flowcraft-storage.ts`: Local project storage for generated
  FlowCraft outputs.
- `frontend/src/lib/flowcraft-runtime.ts` and `flowcraft-demo.ts`: Runtime
  helpers that make generated prototypes more interactive when needed.

### Implemented in v1.0

- Screenshot upload and pasted screenshot upload.
- URL screenshot capture through the existing backend screenshot endpoint.
- Text-to-prototype generation.
- DeepSeek API key support for lower-cost generation.
- Preview pane for generated code.
- FlowCraft diagnosis panel that explains goals, missing states, tradeoffs, and
  the next priority.
- Local project saving in the browser so users can recover generated results.
- A first interactive fallback/enhancement layer for generated prototypes.

### Reusable Modules

- Reuse `UploadTab`, `UrlTab`, and `TextTab` as creation entry points.
- Reuse the WebSocket generation flow in `generate_code.py`.
- Reuse the preview iframe and version display in the existing frontend.
- Reuse `flowcraft-storage.ts` for the first version of project persistence.
- Reuse the existing settings model, stack selection, and design-system
  selectors.
- Reuse the DeepSeek/OpenAI-compatible backend model adapter.

### Modules to Add Later

- A structured interaction-plan schema and validator before code generation.
- A dedicated FlowCraft design-plan service that can generate and edit the plan
  before producing code.
- Version comparison and rollback UI.
- Export packaging for generated HTML/CSS/React projects.
- Stronger diagnosis rules based on generated code states rather than prompt
  metadata alone.
- A clearer GitHub-facing repository layout once product direction stabilizes.

### Prototype Quality Guard

The first real DeepSeek run showed that a model can return a large HTML file
while the initial JavaScript render still fails. FlowCraft therefore needs a
quality guard between "model returned code" and "user can rely on the result."

Current guardrails:

- FlowCraft prompts now say the reference screenshot is visual language, not a
  pixel-level clone target.
- FlowCraft prompts require useful first-viewport content on mobile and desktop.
- FlowCraft prompts require dynamic JavaScript seed data to define every field
  that render functions read.
- `scripts/validate-flowcraft-html.mjs` can smoke-test generated standalone HTML
  by executing inline scripts in a minimal DOM mock and checking that the main
  app container renders meaningful content with a primary action.

Later guardrails:

- Run generated HTML in a real browser sandbox and capture desktop/mobile
  screenshots.
- Automatically ask the model for a repair pass when the generated prototype
  fails validation.
- Feed validation failures into the diagnosis panel rather than showing them as
  successful prototype output.

### External Service Needs

- DeepSeek API key is required for the current lower-cost generation path.
- ScreenshotOne API key is optional and only needed for URL capture.
- No additional paid service is required for Stage 1.

## Stage 1 Scope

Stage 1 adds the first FlowCraft-specific creation wizard while preserving the
current screenshot-to-code pipeline.

The target flow is:

1. Upload or paste a screenshot.
2. Choose a scene template.
3. Choose an interaction strategy.
4. Define the core user task and required details.
5. Generate through the existing backend.

### Stage 1 Implementation

- `frontend/src/lib/flowcraft.ts`
  - Adds `FlowProject`, `FlowCraftScenario`, and `FlowCraftStrategy` types.
  - Adds P0 scene templates: learning, ecommerce, and financial service.
  - Adds strategy templates: efficiency, safety, and delight.
  - Converts wizard input into a structured `FlowProject` object.
  - Keeps compatibility aliases for the older preference naming.

- `frontend/src/components/flowcraft/FlowCraftControls.tsx`
  - Upgrades the old scenario/preference controls into a creation brief.
  - Adds core task, required details, optional screenshot notes, and
    FlowProject preview.
  - Keeps the component compatible with older preference props.

- `frontend/src/components/unified-input/tabs/UploadTab.tsx`
  - Sends screenshot count/type, scene, strategy, core task, requirements, and
    visual notes into the generation prompt.
  - Keeps existing upload, paste, multi-screenshot, video, and asset extraction
    behavior.

- `frontend/src/components/unified-input/tabs/UrlTab.tsx`
  - Adds the same FlowProject context to URL capture generation.

- `frontend/src/components/unified-input/tabs/TextTab.tsx`
  - Adds the same FlowProject context to text-only generation.

## Next Planned Stage

Stage 2 should introduce a structured interaction plan before generation:

- AI produces a plan with screens, states, actions, fallback states, and
  rationale.
- User can confirm or edit the plan.
- Code generation consumes the confirmed plan.
- The diagnosis panel reads from the plan instead of relying mostly on prompt
  metadata.
- Generated output should then pass the prototype quality guard before being
  treated as a valid version.
