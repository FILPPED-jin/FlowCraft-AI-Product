export type FlowCraftScenarioId =
  | "learning"
  | "ecommerce"
  | "finance"
  | "ai-tool"
  | "saas";

export type FlowCraftStrategyId = "efficiency" | "safety" | "delight";
export type FlowCraftFidelityMode = "inspired" | "balanced" | "faithful";

export interface FlowCraftStep {
  id: string;
  title: string;
  action: string;
  successState: string;
  errorState: string;
}

export interface FlowCraftPagePattern {
  id: string;
  name: string;
  purpose: string;
  primaryCta: string;
  secondaryCta?: string;
  keyElements: string[];
}

export interface FlowCraftExceptionPath {
  id: string;
  trigger: string;
  userFeedback: string;
  recoveryAction: string;
}

export interface FlowCraftStrategyVariant {
  strategyId: FlowCraftStrategyId;
  flowImpact: string;
  ctaTreatment: string;
  stateEmphasis: string[];
}

export interface FlowCraftScenario {
  id: FlowCraftScenarioId;
  label: string;
  description: string;
  typicalUser: string;
  userGoal: string;
  pages: FlowCraftPagePattern[];
  steps: FlowCraftStep[];
  primaryCtas: string[];
  successPath: string[];
  exceptionPaths: FlowCraftExceptionPath[];
  strategyVariants: FlowCraftStrategyVariant[];
  requiredStates: string[];
  riskChecks: string[];
  defaultStrategy: FlowCraftStrategyId;
  exampleCopy: string;
  goals: string[];
  missingStates: string[];
  optimizationFocus: string;
}

export interface FlowCraftStrategy {
  id: FlowCraftStrategyId;
  label: string;
  description: string;
  tradeoff: string;
  priority: string;
  principles: string[];
}

export interface FlowProjectVersion {
  id: string;
  label: string;
  createdAt: string;
}

export interface FlowProject {
  id: string;
  title: string;
  screenshotRef: string;
  visualNotes?: string;
  sceneId: FlowCraftScenarioId;
  userGoal: string;
  requirements: string[];
  strategy: FlowCraftStrategy;
  designPlan?: string;
  versions: FlowProjectVersion[];
}

export interface FlowCraftLayoutSpec {
  source: "qwen-vision" | "local-analysis" | "user-notes" | "mixed";
  screenshotRef: string;
  visualNotes: string[];
  layoutPattern: string;
  fidelity: FlowCraftFidelityMode;
  canvas?: Record<string, unknown>;
  visualStyle?: Record<string, unknown>;
  colorSystem?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  componentInventory: unknown[];
  visualHierarchy: unknown[];
  regions: Array<{
    id: string;
    sourceRole: string;
    targetRole: string;
    priority: "high" | "medium" | "low";
    position?: string;
    approximateSize?: string;
    normalizedFrame?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    detectedElements: unknown[];
    hierarchy?: number;
    lockPriority: "high" | "medium" | "low";
  }>;
  styleDirectives: string[];
}

export interface FlowCraftSemanticMappingSpec {
  fidelity: FlowCraftFidelityMode;
  invariantRule: string;
  mappings: Array<{
    sourceRegionId: string;
    sourceVisualRole: string;
    targetComponent: string;
    preserveGeometry: boolean;
    preserveOrder: boolean;
  }>;
}

export interface FlowCraftScenarioSpec {
  id: FlowCraftScenarioId;
  label: string;
  userGoal: string;
  requiredPages: string[];
  primaryFlow: string[];
  requiredStates: string[];
  primaryCtas: string[];
  exceptionPaths: string[];
}

export interface FlowCraftGenerationConstraints {
  layoutMigrationContract: string[];
  sourceContentGuardrails: string[];
  runtimeQualityBars: string[];
}

export interface FlowCraftPrototypePlan {
  summary: string;
  layoutSpec: FlowCraftLayoutSpec;
  scenarioSpec: FlowCraftScenarioSpec;
  constraints: FlowCraftGenerationConstraints;
  screenPlan: Array<{
    region: string;
    component: string;
    contentSource: "scenario" | "user-requirement";
    interactions: string[];
  }>;
}

export interface FlowCraftStructuredInput {
  authority: {
    priority: string[];
    conflictRule: string;
    scenarioTemplateRole: "fallback-only";
  };
  flowProject: FlowProject;
  layoutSpec: FlowCraftLayoutSpec;
  referenceDesignSpec: FlowCraftLayoutSpec;
  semanticMappingSpec: FlowCraftSemanticMappingSpec;
  scenarioSpec: FlowCraftScenarioSpec;
  generationConstraints: FlowCraftGenerationConstraints;
  prototypePlan: FlowCraftPrototypePlan;
}

interface FlowProjectInput {
  title?: string;
  screenshotRef?: string;
  visualNotes?: string;
  scenarioId: FlowCraftScenarioId;
  strategyId: FlowCraftStrategyId;
  userGoal?: string;
  requirementsText?: string;
}

interface PromptOptions {
  projectTitle?: string;
  screenshotRef?: string;
  visualNotes?: string;
  userGoal?: string;
  requirementsText?: string;
  fidelity?: FlowCraftFidelityMode;
}

function looksLikeTargetRequirement(text: string) {
  return /生成|创建|做一个|做个|需要|我想|页面|网站|电商|购物|商城|公司|企业|原型|流程|generate|create|build|make|need|want|page|site|ecommerce|shopping|company|prototype/i.test(
    text
  );
}

function looksLikeVisualReferenceNote(text: string) {
  return /颜色|配色|布局|侧栏|导航|卡片|按钮|字体|间距|圆角|深色|浅色|三栏|面板|视觉|风格|层级|color|palette|layout|sidebar|nav|card|button|type|spacing|radius|dark|light|panel|visual|style|hierarchy/i.test(
    text
  );
}

function normalizeFlowCraftBriefInputs(
  requirementsText: string | undefined,
  visualNotes: string | undefined
) {
  const trimmedRequirements = requirementsText?.trim() ?? "";
  const trimmedVisualNotes = visualNotes?.trim() ?? "";
  const visualNotesAreMisplacedGoal =
    trimmedVisualNotes.length > 0 &&
    looksLikeTargetRequirement(trimmedVisualNotes) &&
    !looksLikeVisualReferenceNote(trimmedVisualNotes);

  if (!visualNotesAreMisplacedGoal) {
    return {
      requirementsText: trimmedRequirements,
      visualNotes: trimmedVisualNotes,
      movedTargetNote: "",
    };
  }

  return {
    requirementsText: [trimmedRequirements, trimmedVisualNotes]
      .filter(Boolean)
      .join("\n"),
    visualNotes: "",
    movedTargetNote: trimmedVisualNotes,
  };
}

