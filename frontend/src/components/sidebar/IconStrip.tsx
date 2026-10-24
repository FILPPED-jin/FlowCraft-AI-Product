import { LuClock, LuCode, LuSettings, LuPlus, LuFolder } from "react-icons/lu";
import { useAppStore } from "../../store/app-store";
import AppleLogo from "./AppleLogo";

interface IconStripProps {
  isHistoryOpen: boolean;
  isEditorOpen: boolean;
  isSettingsOpen: boolean;
  showHistory: boolean;
  showEditor: boolean;
  onToggleHistory: () => void;
  onToggleEditor: () => void;
  onLogoClick: () => void;
  onNewProject: () => void;
  onOpenSettings: () => void;
}

function IconStrip({
  isHistoryOpen,
  isEditorOpen,
  isSettingsOpen,
  showHistory,
  showEditor,
  onToggleHistory,
  onToggleEditor,
  onLogoClick,
  onNewProject,
  onOpenSettings,
}: IconStripProps) {
  const setProjectLibraryOpen = useAppStore((state) => state.setProjectLibraryOpen);
  return (
    <div className="flowcraft-navigation flex w-full items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900 lg:h-full lg:w-16 lg:flex-col lg:items-center lg:gap-y-3 lg:border-b-0 lg:border-r lg:px-0 lg:py-4">
      {/* Logo */}
      <AppleLogo onClick={onLogoClick} />

      <div className="flex items-center gap-1 lg:flex-col lg:gap-0 lg:contents">
        {/* Editor */}
        {showEditor && (
          <button
            onClick={onToggleEditor}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
              isEditorOpen
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Editor"
          >
            <LuCode className="w-[18px] h-[18px]" />
            <span className="hidden text-[10px] leading-none lg:block">Editor</span>
          </button>
        )}

        {/* Versions */}
        {showHistory && (
          <button
            onClick={onToggleHistory}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
              isHistoryOpen
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Versions"
          >
            <LuClock className="w-[18px] h-[18px]" />
            <span className="hidden text-[10px] leading-none lg:block">Versions</span>
          </button>
        )}

        <button
          onClick={onNewProject}
          className="flex items-center justify-center rounded-lg p-2 transition-colors bg-rose-50 text-red-600 hover:bg-rose-100 lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          title="Start a new project"
        >
          <LuPlus className="w-[18px] h-[18px]" />
          <span className="hidden text-[10px] leading-none lg:block font-medium">New</span>
        </button>
      </div>

      {/* Spacer pushes settings to bottom */}
      <button
        type="button"
        onClick={() => setProjectLibraryOpen(true)}
        title="Projects"
        className="flex items-center justify-center gap-2 rounded-md p-2 text-gray-600 hover:bg-rose-50 hover:text-red-600 lg:flex-col lg:gap-1"
      >
        <LuFolder className="h-[18px] w-[18px]" />
        <span className="hidden text-[10px] lg:block">Projects</span>
      </button>
      <div className="hidden flex-1 lg:block" />

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
          isSettingsOpen
            ? "text-gray-900 dark:text-white"
            : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        }`}
        title="Settings"
      >
        <LuSettings className="w-[18px] h-[18px]" />
        <span className="hidden text-[10px] leading-none lg:block">Settings</span>
      </button>
    </div>
  );
}

export default IconStrip;
