import {
  compareVisualFingerprints,
  evaluateDesignSystemConsistency,
  VisualStructureFingerprint,
} from "./flowcraft-visual-fidelity";
import { FlowCraftLayoutSpec } from "./flowcraft";
const fingerprint: VisualStructureFingerprint = {
  aspectRatio: 1.6,
  luminanceGrid: [0.95, 0.8, 0.4, 0.92],
  saturationGrid: [0.02, 0.1, 0.4, 0.03],
  edgeGrid: [0.1, 0.3, 0.6, 0.15],
  whitespaceGrid: [0.8, 0.4, 0.1, 0.7],
};

test("identical visual fingerprints score 100", () => {
  expect(compareVisualFingerprints(fingerprint, fingerprint).overall).toBe(100);
});
test("large composition changes lower the fidelity score", () => {
  const changed: VisualStructureFingerprint = {
    aspectRatio: 0.6,
    luminanceGrid: [0.1, 0.1, 0.9, 0.1],
    saturationGrid: [0.8, 0.7, 0.1, 0.9],
    edgeGrid: [0.8, 0.05, 0.05, 0.8],
    whitespaceGrid: [0.05, 0.05, 0.9, 0.05],
  };
  expect(compareVisualFingerprints(fingerprint, changed).overall).toBeLessThan(50);
});

test("design-system evaluation requires structured visual evidence", () => {
  const spec: FlowCraftLayoutSpec = {
    source: "qwen-vision",
    screenshotRef: "reference",
    visualNotes: [],
    layoutPattern: "grouped table with contextual popover",
    fidelity: "faithful",
    typography: { bodyScale: "16/14" },
    spacing: { baseUnit: 8 },
    colorSystem: { accent: "blue" },
    componentInventory: ["tabs", "table", "popover"],
    visualHierarchy: ["title", "table"],
    regions: [
      {
        id: "table",
        sourceRole: "grouped table",
        targetRole: "launch tasks",
        priority: "high",
        lockPriority: "high",
        normalizedFrame: { x: 0.1, y: 0.3, width: 0.8, height: 0.6 },
        detectedElements: ["rows", "status pills"],
      },
    ],
    styleDirectives: [],
  };
  const html =
    '<style>.row{padding:8px;gap:8px;color:#222;font-size:14px}</style><nav class="tab"></nav><table class="row"><input><select></select><button>New</button></table>';
  expect(evaluateDesignSystemConsistency(html, spec).score).toBe(100);
});