export const FLOWCRAFT_SCENARIOS: FlowCraftScenario[] = [
  {
    id: "learning",
    label: "Learning / Education",
    description:
      "Course discovery, trial learning, and enrollment flows for education products.",
    typicalUser:
      "A motivated learner comparing course value, time commitment, proof of quality, and the safest next step before enrolling.",
    userGoal: "Browse a course, start a trial lesson, then complete enrollment.",
    pages: [
      {
        id: "course-detail",
        name: "Course detail",
        purpose:
          "Help the learner understand outcomes, fit, instructor credibility, schedule, and the next low-risk action.",
        primaryCta: "Start free trial lesson",
        secondaryCta: "View syllabus",
        keyElements: [
          "course outcome summary",
          "skill level and time commitment",
          "instructor credibility",
          "lesson preview",
          "student proof or completion signal",
        ],
      },
      {
        id: "trial-lesson",
        name: "Trial lesson",
        purpose:
          "Let the learner experience a small part of the course and understand progress before enrolling.",
        primaryCta: "Continue to enrollment",
        secondaryCta: "Save for later",
        keyElements: [
          "lesson progress",
          "preview content",
          "completion feedback",
          "retry or resume action",
        ],
      },
      {
        id: "enrollment",
        name: "Enrollment",
        purpose:
          "Collect minimal enrollment information, confirm commitment, and show what happens next.",
        primaryCta: "Confirm enrollment",
        secondaryCta: "Back to trial",
        keyElements: [
          "learner details",
          "schedule or plan selection",
          "validation feedback",
          "confirmation summary",
        ],
      },
    ],
    steps: [
      {
        id: "browse-course",
        title: "Browse course",
        action: "Compare course value, schedule, and learning outcome.",
        successState: "A course card or detail panel makes the next action clear.",
        errorState: "Empty or unavailable courses explain what the learner can try next.",
      },
      {
        id: "trial",
        title: "Start trial",
        action: "Let the learner preview the class before committing.",
        successState: "Trial starts with a clear progress or confirmation state.",
        errorState: "Trial failure keeps the learner on the page with recovery guidance.",
      },
      {
        id: "enroll",
        title: "Enroll",
        action: "Collect the minimum required information and confirm enrollment.",
        successState: "Enrollment success shows the next lesson or schedule.",
        errorState: "Duplicate submit and validation states prevent confusion.",
      },
    ],
    requiredStates: [
      "loading",
      "trial failure",
      "enrollment success",
      "duplicate submit prevention",
    ],
    primaryCtas: [
      "Start free trial lesson",
      "Continue to enrollment",
      "Confirm enrollment",
    ],
    successPath: [
      "Learner reviews course outcomes and social proof.",
      "Learner starts the trial lesson and sees progress feedback.",
      "Learner completes trial and continues to enrollment.",
      "Learner submits enrollment once and sees next lesson or schedule.",
    ],
    exceptionPaths: [
      {
        id: "trial-load-failure",
        trigger: "Trial lesson cannot load or times out.",
        userFeedback:
          "Show a clear non-blaming error with the lesson title still visible.",
        recoveryAction: "Offer retry, back to course detail, and save for later.",
      },
      {
        id: "enrollment-validation",
        trigger: "Required learner details are missing or invalid.",
        userFeedback: "Show inline errors without clearing completed fields.",
        recoveryAction: "Focus the first invalid field and keep confirm disabled until fixed.",
      },
      {
        id: "duplicate-submit",
        trigger: "Learner clicks confirm repeatedly while enrollment is processing.",
        userFeedback: "Show loading/progress and prevent duplicate submission.",
        recoveryAction: "Keep the learner on the confirmation step until success or recoverable failure.",
      },
    ],
    strategyVariants: [
      {
        strategyId: "efficiency",
        flowImpact: "Move from course proof to trial quickly and use inline enrollment instead of extra screens.",
        ctaTreatment: "Keep one dominant trial CTA and compact secondary syllabus action.",
        stateEmphasis: ["fast preview", "minimal fields", "inline validation"],
      },
      {
        strategyId: "safety",
        flowImpact: "Add confirmation before enrollment and preserve progress across trial or form failures.",
        ctaTreatment: "Use explicit confirm labels and visible back/edit actions.",
        stateEmphasis: ["duplicate submit prevention", "retry path", "confirmation summary"],
      },
      {
        strategyId: "delight",
        flowImpact: "Make progress feel rewarding with lesson completion feedback and lightweight milestones.",
        ctaTreatment: "Use encouraging microcopy without hiding the core enrollment CTA.",
        stateEmphasis: ["progress feedback", "completion celebration", "recommended next lesson"],
      },
    ],
    riskChecks: [
      "Make the primary learning action visible above the fold.",
      "Avoid losing progress when trial or enrollment fails.",
      "Confirm paid or commitment-heavy actions before submission.",
    ],
    defaultStrategy: "safety",
    exampleCopy:
      "Show course outcomes, trial CTA, enrollment form, validation, success confirmation, and a back-to-edit path.",
    goals: [
      "Strong visual scan",
      "Credible project narrative",
      "Easy contact path",
    ],
    missingStates: ["loading", "trial failure", "enrollment success"],
    optimizationFocus:
      "Prioritize clarity around trial, enrollment, validation, and post-submit feedback.",
  },
  {
    id: "ecommerce",
    label: "Ecommerce / Shopping",
    description:
      "Product discovery, cart building, and checkout flows for commerce experiences.",
    typicalUser:
      "A shopper evaluating product fit, price, availability, trust signals, and checkout risk before paying.",
    userGoal: "View a product, add it to cart, then move through checkout.",
    pages: [
      {
        id: "product-detail",
        name: "Product detail",
        purpose:
          "Help the shopper inspect product value, variants, stock, delivery, proof, and price before adding to cart.",
        primaryCta: "Add to cart",
        secondaryCta: "Save or compare",
        keyElements: [
          "product media",
          "price and variant controls",
          "stock status",
          "reviews or trust proof",
          "delivery/return promise",
        ],
      },
      {
        id: "cart",
        name: "Cart review",
        purpose:
          "Let the shopper review items, quantities, price changes, discounts, and recovery options before checkout.",
        primaryCta: "Proceed to checkout",
        secondaryCta: "Continue shopping",
        keyElements: [
          "cart line items",
          "quantity controls",
          "remove and undo",
          "promo field",
          "order summary",
        ],
      },
      {
        id: "checkout",
        name: "Checkout",
        purpose:
          "Collect payment or contact details, validate inputs, handle failure, and confirm purchase.",
        primaryCta: "Pay now",
        secondaryCta: "Back to cart",
        keyElements: [
          "contact/payment fields",
          "field validation",
          "payment failure recovery",
          "order review",
          "confirmation receipt",
        ],
      },
    ],
    steps: [
      {
        id: "view-product",
        title: "View product",
        action: "Help the shopper evaluate price, variants, proof, and availability.",
        successState: "The selected product state and CTA are obvious.",
        errorState: "Out-of-stock and unavailable variants offer alternatives.",
      },
      {
        id: "add-to-cart",
        title: "Add to cart",
        action: "Let the shopper choose quantity and add the item confidently.",
        successState: "Cart feedback confirms the item, quantity, and next step.",
        errorState: "Quantity errors explain valid limits without clearing choices.",
      },
      {
        id: "checkout",
        title: "Checkout",
        action: "Collect checkout details and confirm purchase intent.",
        successState: "Confirmation feedback shows order status and next action.",
        errorState: "Payment failure preserves cart and offers retry or edit.",
      },
    ],
    requiredStates: [
      "out of stock",
      "quantity error",
      "payment failure",
      "confirmation feedback",
    ],
    primaryCtas: [
      "Add to cart",
      "Proceed to checkout",
      "Pay now",
      "Retry payment",
    ],
    successPath: [
      "Shopper selects a valid product variant and quantity.",
      "Shopper confirms add-to-cart feedback and reviews cart contents.",
      "Shopper fixes any quantity or promo issues before checkout.",
      "Shopper submits payment and receives a clear confirmation receipt.",
    ],
    exceptionPaths: [
      {
        id: "out-of-stock",
        trigger: "Selected variant is unavailable.",
        userFeedback: "Disable purchase CTA and show stock-specific explanation.",
        recoveryAction: "Offer notify me, select another variant, or continue browsing.",
      },
      {
        id: "quantity-error",
        trigger: "Quantity is zero, above stock limit, or above purchase limit.",
        userFeedback: "Show inline quantity error near the stepper and block checkout.",
        recoveryAction: "Offer one-click correction to the nearest valid quantity.",
      },
      {
        id: "payment-failure",
        trigger: "Payment attempt fails or card is declined.",
        userFeedback:
          "Explain that no charge was made and preserve cart, form, and order summary.",
        recoveryAction: "Offer retry, use a different payment method, and back to cart.",
      },
    ],
    strategyVariants: [
      {
        strategyId: "efficiency",
        flowImpact: "Keep product-to-cart-to-checkout short with inline cart summary and fewer interruptions.",
        ctaTreatment: "Use direct CTAs and reserve confirmation only for payment or destructive cart changes.",
        stateEmphasis: ["fast add-to-cart feedback", "inline quantity correction", "compact checkout"],
      },
      {
        strategyId: "safety",
        flowImpact: "Add review points before payment and make recovery from stock, quantity, and payment errors obvious.",
        ctaTreatment: "Use explicit payment language and visible back/edit/retry controls.",
        stateEmphasis: ["stock constraints", "payment failure recovery", "order review"],
      },
      {
        strategyId: "delight",
        flowImpact: "Use rewarding cart feedback, recommendations, and progress cues without blocking checkout.",
        ctaTreatment: "Pair the primary CTA with lightweight encouraging microcopy.",
        stateEmphasis: ["cart success animation", "smart recommendation", "receipt celebration"],
      },
    ],
    riskChecks: [
      "Keep cart contents recoverable after payment failure.",
      "Show stock and quantity constraints before checkout.",
      "Confirm irreversible payment actions clearly.",
    ],
    defaultStrategy: "efficiency",
    exampleCopy:
      "Include product selection, variant state, cart summary, checkout form, payment error, and confirmation feedback.",
    goals: ["Fast product scan", "Low-friction cart path", "Trustworthy checkout"],
    missingStates: ["out of stock", "quantity error", "payment failure"],
    optimizationFocus:
      "Prioritize product-state clarity, cart recovery, and checkout confidence.",
  },
  {
    id: "finance",
    label: "Financial Service",
    description:
      "Risk assessment and confirmation flows where trust, validation, and reversibility matter.",
    typicalUser:
      "A cautious user completing a simulated suitability or risk assessment who needs transparency, validation, and a safe way to revise answers.",
    userGoal: "Complete a risk assessment, review the result, then confirm or edit.",
    pages: [
      {
        id: "assessment",
        name: "Risk assessment",
        purpose:
          "Collect answers step by step with clear progress, validation, and plain-language help.",
        primaryCta: "Continue",
        secondaryCta: "Save and exit",
        keyElements: [
          "progress indicator",
          "question groups",
          "input validation",
          "help text",
          "privacy or data-use note",
        ],
      },
      {
        id: "review-answers",
        name: "Review answers",
        purpose:
          "Let the user verify key inputs and understand assumptions before seeing or confirming a result.",
        primaryCta: "View result",
        secondaryCta: "Edit answers",
        keyElements: [
          "answer summary",
          "edit links",
          "important assumptions",
          "missing answer warnings",
        ],
      },
      {
        id: "result-confirmation",
        name: "Result confirmation",
        purpose:
          "Explain the simulated risk result, confidence, next step, and non-binding nature of the prototype.",
        primaryCta: "Confirm result",
        secondaryCta: "Return to edit",
        keyElements: [
          "risk level explanation",
          "reason codes",
          "confidence or uncertainty note",
          "confirm/edit controls",
          "support or disclosure link",
        ],
      },
    ],
    steps: [
      {
        id: "risk-assessment",
        title: "Risk assessment",
        action: "Collect required inputs with clear validation and progress.",
        successState: "Inputs are summarized before the user sees the result.",
        errorState: "Validation explains the issue and keeps entered values intact.",
      },
      {
        id: "result-review",
        title: "Review result",
        action: "Explain the calculated result and the confidence or risk level.",
        successState: "The recommendation is clear and traceable.",
        errorState: "Uncertain or failed calculation states offer retry and support.",
      },
      {
        id: "confirm",
        title: "Confirm or edit",
        action: "Let the user confirm, return to edit, or recover from mistakes.",
        successState: "Confirmation states show what changed and what happens next.",
        errorState: "Recovery states avoid accidental submission or lock-in.",
      },
    ],
    requiredStates: [
      "input validation",
      "key confirmation",
      "return to edit",
      "error recovery",
    ],
    primaryCtas: [
      "Continue",
      "Review answers",
      "View result",
      "Confirm result",
      "Return to edit",
    ],
    successPath: [
      "User completes validated assessment inputs with progress feedback.",
      "User reviews answers and edits incorrect or uncertain responses.",
      "User sees a clearly explained simulated result with assumptions.",
      "User confirms or returns to edit without losing entered answers.",
    ],
    exceptionPaths: [
      {
        id: "missing-or-invalid-answer",
        trigger: "Required risk answer is missing, inconsistent, or invalid.",
        userFeedback:
          "Show inline error and an error summary while preserving the user's inputs.",
        recoveryAction: "Focus the affected question and allow correction without restarting.",
      },
      {
        id: "uncertain-result",
        trigger: "Answers produce a low-confidence or conflicting risk profile.",
        userFeedback:
          "Explain uncertainty and which answers influenced the result.",
        recoveryAction: "Offer review answers, adjust assumptions, or contact support.",
      },
      {
        id: "confirmation-risk",
        trigger: "User tries to confirm a key result or next step.",
        userFeedback:
          "Show a plain-language confirmation summary and non-production disclaimer.",
        recoveryAction: "Keep return-to-edit and cancel actions visible until final confirmation.",
      },
    ],
    strategyVariants: [
      {
        strategyId: "efficiency",
        flowImpact: "Group related questions and reduce repeated explanation while keeping required validation.",
        ctaTreatment: "Use clear next-step CTAs and summarize assumptions compactly.",
        stateEmphasis: ["progress clarity", "grouped validation", "fast answer review"],
      },
      {
        strategyId: "safety",
        flowImpact: "Add review, confirmation, edit, and recovery moments around every consequential step.",
        ctaTreatment: "Use conservative labels such as Review, Confirm, and Return to edit.",
        stateEmphasis: ["answer review", "plain-language disclosure", "error recovery"],
      },
      {
        strategyId: "delight",
        flowImpact: "Make progress feel calm and confidence-building without gamifying financial decisions.",
        ctaTreatment: "Use reassuring microcopy and gentle progress feedback.",
        stateEmphasis: ["calm progress", "confidence explanation", "supportive empty states"],
      },
    ],
    riskChecks: [
      "Never hide assumptions behind financial recommendations.",
      "Require confirmation before irreversible actions.",
      "Keep edit and recovery paths visible after errors.",
    ],
    defaultStrategy: "safety",
    exampleCopy:
      "Include assessment inputs, validation, result explanation, confirmation, return-to-edit, and error recovery.",
    goals: ["Trust signal", "Clear confirmation", "Recoverable decision path"],
    missingStates: ["input validation", "key confirmation", "error recovery"],
    optimizationFocus:
      "Prioritize explainability, confirmation states, and recovery from validation errors.",
  },
  {
    id: "ai-tool",
    label: "AI Tool / Assistant",
    description:
      "Prompt, generation, review, and upgrade flows for AI-powered products.",
    typicalUser:
      "A user trying an AI capability who needs a fast first result, clear generation status, and a trustworthy upgrade path when limits are reached.",
    userGoal: "Start an AI task, review the result, then refine it or upgrade the plan.",
    pages: [
      {
        id: "ai-workspace",
        name: "AI workspace",
        purpose: "Help the user describe a task, choose essential settings, and start generation.",
        primaryCta: "Generate result",
        secondaryCta: "Use an example",
        keyElements: ["task composer", "model or mode selector", "input validation", "usage status"],
      },
      {
        id: "result-review",
        name: "Result review",
        purpose: "Show generation progress, the produced result, and focused refinement actions.",
        primaryCta: "Refine result",
        secondaryCta: "Try again",
        keyElements: ["generation progress", "result preview", "edit controls", "failure recovery"],
      },
      {
        id: "upgrade",
        name: "Plan upgrade",
        purpose: "Explain plan value and let the user compare billing choices before purchase.",
        primaryCta: "Confirm upgrade",
        secondaryCta: "Continue with current plan",
        keyElements: ["plan comparison", "monthly and annual billing", "selected plan", "purchase confirmation"],
      },
    ],
    steps: [
      {
        id: "compose-task",
        title: "Compose task",
        action: "Enter a request and choose only the settings needed for a useful first result.",
        successState: "A valid request enables generation and preserves the user's input.",
        errorState: "Empty or invalid input explains what is needed without clearing the composer.",
      },
      {
        id: "generate-review",
        title: "Generate and review",
        action: "Run generation, show progress, and make the result easy to inspect or refine.",
        successState: "The result appears with clear refine, retry, and save actions.",
        errorState: "Generation failure preserves the request and offers retry or edit.",
      },
      {
        id: "upgrade-plan",
        title: "Upgrade plan",
        action: "Compare plans, choose a billing cycle, and confirm the upgrade.",
        successState: "The selected plan and successful upgrade are explicitly confirmed.",
        errorState: "Payment or entitlement failure keeps plan selection and offers recovery.",
      },
    ],
    primaryCtas: ["Generate result", "Refine result", "Try again", "Confirm upgrade"],
    successPath: [
      "User enters a valid task and starts generation.",
      "User sees progress and reviews the generated result.",
      "User refines the result or opens the plan comparison when a limit is reached.",
      "User selects a billing cycle and receives upgrade confirmation.",
    ],
    exceptionPaths: [
      {
        id: "invalid-prompt",
        trigger: "The task input is empty, unsupported, or incomplete.",
        userFeedback: "Explain the missing information beside the composer.",
        recoveryAction: "Preserve the draft and offer an example or focused correction.",
      },
      {
        id: "generation-failure",
        trigger: "Generation times out or returns an error.",
        userFeedback: "Show a specific failure state without removing the original request.",
        recoveryAction: "Offer retry, edit request, or change mode.",
      },
      {
        id: "upgrade-failure",
        trigger: "Upgrade purchase or entitlement activation fails.",
        userFeedback: "Clarify that access was not changed and keep the selected plan visible.",
        recoveryAction: "Offer retry, change billing cycle, or return to the workspace.",
      },
    ],
    strategyVariants: [
      {
        strategyId: "efficiency",
        flowImpact: "Minimize setup before first generation and keep refinement controls close to the result.",
        ctaTreatment: "Use one dominant generate action and concise inline retry controls.",
        stateEmphasis: ["fast first result", "inline refinement", "usage visibility"],
      },
      {
        strategyId: "safety",
        flowImpact: "Make generated status, limitations, purchase terms, and failure recovery explicit.",
        ctaTreatment: "Use explicit confirm labels for upgrade and preserve cancel/back paths.",
        stateEmphasis: ["generation failure", "plan confirmation", "purchase recovery"],
      },
      {
        strategyId: "delight",
        flowImpact: "Use responsive progress and polished result transitions without delaying the task.",
        ctaTreatment: "Pair generation actions with useful status feedback and lightweight success moments.",
        stateEmphasis: ["generation progress", "result reveal", "upgrade success"],
      },
    ],
    requiredStates: ["input validation", "generation progress", "generation failure", "upgrade confirmation"],
    riskChecks: [
      "Keep the user's request recoverable after generation failure.",
      "Distinguish generated output from system status and plan messaging.",
      "Confirm billing choice and price before upgrade.",
    ],
    defaultStrategy: "efficiency",
    exampleCopy:
      "Include a task composer, generation progress, result review, retry state, plan comparison, and upgrade confirmation.",
    goals: ["Fast time to value", "Reliable generation recovery", "Clear upgrade conversion"],
    missingStates: ["input validation", "generation failure", "upgrade confirmation"],
    optimizationFocus:
      "Prioritize first-result completion, transparent generation states, and a measurable upgrade funnel.",
  },
  {
    id: "saas",
    label: "SaaS / Collaboration",
    description:
      "Workspace onboarding, teammate invitations, roles, and permission flows.",
    typicalUser:
      "A workspace administrator who needs to add teammates quickly while understanding role permissions and avoiding accidental access grants.",
    userGoal: "Invite a teammate, assign a role, and confirm workspace access.",
    pages: [
      {
        id: "workspace-members",
        name: "Workspace members",
        purpose: "Show current members, pending invitations, and the primary invite action.",
        primaryCta: "Invite teammate",
        secondaryCta: "Manage roles",
        keyElements: ["member list", "pending invitations", "seat usage", "role summary"],
      },
      {
        id: "invite-member",
        name: "Invite teammate",
        purpose: "Collect an email, assign a role, and explain the resulting access.",
        primaryCta: "Review invitation",
        secondaryCta: "Cancel",
        keyElements: ["email validation", "role selection", "permission summary", "seat warning"],
      },
      {
        id: "invite-confirmation",
        name: "Invitation confirmation",
        purpose: "Confirm recipient and permissions before sending, then show delivery status.",
        primaryCta: "Send invitation",
        secondaryCta: "Edit permissions",
        keyElements: ["recipient summary", "permission warning", "send status", "resend or revoke"],
      },
    ],
    steps: [
      {
        id: "enter-invitee",
        title: "Enter teammate",
        action: "Add a teammate email and validate membership or domain constraints.",
        successState: "A valid recipient can proceed to role selection.",
        errorState: "Invalid, duplicate, or restricted addresses receive actionable feedback.",
      },
      {
        id: "assign-role",
        title: "Assign role",
        action: "Choose a role and review the permissions it grants.",
        successState: "Selected access is summarized in plain language.",
        errorState: "High-risk permission combinations trigger a warning and edit path.",
      },
      {
        id: "send-invitation",
        title: "Send invitation",
        action: "Confirm the recipient and permissions, then send the invitation.",
        successState: "Delivery status and follow-up actions are visible.",
        errorState: "Send failure preserves the invitation and offers retry.",
      },
    ],
    primaryCtas: ["Invite teammate", "Review invitation", "Send invitation", "Retry invitation"],
    successPath: [
      "Administrator opens the member list and starts an invitation.",
      "Administrator enters a valid email and selects an appropriate role.",
      "Administrator reviews permission impact and sends the invitation.",
      "The workspace shows a pending invitation with resend or revoke controls.",
    ],
    exceptionPaths: [
      {
        id: "email-validation",
        trigger: "The email is invalid, already invited, or outside an allowed domain.",
        userFeedback: "Explain the exact issue beside the email field.",
        recoveryAction: "Keep role choices and allow the address to be corrected.",
      },
      {
        id: "permission-warning",
        trigger: "The selected role grants sensitive or broad workspace access.",
        userFeedback: "Summarize the elevated permissions before sending.",
        recoveryAction: "Offer change role, edit custom access, or confirm explicitly.",
      },
      {
        id: "invite-failure",
        trigger: "The invitation cannot be delivered.",
        userFeedback: "Show failed delivery while preserving recipient and role details.",
        recoveryAction: "Offer retry, copy invite link, or cancel the pending invitation.",
      },
    ],
    strategyVariants: [
      {
        strategyId: "efficiency",
        flowImpact: "Combine recipient and role setup while keeping the permission summary visible.",
        ctaTreatment: "Use a direct review-and-send sequence with inline validation.",
        stateEmphasis: ["fast invite", "inline validation", "pending status"],
      },
      {
        strategyId: "safety",
        flowImpact: "Add explicit review for elevated roles and preserve edit, revoke, and retry paths.",
        ctaTreatment: "Use specific labels and require confirmation for broad access.",
        stateEmphasis: ["permission warning", "review before send", "revoke path"],
      },
      {
        strategyId: "delight",
        flowImpact: "Make team activation feel responsive with clear delivery feedback and next-step guidance.",
        ctaTreatment: "Use encouraging confirmation without obscuring member status.",
        stateEmphasis: ["invite success", "team progress", "helpful next action"],
      },
    ],
    requiredStates: ["email validation", "role selection", "permission warning", "invitation confirmation"],
    riskChecks: [
      "Explain permissions before granting elevated access.",
      "Prevent duplicate invitations and preserve failed invite data.",
      "Keep resend, edit, and revoke controls available for pending invitations.",
    ],
    defaultStrategy: "safety",
    exampleCopy:
      "Include member status, email validation, role selection, permission review, invite confirmation, and retry or revoke actions.",
    goals: ["Invite completion", "Safe permission assignment", "Visible activation status"],
    missingStates: ["email validation", "permission warning", "invitation confirmation"],
    optimizationFocus:
      "Prioritize team activation, permission clarity, and recoverable invitation failures.",
  },
];

