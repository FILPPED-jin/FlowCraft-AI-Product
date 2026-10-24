# FlowCraft AI Version Notes

## V0.1 Runnable Prototype

This checkpoint preserves the first FlowCraft AI version that can run end to
end from a screenshot reference to a generated interactive prototype.

### Included

- Screenshot upload, paste upload, URL, text, and code import entry points.
- FlowCraft scenario and optimization controls before generation.
- DeepSeek API support through an OpenAI-compatible backend path.
- One-variant DeepSeek generation to avoid parallel paid calls in V1.
- FlowCraft diagnosis panel with goals, missing states, tradeoff, next priority,
  and an interaction state map.
- Local project library using browser storage for generated prototypes.
- Last-result recovery after WebSocket disconnects or interrupted sessions.
- Prototype interaction runtime that adds basic selection, toggle, input,
  loading, and toast feedback to generated HTML.

### Known Limits

- Project storage is local to the browser, not account-based cloud storage.
- The UI shell still inherits much of the original screenshot-to-code layout.
- The interaction runtime is a V1 fallback. Higher quality should come from
  prompt and generation improvements, not only post-processing.
- The diagnosis panel is prompt-derived and rule-based; it is not yet a full
  evaluator of the generated DOM.

## Suggested Next Versions

### V0.2 FlowCraft Product Shell

- Replace the inherited screenshot-to-code shell with a FlowCraft-specific
  workspace.
- Make the first screen feel like an interaction design brief builder.
- Give the result page a stronger split between reference, prototype, and design
  rationale.

### V0.3 Interaction State Coverage

- Detect which states are present in the generated HTML.
- Let users jump between default, hover/focus, loading, empty, error, success,
  and disabled views.
- Add missing-state regeneration prompts.

### V0.4 Project History

- Promote local storage into a more complete project/history layer.
- Add project naming, version labels, exports, and a clearer restore flow.

### V0.5 Demo Ready

- Polish the demo path with curated examples.
- Add a stable README, setup guide, and demo script for presentation.
