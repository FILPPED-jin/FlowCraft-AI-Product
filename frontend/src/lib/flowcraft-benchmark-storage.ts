import { FlowCraftScenarioId } from "./flowcraft";
import { HTTP_BACKEND_URL } from "../config";

export const FLOWCRAFT_BENCHMARK_RUNS_KEY = "flowcraft:benchmark-runs";

export interface FlowCraftManualRating {
  visualQuality: number;
  interactionQuality: number;
  businessCompleteness: number;
}

export type FlowCraftCaseClassification = "good" | "bad" | "boundary";

export type FlowCraftRootCause =
  | "requirement-parsing"
  | "visual-understanding"
  | "semantic-mapping"
  | "code-generation"
  | "evaluation-error";

export interface FlowCraftEvaluationSnapshot {
  overallScore: number;
  taskCompletionRate: number;
  requiredStateCoverage: number;
  behaviorReliability: number;
}

export interface FlowCraftBenchmarkRun {
  id: string;
  scenarioId: FlowCraftScenarioId;
  taskId: string;
  businessOutcome: string;
  createdAt: string;
  model: string;
  generationDurationMs: number | null;
  modelCallCount: number;
  repairAttempts: number;
  runtimePassed: boolean;
  taskCompleted: boolean;
  taskCompletionRate: number;
  requiredStateCoverage: number;
  behaviorReliability: number;
  visualStructureSimilarity?: number | null;
  designSystemConsistency?: number | null;
  repairLift: number | null;
  manualRating: FlowCraftManualRating;
  caseClassification?: FlowCraftCaseClassification;
  rootCauses?: FlowCraftRootCause[];
  baselineSnapshot?: FlowCraftEvaluationSnapshot | null;
  currentSnapshot?: FlowCraftEvaluationSnapshot;
  regressionStatus?: "passed" | "failed" | "baseline";
  generatedHtml?: string;
  baselineHtml?: string | null;
}

export interface FlowCraftBenchmarkSummary {
  completedScenarios: number;
  totalRuns: number;
  firstPassTaskCompletionRate: number;
  averageTaskCompletionRate: number;
  averageStateCoverage: number;
  averageBehaviorReliability: number;
  averageVisualStructureSimilarity: number | null;
  averageDesignSystemConsistency: number | null;
  averageRepairLift: number | null;
  averageGenerationDurationMs: number | null;
  averageManualScore: number | null;
  totalModelCalls: number;
}

function readRuns(): FlowCraftBenchmarkRun[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FLOWCRAFT_BENCHMARK_RUNS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRuns(runs: FlowCraftBenchmarkRun[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    FLOWCRAFT_BENCHMARK_RUNS_KEY,
    JSON.stringify(runs.slice(0, 1000))
  );
}

export function listFlowCraftBenchmarkRuns() {
  return readRuns().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function fetchFlowCraftBenchmarkRuns() {
  try {
    const response = await fetch(`${HTTP_BACKEND_URL}/api/benchmark/cases?limit=1000`);
    if (!response.ok) throw new Error(`Case list failed with ${response.status}`);
    const records = (await response.json()) as FlowCraftBenchmarkRun[];
    writeRuns(records);
    return records;
  } catch {
    return listFlowCraftBenchmarkRuns();
  }
}

export async function migrateLocalFlowCraftBenchmarkRuns() {
  const localRuns = listFlowCraftBenchmarkRuns();
  try {
    if (localRuns.length) {
      const response = await fetch(`${HTTP_BACKEND_URL}/api/benchmark/cases/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localRuns),
      });
      if (!response.ok) throw new Error(`Case migration failed with ${response.status}`);
    }
    return await fetchFlowCraftBenchmarkRuns();
  } catch {
    return localRuns;
  }
}

export async function saveFlowCraftBenchmarkRun(
  run: Omit<FlowCraftBenchmarkRun, "id" | "createdAt">
) {
  if (typeof window === "undefined") return null;
  const record: FlowCraftBenchmarkRun = {
    ...run,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `benchmark-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const existing = readRuns();
  writeRuns([record, ...existing]);
  try {
    const response = await fetch(`${HTTP_BACKEND_URL}/api/benchmark/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`Case save failed with ${response.status}`);
    const persisted = (await response.json()) as FlowCraftBenchmarkRun;
    writeRuns([persisted, ...existing.filter((item) => item.id !== persisted.id)]);
    return persisted;
  } catch {
    return record;
  }
}

function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

export function summarizeFlowCraftBenchmarkRuns(
  runs: FlowCraftBenchmarkRun[]
): FlowCraftBenchmarkSummary {
  const baselineRuns = runs.filter((run) => run.repairAttempts === 0);
  const firstPassRuns = baselineRuns.length ? baselineRuns : runs;
  const durations = runs
    .map((run) => run.generationDurationMs)
    .filter((value): value is number => typeof value === "number");
  const repairLifts = runs
    .map((run) => run.repairLift)
    .filter((value): value is number => typeof value === "number");
  const manualScores = runs
    .flatMap((run) => Object.values(run.manualRating))
    .filter((value) => value > 0)
    .map((value) => value * 20);
  const visualSimilarity = runs
    .map((run) => run.visualStructureSimilarity)
    .filter((value): value is number => typeof value === "number");
  const designConsistency = runs
    .map((run) => run.designSystemConsistency)
    .filter((value): value is number => typeof value === "number");

  return {
    completedScenarios: new Set(runs.map((run) => run.scenarioId)).size,
    totalRuns: runs.length,
    firstPassTaskCompletionRate: firstPassRuns.length
      ? Math.round(
          (firstPassRuns.filter((run) => run.taskCompleted).length /
            firstPassRuns.length) *
            100
        )
      : 0,
    averageTaskCompletionRate:
      average(runs.map((run) => run.taskCompletionRate)) ?? 0,
    averageStateCoverage:
      average(runs.map((run) => run.requiredStateCoverage)) ?? 0,
    averageBehaviorReliability:
      average(runs.map((run) => run.behaviorReliability)) ?? 0,
    averageVisualStructureSimilarity: average(visualSimilarity),
    averageDesignSystemConsistency: average(designConsistency),
    averageRepairLift: average(repairLifts),
    averageGenerationDurationMs: average(durations),
    averageManualScore: average(manualScores),
    totalModelCalls: runs.reduce((sum, run) => sum + run.modelCallCount, 0),
  };
}

export function buildFlowCraftBenchmarkExport(runs: FlowCraftBenchmarkRun[]) {
  return {
    exportedAt: new Date().toISOString(),
    benchmark: "FlowCraft five-scenario product benchmark",
    summary: summarizeFlowCraftBenchmarkRuns(runs),
    runs,
  };
}
