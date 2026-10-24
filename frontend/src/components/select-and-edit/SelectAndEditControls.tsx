import { LuMousePointerClick, LuX } from "react-icons/lu";
import { useAppStore } from "../../store/app-store";

// Select-and-edit toggle in the preview toolbar, next to the device/code
// tabs — the "inspect element" spot users know from devtools. While select
// mode is on it becomes an explicit exit button.
export function SelectAndEditToolbarButton() {
  const {
    inSelectAndEditMode,
    toggleInSelectAndEditMode,
    disableInSelectAndEditMode,
  } = useAppStore();
  return (
    <button
      type="button"
      onClick={
        inSelectAndEditMode
          ? disableInSelectAndEditMode
          : toggleInSelectAndEditMode
      }
      data-testid="select-edit-toggle"
      title={
        inSelectAndEditMode
          ? "Exit selection mode"
          : "Select an element in the preview to target your edit"
      }
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        inSelectAndEditMode
          ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      }`}
    >
      {inSelectAndEditMode ? (
        <>
          <LuX className="w-3.5 h-3.5" />
          Exit select mode
        </>
      ) : (
        <>
          <LuMousePointerClick className="w-3.5 h-3.5" />
          Select & edit
        </>
      )}
    </button>
  );
}
