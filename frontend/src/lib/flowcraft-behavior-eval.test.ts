import { prepareFlowCraftAuditHtml } from "./flowcraft-behavior-eval";

describe("FlowCraft behavior evaluation HTML", () => {
  test("removes the remote Tailwind runtime from the isolated audit copy", () => {
    const source = `<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body><button>Continue</button></body></html>`;

    const prepared = prepareFlowCraftAuditHtml(source);

    expect(prepared).not.toContain("cdn.tailwindcss.com");
    expect(prepared).toContain("__flowcraftRuntimeErrors");
    expect(prepared).toContain("<button>Continue</button>");
  });
});
