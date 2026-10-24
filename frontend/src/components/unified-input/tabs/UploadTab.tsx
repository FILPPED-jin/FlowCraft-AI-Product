import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { Cross2Icon, ImageIcon } from "@radix-ui/react-icons";
import { ScreenRecorderState } from "../../../types";
import ScreenRecorder from "../../recording/ScreenRecorder";
import { DesignSystemSelectorProps } from "../../settings/DesignSystemSelector";
import { Stack } from "../../../lib/stacks";
import ScreenshotToCodeControls from "../ScreenshotToCodeControls";
import FlowCraftControls from "../../flowcraft/FlowCraftControls";
import {
  buildFlowCraftPrompt,
  DEFAULT_FLOWCRAFT_FIDELITY_MODE,
  DEFAULT_FLOWCRAFT_SCENARIO_ID,
  DEFAULT_FLOWCRAFT_STRATEGY_ID,
  FlowCraftScenarioId,
  FlowCraftFidelityMode,
  FlowCraftStrategyId,
  getFlowCraftScenario,
} from "../../../lib/flowcraft";
import { analyzeFlowCraftReferenceImage } from "../../../lib/flowcraft-visual-analysis";
import { HTTP_BACKEND_URL } from "../../../config";

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType =
        file.type ||
        (file.name.toLowerCase().endsWith(".mov") ? "video/quicktime" : "");
      if (result.startsWith("data:application/octet-stream") && mimeType) {
        const correctedResult = result.replace(
          "data:application/octet-stream",
          `data:${mimeType}`
        );
        resolve(correctedResult);
      } else {
        resolve(result);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

type FileWithPreview = {
  preview: string;
} & File;

const MAX_FILES = 5;
const MAX_REQUIRED_DETAILS_LENGTH = 4000;

const isVideoFile = (file: File) =>
  file.type.startsWith("video/") ||
  [".mp4", ".mov", ".webm"].some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

function getImageFilesFromDataTransfer(items: DataTransferItemList | null) {
  if (!items) return [];

  return Array.from(items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      const extension = file.type.split("/")[1] || "png";
      return new File(
        [file],
        file.name || `pasted-screenshot-${Date.now()}-${index}.${extension}`,
        { type: file.type || "image/png" }
      );
    })
    .filter((file): file is File => file !== null);
}

async function readImageFilesFromClipboard() {
  if (!navigator.clipboard?.read) {
    return [];
  }

  const clipboardItems = await navigator.clipboard.read();
  const files: File[] = [];

  for (const item of clipboardItems) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (!imageType) continue;

    const blob = await item.getType(imageType);
    const extension = imageType.split("/")[1] || "png";
    files.push(
      new File(
        [blob],
        `pasted-screenshot-${Date.now()}-${files.length}.${extension}`,
        { type: imageType }
      )
    );
  }

  return files;
}

