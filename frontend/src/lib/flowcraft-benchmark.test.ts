import {
  calculateFlowCraftBusinessMetrics,
  FLOWCRAFT_BENCHMARK_CASES,
} from "./flowcraft-benchmark";

describe("FlowCraft benchmark", () => {
  test("defines five distinct business scenarios", () => {
    expect(FLOWCRAFT_BENCHMARK_CASES).toHaveLength(5);
    expect(new Set(FLOWCRAFT_BENCHMARK_CASES.map(({ id }) => id)).size).toBe(5);
    expect(
      FLOWCRAFT_BENCHMARK_CASES.every(
        ({ coreTask, requiredDetails, expectedBusinessOutcome }) =>
          coreTask.length > 0 &&
          requiredDetails.length >= 3 &&
          expectedBusinessOutcome.length > 0
      )
    ).toBe(true);
  });

  test("reports first-pass completion and repair lift", () => {
    const metrics = calculateFlowCraftBusinessMetrics({
      taskCoverage: 82,
      stateCoverage: 75,
      currentOverall: 79,
      baselineOverall: 61,
      behaviorAudit: {
        runtimePassed: true,
        interactiveControls: 6,
        testedControls: 4,
        stateChangingControls: 3,
        usableInputs: 1,
        successCueDetected: true,
        recoveryCueDetected: true,
        behaviorScore: 88,
        taskExecution: {
          taskId: "commerce-checkout",
          businessOutcome: "Purchase conversion",
          completedSteps: 4,
          totalSteps: 4,
          taskCompletionRate: 100,
          pathCompleted: true,
          durationMs: 420,
          steps: [],
        },
        notes: [],
      },
    });

    expect(metrics.firstPassTaskCompleted).toBe(true);
    expect(metrics.requiredStateCoverage).toBe(75);
    expect(metrics.behaviorReliability).toBe(88);
    expect(metrics.repairLift).toBe(18);
  });
});
