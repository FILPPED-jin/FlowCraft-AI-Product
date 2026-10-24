import { useState } from "react";
import { LuBookOpen, LuShoppingCart, LuLandmark, LuChevronDown, LuCheck, LuSparkles, LuUsers } from "react-icons/lu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { FLOWCRAFT_SCENARIOS, FlowCraftScenarioId, getFlowCraftScenario } from "../../lib/flowcraft";

const icons = {
  learning: LuBookOpen,
  ecommerce: LuShoppingCart,
  finance: LuLandmark,
  "ai-tool": LuSparkles,
  saas: LuUsers,
};

export default function ScenarioPicker({ value, onChange }: {
  value: FlowCraftScenarioId;
  onChange: (value: FlowCraftScenarioId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<FlowCraftScenarioId | null>(null);
  const selected = getFlowCraftScenario(value);
  const Icon = icons[value];
  const options = FLOWCRAFT_SCENARIOS.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const description = hovered ? getFlowCraftScenario(hovered).description : selected.description;

  return <Popover open={open} onOpenChange={next => { setOpen(next); setQuery(""); setHovered(null); }}>
    <PopoverTrigger asChild>
      <button id="flowcraft-scenario" type="button" aria-label={`Scenario template: ${selected.label}`}
        style={{ minHeight: 44, height: 44 }}
        className="flex w-full items-center gap-3 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
        <Icon className="h-4 w-4 shrink-0 text-red-600" />
        <span className="min-w-0 flex-1 text-left">{selected.label}</span>
        <LuChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-32px)] p-2">
      <input aria-label="Search templates" placeholder="Search templates..." value={query}
        onChange={event => { setQuery(event.target.value); setHovered(null); }}
        className="mb-2 h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 text-sm outline-none focus:border-red-400" />
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {options.map(option => {
          const OptionIcon = icons[option.id];
          return <button key={option.id} type="button" aria-pressed={value === option.id}
            aria-describedby="scenario-option-description"
            onMouseEnter={() => setHovered(option.id)} onFocus={() => setHovered(option.id)}
            onClick={() => { onChange(option.id); setOpen(false); }}
            className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm ${value === option.id ? "bg-rose-50 text-red-700 dark:bg-red-950" : "hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
            <OptionIcon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{option.label}</span>
            {value === option.id && <LuCheck className="h-4 w-4 shrink-0" />}
          </button>;
        })}
        {!options.length && <p className="px-3 py-4 text-sm text-gray-500">No templates found.</p>}
      </div>
      <p id="scenario-option-description" className="mt-2 min-h-16 border-t border-gray-100 px-3 pt-3 text-xs leading-5 text-gray-500 dark:border-zinc-800" aria-live="polite">
        {options.length ? description : "Try another search."}
      </p>
    </PopoverContent>
  </Popover>;
}
