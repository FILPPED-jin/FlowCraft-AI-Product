import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Stack } from "../../lib/stacks";
import { DesignSystem, Settings } from "../../types";
import UploadTab from "./tabs/UploadTab";
import UrlTab from "./tabs/UrlTab";
import TextTab from "./tabs/TextTab";
import ImportTab from "./tabs/ImportTab";
import { DesignSystemSelectorProps } from "../settings/DesignSystemSelector";
import { FLOWCRAFT_DEMO_HTML } from "../../lib/flowcraft-demo";
import {
  loadFlowCraftResult,
} from "../../lib/flowcraft-storage";

interface Props {
  doCreate: (
    images: string[],
    inputMode: "image" | "video",
    textPrompt?: string,
    isAssetExtractionEnabled?: boolean
  ) => void;
  doCreateFromText: (text: string) => void;
  importFromCode: (code: string, stack: Stack) => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  designSystems: DesignSystem[];
  onAddNewDesignSystem: () => void;
  onManageDesignSystems: () => void;
}

type InputTab = "upload" | "url" | "text" | "import";

function UnifiedInputPane({
  doCreate,
  doCreateFromText,
  importFromCode,
  settings,
  setSettings,
  designSystems,
  onAddNewDesignSystem,
  onManageDesignSystems,
}: Props) {
  const [activeTab, setActiveTab] = useState<InputTab>("upload");
  const [storedResult, setStoredResult] = useState(() => loadFlowCraftResult());

  function refreshSavedWork() {
    setStoredResult(loadFlowCraftResult());
  }

  function setStack(stack: Stack) {
    setSettings((prev: Settings) => ({
      ...prev,
      generatedCodeConfig: stack,
    }));
  }

  function setSelectedDesignSystemId(id: string | null) {
    setSettings((prev: Settings) => ({
      ...prev,
      selectedDesignSystemId: id,
    }));
  }

  const designSystemSelectorProps: DesignSystemSelectorProps = {
    designSystems,
    selectedDesignSystemId: settings.selectedDesignSystemId,
    setSelectedDesignSystemId,
    onAddNew: onAddNewDesignSystem,
    onManage: onManageDesignSystems,
  };

  return (
    <div className="flowcraft-input mx-auto flex w-full max-w-5xl flex-col px-5">
      <div className="flowcraft-home-heading mx-auto mb-6 max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase text-gray-400 dark:text-zinc-500">
          FlowCraft AI
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-gray-950 dark:text-zinc-50 sm:text-3xl">
          Interaction design workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-zinc-400">
          Upload a visual reference, choose the scenario and experience
          priorities, then generate a new interactive prototype that adapts the
          reference style instead of copying it.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => importFromCode(FLOWCRAFT_DEMO_HTML, Stack.HTML_TAILWIND)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Load V1 demo
          </button>
          {storedResult && (
            <button
              type="button"
              onClick={() => {
                importFromCode(storedResult.code, Stack.HTML_TAILWIND);
                refreshSavedWork();
              }}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Restore last result
            </button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as InputTab)}
        className="w-full"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Creation brief</h2>
            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-zinc-400">
              Start from a visual reference, choose a product scene, set the interaction strategy, then define the core task before generation.
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500">Stage 1</span>
        </div>
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger
            value="upload"
            className="flex items-center gap-2"
            data-testid="tab-upload"
          >
            <UploadIcon />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger
            value="text"
            className="flex items-center gap-2"
            data-testid="tab-text"
          >
            <TextIcon />
            <span className="hidden sm:inline">Text</span>
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="flex items-center gap-2"
            data-testid="tab-import"
          >
            <ImportIcon />
            <span className="hidden sm:inline">Import</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <UploadTab
            doCreate={doCreate}
            stack={settings.generatedCodeConfig}
            setStack={setStack}
            designSystem={designSystemSelectorProps}
          />
        </TabsContent>

        <TabsContent value="url" className="hidden">
          <UrlTab
            doCreate={doCreate}
            screenshotOneApiKey={settings.screenshotOneApiKey}
            stack={settings.generatedCodeConfig}
            setStack={setStack}
            designSystem={designSystemSelectorProps}
          />
        </TabsContent>

        <TabsContent value="text" className="mt-0">
          <TextTab
            doCreateFromText={doCreateFromText}
            stack={settings.generatedCodeConfig}
            setStack={setStack}
            designSystem={designSystemSelectorProps}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-0">
          <ImportTab importFromCode={importFromCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 6.1H3" />
      <path d="M21 12.1H3" />
      <path d="M15.1 18H3" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export default UnifiedInputPane;
