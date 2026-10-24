export const FLOWCRAFT_LAST_RESULT_KEY = "flowcraft:last-generated-result";
export const FLOWCRAFT_PROJECTS_KEY = "flowcraft:projects";

const MAX_FLOWCRAFT_PROJECTS = 50;

export interface StoredFlowCraftResult {
  code: string;
  savedAt: string;
  label: string;
}

export interface FlowCraftProject {
  id: string;
  title: string;
  code: string;
  stack: string;
  source: "generated" | "imported" | "demo";
  summary: string;
  codeSize: number;
  signature: string;
  createdAt: string;
  updatedAt: string;
}

interface SaveFlowCraftProjectInput {
  id?: string | null;
  title?: string | null;
  code: string;
  stack?: string | null;
  source?: FlowCraftProject["source"];
}

function createProjectId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `flowcraft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanTitle(title?: string | null) {
  const normalized = title?.replace(/\s+/g, " ").trim();
  if (!normalized) return "Untitled prototype";
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

function decodeHtmlText(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function cleanExtractedText(text?: string | null) {
  return decodeHtmlText(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagText(code: string, tagName: string) {
  const match = code.match(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i")
  );
  return cleanExtractedText(match?.[1]);
}

function hashCodeSignature(code: string) {
  let hash = 5381;
  for (let index = 0; index < code.length; index += 1) {
    hash = (hash * 33) ^ code.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function extractReadableText(code: string) {
  const bodyMatch = code.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const html = bodyMatch?.[1] ?? code;
  return cleanExtractedText(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
  );
}

export function getFlowCraftCodeTitle(code: string, fallback = "Generated prototype") {
  const title =
    extractTagText(code, "title") ||
    extractTagText(code, "h1") ||
    extractTagText(code, "h2") ||
    fallback;
  return cleanTitle(title);
}

export function getFlowCraftCodeSummary(code: string) {
  const readableText = extractReadableText(code);
  if (!readableText) return "No readable preview text detected yet.";
  return readableText.length > 132
    ? `${readableText.slice(0, 129).trim()}...`
    : readableText;
}

export function getFlowCraftCodeSignature(code: string) {
  return hashCodeSignature(code);
}

function enrichProject(project: FlowCraftProject): FlowCraftProject {
  return {
    ...project,
    summary:
      typeof project.summary === "string" && project.summary.trim()
        ? project.summary
        : getFlowCraftCodeSummary(project.code),
    codeSize:
      typeof project.codeSize === "number" && project.codeSize > 0
        ? project.codeSize
        : project.code.length,
    signature:
      typeof project.signature === "string" && project.signature.trim()
        ? project.signature
        : getFlowCraftCodeSignature(project.code),
  };
}

function readProjects(): FlowCraftProject[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(FLOWCRAFT_PROJECTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((project): project is FlowCraftProject => {
        return (
          project &&
          typeof project.id === "string" &&
          typeof project.title === "string" &&
          typeof project.code === "string" &&
          typeof project.createdAt === "string" &&
          typeof project.updatedAt === "string"
        );
      })
      .map((project) => {
        const source: FlowCraftProject["source"] =
          project.source === "imported" || project.source === "demo"
            ? project.source
            : "generated";
        return {
          ...project,
          stack:
            typeof project.stack === "string" ? project.stack : "html_tailwind",
          source,
        };
      })
      .map(enrichProject);
  } catch {
    return [];
  }
}

function writeProjects(projects: FlowCraftProject[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    FLOWCRAFT_PROJECTS_KEY,
    JSON.stringify(projects.slice(0, MAX_FLOWCRAFT_PROJECTS))
  );
}

export function listFlowCraftProjects() {
  return readProjects().sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function saveFlowCraftProject({
  id,
  title,
  code,
  stack = "html_tailwind",
  source = "generated",
}: SaveFlowCraftProjectInput): FlowCraftProject | null {
  if (typeof window === "undefined" || !code.trim()) return null;

  const projects = readProjects();
  const now = new Date().toISOString();
  const existingIndex = id
    ? projects.findIndex((project) => project.id === id)
    : -1;
  const existing = existingIndex >= 0 ? projects[existingIndex] : null;
  const project: FlowCraftProject = {
    id: existing?.id ?? id ?? createProjectId(),
    title: cleanTitle(title ?? existing?.title ?? getFlowCraftCodeTitle(code)),
    code,
    stack: stack || existing?.stack || "html_tailwind",
    source,
    summary: getFlowCraftCodeSummary(code),
    codeSize: code.length,
    signature: getFlowCraftCodeSignature(code),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const nextProjects =
    existingIndex >= 0
      ? projects.map((item, index) => (index === existingIndex ? project : item))
      : [project, ...projects];

  writeProjects(nextProjects);
  return project;
}

export function deleteFlowCraftProject(id: string) {
  writeProjects(readProjects().filter((project) => project.id !== id));
}

export function saveFlowCraftResult(
  code: string,
  label = "Last generated result"
) {
  if (typeof window === "undefined" || !code.trim()) return;

  const result: StoredFlowCraftResult = {
    code,
    savedAt: new Date().toISOString(),
    label,
  };
  window.localStorage.setItem(FLOWCRAFT_LAST_RESULT_KEY, JSON.stringify(result));
}

export function loadFlowCraftResult(): StoredFlowCraftResult | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(FLOWCRAFT_LAST_RESULT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredFlowCraftResult>;
    if (!parsed.code || typeof parsed.code !== "string") return null;
    return {
      code: parsed.code,
      savedAt:
        typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date().toISOString(),
      label:
        typeof parsed.label === "string"
          ? parsed.label
          : "Last generated result",
    };
  } catch {
    return null;
  }
}
