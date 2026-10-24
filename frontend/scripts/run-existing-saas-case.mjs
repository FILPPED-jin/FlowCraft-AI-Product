/* eslint-env node */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const sourcePath = path.resolve(
  process.argv[2] || "../.flowcraft-runtime/saas-benchmark-result/index.html"
);
const outputPath = path.resolve(
  process.argv[3] || "../.flowcraft-runtime/saas-case-mvp.json"
);
const baseUrl = process.env.FLOWCRAFT_BASE_URL || "http://127.0.0.1:5173/";

if (!fs.existsSync(sourcePath)) {
  throw new Error(`SaaS case HTML was not found: ${sourcePath}`);
}

const code = fs.readFileSync(sourcePath, "utf8");
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  protocolTimeout: 180_000,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60_000 });
  const evidence = await page.evaluate(async (prototypeCode) => {
    const flowcraft = await import("/src/lib/flowcraft.ts");
    const diagnosis = await import("/src/components/flowcraft/FlowCraftDiagnosis.tsx");
    const behavior = await import("/src/lib/flowcraft-behavior-eval.ts");
    const plans = await import("/src/lib/flowcraft-task-plans.ts");
    const coreTask =
      "Invite a product designer to the Q4 Launch workspace, configure Editor permissions, create a launch-readiness task, and confirm workspace activation.";
    const requiredDetails =
      "Validate teammate email; select Editor role; show a permission warning before sending; confirm invitation status; create a task with owner, due date and status; preserve an edit/back path and failure recovery.";
    const prompt = flowcraft.buildFlowCraftPrompt("", "saas", "safety", {
      userGoal: coreTask,
      requirementsText: requiredDetails,
      visualNotes: "Notion-like workspace table with compact controls and contextual overlays.",
      fidelity: "faithful",
      screenshotRef: "Notion workspace reference",
    });
    const report = diagnosis.buildFlowCraftEvalReport(prompt, prototypeCode);
    const audit = await behavior.runFlowCraftBehaviorAudit(
      prototypeCode,
      plans.FLOWCRAFT_TASK_PLANS.saas
    );
    return { prompt, report, audit, coreTask, requiredDetails };
  }, code);

  const taskExecution = evidence.audit.taskExecution;
  const classification =
    evidence.audit.runtimePassed && taskExecution?.pathCompleted &&
    evidence.report?.scores.overall >= 75
      ? "good"
      : evidence.audit.runtimePassed || (taskExecution?.taskCompletionRate || 0) > 0
        ? "boundary"
        : "bad";
  const rootCauses = classification === "bad" ? ["code-generation"] : [];
  const record = {
    id: `saas-mvp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    scenarioId: "saas",
    taskId: taskExecution?.taskId || "saas-invite",
    businessOutcome:
      taskExecution?.businessOutcome || "Successful team activation",
    model: "deepseek-flash",
    generationDurationMs: null,
    modelCallCount: 1,
    repairAttempts: 0,
    runtimePassed: evidence.audit.runtimePassed,
    taskCompleted: taskExecution?.pathCompleted || false,
    taskCompletionRate: taskExecution?.taskCompletionRate || 0,
    requiredStateCoverage: evidence.report?.scores.stateCoverage || 0,
    behaviorReliability: evidence.audit.behaviorScore,
    repairLift: null,
    manualRating: {
      visualQuality: 0,
      interactionQuality: 0,
      businessCompleteness: 0,
    },
    caseClassification: classification,
    classificationSource: "automated-precheck-pending-human-confirmation",
    rootCauses,
    baselineSnapshot: null,
    currentSnapshot: {
      overallScore: evidence.report?.scores.overall || 0,
      taskCompletionRate: taskExecution?.taskCompletionRate || 0,
      requiredStateCoverage: evidence.report?.scores.stateCoverage || 0,
      behaviorReliability: evidence.audit.behaviorScore,
    },
    regressionStatus: "baseline",
    coreTask: evidence.coreTask,
    requiredDetails: evidence.requiredDetails,
    auditNotes: evidence.audit.notes,
    failedSteps: taskExecution?.steps.filter((step) => !step.passed) || [],
    generatedHtmlPath: sourcePath,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, record }, null, 2));
} finally {
  await browser.close();
}