export const FLOWCRAFT_STRATEGIES: FlowCraftStrategy[] = [
  {
    id: "efficiency",
    label: "Efficiency",
    description:
      "Shorten the path, reduce unnecessary actions, and keep only necessary confirmation.",
    tradeoff: "May feel more direct, but must not remove critical safety cues.",
    priority:
      "Optimize for the shortest understandable path while preserving required confirmation.",
    principles: [
      "Reduce redundant steps.",
      "Keep the primary action visually dominant.",
      "Use inline feedback instead of extra screens when possible.",
    ],
  },
  {
    id: "safety",
    label: "Safety",
    description:
      "Add confirmations, validation, failure recovery, and clear undo/back paths.",
    tradeoff: "Adds a little friction in exchange for trust and recoverability.",
    priority:
      "Optimize for clear validation, confirmation, and recovery before speed.",
    principles: [
      "Show validation before submission.",
      "Keep back/edit/retry actions available.",
      "Make irreversible or high-risk actions explicit.",
    ],
  },
  {
    id: "delight",
    label: "Delight",
    description:
      "Use feedback, exploration, and progress incentives without blocking the task.",
    tradeoff: "Adds personality, but decorative moments must not slow completion.",
    priority:
      "Optimize for motivating feedback and lightweight discovery around the main task.",
    principles: [
      "Use motion or microcopy to reward progress.",
      "Offer helpful suggestions after the core action is clear.",
      "Keep delight secondary to task completion.",
    ],
  },
];

