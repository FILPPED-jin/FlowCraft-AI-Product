/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import {
  LuAlertTriangle,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuInfo,
  LuClipboardCheck,
  LuDownload,
  LuWrench,
} from "react-icons/lu";
import {
  FLOWCRAFT_PREFERENCES,
  FLOWCRAFT_SCENARIOS,
  FlowCraftPreference,
  FlowCraftScenario,
  FlowCraftStructuredInput,
} from "../../lib/flowcraft";
import {
  FlowCraftBehaviorAudit,
  runFlowCraftBehaviorAudit,
} from "../../lib/flowcraft-behavior-eval";
import { calculateFlowCraftBusinessMetrics } from "../../lib/flowcraft-benchmark";
import { getFlowCraftTaskPlanForBrief } from "../../lib/flowcraft-task-plans";
import {
  buildFlowCraftBenchmarkExport,
  FlowCraftCaseClassification,
  FlowCraftBenchmarkRun,
  FlowCraftManualRating,
  FlowCraftRootCause,
  fetchFlowCraftBenchmarkRuns,
  listFlowCraftBenchmarkRuns,
  migrateLocalFlowCraftBenchmarkRuns,
  saveFlowCraftBenchmarkRun,
  summarizeFlowCraftBenchmarkRuns,
} from "../../lib/flowcraft-benchmark-storage";
import { useAppStore } from "../../store/app-store";

interface Props {
  promptText?: string;
  code?: string;
  baselineCode?: string;
  generationDurationMs?: number | null;
  modelName?: string;
  repairAttempts?: number;
  currentVersionId?: string;
  isGenerating?: boolean;
  onAutoRepair?: (instruction: string) => void;
  onSelectVersion?: (versionId: string) => void;
}

interface AutoRepairRun {
  active: boolean;
  attempts: number;
  sourceCode: string;
  bestScore: number;
  bestVersionId: string;
  status: "idle" | "repairing" | "complete" | "rolled-back";
}

interface LayoutCoverage {
  topNavigation: boolean;
  heroOrValueProposition: boolean;
  centralTaskPanel: boolean;
  summaryOrUtilityPanel: boolean;
  supportingCards: boolean;
}

const CASE_CLASSIFICATIONS: Array<{
  id: FlowCraftCaseClassification;
  label: string;
}> = [
  { id: "good", label: "Good" },
  { id: "boundary", label: "Boundary" },
  { id: "bad", label: "Bad" },
];

const ROOT_CAUSES: Array<{ id: FlowCraftRootCause; label: string }> = [
  { id: "requirement-parsing", label: "Requirement parsing" },
  { id: "visual-understanding", label: "Visual understanding" },
  { id: "semantic-mapping", label: "Semantic mapping" },
  { id: "code-generation", label: "Code generation" },
  { id: "evaluation-error", label: "Evaluation error" },
];

export interface FlowCraftEvalReport {
  scenario: FlowCraftScenario;
  preference: FlowCraftPreference;
  scores: {
    taskCoverage: number;
    stateCoverage: number;
    feedbackCoverage: number;
    overall: number;
  };
  coveredStates: string[];
  missingStates: string[];
  missingPrimaryCtas: string[];
  sourceTermLeaks: string[];
  layoutCoverage: LayoutCoverage;
  hasSuccessPath: boolean;
  hasRecoveryPath: boolean;
  prioritySummary: string;
  implementedGoal: string;
  repairInstructions: string[];
  repairPrompt: string;
  evaluationBasis: "user-brief" | "scenario-template";
  coreTask: string;
  requiredDetails: string[];
}

interface EvaluationTarget {
  coreTask: string;
  requiredStates: string[];
  primaryCtas: string[];
  goals: string[];
  feedbackTerms: string[];
  evaluationBasis: "user-brief" | "scenario-template";
}

const STRUCTURED_INPUT_MARKER = "Structured generation inputs:\n\n";
const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "be", "before", "by", "for", "from",
  "in", "into", "it", "of", "on", "or", "the", "then", "to", "with",
  "include", "show", "complete", "start", "open", "choose", "user",
]);

function findScenario(promptText: string): FlowCraftScenario | null {
  return (
    FLOWCRAFT_SCENARIOS.find((scenario) =>
      promptText.includes(`Scenario template: ${scenario.label}`)
    ) ?? null
  );
}

function findPreference(promptText: string): FlowCraftPreference | null {
  return (
    FLOWCRAFT_PREFERENCES.find((preference) =>
      promptText.includes(`Optimization preference: ${preference.label}`)
    ) ?? null
  );
}

function parseStructuredInput(promptText: string): FlowCraftStructuredInput | null {
  const markerIndex = promptText.indexOf(STRUCTURED_INPUT_MARKER);
  if (markerIndex < 0) return null;

  try {
    return JSON.parse(
      promptText.slice(markerIndex + STRUCTURED_INPUT_MARKER.length)
    ) as FlowCraftStructuredInput;
  } catch {
    return null;
  }
}

function isCustomEvaluationTarget(
  structuredInput: FlowCraftStructuredInput,
  scenario: FlowCraftScenario
) {
  return (
    structuredInput.scenarioSpec.primaryFlow.length === 1 &&
    structuredInput.scenarioSpec.primaryFlow[0] ===
      structuredInput.flowProject.userGoal &&
    structuredInput.flowProject.userGoal.trim().toLowerCase() !==
      scenario.userGoal.trim().toLowerCase()
  );
}

