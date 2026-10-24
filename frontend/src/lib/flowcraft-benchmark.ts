import { FlowCraftBehaviorAudit } from "./flowcraft-behavior-eval";

export interface FlowCraftBenchmarkCase {
  id: string;
  name: string;
  coreTask: string;
  requiredDetails: string[];
  expectedBusinessOutcome: string;
  expectedSteps: number;
}

export const FLOWCRAFT_BENCHMARK_CASES: FlowCraftBenchmarkCase[] = [
  {
    id: "ai-upgrade",
    name: "AI tool upgrade",
    coreTask: "Start a chat, open the upgrade sheet, and choose a Pro billing cycle.",
    requiredDetails: ["chat composer", "upgrade entry", "monthly and annual plans", "purchase confirmation"],
    expectedBusinessOutcome: "Upgrade funnel completion",
    expectedSteps: 4,
  },
  {
    id: "commerce-checkout",
    name: "Ecommerce checkout",
    coreTask: "Browse a product, add it to cart, and complete checkout.",
    requiredDetails: ["product detail", "cart feedback", "payment failure recovery", "order confirmation"],
    expectedBusinessOutcome: "Purchase conversion",
    expectedSteps: 4,
  },
  {
    id: "course-enrollment",
    name: "Course enrollment",
    coreTask: "Review a course, start a trial lesson, and complete enrollment.",
    requiredDetails: ["course outcomes", "trial state", "enrollment validation", "success confirmation"],
    expectedBusinessOutcome: "Trial-to-enrollment conversion",
    expectedSteps: 4,
  },
  {
    id: "finance-assessment",
    name: "Financial assessment",
    coreTask: "Complete a risk assessment, review the result, and confirm or edit it.",
    requiredDetails: ["input validation", "risk result", "edit path", "confirmation state"],
    expectedBusinessOutcome: "Assessment completion",
    expectedSteps: 4,
  },
  {
    id: "saas-invite",
    name: "SaaS member invitation",
    coreTask: "Invite a teammate and configure their workspace permissions.",
    requiredDetails: ["email validation", "role selection", "permission warning", "invitation confirmation"],
    expectedBusinessOutcome: "Successful team activation",
    expectedSteps: 3,
  },
];

export interface FlowCraftBusinessMetrics {
  firstPassTaskCompleted: boolean;
  requiredStateCoverage: number;
  behaviorReliability: number;
  repairLift: number | null;
}

export function calculateFlowCraftBusinessMetrics({
  taskCoverage,
  stateCoverage,
  behaviorAudit,
  baselineOverall,
  currentOverall,
}: {
  taskCoverage: number;
  stateCoverage: number;
  behaviorAudit?: FlowCraftBehaviorAudit | null;
  baselineOverall?: number | null;
  currentOverall: number;
}): FlowCraftBusinessMetrics {
  return {
    firstPassTaskCompleted:
      taskCoverage >= 70 &&
      !!behaviorAudit?.runtimePassed &&
      !!behaviorAudit.taskExecution?.pathCompleted,
    requiredStateCoverage: stateCoverage,
    behaviorReliability: behaviorAudit?.behaviorScore ?? 0,
    repairLift:
      baselineOverall == null ? null : currentOverall - baselineOverall,
  };
}
