import { buildFlowCraftPrompt, FLOWCRAFT_SCENARIOS } from "./flowcraft";

function getStructuredInput(prompt: string) {
  const marker = "Structured generation inputs:\n\n";
  return JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length));
}

describe("FlowCraft prompt authority", () => {
  test("exposes the five primary benchmark scenarios in the product picker", () => {
    expect(FLOWCRAFT_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "learning",
      "ecommerce",
      "finance",
      "ai-tool",
      "saas",
    ]);
  });

  test("keeps a custom core task above the selected scenario template", () => {
    const prompt = buildFlowCraftPrompt("", "ecommerce", "efficiency", {
      userGoal:
        "Open an AI chat app, start a conversation, and choose a Pro billing cycle.",
      requirementsText:
        "Include a launch screen; chat composer; upgrade sheet; monthly and annual plans; confirmation feedback.",
      visualNotes: `Qwen visual LayoutSpec:
{
  "regions": [
    {
      "id": "composer",
      "visualRole": "bottom elevated input panel",
      "transferRole": "chat composer with model and voice controls"
    }
  ]
}`,
    });
    const structured = getStructuredInput(prompt);

    expect(structured.authority.priority).toEqual([
      "Core task",
      "Required details",
      "Screenshot visual and layout evidence",
      "Scenario template suggestions",
    ]);
    expect(structured.authority.scenarioTemplateRole).toBe("fallback-only");
    expect(structured.scenarioSpec.primaryFlow).toEqual([
      "Open an AI chat app, start a conversation, and choose a Pro billing cycle.",
    ]);
    expect(structured.scenarioSpec.requiredPages).toEqual([]);
    expect(structured.scenarioSpec.primaryCtas).toEqual([]);
    expect(structured.layoutSpec.regions[0].targetRole).toBe(
      "chat composer with model and voice controls"
    );
    expect(prompt).not.toContain("Key pages: Product detail");
    expect(prompt).not.toContain("Primary CTAs: Add to cart");
  });

  test("preserves scenario defaults when the core task is unchanged", () => {
    const prompt = buildFlowCraftPrompt("", "ecommerce", "efficiency", {
      userGoal: "View a product, add it to cart, then move through checkout.",
    });
    const structured = getStructuredInput(prompt);

    expect(structured.scenarioSpec.requiredPages.length).toBeGreaterThan(0);
    expect(structured.scenarioSpec.primaryCtas).toContain("Add to cart");
  });
});