function getEvaluationTarget(
  promptText: string,
  scenario: FlowCraftScenario
): EvaluationTarget {
  const structuredInput = parseStructuredInput(promptText);
  if (structuredInput && isCustomEvaluationTarget(structuredInput, scenario)) {
    const requiredStates = structuredInput.scenarioSpec.requiredStates.filter(Boolean);
    return {
      coreTask: structuredInput.flowProject.userGoal,
      requiredStates,
      primaryCtas: structuredInput.scenarioSpec.primaryCtas,
      goals: [structuredInput.flowProject.userGoal],
      feedbackTerms: requiredStates.filter((detail) =>
        /success|confirm|feedback|validation|failure|error|recovery|selected|成功|确认|反馈|校验|失败|恢复|选中/i.test(
          detail
        )
      ),
      evaluationBasis: "user-brief",
    };
  }

  const terms = getScenarioTerms(scenario);
  return {
    coreTask: scenario.userGoal,
    requiredStates: scenario.requiredStates,
    primaryCtas: scenario.primaryCtas,
    goals: terms.goals,
    feedbackTerms: terms.feedback,
    evaluationBasis: "scenario-template",
  };
}

function normalizeText(value = "") {
  return value.toLowerCase().replace(/\s+/g, " ");
}

function getMeaningfulTokens(value: string) {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function getPhraseMatchRatio(source: string, phrase: string) {
  const normalizedPhrase = normalizeText(phrase);
  if (source.includes(normalizedPhrase)) return 1;
  const tokens = getMeaningfulTokens(phrase);
  if (tokens.length === 0) return 0;
  return tokens.filter((token) => source.includes(token)).length / tokens.length;
}

function isRequirementCovered(source: string, requirement: string) {
  return getPhraseMatchRatio(source, requirement) >= 0.55;
}

function includesAny(source: string, terms: string[]) {
  return terms.some((term) => source.includes(term.toLowerCase()));
}

function getCoverageScore(source: string, terms: string[]) {
  if (terms.length === 0) {
    return 100;
  }

  const coverage = terms.reduce(
    (total, term) => total + getPhraseMatchRatio(source, term),
    0
  );
  return Math.round((coverage / terms.length) * 100);
}

function getScenarioTerms(scenario: FlowCraftScenario) {
  return {
    goals: scenario.goals,
    states: [
      ...scenario.requiredStates,
      ...scenario.missingStates,
      ...scenario.exceptionPaths.flatMap((path) => [
        path.trigger,
        path.userFeedback,
        path.recoveryAction,
      ]),
    ],
    feedback: [
      ...scenario.primaryCtas,
      ...scenario.successPath,
      ...scenario.exceptionPaths.map((path) => path.recoveryAction),
    ],
  };
}

function getPrioritySummary(
  target: EvaluationTarget,
  preference: FlowCraftPreference,
  code = ""
) {
  const source = normalizeText(code);
  const missingRequiredStates = target.requiredStates.filter(
    (state) => !isRequirementCovered(source, state)
  );
  const missingPrimaryCtas = target.primaryCtas.filter(
    (cta) => !isRequirementCovered(source, cta)
  );

  if (missingRequiredStates.length > 0) {
    return `First improve state coverage: ${missingRequiredStates
      .slice(0, 2)
      .join(", ")}.`;
  }

  if (missingPrimaryCtas.length > 0) {
    return `Clarify the next action: ${missingPrimaryCtas[0]}.`;
  }

  return `${target.coreTask} ${preference.priority}`;
}

function getImplementedGoal(
  target: EvaluationTarget,
  scenario: FlowCraftScenario,
  preference: FlowCraftPreference,
  code = ""
) {
  const source = normalizeText(code);
  const strategyVariant = scenario.strategyVariants.find(
    (variant) => variant.strategyId === preference.id
  );
  const matchedCta = target.primaryCtas.find((cta) =>
    isRequirementCovered(source, cta)
  );

  if (matchedCta) {
    return `Supports the ${scenario.label.toLowerCase()} path around "${matchedCta}" while applying the ${preference.label.toLowerCase()} strategy.`;
  }

  if (target.evaluationBasis === "user-brief") {
    return `Evaluates the generated prototype against the user-authored task: ${target.coreTask}`;
  }

  return (
    strategyVariant?.flowImpact ??
    `Applies ${preference.label.toLowerCase()} principles to the ${scenario.label.toLowerCase()} flow.`
  );
}

function getSourceTermLeaks(scenario: FlowCraftScenario, source: string) {
  const termsByScenario: Record<FlowCraftScenario["id"], string[]> = {
    ecommerce: [
      "creati",
      "go viral",
      "create video",
      "create image",
      "ads agent",
      "video generator",
      "veo3",
      "render video",
    ],
    learning: [
      "add to cart",
      "checkout",
      "payment method",
      "create video",
      "ads agent",
      "portfolio allocation",
      "risk score",
    ],
    finance: [
      "add to cart",
      "checkout",
      "create video",
      "create image",
      "course lesson",
      "enrollment",
      "trending media",
    ],
    "ai-tool": [
      "add to cart",
      "checkout",
      "course lesson",
      "enrollment",
      "risk assessment",
      "invite teammate",
    ],
    saas: [
      "add to cart",
      "checkout",
      "course lesson",
      "risk score",
      "generate image",
      "upgrade plan",
    ],
  };

  return termsByScenario[scenario.id].filter((term) => source.includes(term));
}

function getLayoutCoverage(source: string): LayoutCoverage {
  return {
    topNavigation: includesAny(source, ["<nav", "navigation", "account", "categories"]),
    heroOrValueProposition: includesAny(source, ["hero", "collection", "featured", "value proposition"]),
    centralTaskPanel: includesAny(source, ["quantity", "variant", "enroll", "risk", "checkout", "trial", "prompt", "generate", "invite", "role", "permission"]),
    summaryOrUtilityPanel: includesAny(source, ["summary", "total", "progress", "recommendation", "receipt", "usage", "result", "member", "pending"]),
    supportingCards: includesAny(source, ["recommended", "reviews", "trust", "modules", "insight", "proof", "capabilities", "plans", "teams", "activity"]),
  };
}

function buildRepairPrompt(
  scenario: FlowCraftScenario,
  target: EvaluationTarget,
  repairInstructions: string[]
) {
  return [
    "FlowCraft EvalReport repair request:",
    `Scenario: ${scenario.label}.`,
    `Evaluation source: ${target.evaluationBasis === "user-brief" ? "Core task and Required details" : "scenario template defaults"}.`,
    `Core task: ${target.coreTask}`,
    "Preserve the current layout, color system, spacing, typography, content density, and every working interaction.",
    "Preserve the original generated version as the baseline. Apply this repair as a new child version so the before/after result remains comparable.",
    "Do not regenerate the page from scratch. Make the smallest targeted code changes needed to fix only the gaps below:",
    ...repairInstructions.map((instruction, index) => `${index + 1}. ${instruction}`),
    "Keep all current major regions visible and return one complete runnable HTML document.",
  ].join("\n");
}

export function buildFlowCraftEvalReport(
  promptText = "",
  code = ""
): FlowCraftEvalReport | null {
  const scenario = findScenario(promptText);
  const preference = findPreference(promptText);

  if (!scenario || !preference) {
    return null;
  }

  const source = normalizeText(code);
  const target = getEvaluationTarget(promptText, scenario);
  const taskCoverage = getCoverageScore(source, target.goals);
  const stateCoverage = getCoverageScore(source, target.requiredStates);
  const feedbackCoverage = getCoverageScore(source, target.feedbackTerms);
  const coveredStates = target.requiredStates.filter((state) =>
    isRequirementCovered(source, state)
  );
  const missingStates = target.requiredStates.filter(
    (state) => !isRequirementCovered(source, state)
  );
  const missingPrimaryCtas = target.primaryCtas.filter(
    (cta) => !isRequirementCovered(source, cta)
  );
  const sourceTermLeaks =
    target.evaluationBasis === "scenario-template"
      ? getSourceTermLeaks(scenario, source)
      : [];
  const layoutCoverage = getLayoutCoverage(source);
  const missingLayoutRegions = Object.entries(layoutCoverage)
    .filter(([, isPresent]) => !isPresent)
    .map(([region]) => region.replace(/([A-Z])/g, " $1").toLowerCase());
  const repairableMissingLayoutRegions =
    target.evaluationBasis === "scenario-template" ? missingLayoutRegions : [];
  const hasSuccessPath = includesAny(source, [
    "success",
    "confirmed",
    "complete",
    "receipt",
  ]);
  const hasRecoveryPath = includesAny(source, [
    "retry",
    "edit",
    "back",
    "recover",
  ]);
  const repairInstructions = [
    ...missingStates.map(
      (state) =>
        `Add an explicit "${state}" state with visible feedback and a usable next action.`
    ),
    ...missingPrimaryCtas.map(
      (cta) => `Add or clarify the primary CTA "${cta}" in the relevant step.`
    ),
    ...sourceTermLeaks.map(
      (term) =>
        `Remove the leftover source-domain term "${term}" and replace it with ${scenario.label.toLowerCase()} wording.`
    ),
    ...repairableMissingLayoutRegions.map(
      (region) =>
        `Restore a clear ${region} region without changing the established visual language.`
    ),
    ...(!hasSuccessPath
      ? ["Add a visible success confirmation with a clear next step."]
      : []),
    ...(!hasRecoveryPath
      ? ["Add a retry, edit, or back path for recoverable failures."]
      : []),
  ];
  const normalizedRepairInstructions =
    repairInstructions.length > 0
      ? repairInstructions
      : [
          "Keep the current implementation and improve microcopy and feedback clarity without changing its structure.",
        ];

  return {
    scenario,
    preference,
    scores: {
      taskCoverage,
      stateCoverage,
      feedbackCoverage,
      overall: Math.round(
        taskCoverage * 0.35 + stateCoverage * 0.4 + feedbackCoverage * 0.25
      ),
    },
    coveredStates,
    missingStates,
    missingPrimaryCtas,
    sourceTermLeaks,
    layoutCoverage,
    hasSuccessPath,
    hasRecoveryPath,
    prioritySummary: getPrioritySummary(target, preference, code),
    implementedGoal: getImplementedGoal(target, scenario, preference, code),
    repairInstructions: normalizedRepairInstructions,
    repairPrompt: buildRepairPrompt(
      scenario,
      target,
      normalizedRepairInstructions
    ),
    evaluationBasis: target.evaluationBasis,
    coreTask: target.coreTask,
    requiredDetails: target.requiredStates,
  };
}

function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const barClass =
    score >= 80
      ? "bg-emerald-500 dark:bg-emerald-400"
      : score >= 50
        ? "bg-amber-400 dark:bg-amber-300"
        : "bg-red-500 dark:bg-red-400";
  const scoreClass =
    score >= 80
      ? "text-emerald-700 dark:text-emerald-400"
      : score >= 50
        ? "text-amber-700 dark:text-amber-300"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-gray-700 dark:text-zinc-200">
          {label}
        </span>
        <span className={`font-semibold tabular-nums ${scoreClass}`}>
          {score}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function StatusRow({
  title,
  detail,
  passed,
}: {
  title: string;
  detail: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          passed
            ? "bg-emerald-500 text-white"
            : "bg-amber-400 text-white"
        }`}
      >
        {passed ? <LuCheck className="size-4" /> : <LuAlertTriangle className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-4 text-gray-500 dark:text-zinc-400">
          {detail}
        </p>
      </div>
    </div>
  );
}

export default function FlowCraftDiagnosis({
  promptText = "",
  code = "",
  baselineCode = "",
  generationDurationMs = null,
  modelName = "Unknown model",
  repairAttempts = 0,
  currentVersionId = "",
  isGenerating = false,
  onAutoRepair,
  onSelectVersion,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [repairPrepared, setRepairPrepared] = useState(false);
  const [behaviorAudit, setBehaviorAudit] =
    useState<FlowCraftBehaviorAudit | null>(null);
  const [isBehaviorAuditRunning, setIsBehaviorAuditRunning] = useState(false);
  const [manualRating, setManualRating] = useState<FlowCraftManualRating>({
    visualQuality: 0,
    interactionQuality: 0,
    businessCompleteness: 0,
  });
  const [benchmarkRuns, setBenchmarkRuns] = useState(() =>
    listFlowCraftBenchmarkRuns()
  );
  const [benchmarkSaved, setBenchmarkSaved] = useState(false);
  const [latestSavedRun, setLatestSavedRun] =
    useState<FlowCraftBenchmarkRun | null>(null);
  const [caseClassification, setCaseClassification] =
    useState<FlowCraftCaseClassification | null>(null);
  const [rootCauses, setRootCauses] = useState<FlowCraftRootCause[]>([]);
  const [auditCode, setAuditCode] = useState("");
  const [autoRepairRun, setAutoRepairRun] = useState<AutoRepairRun>({
    active: false,
    attempts: 0,
    sourceCode: "",
    bestScore: 0,
    bestVersionId: "",
    status: "idle",
  });
  const autoRepairDispatchRef = useRef("");

  useEffect(() => {
    let active = true;
    migrateLocalFlowCraftBenchmarkRuns().then((runs) => {
      if (active) setBenchmarkRuns(runs);
    });
    return () => {
      active = false;
    };
  }, []);
  const setUpdateInstruction = useAppStore(
    (state) => state.setUpdateInstruction
  );
  const report = buildFlowCraftEvalReport(promptText, code);
  const taskPlan = report
    ? getFlowCraftTaskPlanForBrief(
        report.scenario.id,
        report.coreTask,
        report.requiredDetails
      )
    : null;
  const baselineReport = baselineCode.trim()
    ? buildFlowCraftEvalReport(promptText, baselineCode)
    : null;

  useEffect(() => {
    let cancelled = false;
    setBehaviorAudit(null);
    if (!code.trim()) return () => undefined;

    setIsBehaviorAuditRunning(true);
    const watchdog = window.setTimeout(() => {
      if (cancelled) return;
      setBehaviorAudit({
        runtimePassed: false,
        interactiveControls: 0,
        testedControls: 0,
        stateChangingControls: 0,
        usableInputs: 0,
        successCueDetected: false,
        recoveryCueDetected: false,
        behaviorScore: 0,
        taskExecution: null,
        notes: [
          "Behavior replay exceeded the 10 second evaluation limit and was classified for review.",
        ],
      });
      setAuditCode(code);
      setIsBehaviorAuditRunning(false);
    }, 10_000);
    runFlowCraftBehaviorAudit(code, taskPlan).then((audit) => {
      if (cancelled) return;
      window.clearTimeout(watchdog);
      setBehaviorAudit(audit);
      setAuditCode(code);
      setIsBehaviorAuditRunning(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };
  }, [code, taskPlan]);

  useEffect(() => {
    setBenchmarkSaved(false);
    setLatestSavedRun(null);
    setCaseClassification(null);
    setRootCauses([]);
  }, [currentVersionId]);

  useEffect(() => {
    const taskExecution = behaviorAudit?.taskExecution;
    if (
      !report ||
      !autoRepairRun.active ||
      isGenerating ||
      isBehaviorAuditRunning ||
      auditCode !== code ||
      code === autoRepairRun.sourceCode ||
      !taskExecution
    ) {
      return;
    }

    const score = Math.round(
      report.scores.overall * 0.55 + behaviorAudit.behaviorScore * 0.45
    );
    const improved = score >= autoRepairRun.bestScore;
    const staticGapCount =
      report.missingStates.length +
      report.missingPrimaryCtas.length +
      report.sourceTermLeaks.length +
      (report.hasSuccessPath ? 0 : 1) +
      (report.hasRecoveryPath ? 0 : 1);
    const failedSteps = taskExecution.steps.filter((step) => !step.passed);
    const stillHasGaps = !taskExecution.pathCompleted || staticGapCount > 0;

    if (!improved) {
      if (autoRepairRun.bestVersionId) {
        onSelectVersion?.(autoRepairRun.bestVersionId);
      }
      setAutoRepairRun((current) => ({
        ...current,
        active: false,
        status: "rolled-back",
      }));
      return;
    }

    if (stillHasGaps && autoRepairRun.attempts < 2 && onAutoRepair) {
      if (autoRepairDispatchRef.current === code) return;
      const behaviorRepairs = failedSteps.map(
        (step, index) =>
          `${index + 1}. Make the task step "${step.label}" executable. Current replay result: ${step.detail}`
      );
      const instruction = behaviorRepairs.length
        ? `${report.repairPrompt}\n\nBehavior replay gaps:\n${behaviorRepairs.join("\n")}`
        : report.repairPrompt;
      autoRepairDispatchRef.current = code;
      setUpdateInstruction(instruction);
      setAutoRepairRun((current) => ({
        ...current,
        attempts: current.attempts + 1,
        sourceCode: code,
        bestScore: score,
        bestVersionId: currentVersionId,
        status: "repairing",
      }));
      onAutoRepair(instruction);
      return;
    }

    setAutoRepairRun((current) => ({
      ...current,
      active: false,
      bestScore: score,
      bestVersionId: currentVersionId,
      status: "complete",
    }));
  }, [
    auditCode,
    autoRepairRun,
    behaviorAudit,
    code,
    currentVersionId,
    isBehaviorAuditRunning,
    isGenerating,
    onAutoRepair,
    onSelectVersion,
    report,
    setUpdateInstruction,
  ]);

  if (!report) {
    return null;
  }

  const {
    scenario,
    preference,
    scores,
    coveredStates,
    missingStates,
    missingPrimaryCtas,
    sourceTermLeaks,
    layoutCoverage,
    hasSuccessPath,
    hasRecoveryPath,
    prioritySummary,
    implementedGoal,
    repairInstructions,
    repairPrompt,
    evaluationBasis,
    coreTask,
  } = report;
  const businessMetrics = calculateFlowCraftBusinessMetrics({
    taskCoverage: scores.taskCoverage,
    stateCoverage: scores.stateCoverage,
    behaviorAudit,
    baselineOverall: baselineReport?.scores.overall,
    currentOverall: scores.overall,
  });
  const strategyVariant = scenario.strategyVariants.find(
    (variant) => variant.strategyId === preference.id
  );
  const layoutRegionCount = Object.values(layoutCoverage).filter(Boolean).length;
  const missingLayoutRegions = Object.entries(layoutCoverage)
    .filter(([, isPresent]) => !isPresent)
    .map(([region]) => region.replace(/([A-Z])/g, " $1").toLowerCase());
  const reportableMissingLayoutRegions =
    evaluationBasis === "scenario-template" ? missingLayoutRegions : [];
  const gapItems = [
    ...missingStates.map((state) => ({
      title: state,
      detail: "Required state is not represented in the current prototype.",
    })),
    ...missingPrimaryCtas.map((cta) => ({
      title: cta,
      detail: "Primary action is missing or is not clear enough.",
    })),
    ...sourceTermLeaks.map((term) => ({
      title: term,
      detail: "Source-domain wording remains in the generated result.",
    })),
    ...reportableMissingLayoutRegions.map((region) => ({
      title: region,
      detail: "This structural region was not detected in the prototype.",
    })),
    ...(!hasSuccessPath
      ? [{ title: "Success feedback", detail: "A clear completion state was not detected." }]
      : []),
    ...(!hasRecoveryPath
      ? [{ title: "Recovery path", detail: "Retry, edit, or back actions were not detected." }]
      : []),
    ...(behaviorAudit?.taskExecution?.steps
      .filter((step) => !step.passed)
      .map((step) => ({
        title: step.label,
        detail: step.detail,
      })) ?? []),
  ];
  const flowPassed =
    scores.taskCoverage >= 75 &&
    missingPrimaryCtas.length === 0 &&
    (behaviorAudit?.taskExecution?.pathCompleted ?? false);
  const recoveryPassed =
    (behaviorAudit?.successCueDetected ?? hasSuccessPath) &&
    (behaviorAudit?.recoveryCueDetected ?? hasRecoveryPath);
  const runtimePassed = behaviorAudit?.runtimePassed ?? code.trim().length > 0;

  async function saveBenchmarkResult() {
    const taskExecution = behaviorAudit?.taskExecution;
    if (!behaviorAudit || !caseClassification) return;
    if (caseClassification === "bad" && rootCauses.length === 0) return;
    const currentSnapshot = {
      overallScore: scores.overall,
      taskCompletionRate: taskExecution?.taskCompletionRate ?? 0,
      requiredStateCoverage: scores.stateCoverage,
      behaviorReliability: behaviorAudit.behaviorScore,
    };
    const baselineSnapshot = baselineReport
      ? {
          overallScore: baselineReport.scores.overall,
          taskCompletionRate: 0,
          requiredStateCoverage: baselineReport.scores.stateCoverage,
          behaviorReliability: 0,
        }
      : null;
    const regressionStatus = baselineSnapshot
      ? currentSnapshot.overallScore >= baselineSnapshot.overallScore &&
        !!taskExecution?.pathCompleted
        ? "passed"
        : "failed"
      : "baseline";
    const savedRun = await saveFlowCraftBenchmarkRun({
      scenarioId: scenario.id,
      taskId: taskExecution?.taskId ?? taskPlan?.id ?? `${scenario.id}-unresolved`,
      businessOutcome:
        taskExecution?.businessOutcome ??
        taskPlan?.businessOutcome ??
        "Evaluation did not reach a business outcome",
      model: modelName,
      generationDurationMs,
      modelCallCount: 1 + repairAttempts,
      repairAttempts,
      runtimePassed: behaviorAudit.runtimePassed,
      taskCompleted: taskExecution?.pathCompleted ?? false,
      taskCompletionRate: taskExecution?.taskCompletionRate ?? 0,
      requiredStateCoverage: scores.stateCoverage,
      behaviorReliability: behaviorAudit.behaviorScore,
      repairLift: businessMetrics.repairLift,
      manualRating,
      caseClassification,
      rootCauses,
      baselineSnapshot,
      currentSnapshot,
      regressionStatus,
      generatedHtml: code,
      baselineHtml: baselineCode || null,
    });
    setBenchmarkRuns(await fetchFlowCraftBenchmarkRuns());
    setLatestSavedRun(savedRun);
    setBenchmarkSaved(true);
  }

  const benchmarkSummary = summarizeFlowCraftBenchmarkRuns(benchmarkRuns);

  function exportBenchmarkReport() {
    if (!benchmarkRuns.length) return;
    const reportData = buildFlowCraftBenchmarkExport(benchmarkRuns);
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flowcraft-benchmark-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function getRepairPromptWithBehavior() {
    const behaviorRepairs = behaviorAudit?.taskExecution?.steps
      .filter((step) => !step.passed)
      .map(
        (step, index) =>
          `${index + 1}. Make the task step "${step.label}" executable. Current replay result: ${step.detail}`
      ) ?? [];
    return behaviorRepairs.length
      ? `${repairPrompt}\n\nBehavior replay gaps:\n${behaviorRepairs.join("\n")}`
      : repairPrompt;
  }

  function runAutomaticRepair() {
    const instruction = getRepairPromptWithBehavior();
    setUpdateInstruction(instruction);
    setRepairPrepared(true);
    if (!onAutoRepair || isGenerating) return;
    const score = Math.round(
      scores.overall * 0.55 + (behaviorAudit?.behaviorScore ?? 0) * 0.45
    );
    autoRepairDispatchRef.current = code;
    setAutoRepairRun({
      active: true,
      attempts: 1,
      sourceCode: code,
      bestScore: score,
      bestVersionId: currentVersionId,
      status: "repairing",
    });
    onAutoRepair(instruction);
  }

  return (
    <aside className="border-b border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-4 rounded-md px-1 py-1.5 text-left transition hover:bg-gray-50 dark:hover:bg-zinc-900"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Interaction design evaluation
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-zinc-400">
              {evaluationBasis === "user-brief" ? "User brief" : scenario.label} · {preference.label} strategy · {scores.overall}% overall · {scores.stateCoverage}% state coverage
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:border-zinc-800 dark:text-zinc-300">
            {isOpen ? "Collapse" : "View report"}
            {isOpen ? <LuChevronUp /> : <LuChevronDown />}
          </span>
        </button>

        {!isOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-2 px-1 pb-1 text-xs">
            {gapItems.length > 0 ? (
              <span className="rounded-md bg-red-50 px-2.5 py-1.5 font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
                Detected {gapItems.length} {gapItems.length === 1 ? "gap" : "gaps"}
              </span>
            ) : (
              <span className="rounded-md bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                No critical gaps detected
              </span>
            )}
            <span className="text-gray-500 dark:text-zinc-400">
              Next: {prioritySummary}
            </span>
          </div>
        )}

        {isOpen && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 lg:grid-cols-[0.88fr_1.12fr]">
              <section className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <StatusRow
                  title="Runtime"
                  detail={isBehaviorAuditRunning ? "Running the prototype in an isolated frame." : "Prototype rendered without a critical output error."}
                  passed={runtimePassed}
                />
                <StatusRow
                  title="Flow"
                  detail={isBehaviorAuditRunning
                    ? "Executing the required task steps in sequence."
                    : behaviorAudit?.taskExecution
                      ? `${behaviorAudit.taskExecution.completedSteps}/${behaviorAudit.taskExecution.totalSteps} required steps completed in sequence.`
                      : "Core user flow has not been executed yet."}
                  passed={flowPassed}
                />
                <StatusRow
                  title="Recovery"
                  detail={recoveryPassed ? "Success and recovery paths are present." : "Edge cases or recovery feedback need attention."}
                  passed={recoveryPassed}
                />
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">
                    Coverage score
                  </p>
                  <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-zinc-200">
                    {scores.overall}% overall
                  </span>
                </div>
                <div className="mt-4 space-y-3.5">
                  <ScoreBar label="Core task coverage" score={scores.taskCoverage} />
                  <ScoreBar label="Required state coverage" score={scores.stateCoverage} />
                  <ScoreBar label="Feedback completeness" score={scores.feedbackCoverage} />
                  <ScoreBar
                    label="Behavior reliability"
                    score={businessMetrics.behaviorReliability}
                  />
                </div>
              </section>
            </div>

            {behaviorAudit?.taskExecution && (
              <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">
                      Task replay
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {behaviorAudit.taskExecution.businessOutcome}
                    </p>
                  </div>
                  <span className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${behaviorAudit.taskExecution.pathCompleted ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"}`}>
                    {behaviorAudit.taskExecution.taskCompletionRate}% complete
                  </span>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {behaviorAudit.taskExecution.steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-2.5 rounded-md border border-gray-100 px-3 py-2 dark:border-zinc-800">
                      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${step.passed ? "bg-emerald-500 text-white" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"}`}>
                        {step.passed ? <LuCheck className="size-3" /> : index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-zinc-100">{step.label}</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-gray-500 dark:text-zinc-400">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {behaviorAudit && !behaviorAudit.taskExecution && (
              <section className="rounded-lg border border-red-100 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-950 dark:bg-red-950/25 dark:text-red-300">
                <p className="font-semibold">Behavior replay did not produce a task result</p>
                <p className="mt-1 leading-5">
                  {behaviorAudit.notes.join(" ")}
                </p>
              </section>
            )}

            <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">
                    Benchmark record
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                    Automated evidence + human judgment
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-zinc-400">
                    Rate the rendered result only. These scores never change the generation prompt or automatic evaluator.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!benchmarkRuns.length}
                    onClick={exportBenchmarkReport}
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    <LuDownload className="size-4" />
                    Export
                  </button>
                  <button
                    type="button"
                    disabled={
                      !behaviorAudit ||
                      isBehaviorAuditRunning ||
                      !caseClassification ||
                      (caseClassification === "bad" && rootCauses.length === 0)
                    }
                    onClick={saveBenchmarkResult}
                    className="flex items-center gap-2 rounded-md bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
                  >
                    <LuClipboardCheck className="size-4" />
                    {benchmarkSaved ? "Result saved" : "Save benchmark result"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {([
                  ["visualQuality", "Visual quality"],
                  ["interactionQuality", "Interaction quality"],
                  ["businessCompleteness", "Business completeness"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-700 dark:text-zinc-200">{label}</p>
                    <div className="mt-2 grid grid-cols-5 gap-1" role="group" aria-label={label}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          aria-pressed={manualRating[key] === score}
                          onClick={() => {
                            setManualRating((current) => ({ ...current, [key]: score }));
                            setBenchmarkSaved(false);
                          }}
                          className={`h-8 rounded-md border text-xs font-semibold transition ${manualRating[key] === score ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "border-gray-200 text-gray-500 hover:border-gray-400 dark:border-zinc-800 dark:text-zinc-400"}`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 dark:border-zinc-800 lg:grid-cols-[0.7fr_1.3fr]">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-zinc-200">
                    Case classification
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Case classification">
                    {CASE_CLASSIFICATIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={caseClassification === option.id}
                        onClick={() => {
                          setCaseClassification(option.id);
                          if (option.id !== "bad") setRootCauses([]);
                          setBenchmarkSaved(false);
                        }}
                        className={`h-9 rounded-md border text-xs font-semibold transition ${caseClassification === option.id ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "border-gray-200 text-gray-500 hover:border-gray-400 dark:border-zinc-800 dark:text-zinc-400"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-zinc-200">
                    Root cause {caseClassification === "bad" ? "(required)" : "(Bad Case only)"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ROOT_CAUSES.map((cause) => {
                      const selected = rootCauses.includes(cause.id);
                      return (
                        <button
                          key={cause.id}
                          type="button"
                          disabled={caseClassification !== "bad"}
                          aria-pressed={selected}
                          onClick={() => {
                            setRootCauses((current) =>
                              selected
                                ? current.filter((item) => item !== cause.id)
                                : [...current, cause.id]
                            );
                            setBenchmarkSaved(false);
                          }}
                          className={`rounded-md border px-2.5 py-2 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "border-gray-200 text-gray-500 hover:border-gray-400 dark:border-zinc-800 dark:text-zinc-400"}`}
                        >
                          {cause.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {latestSavedRun && (
                <div className={`mt-4 rounded-md border px-3 py-2 text-xs font-medium ${latestSavedRun.regressionStatus === "failed" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>
                  Case saved · {latestSavedRun.caseClassification?.toUpperCase()} · Regression {latestSavedRun.regressionStatus}
                  {latestSavedRun.baselineSnapshot && latestSavedRun.currentSnapshot
                    ? ` · Score ${latestSavedRun.baselineSnapshot.overallScore}% → ${latestSavedRun.currentSnapshot.overallScore}%`
                    : ` · Baseline ${latestSavedRun.currentSnapshot?.overallScore ?? scores.overall}%`}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 text-xs dark:border-zinc-800 sm:grid-cols-4 lg:grid-cols-8">
                <div><p className="text-gray-400">Coverage</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.completedScenarios}/5 scenarios</p></div>
                <div><p className="text-gray-400">First-pass completion</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.firstPassTaskCompletionRate}%</p></div>
                <div><p className="text-gray-400">Avg. task completion</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.averageTaskCompletionRate}%</p></div>
                <div><p className="text-gray-400">Avg. state coverage</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.averageStateCoverage}%</p></div>
                <div><p className="text-gray-400">Behavior reliability</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.averageBehaviorReliability}%</p></div>
                <div><p className="text-gray-400">Avg. repair lift</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.averageRepairLift == null ? "Not measured" : `${benchmarkSummary.averageRepairLift >= 0 ? "+" : ""}${benchmarkSummary.averageRepairLift} pts`}</p></div>
                <div><p className="text-gray-400">Human score</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.averageManualScore == null ? "Not rated" : `${benchmarkSummary.averageManualScore}%`}</p></div>
                <div><p className="text-gray-400">Time / calls</p><p className="mt-1 font-semibold text-gray-800 dark:text-zinc-100">{benchmarkSummary.averageGenerationDurationMs == null ? "Not measured" : `${(benchmarkSummary.averageGenerationDurationMs / 1000).toFixed(1)}s`} / {benchmarkSummary.totalModelCalls}</p></div>
              </div>
            </section>

            <section className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">Evaluation truth</p>
                <p className="mt-1 font-medium text-gray-800 dark:text-zinc-100">
                  {evaluationBasis === "user-brief" ? "Core task + Required details" : "Scenario template fallback"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">First-pass task</p>
                <p className={`mt-1 font-medium ${businessMetrics.firstPassTaskCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {businessMetrics.firstPassTaskCompleted ? "Completed" : "Not completed"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">Repair lift</p>
                <p className="mt-1 font-medium text-gray-800 dark:text-zinc-100">
                  {businessMetrics.repairLift == null
                    ? "Baseline version"
                    : `${businessMetrics.repairLift >= 0 ? "+" : ""}${businessMetrics.repairLift} points`}
                </p>
              </div>
            </section>

            {gapItems.length > 0 && (
              <section className="rounded-lg border border-red-100 bg-red-50/80 p-4 dark:border-red-950 dark:bg-red-950/25">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Detected {gapItems.length} {gapItems.length === 1 ? "gap" : "gaps"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-red-700/75 dark:text-red-300/75">
                      Uncovered states and actions are highlighted here for targeted repair.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runAutomaticRepair}
                    disabled={isGenerating || autoRepairRun.active}
                    className="flex items-center gap-2 rounded-md bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <LuWrench className="size-4" />
                    {autoRepairRun.active
                      ? `Repairing ${autoRepairRun.attempts}/2`
                      : autoRepairRun.status === "rolled-back"
                        ? "Kept better version"
                        : autoRepairRun.status === "complete"
                          ? "Repair complete"
                          : onAutoRepair
                            ? "Auto repair gaps"
                            : repairPrepared
                              ? "Repair prepared"
                              : "Repair gaps"}
                  </button>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {gapItems.slice(0, 6).map((gap) => (
                    <div key={`${gap.title}-${gap.detail}`} className="flex gap-2.5 rounded-md bg-white/70 px-3 py-2 dark:bg-zinc-950/40">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
                      <div>
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                          {gap.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-gray-600 dark:text-zinc-400">
                          {gap.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {repairPrepared && (
                  <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {onAutoRepair
                      ? "The repair runs as a child version, is replayed automatically, and stops after two attempts. A lower-scoring result returns to the best version."
                      : "Targeted repair instructions are ready in the left update box. Sending creates a child version; the original remains available for manual comparison."}
                  </p>
                )}
              </section>
            )}

            <div className="grid gap-3 lg:grid-cols-3">
              <section className="rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">
                  What this prototype supports
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-zinc-200">
                  {implementedGoal}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(evaluationBasis === "user-brief" ? [coreTask] : scenario.goals).map((goal) => (
                    <span key={goal} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                      {goal}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">
                  Covered states
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-zinc-200">
                  {coveredStates.length > 0
                    ? coveredStates.join(", ")
                    : "No required state keyword was detected yet."}
                </p>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">
                  Next priority
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-zinc-200">
                  {prioritySummary}
                </p>
                <p className="mt-3 border-t border-gray-200 pt-3 text-xs leading-5 text-gray-500 dark:border-zinc-800 dark:text-zinc-400">
                  {strategyVariant?.ctaTreatment ?? preference.priority} {preference.tradeoff}
                </p>
              </section>
            </div>

            <div className="flex items-start gap-2 px-1 text-[11px] leading-4 text-gray-500 dark:text-zinc-400">
              <LuInfo className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Evaluation checks runtime, key flows, recovery, and structural coverage. {missingPrimaryCtas.length} missing CTAs · {sourceTermLeaks.length} source-term leaks · {layoutRegionCount}/5 layout regions detected · {repairInstructions.length} targeted repair instructions.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
