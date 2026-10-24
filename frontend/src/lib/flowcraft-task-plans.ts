import type { FlowCraftScenarioId } from "./flowcraft";

export type FlowCraftTaskActionType = "fill" | "select" | "click" | "assert";

export interface FlowCraftTaskAction {
  id: string;
  label: string;
  type: FlowCraftTaskActionType;
  targets: string[];
  value?: string;
  expected?: string[];
  optional?: boolean;
}

export interface FlowCraftTaskPlan {
  id: string;
  scenarioId: FlowCraftScenarioId;
  businessOutcome: string;
  actions: FlowCraftTaskAction[];
}

export const FLOWCRAFT_TASK_PLANS: Record<FlowCraftScenarioId, FlowCraftTaskPlan> = {
  learning: {
    id: "course-enrollment",
    scenarioId: "learning",
    businessOutcome: "Trial-to-enrollment conversion",
    actions: [
      { id: "start-trial", label: "Start a trial lesson", type: "click", targets: ["start free trial", "start trial", "try lesson"], expected: ["trial", "lesson", "progress"] },
      { id: "continue-enrollment", label: "Continue to enrollment", type: "click", targets: ["continue to enrollment", "enroll", "continue"], expected: ["enrollment", "learner details", "schedule"] },
      { id: "complete-details", label: "Complete enrollment details", type: "fill", targets: ["name", "email", "learner", "details"], value: "FlowCraft Learner" },
      { id: "confirm-enrollment", label: "Confirm enrollment", type: "click", targets: ["confirm enrollment", "complete enrollment", "enroll now"], expected: ["success", "confirmed", "enrolled", "next lesson"] },
      { id: "verify-enrollment", label: "Verify enrollment success", type: "assert", targets: ["success", "confirmed", "enrolled", "next lesson", "schedule"] },
    ],
  },
  ecommerce: {
    id: "commerce-checkout",
    scenarioId: "ecommerce",
    businessOutcome: "Purchase conversion",
    actions: [
      { id: "add-cart", label: "Add a product to cart", type: "click", targets: ["add to cart", "add bag", "buy now"], expected: ["cart", "added", "quantity"] },
      { id: "checkout", label: "Proceed to checkout", type: "click", targets: ["proceed to checkout", "checkout", "continue to payment"], expected: ["payment", "shipping", "order summary"] },
      { id: "checkout-details", label: "Complete checkout details", type: "fill", targets: ["email", "name", "address", "card"], value: "FlowCraft Customer" },
      { id: "pay", label: "Submit payment", type: "click", targets: ["pay now", "place order", "confirm purchase"], expected: ["confirmation", "receipt", "order number", "success"] },
      { id: "verify-order", label: "Verify order confirmation", type: "assert", targets: ["confirmation", "receipt", "order number", "thank you", "success"] },
    ],
  },
  finance: {
    id: "finance-assessment",
    scenarioId: "finance",
    businessOutcome: "Assessment completion",
    actions: [
      { id: "assessment-input", label: "Complete assessment inputs", type: "fill", targets: ["amount", "goal", "horizon", "risk", "income"], value: "5" },
      { id: "continue", label: "Continue to review", type: "click", targets: ["continue", "review answers", "check fit"], expected: ["review", "summary", "answers"] },
      { id: "view-result", label: "View assessment result", type: "click", targets: ["view result", "show result", "recommendation"], expected: ["risk", "result", "recommendation"] },
      { id: "confirm-result", label: "Confirm the result", type: "click", targets: ["confirm result", "confirm plan", "accept"], expected: ["confirmed", "confirmation", "complete"] },
      { id: "verify-result", label: "Verify confirmation or edit path", type: "assert", targets: ["confirmed", "confirmation", "return to edit", "edit answers"] },
    ],
  },
  "ai-tool": {
    id: "ai-upgrade",
    scenarioId: "ai-tool",
    businessOutcome: "Upgrade funnel completion",
    actions: [
      { id: "compose", label: "Enter an AI task", type: "fill", targets: ["prompt", "message", "task", "ask", "chat"], value: "Summarize the launch plan" },
      { id: "generate", label: "Generate a result", type: "click", targets: ["generate result", "generate", "send", "create"], expected: ["result", "response", "generated", "upgrade"] },
      { id: "open-upgrade", label: "Open plan upgrade", type: "click", targets: ["upgrade", "get pro", "view plans"], expected: ["monthly", "annual", "billing", "plan"] },
      { id: "choose-plan", label: "Choose a billing cycle", type: "select", targets: ["annual", "yearly", "monthly", "billing", "plan"], expected: ["selected", "annual", "monthly"] },
      { id: "confirm-upgrade", label: "Confirm upgrade", type: "click", targets: ["confirm upgrade", "get pro plan", "upgrade now", "subscribe"], expected: ["success", "confirmed", "pro", "upgraded"] },
      { id: "verify-upgrade", label: "Verify upgrade confirmation", type: "assert", targets: ["success", "confirmed", "upgraded", "pro plan", "welcome to pro"] },
    ],
  },
  saas: {
    id: "saas-invite",
    scenarioId: "saas",
    businessOutcome: "Successful team activation",
    actions: [
      { id: "open-invite", label: "Open teammate invitation", type: "click", targets: ["invite teammate", "invite member", "add member"], expected: ["email", "role", "permission"] },
      { id: "enter-email", label: "Enter teammate email", type: "fill", targets: ["email", "teammate", "member"], value: "teammate@example.com" },
      { id: "select-role", label: "Select a workspace role", type: "select", targets: ["role", "member", "admin", "editor"], expected: ["permission", "access", "role"] },
      { id: "review-invite", label: "Review invitation permissions", type: "click", targets: ["review invitation", "review permissions", "continue"], expected: ["permission", "recipient", "review"] },
      { id: "send-invite", label: "Send the invitation", type: "click", targets: ["send invitation", "send invite", "confirm invitation"], expected: ["pending", "sent", "invited", "success"] },
      { id: "verify-invite", label: "Verify invitation status", type: "assert", targets: ["pending", "sent", "invited", "success", "resend", "revoke"] },
    ],
  },
};

export function getFlowCraftTaskPlan(scenarioId: FlowCraftScenarioId) {
  return FLOWCRAFT_TASK_PLANS[scenarioId];
}

export function getFlowCraftTaskPlanForBrief(
  fallbackScenarioId: FlowCraftScenarioId,
  coreTask: string,
  requiredDetails: string[] = []
) {
  const brief = `${coreTask} ${requiredDetails.join(" ")}`.toLowerCase();
  if (/\b(ai|assistant|chat|prompt|generat|upgrade|billing cycle|pro plan)\b/.test(brief)) {
    return FLOWCRAFT_TASK_PLANS["ai-tool"];
  }
  if (/\b(saas|workspace|teammate|member|invite|invitation|role|permission)\b/.test(brief)) {
    return FLOWCRAFT_TASK_PLANS.saas;
  }
  if (/\b(product|cart|checkout|payment|purchase|order)\b/.test(brief)) {
    return FLOWCRAFT_TASK_PLANS.ecommerce;
  }
  if (/\b(course|lesson|trial|learn|enrollment|enroll)\b/.test(brief)) {
    return FLOWCRAFT_TASK_PLANS.learning;
  }
  if (/\b(finance|financial|risk|assessment|recommendation|portfolio)\b/.test(brief)) {
    return FLOWCRAFT_TASK_PLANS.finance;
  }
  return FLOWCRAFT_TASK_PLANS[fallbackScenarioId];
}