async function analyzeReferenceWithQwen(
  image: string,
  scenario: FlowCraftScenarioId,
  coreTask: string,
  requiredDetails: string
) {
  try {
    const response = await fetch(`${HTTP_BACKEND_URL}/api/flowcraft/analyze-reference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, scenario, coreTask, requiredDetails }),
    });

    if (!response.ok) {
      return "";
    }

    const data = (await response.json()) as {
      enabled?: boolean;
      notes?: string;
    };

    return data.enabled && data.notes ? data.notes.trim() : "";
  } catch {
    return "";
  }
}

interface Props {
  doCreate: (
    referenceImages: string[],
    inputMode: "image" | "video",
    textPrompt?: string,
    isAssetExtractionEnabled?: boolean
  ) => void;
  stack: Stack;
  setStack: (stack: Stack) => void;
  designSystem: DesignSystemSelectorProps;
}

function UploadTab({ doCreate, stack, setStack, designSystem }: Props) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedDataUrls, setUploadedDataUrls] = useState<string[]>([]);
  const [uploadedInputMode, setUploadedInputMode] = useState<
    "image" | "video"
  >("image");
  const [textPrompt, setTextPrompt] = useState("");
  const [flowScenarioId, setFlowScenarioId] = useState<FlowCraftScenarioId>(
    DEFAULT_FLOWCRAFT_SCENARIO_ID
  );
  const initialScenario = getFlowCraftScenario(DEFAULT_FLOWCRAFT_SCENARIO_ID);
  const [flowStrategyId, setFlowStrategyId] =
    useState<FlowCraftStrategyId>(DEFAULT_FLOWCRAFT_STRATEGY_ID);
  const [flowUserGoal, setFlowUserGoal] = useState(initialScenario.userGoal);
  const [flowRequirementsText, setFlowRequirementsText] = useState(
    initialScenario.exampleCopy
  );
  const [flowVisualNotes, setFlowVisualNotes] = useState("");
  const [flowFidelityMode, setFlowFidelityMode] =
    useState<FlowCraftFidelityMode>(DEFAULT_FLOWCRAFT_FIDELITY_MODE);
  const [isAssetExtractionEnabled, setIsAssetExtractionEnabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const filesRef = useRef<FileWithPreview[]>([]);
  const submissionLockRef = useRef(false);
  const [screenRecorderState, setScreenRecorderState] =
    useState<ScreenRecorderState>(ScreenRecorderState.INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasUploadedFile = uploadedDataUrls.length > 0;
  const remainingSlots = Math.max(0, MAX_FILES - files.length);
  const isAtLimit = remainingSlots === 0;

  const buildVisualNotes = useCallback(
    async (images: string[], inputMode: "image" | "video") => {
      if (inputMode !== "image" || images.length === 0) {
        return flowVisualNotes;
      }
      const qwenNotes = await analyzeReferenceWithQwen(
        images[0],
        flowScenarioId,
        flowUserGoal,
        flowRequirementsText
      );
      const localNotes = await analyzeFlowCraftReferenceImage(images[0]);
      return [flowVisualNotes.trim(), qwenNotes, localNotes.trim()]
        .filter(Boolean)
        .join("\n\n");
    },
    [flowRequirementsText, flowScenarioId, flowUserGoal, flowVisualNotes]
  );

  const validateSubmission = useCallback(
    async (hasReference: boolean, inputMode: "image" | "video") => {
      if (!hasReference) {
        toast.error("Upload a reference image or video before generating.");
        return false;
      }
      if (!flowUserGoal.trim()) {
        toast.error("Core task is required.");
        return false;
      }
      if (flowRequirementsText.length > MAX_REQUIRED_DETAILS_LENGTH) {
        toast.error(
          `Required details must be ${MAX_REQUIRED_DETAILS_LENGTH.toLocaleString()} characters or fewer.`
        );
        return false;
      }

      if (inputMode === "image") {
        try {
          const response = await fetch(`${HTTP_BACKEND_URL}/api/capabilities`);
          if (!response.ok) throw new Error("Capability check failed");
          const capabilities = (await response.json()) as {
            deepseek_configured?: boolean;
          };
          if (!capabilities.deepseek_configured) {
            toast.error(
              "DeepSeek API key is not configured. Add it to backend/.env and restart the backend."
            );
            return false;
          }
        } catch {
          toast.error(
            "Could not verify the backend configuration. Check that the backend is running."
          );
          return false;
        }
      }
      return true;
    },
    [flowRequirementsText, flowUserGoal]
  );

  const handleGenerate = useCallback(async () => {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    setIsSubmitting(true);
    const canSubmit = await validateSubmission(
      uploadedDataUrls.length > 0,
      uploadedInputMode
    );
    if (!canSubmit) {
      submissionLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const visualNotes = await buildVisualNotes(
        uploadedDataUrls,
        uploadedInputMode
      );
      doCreate(
        uploadedDataUrls,
        uploadedInputMode,
        buildFlowCraftPrompt(textPrompt, flowScenarioId, flowStrategyId, {
          userGoal: flowUserGoal,
          requirementsText: flowRequirementsText,
          visualNotes,
          fidelity: flowFidelityMode,
          screenshotRef:
            uploadedInputMode === "video"
              ? "uploaded screen recording"
              : `${uploadedDataUrls.length} uploaded screenshot${
                  uploadedDataUrls.length === 1 ? "" : "s"
                }`,
        }),
        isAssetExtractionEnabled
      );
    } catch {
      submissionLockRef.current = false;
      setIsSubmitting(false);
      toast.error("Generation could not be started. Please try again.");
    }
  }, [
    validateSubmission,
    uploadedDataUrls,
    uploadedInputMode,
    textPrompt,
    flowScenarioId,
    flowStrategyId,
    flowUserGoal,
    flowRequirementsText,
    flowFidelityMode,
    buildVisualNotes,
    isAssetExtractionEnabled,
    doCreate,
  ]);

  useEffect(() => {
    if (!hasUploadedFile) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (document.activeElement === textInputRef.current) return;
        e.preventDefault();
        handleGenerate();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [hasUploadedFile, handleGenerate]);

  const handleClear = () => {
    files.forEach((file) => URL.revokeObjectURL(file.preview));
    setUploadedDataUrls([]);
    setFiles([]);
    setTextPrompt("");
    setFlowScenarioId(DEFAULT_FLOWCRAFT_SCENARIO_ID);
    setFlowStrategyId(DEFAULT_FLOWCRAFT_STRATEGY_ID);
    setFlowUserGoal(initialScenario.userGoal);
    setFlowRequirementsText(initialScenario.exampleCopy);
    setFlowVisualNotes("");
    setUploadedInputMode("image");
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleAddFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const incomingHasVideo = acceptedFiles.some(isVideoFile);
      const hasExistingImages = files.length > 0 && uploadedInputMode === "image";

      if (incomingHasVideo && (acceptedFiles.length > 1 || hasExistingImages)) {
        toast.error(
          `Upload either one video or up to ${MAX_FILES} screenshots (not both).`
        );
        return;
      }

      if (uploadedInputMode === "video" && files.length > 0) {
        toast.error("Remove the video to add images.");
        return;
      }

      if (!incomingHasVideo && files.length >= MAX_FILES) {
        toast.error(
          `You’ve reached the limit of ${MAX_FILES} screenshots. Remove one to add another.`
        );
        return;
      }

      let filesToAdd = acceptedFiles;
      if (!incomingHasVideo && files.length + acceptedFiles.length > MAX_FILES) {
        const remainingSlots = MAX_FILES - files.length;
        toast.error(
          `Only ${remainingSlots} more screenshot${
            remainingSlots === 1 ? "" : "s"
          } will be added to stay within the ${MAX_FILES}-screenshot limit.`
        );
        filesToAdd = acceptedFiles.slice(0, remainingSlots);
      }

      const newFiles = filesToAdd.map((file: File) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      ) as FileWithPreview[];

      try {
        const dataUrls = await Promise.all(filesToAdd.map((file) => fileToDataURL(file)));
        if (dataUrls.length === 0) return;

        if (incomingHasVideo) {
          files.forEach((file) => URL.revokeObjectURL(file.preview));
          setFiles(newFiles);
          setUploadedDataUrls(dataUrls as string[]);
          setUploadedInputMode("video");
          setSelectedIndex(0);
        } else {
          setFiles((prev) => [...prev, ...newFiles]);
          setUploadedDataUrls((prev) => [...prev, ...(dataUrls as string[])]);
          setUploadedInputMode("image");
          if (files.length === 0) {
            setSelectedIndex(0);
          }
        }

        setTimeout(() => textInputRef.current?.focus(), 100);
      } catch (error) {
        newFiles.forEach((file) => URL.revokeObjectURL(file.preview));
        toast.error("Error reading files.");
        console.error("Error reading files:", error);
      }
    },
    [files, uploadedInputMode]
  );

  const handlePasteFiles = useCallback(
    async (pastedFiles: File[]) => {
      if (pastedFiles.length === 0) {
        toast.error("Clipboard does not contain an image.");
        return;
      }

      await handleAddFiles(pastedFiles);
    },
    [handleAddFiles]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const pastedFiles = await readImageFilesFromClipboard();
      await handlePasteFiles(pastedFiles);
    } catch (error) {
      console.error("Error reading clipboard:", error);
      toast.error("Could not read an image from the clipboard. Try Ctrl/Cmd + V.");
    }
  }, [handlePasteFiles]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.isContentEditable;
      if (isTextInput) return;

      const pastedFiles = getImageFilesFromDataTransfer(
        event.clipboardData?.items ?? null
      );
      if (pastedFiles.length === 0) return;

      event.preventDefault();
      void handlePasteFiles(pastedFiles);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePasteFiles]);

  const {
    getRootProps,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject,
    isDragActive,
    open,
  } = useDropzone({
    maxFiles: MAX_FILES,
    maxSize: 1024 * 1024 * 20,
    noClick: true,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpeg"],
      "image/jpg": [".jpg"],
      "video/quicktime": [".mov"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
    },
    onDrop: handleAddFiles,
    onDropRejected: (rejectedFiles) => {
      const firstError = rejectedFiles[0]?.errors?.[0];
      if (!firstError) {
        toast.error("Some files were rejected.");
        return;
      }

      if (firstError.code === "file-too-large") {
        toast.error("One or more files exceed the 20MB limit.");
        return;
      }

      if (firstError.code === "file-invalid-type") {
        toast.error("Unsupported file type. Use PNG, JPG, MP4, MOV, or WebM.");
        return;
      }

      if (firstError.code === "too-many-files") {
        toast.error(`You can upload up to ${MAX_FILES} screenshots.`);
        return;
      }

      toast.error(firstError.message);
    },
  });

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => filesRef.current.forEach((file) => URL.revokeObjectURL(file.preview));
  }, []);

  const dropzoneClassName = useMemo(() => {
    const base =
      "flex min-h-[260px] w-full max-w-5xl flex-col items-center justify-center rounded-lg border border-dashed bg-white p-5 text-gray-500 outline-none transition-all cursor-pointer dark:bg-zinc-950 dark:text-zinc-400";
    if (isFocused) {
      return `${base} border-blue-500 bg-blue-50 dark:bg-blue-950/30`;
    }
    if (isDragAccept) {
      return `${base} border-green-500 bg-green-50 dark:bg-green-950/30`;
    }
    if (isDragReject) {
      return `${base} border-red-500 bg-red-50 dark:bg-red-950/30`;
    }
    return `${base} border-gray-200 dark:border-zinc-700`;
  }, [isFocused, isDragAccept, isDragReject]);

  const handleScreenRecorderGenerate = async (
    images: string[],
    inputMode: "image" | "video"
  ) => {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    setIsSubmitting(true);
    const canSubmit = await validateSubmission(images.length > 0, inputMode);
    if (!canSubmit) {
      submissionLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const visualNotes = await buildVisualNotes(images, inputMode);
      doCreate(
        images,
        inputMode,
        buildFlowCraftPrompt("", flowScenarioId, flowStrategyId, {
          userGoal: flowUserGoal,
          requirementsText: flowRequirementsText,
          visualNotes,
          fidelity: flowFidelityMode,
          screenshotRef:
            inputMode === "video"
              ? "recorded screen video"
              : `${images.length} recorded screenshot${images.length === 1 ? "" : "s"}`,
        })
      );
    } catch {
      submissionLockRef.current = false;
      setIsSubmitting(false);
      toast.error("Generation could not be started. Please try again.");
    }
  };

  const handleRemoveImage = (index: number) => {
    if (uploadedInputMode === "video" || files.length === 1) {
      handleClear();
      return;
    }

    const removed = files[index];
    if (removed) {
      URL.revokeObjectURL(removed.preview);
    }

    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadedDataUrls((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => {
      if (prev === index) {
        return Math.max(0, index - 1);
      }
      if (prev > index) {
        return prev - 1;
      }
      return prev;
    });
  };

  return (
    <div className="flowcraft-upload-layout flex flex-col items-center gap-5">
      <FlowCraftControls
        scenarioId={flowScenarioId}
        strategyId={flowStrategyId}
        userGoal={flowUserGoal}
        requirementsText={flowRequirementsText}
        visualNotes={flowVisualNotes}
        fidelityMode={flowFidelityMode}
        onScenarioChange={setFlowScenarioId}
        onStrategyChange={setFlowStrategyId}
        onUserGoalChange={setFlowUserGoal}
        onRequirementsTextChange={setFlowRequirementsText}
        onVisualNotesChange={setFlowVisualNotes}
        onFidelityModeChange={setFlowFidelityMode}
      />

      <div className="flowcraft-reference-column">
      <div className="flowcraft-region-heading">
        <h2>Reference image</h2>
        <p>Upload your screenshots or record a reference.</p>
      </div>
      {screenRecorderState === ScreenRecorderState.INITIAL && !hasUploadedFile && (
        <div {...getRootProps({ className: dropzoneClassName })} data-testid="upload-dropzone">
          <input data-testid="upload-input" {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400 dark:text-zinc-500"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-700 dark:text-zinc-200">
                Drop up to {MAX_FILES} screenshots or a single video
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
              Supports PNG, JPG, MP4, MOV, WebM (max 20MB each, 30s video)
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={open}
                className="text-sm text-gray-600 underline hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Browse files
              </button>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Paste screenshot
              </button>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500">
              You can also press Ctrl/Cmd + V.
            </p>
          </div>
        </div>
      )}

      {hasUploadedFile && (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative w-full max-w-5xl">
            {uploadedInputMode === "video" ? (
              <div className="relative rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <video
                  src={files[0]?.preview}
                  className="h-auto max-h-[400px] w-full rounded-md border border-gray-100 object-contain dark:border-zinc-800"
                  controls
                />
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 bg-white dark:bg-zinc-800 rounded-full p-1.5 shadow-md hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Remove video"
                >
                  <Cross2Icon className="h-4 w-4 text-gray-600 dark:text-zinc-300" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps({
                  className: `relative rounded-lg border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${
                    isDragActive ? "ring-2 ring-blue-200 dark:ring-blue-800" : ""
                  }`,
                })}
              >
                <input {...getInputProps()} />
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                  <span>{`Uploaded Screenshots (${files.length}/${MAX_FILES})`}</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                  >
                    Clear all
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
                  {isAtLimit
                    ? "Limit reached"
                    : `${remainingSlots} remaining`}
                </div>
                <div className="mt-3 overflow-hidden rounded-md border border-gray-100 bg-gray-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex h-[280px] w-full items-center justify-center overflow-hidden rounded bg-white dark:bg-zinc-950">
                    {files[selectedIndex] && (
                      <img
                        src={files[selectedIndex].preview}
                        alt={`Uploaded screenshot ${selectedIndex + 1}`}
                        className="h-auto w-auto max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative group flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        className={`h-14 w-14 rounded-md border overflow-hidden ${
                          selectedIndex === index
                            ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                            : "border-gray-200 dark:border-zinc-700"
                        }`}
                        aria-label={`Preview screenshot ${index + 1}`}
                      >
                        <img
                          src={file.preview}
                          alt={`Thumbnail ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-1 -right-1 h-4 w-4 bg-gray-800 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
                        <Cross2Icon className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (isAtLimit) {
                        toast.error(
                          `You’ve reached the limit of ${MAX_FILES} screenshots. Remove one to add another.`
                        );
                        return;
                      }
                      open();
                    }}
                    disabled={isAtLimit}
                    className={`h-14 w-14 rounded-md border border-dashed flex items-center justify-center flex-shrink-0 ${
                      isAtLimit
                        ? "border-gray-200 dark:border-zinc-700 text-gray-300 dark:text-zinc-600 cursor-not-allowed"
                        : "border-gray-300 dark:border-zinc-600 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:border-gray-400 dark:hover:border-zinc-500"
                    }`}
                    aria-label="Add more screenshots"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-400 dark:text-zinc-500">
                  Drag and drop, browse, or paste to add more screenshots
                </div>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  disabled={isAtLimit}
                  className={`mt-3 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    isAtLimit
                      ? "cursor-not-allowed border-gray-200 text-gray-300 dark:border-zinc-700 dark:text-zinc-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                >
                  Paste screenshot
                </button>
                {isDragActive && (
                  <div className="absolute inset-0 bg-blue-50/80 dark:bg-blue-950/80 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg flex items-center justify-center pointer-events-none">
                    <p className="text-blue-600 dark:text-blue-400 font-medium">Drop to add</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <ScreenshotToCodeControls
            textPrompt={textPrompt}
            onTextPromptChange={setTextPrompt}
            textInputRef={textInputRef}
            onTextInputKeyDown={handleKeyDown}
            stack={stack}
            setStack={setStack}
            designSystem={designSystem}
            showAssetExtraction={uploadedInputMode === "image"}
            isAssetExtractionEnabled={isAssetExtractionEnabled}
            onAssetExtractionChange={setIsAssetExtractionEnabled}
            onGenerate={handleGenerate}
            isActionLoading={isSubmitting}
          />
        </div>
      )}

      {!hasUploadedFile && (
        <div className="flex flex-col items-center gap-3">
          {screenRecorderState === ScreenRecorderState.INITIAL && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
              <div className="h-px w-12 bg-gray-300 dark:bg-zinc-600" />
              <span>or</span>
              <div className="h-px w-12 bg-gray-300 dark:bg-zinc-600" />
            </div>
          )}
          <ScreenRecorder
            screenRecorderState={screenRecorderState}
            setScreenRecorderState={setScreenRecorderState}
            generateCode={handleScreenRecorderGenerate}
            stack={stack}
            setStack={setStack}
            designSystem={designSystem}
          />
        </div>
      )}
      </div>
    </div>
  );
}

export default UploadTab;
