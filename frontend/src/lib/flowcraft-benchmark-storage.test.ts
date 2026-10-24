jest.mock("../config", () => ({
  HTTP_BACKEND_URL: "http://127.0.0.1:7001",
}));

import {
  buildFlowCraftBenchmarkExport,
  summarizeFlowCraftBenchmarkRuns,
} from "./flowcraft-benchmark-storage";

describe("FlowCraft benchmark storage", () => {
  test("aggregates business and manual metrics without inventing missing values", () => {
    const summary = summarizeFlowCraftBenchmarkRuns([
      {
        id: "one",
        scenarioId: "saas",
        taskId: "saas-invite",
        businessOutcome: "Successful team activation",
        createdAt: "2026-10-22T00:00:00.000Z",
        model: "test-model",
        generationDurationMs: 1000,
        modelCallCount: 1,
        repairAttempts: 0,
        runtimePassed: true,
        taskCompleted: false,
        taskCompletionRate: 50,
        requiredStateCoverage: 60,
        behaviorReliability: 55,
        repairLift: null,
        manualRating: { visualQuality: 4, interactionQuality: 3, businessCompleteness: 3 },
      },
      {
        id: "two",
        scenarioId: "saas",
        taskId: "saas-invite",
        businessOutcome: "Successful team activation",
        createdAt: "2026-10-22T00:05:00.000Z",
        model: "test-model",
        generationDurationMs: 1500,
        modelCallCount: 2,
        repairAttempts: 1,
        runtimePassed: true,
        taskCompleted: true,
        taskCompletionRate: 100,
        requiredStateCoverage: 90,
        behaviorReliability: 92,
        repairLift: 18,
        manualRating: { visualQuality: 4, interactionQuality: 5, businessCompleteness: 5 },
      },
    ]);

    expect(summary.completedScenarios).toBe(1);
    expect(summary.firstPassTaskCompletionRate).toBe(0);
    expect(summary.averageTaskCompletionRate).toBe(75);
    expect(summary.averageRepairLift).toBe(18);
    expect(summary.averageGenerationDurationMs).toBe(1250);
    expect(summary.totalModelCalls).toBe(3);
  });

  test("builds an export with the same auditable summary and raw runs", () => {
    const runs = [
      {
        id: "one",
        scenarioId: "ai-tool" as const,
        taskId: "ai-compose",
        businessOutcome: "Successful first result",
        createdAt: "2026-10-22T00:00:00.000Z",
        model: "test-model",
        generationDurationMs: 800,
        modelCallCount: 1,
        repairAttempts: 0,
        runtimePassed: true,
        taskCompleted: true,
        taskCompletionRate: 100,
        requiredStateCoverage: 80,
        behaviorReliability: 90,
        repairLift: null,
        manualRating: { visualQuality: 4, interactionQuality: 4, businessCompleteness: 5 },
      },
    ];

    const report = buildFlowCraftBenchmarkExport(runs);

    expect(report.benchmark).toContain("five-scenario");
    expect(report.summary.firstPassTaskCompletionRate).toBe(100);
    expect(report.runs).toEqual(runs);
  });

  test("keeps case classification, root cause, and regression evidence", () => {
    const runs = [
      {
        id: "case-one",
        scenarioId: "saas" as const,
        taskId: "saas-invite",
        businessOutcome: "Successful team activation",
        createdAt: "2026-10-23T00:00:00.000Z",
        model: "deepseek-flash",
        generationDurationMs: 1200,
        modelCallCount: 2,
        repairAttempts: 1,
        runtimePassed: true,
        taskCompleted: true,
        taskCompletionRate: 100,
        requiredStateCoverage: 90,
        behaviorReliability: 92,
        repairLift: 20,
        manualRating: { visualQuality: 4, interactionQuality: 4, businessCompleteness: 5 },
        caseClassification: "bad" as const,
        rootCauses: ["semantic-mapping" as const],
        baselineSnapshot: {
          overallScore: 68,
          taskCompletionRate: 50,
          requiredStateCoverage: 60,
          behaviorReliability: 55,
        },
        currentSnapshot: {
          overallScore: 88,
          taskCompletionRate: 100,
          requiredStateCoverage: 90,
          behaviorReliability: 92,
        },
        regressionStatus: "passed" as const,
        generatedHtml: "<!doctype html><html></html>",
      },
    ];

    const report = buildFlowCraftBenchmarkExport(runs);

    expect(report.runs[0].caseClassification).toBe("bad");
    expect(report.runs[0].rootCauses).toEqual(["semantic-mapping"]);
    expect(report.runs[0].regressionStatus).toBe("passed");
    expect(report.runs[0].baselineSnapshot?.overallScore).toBe(68);
  });
});
