import type { FlowCraftTaskAction, FlowCraftTaskPlan } from "./flowcraft-task-plans";

export interface FlowCraftTaskStepResult {
  id: string;
  label: string;
  type: FlowCraftTaskAction["type"];
  passed: boolean;
  detail: string;
  durationMs: number;
}

export interface FlowCraftTaskExecution {
  taskId: string;
  businessOutcome: string;
  completedSteps: number;
  totalSteps: number;
  taskCompletionRate: number;
  pathCompleted: boolean;
  durationMs: number;
  steps: FlowCraftTaskStepResult[];
}

export interface FlowCraftBehaviorAudit {
  runtimePassed: boolean;
  interactiveControls: number;
  testedControls: number;
  stateChangingControls: number;
  usableInputs: number;
  successCueDetected: boolean;
  recoveryCueDetected: boolean;
  behaviorScore: number;
  taskExecution: FlowCraftTaskExecution | null;
  notes: string[];
}

const SUCCESS_PATTERN = /success|successful|complete|completed|confirmed|confirmation|receipt|sent|invited|upgraded|已完成|成功|确认/i;
const RECOVERY_PATTERN = /retry|try again|edit|back|undo|cancel|recover|resend|revoke|重试|返回|修改|撤销|取消/i;

export function prepareFlowCraftAuditHtml(code: string) {
  const script = `<script>
    window.__flowcraftRuntimeErrors = [];
    window.addEventListener('error', event => window.__flowcraftRuntimeErrors.push(String(event.message || 'runtime error')));
    window.addEventListener('unhandledrejection', event => window.__flowcraftRuntimeErrors.push(String(event.reason || 'unhandled rejection')));
  </script>`;
  const withoutTailwindRuntime = code.replace(
    /<script\b[^>]*\bsrc=["']https:\/\/cdn\.tailwindcss\.com\/?[^"']*["'][^>]*>\s*<\/script>/gi,
    ""
  );
  return /<head(?:\s[^>]*)?>/i.test(withoutTailwindRuntime)
    ? withoutTailwindRuntime.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${script}`)
    : `${script}${withoutTailwindRuntime}`;
}

function normalize(value = "") {
  return value.toLowerCase().replace(/[^\p{L}\p{N}@.]+/gu, " ").trim();
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getDocumentFingerprint(doc: Document) {
  const text = doc.body?.innerText.replace(/\s+/g, " ").trim() ?? "";
  const state = Array.from(
    doc.querySelectorAll("[aria-expanded], [aria-selected], [aria-checked], [data-state], input, select, textarea")
  ).map((element) => {
    const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    return [
      element.getAttribute("aria-expanded"),
      element.getAttribute("aria-selected"),
      element.getAttribute("aria-checked"),
      element.getAttribute("data-state"),
      field.value,
    ].join(":");
  }).join("|");
  return `${text}|${state}|${doc.querySelectorAll("dialog[open], [role='dialog']").length}`;
}

function getElementDescription(element: Element) {
  const id = element.getAttribute("id");
  const escapedId = id?.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1");
  const label = escapedId
    ? element.ownerDocument.querySelector(`label[for="${escapedId}"]`)?.textContent
    : "";
  return normalize([
    label,
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.getAttribute("title"),
    element.getAttribute("value"),
    element.textContent,
  ].filter(Boolean).join(" "));
}

function matchScore(element: Element, targets: string[]) {
  const description = getElementDescription(element);
  return targets.reduce((best, target) => {
    const normalizedTarget = normalize(target);
    if (!normalizedTarget) return best;
    if (description === normalizedTarget) return Math.max(best, 100);
    if (description.includes(normalizedTarget)) return Math.max(best, 70 + normalizedTarget.length);
    const words = normalizedTarget.split(" ").filter((word) => word.length > 2);
    const hits = words.filter((word) => description.includes(word)).length;
    return Math.max(best, words.length ? Math.round((hits / words.length) * 50) : 0);
  }, 0);
}

function findBestElement<T extends Element>(elements: T[], targets: string[]) {
  return elements
    .map((element) => ({ element, score: matchScore(element, targets) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0]?.element ?? null;
}

function includesExpected(doc: Document, terms: string[] = []) {
  const text = normalize(doc.body?.innerText ?? "");
  return terms.some((term) => text.includes(normalize(term)));
}

function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

async function executeTaskAction(doc: Document, action: FlowCraftTaskAction) {
  const startedAt = performance.now();
  const done = (passed: boolean, detail: string): FlowCraftTaskStepResult => ({
    id: action.id,
    label: action.label,
    type: action.type,
    passed,
    detail,
    durationMs: Math.round(performance.now() - startedAt),
  });

  if (action.type === "assert") {
    return includesExpected(doc, action.targets)
      ? done(true, `Detected: ${action.targets.join(" / ")}.`)
      : done(false, `Expected state was not visible: ${action.targets.join(" / ")}.`);
  }

  if (action.type === "fill") {
    const fields = Array.from(doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input:not([type='hidden']):not([type='button']):not([type='submit']):not([type='radio']):not([type='checkbox']), textarea"
    )).filter((field) => !field.disabled);
    const field = findBestElement(fields, action.targets) ?? fields.find((candidate) => !candidate.value) ?? fields[0];
    if (!field) return done(!!action.optional, "No usable input matched this step.");
    const value = field.type === "email" ? "teammate@example.com" : (action.value ?? "FlowCraft evaluation");
    setFieldValue(field, value);
    await wait(40);
    return field.value ? done(true, `Filled ${getElementDescription(field) || "input"}.`) : done(false, "Input did not retain its value.");
  }

  if (action.type === "select") {
    const selects = Array.from(doc.querySelectorAll<HTMLSelectElement>("select:not([disabled])"));
    const select = findBestElement(selects, action.targets) ?? selects[0];
    if (select) {
      const options = Array.from(select.options).filter((option) => !option.disabled && option.value);
      const option = findBestElement(options, action.targets) ?? options[0];
      if (!option) return done(false, "The select control had no usable options.");
      select.value = option.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(60);
      return done(true, `Selected ${option.textContent?.trim() || option.value}.`);
    }
    const choices = Array.from(doc.querySelectorAll<HTMLElement>(
      "input[type='radio'], input[type='checkbox'], [role='radio'], [role='option'], [role='checkbox']"
    )).filter((element) => !(element as HTMLInputElement).disabled);
    const choice = findBestElement(choices, action.targets) ?? choices[0];
    if (!choice) return done(!!action.optional, "No selectable role or option was found.");
    choice.click();
    await wait(80);
    return done(true, `Selected ${getElementDescription(choice) || "available option"}.`);
  }

  const controls = Array.from(doc.querySelectorAll<HTMLElement>(
    "button:not([disabled]), a[href], input[type='button']:not([disabled]), input[type='submit']:not([disabled]), [role='button']:not([aria-disabled='true']), [role='tab']:not([aria-disabled='true'])"
  ));
  const control = findBestElement(controls, action.targets);
  if (!control) return done(!!action.optional, `No action matched: ${action.targets.join(" / ")}.`);
  const before = getDocumentFingerprint(doc);
  control.click();
  await wait(120);
  const changed = getDocumentFingerprint(doc) !== before;
  return changed || includesExpected(doc, action.expected)
    ? done(true, `Activated ${getElementDescription(control) || control.tagName.toLowerCase()} and observed feedback.`)
    : done(false, `Activated ${getElementDescription(control) || control.tagName.toLowerCase()}, but no state change was detected.`);
}

async function executeTaskPlan(doc: Document, plan: FlowCraftTaskPlan): Promise<FlowCraftTaskExecution> {
  const startedAt = performance.now();
  const steps: FlowCraftTaskStepResult[] = [];
  for (const action of plan.actions) steps.push(await executeTaskAction(doc, action));
  const requiredSteps = steps.filter((step) => !plan.actions.find((action) => action.id === step.id)?.optional);
  const completedSteps = requiredSteps.filter((step) => step.passed).length;
  return {
    taskId: plan.id,
    businessOutcome: plan.businessOutcome,
    completedSteps,
    totalSteps: requiredSteps.length,
    taskCompletionRate: requiredSteps.length ? Math.round((completedSteps / requiredSteps.length) * 100) : 0,
    pathCompleted: requiredSteps.length > 0 && completedSteps === requiredSteps.length,
    durationMs: Math.round(performance.now() - startedAt),
    steps,
  };
}

export async function runFlowCraftBehaviorAudit(code: string, taskPlan?: FlowCraftTaskPlan | null): Promise<FlowCraftBehaviorAudit> {
  const empty = (note: string): FlowCraftBehaviorAudit => ({
    runtimePassed: false,
    interactiveControls: 0,
    testedControls: 0,
    stateChangingControls: 0,
    usableInputs: 0,
    successCueDetected: false,
    recoveryCueDetected: false,
    behaviorScore: 0,
    taskExecution: null,
    notes: [note],
  });
  if (typeof document === "undefined" || !code.trim()) return empty("No runnable prototype was available for behavior evaluation.");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:1366px;height:900px;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Behavior audit timed out while loading the prototype.")), 5000);
      iframe.onload = () => { window.clearTimeout(timeout); resolve(); };
      iframe.srcdoc = prepareFlowCraftAuditHtml(code);
    });
    const doc = iframe.contentDocument;
    const frameWindow = iframe.contentWindow as (Window & { __flowcraftRuntimeErrors?: string[] }) | null;
    if (!doc || !frameWindow) throw new Error("Behavior audit could not access the isolated prototype.");

    await wait(100);
    const controls = Array.from(doc.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [role='button'], [role='tab'], [role='switch']"));
    const taskExecution = taskPlan ? await executeTaskPlan(doc, taskPlan) : null;
    const runtimeErrors = frameWindow.__flowcraftRuntimeErrors ?? [];
    const runtimePassed = runtimeErrors.length === 0;
    const text = doc.body?.innerText ?? "";
    const testedSteps = taskExecution?.steps.filter((step) => step.type !== "assert") ?? [];
    const stateChangingControls = testedSteps.filter((step) => step.passed && step.type === "click").length;
    const usableInputs = testedSteps.filter((step) => step.passed && step.type === "fill").length;
    const taskRate = taskExecution?.taskCompletionRate ?? 0;
    const behaviorScore = Math.min(100, Math.round((runtimePassed ? 20 : 0) + taskRate * 0.7 + (RECOVERY_PATTERN.test(text) ? 10 : 0)));
    const notes = taskExecution
      ? [`${taskExecution.completedSteps}/${taskExecution.totalSteps} required task steps passed in sequence.`, taskExecution.pathCompleted ? `Business outcome verified: ${taskExecution.businessOutcome}.` : `Business outcome not yet verified: ${taskExecution.businessOutcome}.`]
      : ["No task plan was supplied for sequential behavior evaluation."];
    if (runtimeErrors.length) notes.push(`${runtimeErrors.length} runtime errors were captured.`);

    return {
      runtimePassed,
      interactiveControls: controls.length,
      testedControls: testedSteps.length,
      stateChangingControls,
      usableInputs,
      successCueDetected: SUCCESS_PATTERN.test(text),
      recoveryCueDetected: RECOVERY_PATTERN.test(text),
      behaviorScore,
      taskExecution,
      notes,
    };
  } catch (error) {
    return empty(error instanceof Error ? error.message : "Behavior audit failed.");
  } finally {
    iframe.remove();
  }
}