export const DEFAULT_FLOWCRAFT_SCENARIO_ID: FlowCraftScenarioId = "learning";
export const DEFAULT_FLOWCRAFT_STRATEGY_ID: FlowCraftStrategyId = "safety";
export const DEFAULT_FLOWCRAFT_FIDELITY_MODE: FlowCraftFidelityMode = "faithful";
export const FLOWCRAFT_FIDELITY_MODES: Array<{
  id: FlowCraftFidelityMode;
  label: string;
  description: string;
}> = [
  {
    id: "inspired",
    label: "Inspired",
    description: "Reuse the visual mood while allowing a new composition.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Preserve major regions while adapting secondary layout details.",
  },
  {
    id: "faithful",
    label: "Faithful",
    description: "Lock region geometry, density, hierarchy, and design tokens.",
  },
];

export type FlowCraftPreferenceId = FlowCraftStrategyId;
export type FlowCraftPreference = FlowCraftStrategy;
export const FLOWCRAFT_PREFERENCES = FLOWCRAFT_STRATEGIES;
export const DEFAULT_FLOWCRAFT_PREFERENCE_ID = DEFAULT_FLOWCRAFT_STRATEGY_ID;

export function getFlowCraftScenario(id: FlowCraftScenarioId) {
  return (
    FLOWCRAFT_SCENARIOS.find((scenario) => scenario.id === id) ??
    FLOWCRAFT_SCENARIOS[0]
  );
}

