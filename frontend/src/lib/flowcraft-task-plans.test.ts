import {
  FLOWCRAFT_TASK_PLANS,
  getFlowCraftTaskPlanForBrief,
} from "./flowcraft-task-plans";

describe("FlowCraft task plans", () => {
  test("defines an executable task path for all five primary scenarios", () => {
    expect(Object.keys(FLOWCRAFT_TASK_PLANS)).toHaveLength(5);
    expect(
      Object.values(FLOWCRAFT_TASK_PLANS).every(
        (plan) => plan.actions.length >= 5 && plan.actions.some((action) => action.type === "assert")
      )
    ).toBe(true);
  });

  test("follows the user brief instead of an incompatible fallback template", () => {
    const plan = getFlowCraftTaskPlanForBrief(
      "ecommerce",
      "Start an AI chat and choose a Pro billing cycle",
      ["upgrade entry", "monthly and annual plans", "purchase confirmation"]
    );

    expect(plan.scenarioId).toBe("ai-tool");
    expect(plan.id).toBe("ai-upgrade");
  });
});
