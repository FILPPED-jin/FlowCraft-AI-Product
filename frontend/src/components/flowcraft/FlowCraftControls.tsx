import {
  FLOWCRAFT_FIDELITY_MODES,
  FLOWCRAFT_STRATEGIES,
  FlowCraftFidelityMode,
  FlowCraftStrategyId,
  FlowCraftScenarioId,
  createFlowProject,
  getFlowCraftScenario,
  getFlowCraftStrategy,
} from "../../lib/flowcraft";
import ScenarioPicker from "./ScenarioPicker";

interface Props {
  scenarioId: FlowCraftScenarioId;
  strategyId?: FlowCraftStrategyId;
  preferenceId?: FlowCraftStrategyId;
  userGoal: string;
  requirementsText: string;
  visualNotes?: string;
  fidelityMode?: FlowCraftFidelityMode;
  onScenarioChange: (id: FlowCraftScenarioId) => void;
  onStrategyChange?: (id: FlowCraftStrategyId) => void;
  onPreferenceChange?: (id: FlowCraftStrategyId) => void;
  onUserGoalChange: (value: string) => void;
  onRequirementsTextChange: (value: string) => void;
  onVisualNotesChange?: (value: string) => void;
  onFidelityModeChange?: (value: FlowCraftFidelityMode) => void;
  showVisualNotes?: boolean;
}

export default function FlowCraftControls({
  scenarioId,
  strategyId,
  preferenceId,
  userGoal,
  requirementsText,
  visualNotes = "",
  fidelityMode = "faithful",
  onScenarioChange,
  onStrategyChange,
  onPreferenceChange,
  onUserGoalChange,
  onRequirementsTextChange,
  onVisualNotesChange,
  onFidelityModeChange,
  showVisualNotes = true,
}: Props) {
  const scenario = getFlowCraftScenario(scenarioId);
  const activeStrategyId = strategyId ?? preferenceId ?? scenario.defaultStrategy;
  const strategy = getFlowCraftStrategy(activeStrategyId);
  const strategyVariant = scenario.strategyVariants.find(
    (variant) => variant.strategyId === activeStrategyId
  );
  const visualNotesLookLikeTarget =
    visualNotes.trim().length > 0 &&
    /生成|创建|做一个|做个|需要|我想|页面|网站|电商|购物|商城|公司|企业|原型|流程|generate|create|build|make|need|want|page|site|ecommerce|shopping|company|prototype/i.test(
      visualNotes
    ) &&
    !/颜色|配色|布局|侧栏|导航|卡片|按钮|字体|间距|圆角|深色|浅色|三栏|面板|视觉|风格|层级|color|palette|layout|sidebar|nav|card|button|type|spacing|radius|dark|light|panel|visual|style|hierarchy/i.test(
      visualNotes
    );
  const project = createFlowProject({
    scenarioId,
    strategyId: activeStrategyId,
    userGoal,
    requirementsText,
    visualNotes,
  });

  const handleScenarioChange = (id: FlowCraftScenarioId) => {
    const nextScenario = getFlowCraftScenario(id);
    onScenarioChange(id);
    onUserGoalChange(nextScenario.userGoal);
    onRequirementsTextChange(nextScenario.exampleCopy);
    const updateStrategy = onStrategyChange ?? onPreferenceChange;
    updateStrategy?.(nextScenario.defaultStrategy);
  };

  const handleStrategyChange = (id: FlowCraftStrategyId) => {
    const updateStrategy = onStrategyChange ?? onPreferenceChange;
    updateStrategy?.(id);
  };

  return (
    <section className="flowcraft-brief w-full max-w-5xl rounded-lg border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div hidden style={{ display: "none" }} />

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="space-y-2">
          <label
            htmlFor="flowcraft-scenario"
            className="text-xs font-medium text-gray-600 dark:text-zinc-300"
          >
            Scenario template
          </label>
          <ScenarioPicker value={scenarioId} onChange={handleScenarioChange} />
        </div>

        <div hidden />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="flowcraft-core-task"
              className="text-xs font-medium text-gray-600 dark:text-zinc-300"
            >
              Core task
            </label>
            <textarea
              id="flowcraft-core-task"
              value={userGoal}
              onChange={(event) => onUserGoalChange(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              placeholder={scenario.userGoal}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="flowcraft-requirements"
              className="text-xs font-medium text-gray-600 dark:text-zinc-300"
            >
              Required details
            </label>
            <textarea
              id="flowcraft-requirements"
              value={requirementsText}
              onChange={(event) => onRequirementsTextChange(event.target.value)}
              maxLength={4000}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              placeholder={scenario.exampleCopy}
            />
          </div>
        </div>

        {showVisualNotes && onVisualNotesChange && (
          <div className="space-y-2">
            <label
              htmlFor="flowcraft-visual-notes"
              className="text-xs font-medium text-gray-600 dark:text-zinc-300"
            >
              Reference visual notes
            </label>
            <textarea
              id="flowcraft-visual-notes"
              value={visualNotes}
              onChange={(event) => onVisualNotesChange(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              placeholder="Only describe the uploaded screenshot's visual language, such as dark shell, three-column layout, rounded controls, strong green CTA, dense cards."
            />
            <p className="text-xs leading-5 text-gray-500 dark:text-zinc-400">
              Do not put the target product request here. Use Core task or
              Required details for requests like “generate a company ecommerce
              page.”
            </p>
            {visualNotesLookLikeTarget && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                This looks like a target requirement rather than a screenshot
                description. FlowCraft will treat it as generation requirements,
                but moving it to Required details will be clearer.
              </p>
            )}
          </div>
        )}

        {onFidelityModeChange && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-300">
              Reference fidelity
            </p>
            <div
              className="grid grid-cols-3 rounded-lg bg-gray-100 p-1 dark:bg-zinc-900"
              role="group"
              aria-label="Reference fidelity"
            >
              {FLOWCRAFT_FIDELITY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={fidelityMode === mode.id}
                  onClick={() => onFidelityModeChange(mode.id)}
                  className={`min-h-9 px-3 text-xs font-medium transition ${
                    fidelityMode === mode.id
                      ? "rounded-md bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                  title={mode.description}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-5 text-gray-500 dark:text-zinc-400">
              {
                FLOWCRAFT_FIDELITY_MODES.find(
                  (mode) => mode.id === fidelityMode
                )?.description
              }
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="flowcraft-strategy"
            className="text-xs font-medium text-gray-600 dark:text-zinc-300"
          >
            Interaction strategy
          </label>
          <select
            id="flowcraft-strategy"
            value={activeStrategyId}
            onChange={(event) =>
              handleStrategyChange(event.target.value as FlowCraftStrategyId)
            }
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
          >
            {FLOWCRAFT_STRATEGIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-gray-500 dark:text-zinc-400">
            {strategy.description}
          </p>
          {strategyVariant && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <p className="font-medium text-gray-600 dark:text-zinc-300">
                Strategy effect
              </p>
              <p className="mt-1">{strategyVariant.flowImpact}</p>
              <p className="mt-1">{strategyVariant.ctaTreatment}</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60 sm:px-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-300">
              FlowProject preview
            </p>
            <p className="mt-1 whitespace-pre-line text-xs leading-5 text-gray-500 dark:text-zinc-400">
              {`Scene: ${scenario.label}\nTask: ${project.userGoal}\nStrategy: ${strategy.label}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-300">
              Key pages
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-zinc-400">
              {scenario.pages
                .map((page) => `${page.name}: ${page.primaryCta}`)
                .join(" / ")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-300">
              Diagnostic focus
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-zinc-400">
              {scenario.optimizationFocus} {strategy.priority}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
