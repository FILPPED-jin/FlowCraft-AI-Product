import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../../hooks/useThrottle";
import { useAppStore } from "../../store/app-store";
import { normalizeBabelCdn } from "../../lib/babelCdn";
import { describeElementContext } from "../select-and-edit/utils";

interface Props {
  code: string;
  device: "mobile" | "desktop";
  onScaleChange?: (scale: number) => void;
  viewMode?: "fit" | "actual";
}

const MOBILE_VIEWPORT_WIDTH = 375;
export const DESKTOP_VIEWPORT_WIDTH = 1366;

function getAccessibleFrameDocument(iframe: HTMLIFrameElement | null) {
  try {
    return iframe?.contentWindow?.document ?? null;
  } catch {
    return null;
  }
}

function getAccessibleFrameWindow(iframe: HTMLIFrameElement | null) {
  try {
    void iframe?.contentWindow?.document;
    return iframe?.contentWindow ?? null;
  } catch {
    return null;
  }
}

function PreviewComponent({
  code,
  device,
  onScaleChange,
  viewMode,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const throttledCode = useThrottle(code, 200);
  const activeMode = viewMode ?? "fit";
  const initialHtmlRef = useRef(normalizeBabelCdn(code));
  const visibleHtmlRef = useRef(initialHtmlRef.current);
  const [stableHtml, setStableHtml] = useState(initialHtmlRef.current);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const [clickEvent, setClickEvent] = useState<MouseEvent | null>(null);

  const { inSelectAndEditMode, selectedElement, setSelectedElement } =
    useAppStore();

  const inSelectAndEditModeRef = useRef(inSelectAndEditMode);
  useEffect(() => {
    inSelectAndEditModeRef.current = inSelectAndEditMode;
  }, [inSelectAndEditMode]);

  const handleIframeClick = useCallback((event: MouseEvent) => {
    if (!inSelectAndEditModeRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    setClickEvent(event);
  }, []);

  const handleIframeInteraction = useCallback((event: Event) => {
    if (!inSelectAndEditModeRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleIframeLinkClick = useCallback((event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest?.("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (href && href.startsWith("#")) {
      event.preventDefault();
    }
  }, []);

  const handleIframeKeyDown = useCallback((event: KeyboardEvent) => {
    if (!inSelectAndEditModeRef.current) return;
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    useAppStore.getState().disableInSelectAndEditMode();
  }, []);

  useEffect(() => {
    if (!inSelectAndEditModeRef.current || !clickEvent) return;

    const targetElement = clickEvent.target as HTMLElement;
    if (!targetElement) return;

    setSelectedElement({
      tagName: targetElement.tagName.toLowerCase(),
      html: targetElement.outerHTML,
      context: describeElementContext(targetElement),
    });
  }, [clickEvent, setSelectedElement]);

  useEffect(() => {
    if (inSelectAndEditMode) return;
    if (selectedElement) {
      setSelectedElement(null);
    }
  }, [inSelectAndEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const updateScale = () => {
      const wrapper = wrapperRef.current;
      const iframe = iframeRef.current;
      if (!wrapper || !iframe) return;

      const viewportWidth = wrapper.clientWidth;
      const viewportHeight = wrapper.clientHeight;

      if (device === "desktop") {
        const scaleValue =
          activeMode === "fit"
            ? Math.min(1, viewportWidth / DESKTOP_VIEWPORT_WIDTH)
            : 1;
        const iframeHeight =
          scaleValue > 0 ? viewportHeight / scaleValue : viewportHeight;

        onScaleChange?.(scaleValue);
        iframe.style.width = `${DESKTOP_VIEWPORT_WIDTH}px`;
        iframe.style.height = `${iframeHeight}px`;
        iframe.style.transform = `scale(${scaleValue})`;
        iframe.style.transformOrigin = "top left";
        return;
      }

      onScaleChange?.(1);
      iframe.style.width = `${MOBILE_VIEWPORT_WIDTH}px`;
      iframe.style.height = `${viewportHeight}px`;
      iframe.style.transform = "scale(1)";
      iframe.style.transformOrigin = "top left";
    };

    updateScale();

    window.addEventListener("resize", updateScale);
    const resizeObserver = new ResizeObserver(updateScale);
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }
    return () => {
      window.removeEventListener("resize", updateScale);
      resizeObserver.disconnect();
    };
  }, [activeMode, device, onScaleChange]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const suppressedEvents = ["pointerdown", "mousedown", "mouseup", "submit"];

    const handleLoad = () => {
      const win = getAccessibleFrameWindow(iframe);
      const doc = getAccessibleFrameDocument(iframe);
      if (!win) return;
      win.addEventListener("click", handleIframeClick, true);
      for (const type of suppressedEvents) {
        win.addEventListener(type, handleIframeInteraction, true);
      }
      win.addEventListener("keydown", handleIframeKeyDown, true);
      doc?.addEventListener("click", handleIframeLinkClick);
    };

    iframe.addEventListener("load", handleLoad);
    if (getAccessibleFrameDocument(iframe)?.readyState === "complete") {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener("load", handleLoad);
      const win = getAccessibleFrameWindow(iframe);
      const doc = getAccessibleFrameDocument(iframe);
      if (win) {
        win.removeEventListener("click", handleIframeClick, true);
        for (const type of suppressedEvents) {
          win.removeEventListener(type, handleIframeInteraction, true);
        }
        win.removeEventListener("keydown", handleIframeKeyDown, true);
        doc?.removeEventListener("click", handleIframeLinkClick);
      }
    };
  }, [
    handleIframeClick,
    handleIframeInteraction,
    handleIframeKeyDown,
    handleIframeLinkClick,
  ]);

  useEffect(() => {
    const html = normalizeBabelCdn(throttledCode);
    if (!html.trim() || html === stableHtml || html === pendingHtml) return;
    setPendingHtml(html);
  }, [pendingHtml, stableHtml, throttledCode]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || visibleHtmlRef.current === stableHtml) return;
    visibleHtmlRef.current = stableHtml;
    iframe.srcdoc = stableHtml;
  }, [stableHtml]);

  const commitPendingHtml = useCallback(() => {
    if (!pendingHtml) return;
    setStableHtml(pendingHtml);
    setPendingHtml(null);
  }, [pendingHtml]);

  return (
    <div
      className={`relative h-full min-h-0 flex-1 ${
        device === "mobile"
          ? "flex justify-center overflow-hidden bg-gray-100 dark:bg-zinc-900"
          : activeMode === "fit"
            ? "flex justify-center overflow-hidden"
            : "overflow-auto"
      } ${inSelectAndEditMode ? "cursor-crosshair" : ""}`}
    >
      <div
        ref={wrapperRef}
        className={`absolute inset-0 min-h-0 min-w-0 ${
          device === "mobile"
            ? "flex justify-center overflow-hidden"
            : activeMode === "fit"
              ? "flex justify-center overflow-hidden"
              : "overflow-auto"
        }`}
      >
        <iframe
          id={`preview-${device}`}
          ref={iframeRef}
          title="Preview"
          srcDoc={initialHtmlRef.current}
          className={classNames({
            "border-0": true,
          })}
        ></iframe>
        {pendingHtml && (
          <iframe
            title="Preparing preview"
            srcDoc={pendingHtml}
            onLoad={commitPendingHtml}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
      </div>
    </div>
  );
}

export default PreviewComponent;
