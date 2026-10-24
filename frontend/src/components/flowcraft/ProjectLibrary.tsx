import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { FlowCraftProject, deleteFlowCraftProject, listFlowCraftProjects } from "../../lib/flowcraft-storage";
import { Stack } from "../../lib/stacks";
import { useAppStore } from "../../store/app-store";
export default function ProjectLibrary({ onOpen }: { onOpen: (code: string, stack: Stack) => void }) {
  const open = useAppStore(state => state.isProjectLibraryOpen);
  const setOpen = useAppStore(state => state.setProjectLibraryOpen);
  const [projects, setProjects] = useState(listFlowCraftProjects);
  useEffect(() => { if (open) setProjects(listFlowCraftProjects()); }, [open]);
  function refreshSavedWork() { setProjects(listFlowCraftProjects()); }
  function importFromCode(code: string, stack: Stack) { setOpen(false); onOpen(code, stack); }
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) refreshSavedWork(); }}>
    <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Projects</DialogTitle></DialogHeader>
      {projects.length === 0 && <p className="py-6 text-sm text-gray-500">No saved projects yet.</p>}
      {true && (
        <section className="order-3 mt-8 mb-6 border-t border-gray-200 bg-white py-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Project library
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                Local saved HTML results with content fingerprints.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshSavedWork}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Refresh
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                onOpen={() => {
                  importFromCode(project.code, project.stack as Stack);
                  refreshSavedWork();
                }}
                onDelete={() => {
                  deleteFlowCraftProject(project.id);
                  refreshSavedWork();
                }}
              />
            ))}
          </div>
        </section>
      )}

    </DialogContent>
  </Dialog>;
}
function ProjectItem({
  project,
  onOpen,
  onDelete,
}: {
  project: FlowCraftProject;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const updatedAt = new Date(project.updatedAt);
  const updatedLabel = Number.isNaN(updatedAt.getTime())
    ? "Saved"
    : updatedAt.toLocaleString();
  const codeSizeLabel =
    project.codeSize >= 1000
      ? `${(project.codeSize / 1000).toFixed(1)}k chars`
      : `${project.codeSize} chars`;

  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-zinc-800">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
          {project.title}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-zinc-500">
          {project.summary}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-zinc-500">
          <span>{updatedLabel}</span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] uppercase tracking-normal text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">
            {project.source}
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tracking-normal text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">
            {codeSizeLabel}
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tracking-normal text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">
            #{project.signature.slice(0, 8)}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-300"
      >
        Delete
      </button>
    </div>
  );
}

