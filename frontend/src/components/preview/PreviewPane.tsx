import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import {
  FaDesktop,
  FaMobile,
  FaCode,
} from "react-icons/fa";
import {
  LuChevronLeft,
  LuChevronRight,
  LuExternalLink,
  LuRefreshCw,
  LuDownload,
  LuSave,
} from "react-icons/lu";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AppState, Settings } from "../../types";
import CodeTab from "./CodeTab";
import { Button } from "../ui/button";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { extractHtml } from "./extractHtml";
import PreviewComponent from "./PreviewComponent";
import { downloadCode } from "./download";
import { SelectAndEditToolbarButton } from "../select-and-edit/SelectAndEditControls";
import { normalizeBabelCdn } from "../../lib/babelCdn";
import ImageScanningPreview from "./ImageScanningPreview";
import FlowCraftDiagnosis from "../flowcraft/FlowCraftDiagnosis";
import {
  getFlowCraftCodeTitle,
  saveFlowCraftProject,
  saveFlowCraftResult,
} from "../../lib/flowcraft-storage";
import { enhanceFlowCraftPrototype } from "../../lib/flowcraft-runtime";

function prepareHtmlForNewTab(code: string) {
  const html = normalizeBabelCdn(code);
  if (/<base\s/i.test(html)) return html;

  const baseTag = `<base href="${window.location.origin}/">`;
  return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${baseTag}`);
}

function openInNewTab(code: string) {
  const blob = new Blob([prepareHtmlForNewTab(code)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

interface Props {
  settings: Settings;
  onOpenVersions: () => void;
  onAutoRepair: (instruction: string) => void;
}

function PreviewPane({ settings, onOpenVersions, onAutoRepair }: Props) {
  const { appState } = useAppStore();
  const { inputMode, head, commits, setHead } = useProjectStore();
  const [activeTab, setActiveTab] = useState("desktop");
  const [desktopScale, setDesktopScale] = useState(1);
  const [desktopViewMode, setDesktopViewMode] = useState<"fit" | "actual">("fit");

  // Sorted commit list for version navigation
  const sortedCommits = useMemo(() =>
    Object.values(commits).sort(
      (a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
    ), [commits]);

  const currentVersionIndex = sortedCommits.findIndex(c => c.hash === head);
  const totalVersions = sortedCommits.length;
  const canGoPrev = currentVersionIndex > 0;
  const canGoNext = currentVersionIndex < totalVersions - 1;

  const currentCommit = head && commits[head] ? commits[head] : "";
  const selectedVariant = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex]
    : null;
  const currentCode = selectedVariant
    ? selectedVariant.code
    : "";
  const parentCommit =
    currentCommit && currentCommit.parentHash
      ? commits[currentCommit.parentHash]
      : null;
  const parentVariant = parentCommit
    ? parentCommit.variants[parentCommit.selectedVariantIndex]
    : null;
  const shouldHoldPreviousPreview =
    currentCommit &&
    currentCommit.type === "ai_edit" &&
    selectedVariant?.status !== "complete" &&
    !!parentVariant?.code?.trim();
  const previewSourceCode = shouldHoldPreviousPreview
    ? parentVariant?.code ?? currentCode
    : currentCode;

  const isSelectedVariantComplete =
    head &&
    commits[head] &&
    commits[head].variants[commits[head].selectedVariantIndex].status ===
      "complete";

  const previewCode =
    inputMode === "video" && appState === AppState.CODING
      ? enhanceFlowCraftPrototype(extractHtml(previewSourceCode))
      : enhanceFlowCraftPrototype(previewSourceCode);
  const sourceImage = currentCommit ? currentCommit.inputs?.images[0] : undefined;
  const promptText = currentCommit ? currentCommit.inputs?.text : "";
  let evaluationCommitHash = head || "";
  const visitedEvaluationCommits = new Set<string>();
  while (evaluationCommitHash) {
    const evaluationCandidate = commits[evaluationCommitHash];
    const parentHash = evaluationCandidate?.parentHash;
    if (
      !evaluationCandidate ||
      evaluationCandidate.type !== "ai_edit" ||
      !parentHash ||
      visitedEvaluationCommits.has(parentHash)
    ) {
      break;
    }
    visitedEvaluationCommits.add(parentHash);
    if (!commits[parentHash]) break;
    evaluationCommitHash = parentHash;
  }
  const evaluationCommit = evaluationCommitHash
    ? commits[evaluationCommitHash]
    : null;
  const evaluationPromptText = evaluationCommit?.inputs?.text ?? promptText;
  const repairBaselineCode =
    currentCommit !== "" && currentCommit.type === "ai_edit"
      ? parentVariant?.code ?? ""
      : "";
  let repairAttempts = 0;
  let repairCursor = currentCommit !== "" ? currentCommit : null;
  const visitedRepairCommits = new Set<string>();
  while (
    repairCursor &&
    repairCursor.type === "ai_edit" &&
    !visitedRepairCommits.has(repairCursor.hash)
  ) {
    visitedRepairCommits.add(repairCursor.hash);
    repairAttempts += 1;
    repairCursor = repairCursor.parentHash
      ? commits[repairCursor.parentHash] ?? null
      : null;
  }
  const generationDurationMs = selectedVariant?.completedAt && selectedVariant.requestStartedAt
    ? selectedVariant.completedAt - selectedVariant.requestStartedAt
    : null;

  const showImageScanningPreview =
    appState === AppState.CODING &&
    currentCommit !== "" &&
    currentCommit.type === "ai_create" &&
    inputMode === "image" &&
    !previewCode.trim() &&
    !!sourceImage;

  const canSelectAndEdit =
    appState === AppState.CODE_READY || !!isSelectedVariantComplete;

  function saveCurrentProject() {
    if (!previewCode.trim()) {
      toast.error("No generated code to save yet.");
      return;
    }

    const promptFallbackTitle =
      promptText?.match(/^User notes:\s*(.+)$/m)?.[1]?.trim() ||
      promptText?.match(/^Scenario template:\s*([^.]+)\./m)?.[1]?.trim() ||
      "FlowCraft prototype";
    const defaultTitle = getFlowCraftCodeTitle(previewCode, promptFallbackTitle);
    const title = window.prompt("Project name", defaultTitle);
    if (title === null) return;

    saveFlowCraftResult(previewCode, title || defaultTitle);
    saveFlowCraftProject({
      title: title || defaultTitle,
      code: previewCode,
      stack: settings.generatedCodeConfig,
      source: "generated",
    });
    toast.success("Project saved.");
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="relative flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="desktop" title="Desktop" data-testid="tab-desktop">
                <FaDesktop />
              </TabsTrigger>
              <TabsTrigger value="mobile" title="Mobile" data-testid="tab-mobile">
                <FaMobile />
              </TabsTrigger>
              <TabsTrigger value="code" title="Code" data-testid="tab-code" className="gap-2">
                <FaCode />
                Code
              </TabsTrigger>
            </TabsList>
            {(activeTab === "desktop" || activeTab === "mobile") && (
              <div className="hidden sm:inline-flex items-center gap-2">
                {activeTab === "desktop" && (
                  <div className="inline-flex items-center rounded-md bg-gray-100 p-1 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setDesktopViewMode("fit")}
                      title="Scale down to fit the screen"
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        desktopViewMode === "fit"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                          : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      Scale
                      {desktopScale < 1 && (
                        <span className="ml-1 text-rose-600 dark:text-rose-300 font-bold">
                          ({Math.round(desktopScale * 100)}%)
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesktopViewMode("actual")}
                      title="View at original size (100%)"
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        desktopViewMode === "actual"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                          : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      100%
                    </button>
                  </div>
                )}
                <Button
                  onClick={() => openInNewTab(previewCode)}
                  variant="ghost"
                  size="icon"
                  title="Open in New Tab"
                  className="h-8 w-8"
                >
                  <LuExternalLink />
                </Button>
              </div>
            )}
          </div>

          {/* Version navigation */}
          {totalVersions > 0 && (
            <div className="hidden shrink-0 items-center justify-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 md:flex">
              <Button
                onClick={() => canGoPrev && setHead(sortedCommits[currentVersionIndex - 1].hash)}
                variant="ghost"
                size="icon"
                title="Previous version"
                className={`h-6 w-6 rounded-full hover:bg-white dark:hover:bg-zinc-700 ${!canGoPrev ? "opacity-30 cursor-not-allowed" : ""}`}
                disabled={!canGoPrev}
              >
                <LuChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <div
                onClick={onOpenVersions}
                className="flex items-center justify-center gap-2 px-1 cursor-pointer hover:opacity-70 transition-opacity w-32"
                title="View all versions"
              >
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none">
                  Version {currentVersionIndex + 1}
                </span>
                {currentVersionIndex === totalVersions - 1 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300 leading-none flex items-center h-4">
                    Latest
                  </span>
                )}
              </div>
              <Button
                onClick={() => canGoNext && setHead(sortedCommits[currentVersionIndex + 1].hash)}
                variant="ghost"
                size="icon"
                title="Next version"
                className={`h-6 w-6 rounded-full hover:bg-white dark:hover:bg-zinc-700 ${!canGoNext ? "opacity-30 cursor-not-allowed" : ""}`}
                disabled={!canGoNext}
              >
                <LuChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1">
            {canSelectAndEdit &&
              (activeTab === "desktop" || activeTab === "mobile") && (
                <SelectAndEditToolbarButton />
              )}
            {(appState === AppState.CODE_READY || isSelectedVariantComplete) && (
              <Button
                onClick={saveCurrentProject}
                variant="ghost"
                size="icon"
                title="Save Project"
                className="h-9 w-9"
              >
                <LuSave />
              </Button>
            )}
            {(appState === AppState.CODE_READY || isSelectedVariantComplete) && (
              <Button
                onClick={() => downloadCode(previewCode)}
                variant="ghost"
                size="icon"
                title="Download Code"
                className="h-9 w-9"
                data-testid="download-code"
              >
                <LuDownload />
              </Button>
            )}
            <Button
              onClick={() => {
                const iframes = document.querySelectorAll("iframe");
                iframes.forEach((iframe) => {
                  if (iframe.srcdoc) {
                    const content = iframe.srcdoc;
                    iframe.srcdoc = `${content}\n<!-- flowcraft-refresh:${Date.now()} -->`;
                  }
                });
              }}
              variant="ghost"
              size="icon"
              title="Refresh Preview"
              className="h-9 w-9"
            >
              <LuRefreshCw />
            </Button>
          </div>
        </div>
        <FlowCraftDiagnosis
          promptText={evaluationPromptText}
          code={previewCode}
          baselineCode={repairBaselineCode}
          generationDurationMs={generationDurationMs}
          modelName={selectedVariant?.model ?? settings.codeGenerationModel}
          repairAttempts={repairAttempts}
          currentVersionId={head ?? ""}
          isGenerating={
            appState === AppState.CODING || selectedVariant?.status === "generating"
          }
          onAutoRepair={onAutoRepair}
          onSelectVersion={setHead}
        />
        <TabsContent value="desktop" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          {showImageScanningPreview ? (
            <ImageScanningPreview imageUrl={sourceImage} />
          ) : (
            <div className="relative flex-1 min-h-0">
              {shouldHoldPreviousPreview && (
                <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/95 dark:text-zinc-300">
                  Editing... showing the last stable preview
                </div>
              )}
              <PreviewComponent
                code={previewCode}
                device="desktop"
                onScaleChange={setDesktopScale}
                viewMode={desktopViewMode}
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="mobile" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          {showImageScanningPreview ? (
            <ImageScanningPreview imageUrl={sourceImage} />
          ) : (
            <div className="relative flex-1 min-h-0">
              {shouldHoldPreviousPreview && (
                <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/95 dark:text-zinc-300">
                  Editing... showing the last stable preview
                </div>
              )}
              <PreviewComponent
                code={previewCode}
                device="mobile"
                viewMode="actual"
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="code" className="flex-1 min-h-0 mt-0 overflow-auto">
          <CodeTab
            code={previewCode}
            setCode={() => {}}
            settings={settings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PreviewPane;