export function getFlowCraftStrategy(id: FlowCraftStrategyId) {
  return (
    FLOWCRAFT_STRATEGIES.find((strategy) => strategy.id === id) ??
    FLOWCRAFT_STRATEGIES[0]
  );
}

export const getFlowCraftPreference = getFlowCraftStrategy;

export function parseFlowCraftRequirements(text = "") {
  return text
    .split(/\r?\n|,|;|；|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createFlowProject(input: FlowProjectInput): FlowProject {
  const scenario = getFlowCraftScenario(input.scenarioId);
  const strategy = getFlowCraftStrategy(input.strategyId);
  const requirements = parseFlowCraftRequirements(input.requirementsText);

  return {
    id: `flow-${Date.now()}`,
    title: input.title?.trim() || `${scenario.label} prototype`,
    screenshotRef: input.screenshotRef || "pending screenshot upload",
    visualNotes: input.visualNotes?.trim() || undefined,
    sceneId: scenario.id,
    userGoal: input.userGoal?.trim() || scenario.userGoal,
    requirements:
      requirements.length > 0 ? requirements : parseFlowCraftRequirements(scenario.exampleCopy),
    strategy,
    versions: [],
  };
}

export function describeFlowProject(project: FlowProject) {
  const scenario = getFlowCraftScenario(project.sceneId);

  return [
    `Scene: ${scenario.label}`,
    `Core task: ${project.userGoal}`,
    `Strategy: ${project.strategy.label}`,
    `Requirements: ${project.requirements.join("; ")}`,
    `Required states: ${scenario.requiredStates.join("; ")}`,
  ].join("\n");
}

function splitContract(contract: string) {
  return contract
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getVisualNoteLines(visualNotes?: string) {
  return (visualNotes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function extractQwenLayoutSpec(visualNotes?: string) {
  const marker = "Qwen visual LayoutSpec:";
  const markerIndex = (visualNotes || "").indexOf(marker);
  if (markerIndex < 0) return null;

  const text = (visualNotes || "").slice(markerIndex + marker.length);
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1)) as {
            canvas?: Record<string, unknown>;
            visualStyle?: Record<string, unknown>;
            colorSystem?: Record<string, unknown>;
            typography?: Record<string, unknown>;
            spacing?: Record<string, unknown>;
            componentInventory?: unknown[];
            visualHierarchy?: unknown[];
            regions?: Array<{
              id?: string;
              position?: string;
              approximateSize?: string;
              visualRole?: string;
              transferRole?: string;
              detectedElements?: unknown[];
              normalizedFrame?: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
              };
              hierarchy?: number;
              lockPriority?: "high" | "medium" | "low";
            }>;
          };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function hasCustomFlowCraftIntent(
  scenario: FlowCraftScenario,
  project: FlowProject
) {
  return project.userGoal.trim() !== scenario.userGoal.trim();
}

function getLayoutSource(visualNotes?: string): FlowCraftLayoutSpec["source"] {
  const text = visualNotes || "";
  const hasQwen = /Qwen visual LayoutSpec/i.test(text);
  const hasLocal = /Automated reference visual analysis/i.test(text);
  if (hasQwen && hasLocal) return "mixed";
  if (hasQwen) return "qwen-vision";
  if (hasLocal) return "local-analysis";
  return "user-notes";
}

function inferLayoutPattern(visualNotes?: string) {
  const text = visualNotes || "";
  const qwenMatch = text.match(/"layoutPattern"\s*:\s*"([^"]+)"/i);
  if (qwenMatch?.[1]) return qwenMatch[1];
  const compositionMatch = text.match(/Composition:\s*([^.;\n]+)/i);
  if (compositionMatch?.[1]) return compositionMatch[1];
  if (/sidebar|left panel|right panel/i.test(text)) return "multi-panel product shell";
  if (/hero|generator|central/i.test(text)) return "hero plus central action panel";
  if (/mobile|tall/i.test(text)) return "mobile vertical flow";
  return "reference-derived adaptive layout";
}

function buildFlowCraftLayoutSpec(
  project: FlowProject,
  scenario: FlowCraftScenario,
  visualNotes: string | undefined,
  fidelity: FlowCraftFidelityMode
): FlowCraftLayoutSpec {
  const qwenSpec = extractQwenLayoutSpec(visualNotes);
  const qwenRegions = qwenSpec?.regions || [];
  const migrationRules = splitContract(
    getFlowCraftLayoutMigrationContract(scenario.id)
  );
  const regionInputs =
    qwenRegions.length > 0
      ? qwenRegions.map((region, index) => ({
          id: region.id || `region-${index + 1}`,
          sourceRole: region.visualRole || region.id || `region ${index + 1}`,
          targetRole:
            region.transferRole ||
            `adapt this region to support the core task: ${project.userGoal}`,
          position: region.position,
          approximateSize: region.approximateSize,
          normalizedFrame:
            typeof region.normalizedFrame?.x === "number" &&
            typeof region.normalizedFrame?.y === "number" &&
            typeof region.normalizedFrame?.width === "number" &&
            typeof region.normalizedFrame?.height === "number"
              ? {
                  x: region.normalizedFrame.x,
                  y: region.normalizedFrame.y,
                  width: region.normalizedFrame.width,
                  height: region.normalizedFrame.height,
                }
              : undefined,
          // Source text is intentionally excluded. The generator only needs
          // component roles and geometry; passing OCR labels encourages it to
          // copy the reference product instead of remapping user semantics.
          detectedElements: [],
          hierarchy: region.hierarchy,
          lockPriority: region.lockPriority || (index < 4 ? "high" : "medium"),
        }))
      : hasCustomFlowCraftIntent(scenario, project)
        ? [
            ["primary navigation", "navigation supporting the core task"],
            ["main content", "primary task workspace"],
            ["primary action", "next action in the user-defined flow"],
            ["supporting content", "details required by the user brief"],
            ["feedback area", "validation, recovery, and confirmation feedback"],
          ].map(([sourceRole, targetRole], index) => ({
            id: `region-${index + 1}`,
            sourceRole,
            targetRole,
            detectedElements: [],
            lockPriority: index < 3 ? "high" : "medium",
          }))
        : migrationRules.slice(0, 9).map((rule, index) => {
            const [sourceRole, targetRole] = rule
              .split("->")
              .map((part) => part.trim());
            return {
              id: `region-${index + 1}`,
              sourceRole: sourceRole || rule,
              targetRole: targetRole || rule,
              detectedElements: [],
              lockPriority: index < 3 ? "high" : "medium",
            };
          });
  const regions = regionInputs.map((region, index) => ({
    ...region,
    priority: region.lockPriority || (index < 4 ? "high" : index < 7 ? "medium" : "low"),
  })) as FlowCraftLayoutSpec["regions"];

  const noteLines = getVisualNoteLines(visualNotes);
  return {
    source: getLayoutSource(visualNotes),
    screenshotRef: project.screenshotRef,
    visualNotes: noteLines,
    layoutPattern: inferLayoutPattern(visualNotes),
    fidelity,
    canvas: qwenSpec?.canvas,
    visualStyle: qwenSpec?.visualStyle,
    colorSystem: qwenSpec?.colorSystem,
    typography: qwenSpec?.typography,
    spacing: qwenSpec?.spacing,
    componentInventory: qwenSpec?.componentInventory || [],
    visualHierarchy: qwenSpec?.visualHierarchy || [],
    regions,
    styleDirectives: [
      "Keep the reference's surface contrast, spacing rhythm, component density, radius, and CTA emphasis.",
      "Use screenshot regions as structure and visual evidence only; the user's core task and required details own labels, entities, CTAs, states, and flow logic.",
      "Use the scenario template only to fill genuine gaps that the user brief does not define.",
      "Do not embed the screenshot as a background or preserve source-domain brand/content.",
      fidelity === "faithful"
        ? "Treat high-priority region frames, ordering, density, alignment, and design tokens as hard constraints. Do not invent a large region absent from the reference."
        : fidelity === "balanced"
          ? "Preserve major region geometry and design tokens while allowing small structural changes required by the task."
          : "Use the reference as visual inspiration while keeping its dominant composition recognizable.",
    ],
  };
}

function inferSemanticTarget(sourceRole: string, project: FlowProject) {
  const role = sourceRole.toLowerCase();
  if (/title|header|identity|heading/.test(role)) {
    return "workspace title and current launch status";
  }
  if (/tab|view|navigation/.test(role)) {
    return "Overview / Members / Launch tasks view controls";
  }
  if (/toolbar|filter|sort|action/.test(role)) {
    return "member and task filters plus the primary create action";
  }
  if (/table|row|list|group|board|content/.test(role)) {
    return "grouped launch tasks and workspace member rows";
  }
  if (/popover|menu|dialog|overlay|context/.test(role)) {
    return "permission review, dependency selection, and confirmation actions";
  }
  return `support the core task without changing this region's geometry: ${project.userGoal}`;
}

function buildFlowCraftSemanticMappingSpec(
  layoutSpec: FlowCraftLayoutSpec,
  project: FlowProject,
  fidelity: FlowCraftFidelityMode
): FlowCraftSemanticMappingSpec {
  return {
    fidelity,
    invariantRule:
      fidelity === "faithful"
        ? "Business semantics may replace copy and controls, but high-priority frames, region order, whitespace distribution, and component density are immutable."
        : "Business semantics replace source content while preserving the dominant visual hierarchy.",
    mappings: layoutSpec.regions.map((region) => ({
      sourceRegionId: region.id,
      sourceVisualRole: region.sourceRole,
      targetComponent: inferSemanticTarget(region.sourceRole, project),
      preserveGeometry: fidelity === "faithful" || region.lockPriority === "high",
      preserveOrder: fidelity !== "inspired",
    })),
  };
}

function buildFlowCraftScenarioSpec(
  scenario: FlowCraftScenario,
  project: FlowProject
): FlowCraftScenarioSpec {
  if (hasCustomFlowCraftIntent(scenario, project)) {
    return {
      id: scenario.id,
      label: scenario.label,
      userGoal: project.userGoal,
      requiredPages: [],
      primaryFlow: [project.userGoal],
      requiredStates: project.requirements,
      primaryCtas: [],
      exceptionPaths: [],
    };
  }

  return {
    id: scenario.id,
    label: scenario.label,
    userGoal: project.userGoal,
    requiredPages: scenario.pages.map((page) => page.name),
    primaryFlow: scenario.steps.map((step) => `${step.title}: ${step.action}`),
    requiredStates: scenario.requiredStates,
    primaryCtas: scenario.primaryCtas,
    exceptionPaths: scenario.exceptionPaths.map(
      (path) => `${path.trigger} -> ${path.recoveryAction}`
    ),
  };
}

function buildFlowCraftGenerationConstraints(
  scenario: FlowCraftScenario,
  project: FlowProject
): FlowCraftGenerationConstraints {
  const customIntent = hasCustomFlowCraftIntent(scenario, project);
  return {
    layoutMigrationContract: customIntent
      ? [
          "Map screenshot regions to the user-defined core task.",
          "Do not introduce template-specific pages, entities, or CTAs unless the user requested them.",
        ]
      : splitContract(getFlowCraftLayoutMigrationContract(scenario.id)),
    sourceContentGuardrails: customIntent
      ? [
          "Do not preserve source brand names or copy unless explicitly requested.",
          "Do not replace the user's product domain with the selected template's domain.",
        ]
      : splitContract(getFlowCraftSourceContentGuardrails(scenario.id)),
    runtimeQualityBars: [
      "Return one complete standalone HTML document.",
      "Use inline CSS and vanilla JavaScript for low-cost model reliability.",
      "Preserve the reference's visual richness instead of collapsing it to a sparse form.",
      "Keep major mapped regions visible when possible: nav, hero, central panel, step controls, summary/utility area, supporting cards, and sticky or prominent CTA.",
      "First render must show meaningful content without user clicks.",
      "Every referenced JavaScript selector and data field must exist.",
      "Include at least one success path and one failure/recovery state.",
    ],
  };
}

function buildFlowCraftPrototypePlan(
  layoutSpec: FlowCraftLayoutSpec,
  scenarioSpec: FlowCraftScenarioSpec,
  constraints: FlowCraftGenerationConstraints
): FlowCraftPrototypePlan {
  return {
    summary:
      "Transform the screenshot's structural layout into a scenario-native interactive prototype using explicit region mapping, not freeform cloning.",
    layoutSpec,
    scenarioSpec,
    constraints,
    screenPlan: layoutSpec.regions.slice(0, 7).map((region, index) => ({
      region: region.sourceRole,
      component: region.targetRole,
      contentSource: index < 2 ? "scenario" : "user-requirement",
      interactions:
        scenarioSpec.id === "saas"
          ? ["member and task state", "role or status selection", "validation and recovery feedback"]
          : /cart|checkout|payment|receipt|summary/i.test(region.targetRole)
          ? ["cart state", "payment failure or recovery", "confirmation feedback"]
          : /\bproduct\b(?!\s+designer)|variant|quantity|stock/i.test(region.targetRole)
            ? ["variant selection", "quantity validation", "stock or out-of-stock feedback"]
            : /recommended|bundle|review|trust/i.test(region.targetRole)
              ? ["supporting card selection", "trust detail feedback"]
              : index === 0
          ? ["navigation state", "active section feedback"]
          : index === 1
            ? ["primary CTA", "success feedback"]
            : ["state change", "validation or recovery feedback"],
    })),
  };
}

function buildFlowCraftStructuredInput(
  project: FlowProject,
  scenario: FlowCraftScenario,
  visualNotes: string | undefined,
  fidelity: FlowCraftFidelityMode
): FlowCraftStructuredInput {
  const layoutSpec = buildFlowCraftLayoutSpec(
    project,
    scenario,
    visualNotes,
    fidelity
  );
  const semanticMappingSpec = buildFlowCraftSemanticMappingSpec(
    layoutSpec,
    project,
    fidelity
  );
  const scenarioSpec = buildFlowCraftScenarioSpec(scenario, project);
  const generationConstraints = buildFlowCraftGenerationConstraints(
    scenario,
    project
  );
  const prototypePlan = buildFlowCraftPrototypePlan(
    layoutSpec,
    scenarioSpec,
    generationConstraints
  );

  return {
    authority: {
      priority: [
        "Core task",
        "Required details",
        "Screenshot visual and layout evidence",
        "Scenario template suggestions",
      ],
      conflictRule:
        "When sources conflict, follow the higher-priority source. Never force template-specific pages, entities, labels, CTAs, or states into a user-defined task.",
      scenarioTemplateRole: "fallback-only",
    },
    flowProject: project,
    layoutSpec,
    referenceDesignSpec: layoutSpec,
    semanticMappingSpec,
    scenarioSpec,
    generationConstraints,
    prototypePlan,
  };
}

export function buildFlowCraftPrompt(
  userPrompt: string,
  scenarioId: FlowCraftScenarioId,
  strategyId: FlowCraftStrategyId,
  options: PromptOptions = {}
) {
  const scenario = getFlowCraftScenario(scenarioId);
  const strategy = getFlowCraftStrategy(strategyId);
  const normalizedInputs = normalizeFlowCraftBriefInputs(
    options.requirementsText || userPrompt,
    options.visualNotes
  );
  const project = createFlowProject({
    title: options.projectTitle,
    screenshotRef: options.screenshotRef,
    visualNotes: normalizedInputs.visualNotes,
    scenarioId,
    strategyId,
    userGoal: options.userGoal,
    requirementsText: normalizedInputs.requirementsText,
  });

  const customNotes = userPrompt.trim()
    ? `\nUser notes: ${userPrompt.trim()}`
    : "";
  const visualNotes = normalizedInputs.visualNotes
    ? `\nVisual notes from the screenshot: ${normalizedInputs.visualNotes}`
    : "";
  const movedTargetNote = normalizedInputs.movedTargetNote
    ? `\nInput correction: the user wrote this in the screenshot-notes field, but it describes the target product requirement, not the screenshot visuals. Treat it as target requirements, not as visual evidence: ${normalizedInputs.movedTargetNote}`
    : "";
  const customIntent = hasCustomFlowCraftIntent(scenario, project);
  const structureGuidance = customIntent
    ? "Build the screens and interactions explicitly requested by the Core task and Additional requirements. Include clear validation, recovery, and confirmation where the user brief requires them."
    : getFlowCraftStructureGuidance(scenarioId);
  const layoutMigrationContract = customIntent
    ? "Map each major screenshot region to the user-defined Core task. Do not introduce template-specific pages, entities, or CTAs."
    : getFlowCraftLayoutMigrationContract(scenarioId);
  const sourceContentGuardrails = customIntent
    ? "Do not preserve source brand names or irrelevant source-domain wording. Do not replace the user's product domain with the selected template's domain."
    : getFlowCraftSourceContentGuardrails(scenarioId);
  const structuredInput = buildFlowCraftStructuredInput(
    project,
    scenario,
    normalizedInputs.visualNotes,
    options.fidelity || "faithful"
  );
  const templateQualifier = customIntent
    ? "Fallback only; do not introduce its domain model when it conflicts with the Core task or Additional requirements."
    : "Use these defaults where the user brief does not provide more specific direction.";

  return [
    "You are FlowCraft AI, an interaction design copilot that turns a visual reference into a new interactive prototype.",
    "Authority order (highest to lowest): Core task > Additional requirements > screenshot visual/layout evidence > scenario template suggestions.",
    "Conflict rule: when two sources disagree, obey the higher-priority source. Never force template-specific products, pages, entities, labels, CTAs, data models, or states into a user-defined task.",
    "Structured-input contract: use the FlowCraftStructuredInput JSON as the source of truth. Its authority field is mandatory. LayoutSpec comes from screenshot analysis, user intent owns product semantics and flow, GenerationConstraints define quality rules, and PrototypePlan is the implementation plan.",
    `Reference fidelity mode: ${options.fidelity || "faithful"}. In faithful mode, normalized frames, region ordering, whitespace distribution, component density, typography scale, and design tokens are hard constraints.`,
    "FlowCraft generation contract: Core task and Additional requirements supply product/domain content, labels, CTA text, data model, states, and interaction logic. The screenshot supplies layout structure and visual language. The selected scenario template is fallback guidance only.",
    "Reference policy: do not clone the screenshot pixel-for-pixel. Use it to infer layout slots, surface hierarchy, color direction, spacing rhythm, component shapes, button style, typography feel, and density. Recompose those cues around the selected scene, strategy, core task, and requirements.",
    "Visual translation policy: first identify the reference's dominant layout pattern (for example: hero + central creation panel + content cards, sidebar + content + utility panel, feed + detail pane, dashboard grid, chat workspace, checkout form, or media player shell). Preserve the useful layout skeleton, but populate it with content required by the Core task and Additional requirements.",
    "Do not collapse a rich reference into a generic template. If the screenshot has a dark immersive app shell, multi-panel structure, sticky action bar, strong card rhythm, or prominent utility rail, translate those cues into the new prototype instead of switching to an unrelated clean beige landing/product page.",
    "Scenario transformation rule: visual DNA and block layout come from the screenshot; task flow, labels, states, entities, and data model come from the Core task and Additional requirements. Scenario defaults may fill omissions but may not replace user intent.",
    "Reference block mapping requirement: preserve the reference's major visible regions and convert their roles. If the reference has top navigation, left library/sidebar, central hero/content panel, right promo/detail panel, and a bottom action bar, the generated prototype should keep a comparable composition, spacing density, panel proportions, and palette relationship while changing the text, products, CTAs, and interactions to the chosen scenario.",
    `Layout migration contract: ${layoutMigrationContract}`,
    `Source-content guardrails: ${sourceContentGuardrails}`,
    "Color and surface fidelity requirement: keep the reference's dominant background/surface contrast and accent relationships unless they conflict with readability. Do not introduce an unrelated palette. For example, a black/dark-gray interface with bright green or blue accents should remain a dark, high-contrast interface with similar accent energy.",
    "Quality floor: do not output a sparse two-card layout when the reference has a rich multi-panel layout. Do not output oversized empty areas, placeholder emoji product art, or generic centered cards unless the reference itself uses that structure.",
    `Scenario template: ${scenario.label}. ${scenario.description} ${templateQualifier}`,
    `Typical user: ${scenario.typicalUser}`,
    `Optimization preference: ${strategy.label}. ${strategy.description}`,
    `Core task: ${project.userGoal}`,
    customIntent ? "" : `Key pages: ${scenario.pages
      .map(
        (page) =>
          `${page.name} (purpose: ${page.purpose}; primary CTA: ${page.primaryCta}; key elements: ${page.keyElements.join(", ")})`
      )
      .join(" | ")}`,
    customIntent ? "" : `Primary flow steps: ${scenario.steps
      .map((step) => `${step.title} (${step.action})`)
      .join(" -> ")}`,
    customIntent ? "" : `Primary CTAs: ${scenario.primaryCtas.join("; ")}`,
    customIntent ? "" : `Success path: ${scenario.successPath.join(" -> ")}`,
    customIntent ? "" : `Exception paths: ${scenario.exceptionPaths
      .map(
        (path) =>
          `${path.trigger} => feedback: ${path.userFeedback}; recovery: ${path.recoveryAction}`
      )
      .join(" | ")}`,
    customIntent ? "" : `Required interaction states: ${scenario.requiredStates.join("; ")}`,
    customIntent ? "" : `Risk checks: ${scenario.riskChecks.join("; ")}`,
    `Strategy principles: ${strategy.principles.join("; ")}`,
    `Selected strategy impact: ${
      scenario.strategyVariants.find((variant) => variant.strategyId === strategyId)
        ?.flowImpact ?? strategy.priority
    }`,
    `Selected strategy CTA treatment: ${
      scenario.strategyVariants.find((variant) => variant.strategyId === strategyId)
        ?.ctaTreatment ?? "Use CTA treatment that matches the selected strategy."
    }`,
    `Tradeoff: ${strategy.tradeoff}`,
    `Prototype structure requirements: ${structureGuidance}`,
    `Additional requirements: ${project.requirements.join("; ")}`,
    visualNotes.trim(),
    movedTargetNote.trim(),
    customNotes.trim(),
    "Build a runnable interactive prototype, not a static copy. The result should feel inspired by the reference but should be redesigned for the FlowCraft brief. Include clickable controls, visible state changes, validation or failure states, and confirmation/recovery paths that match the scenario.",
    "Final semantic audit before returning code: no source-product words should remain unless they are purely generic navigation labels. Every primary CTA must belong to the selected scenario. Every large reference block must be mapped to a scenario block rather than copied as source content.",
    "Runtime quality bar: the first render must show meaningful content on mobile and desktop, every JavaScript data field referenced by the UI must be defined, and the initial view must not fail if a user never clicks anything.",
    "Responsive quality bar: do not leave the mobile first viewport as an empty decorative background. Show the title, primary action, and first useful content within the initial viewport.",
    "Completeness quality bar: return a complete standalone document. If using plain HTML, include <!DOCTYPE html>, <html>, <body>, <main id=\"app\">, inline CSS, defensive JavaScript, and a closing </html>. Prefer a compact complete prototype over a long decorative page.",
    "Dependency quality bar: for DeepSeek or low-cost models, prefer inline CSS and vanilla JavaScript over Tailwind CDN or remote assets so the result opens reliably from a saved local HTML file.",
    `ReferenceDesignSpecJSON: ${JSON.stringify(structuredInput.referenceDesignSpec)}`,
    `SemanticMappingSpecJSON: ${JSON.stringify(structuredInput.semanticMappingSpec)}`,
    "Structured generation inputs:",
    JSON.stringify(structuredInput, null, 2),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getFlowCraftLayoutMigrationContract(scenarioId: FlowCraftScenarioId) {
  if (scenarioId === "ecommerce") {
    return [
      "top navigation -> ecommerce category/account navigation",
      "large hero title -> product or collection value proposition",
      "central creation/input panel -> product detail and variant/add-to-cart panel",
      "tabbed creation modes -> Product, Cart, Checkout steps",
      "prompt textarea or media input -> product options, quantity, shipping/payment fields",
      "primary create button -> Add to cart, Proceed to checkout, or Pay now depending on step",
      "trending/media cards -> recommended products, bundles, reviews, or trust cards",
      "right utility panel if present -> cart summary, delivery promise, payment recovery, or receipt",
      "bottom action strip if present -> sticky cart total and checkout controls",
    ].join("; ");
  }

  if (scenarioId === "learning") {
    return [
      "top navigation -> course categories/account navigation",
      "large hero title -> course outcome or learning path value proposition",
      "central creation/input panel -> course detail, trial lesson, and enrollment panel",
      "tabbed creation modes -> Overview, Trial, Enroll steps",
      "prompt textarea or media input -> learner goal, lesson preview, or enrollment fields",
      "primary create button -> Start free trial lesson, Continue to enrollment, or Confirm enrollment",
      "trending/media cards -> popular lessons, instructor proof, modules, or learner outcomes",
      "right utility panel if present -> progress, prerequisites, schedule, or next-step summary",
      "bottom action strip if present -> sticky lesson progress and enrollment controls",
    ].join("; ");
  }

  if (scenarioId === "ai-tool") {
    return [
      "top navigation -> AI workspace history, tools, and account navigation",
      "large hero title -> AI task value proposition or current workspace status",
      "central creation/input panel -> task composer, generation progress, and result review",
      "tabbed creation modes -> Compose, Result, Refine steps",
      "prompt textarea or media input -> AI task composer and supporting attachments",
      "primary create button -> Generate result, Refine result, or Confirm upgrade",
      "trending/media cards -> example tasks, recent results, capabilities, or plan benefits",
      "right utility panel if present -> generation settings, usage status, or result details",
      "bottom action strip if present -> sticky composer, retry, save, or upgrade controls",
    ].join("; ");
  }

  if (scenarioId === "saas") {
    return [
      "top navigation -> workspace, team, and account navigation",
      "large hero title -> team activation or workspace status",
      "central creation/input panel -> teammate email, role selection, and permission review",
      "tabbed creation modes -> Members, Invite, Permissions steps",
      "prompt textarea or media input -> email, role, and access controls",
      "primary create button -> Invite teammate, Review invitation, or Send invitation",
      "trending/media cards -> member rows, teams, roles, or workspace activity",
      "right utility panel if present -> seat usage, permission summary, or invite status",
      "bottom action strip if present -> sticky review, send, retry, or revoke controls",
    ].join("; ");
  }

  return [
    "top navigation -> finance product/account navigation",
    "large hero title -> financial goal or advisory value proposition",
    "central creation/input panel -> goal intake, risk inputs, and review panel",
    "tabbed creation modes -> Goal, Risk, Review steps",
    "prompt textarea or media input -> amount, horizon, risk tolerance, consent, or contact fields",
    "primary create button -> Check fit, Review recommendation, or Confirm plan",
    "trending/media cards -> plan options, risk education, trust proof, or next actions",
    "right utility panel if present -> summary, risk explanation, consent status, or confirmation receipt",
    "bottom action strip if present -> sticky review and confirmation controls",
  ].join("; ");
}

function getFlowCraftSourceContentGuardrails(scenarioId: FlowCraftScenarioId) {
  const base =
    "Do not preserve source brand names, source product names, source marketing headlines, or source-domain CTAs from the screenshot. Use the screenshot's block roles, not its business meaning.";

  if (scenarioId === "ecommerce") {
    return `${base} For ecommerce, avoid leftover source-domain terms such as video generator, create video, create image, ads agent, go viral, prompt, render, playlist, lesson, or risk assessment. Replace them with product, cart, checkout, payment, delivery, stock, variant, receipt, and recovery language.`;
  }

  if (scenarioId === "learning") {
    return `${base} For learning, avoid leftover source-domain terms such as shopping cart, checkout, payment, video generator, create image, ads agent, portfolio allocation, or risk score. Replace them with course, lesson, trial, progress, enrollment, syllabus, instructor, and resume/retry language.`;
  }

  if (scenarioId === "ai-tool") {
    return `${base} For AI tools, avoid leftover source-domain terms such as add to cart, enrollment, risk assessment, or member invitation. Replace them with task, prompt, generate, progress, result, refine, usage, plan, upgrade, retry, and confirmation language.`;
  }

  if (scenarioId === "saas") {
    return `${base} For SaaS collaboration, avoid leftover source-domain terms such as add to cart, course lesson, risk score, or generation prompt. Replace them with workspace, teammate, member, role, permission, invitation, pending, resend, revoke, and activation language.`;
  }

  return `${base} For finance, avoid leftover source-domain terms such as add to cart, checkout, video generator, create image, course lesson, enrollment, or trending media. Replace them with goal, amount, horizon, risk, recommendation, consent, review, and confirmation language.`;
}

function getFlowCraftStructureGuidance(scenarioId: FlowCraftScenarioId) {
  if (scenarioId === "ecommerce") {
    return [
      "Use a commerce-specific flow: product detail, plan or SKU choice, cart review, quantity validation, checkout/payment, failure recovery, and order confirmation.",
      "The UI should include price, selected item summary, cart total, edit/back path, payment error, retry, and receipt.",
      "If the reference is a media, dashboard, social, or productivity app, translate its shell into ecommerce instead of discarding it: navigation becomes category browsing, the main stage becomes featured product or collection detail, side panels become cart/recommendations/trust modules, and bottom controls become sticky cart or checkout controls.",
      "For a Spotify-like reference, preserve the dark app shell, left navigation/library panel, central large hero/collection panel, right promotion or cart panel, and bottom sticky action bar. Convert them into ecommerce: left category/account navigation, center featured product or collection with product rows, right cart/recommendation/trust panel, bottom checkout or cart control strip.",
      "Do not solve ecommerce as a generic blue landing page or an unrelated minimal boutique page unless the reference itself strongly suggests that visual language.",
    ].join(" ");
  }

  if (scenarioId === "learning") {
    return [
      "Use an education-specific flow: course overview, module shortcuts, guided trial lesson, progress indicator, prerequisite warning, enrollment review, and resume/retry path.",
      "The UI should include lesson state, answer/check interaction or preview task, progress feedback, enrollment CTA, and next lesson confirmation.",
      "Do not solve learning as a generic signup or commerce checkout page.",
    ].join(" ");
  }

  if (scenarioId === "ai-tool") {
    return [
      "Use an AI-product flow: task composer, input validation, generation progress, result review, refinement, failure recovery, plan comparison, and upgrade confirmation.",
      "The UI should include a usable composer, visible loading and failure states, result actions, usage or plan context, billing choice, and confirmation feedback.",
      "Do not solve an AI tool as a decorative landing page with no runnable generation or upgrade interaction.",
    ].join(" ");
  }

  if (scenarioId === "saas") {
    return [
      "Use a SaaS collaboration flow: member list, invite entry, email validation, role selection, permission warning, review, send status, retry, and revoke.",
      "The UI should include current member status, pending invitations, clear access summaries, and recoverable send failures.",
      "Do not solve SaaS collaboration as a generic analytics dashboard without a working invitation flow.",
    ].join(" ");
  }

  return [
    "Use a finance-specific flow: goal intake, amount/horizon/risk inputs, inline validation, risk mismatch warning, review-before-submit, consent, and confirmation receipt.",
    "The UI should include editable answers, risk explanation, conservative recovery path, submit blocking until required consent, and follow-up confirmation.",
    "Do not solve finance as a generic SaaS dashboard or simple contact form.",
  ].join(" ");
}

export function buildFlowCraftTextPrompt(
  userPrompt: string,
  scenarioId: FlowCraftScenarioId,
  strategyId: FlowCraftStrategyId,
  options: PromptOptions = {}
) {
  return buildFlowCraftPrompt(userPrompt, scenarioId, strategyId, {
    ...options,
    requirementsText: options.requirementsText || userPrompt,
  });
}
