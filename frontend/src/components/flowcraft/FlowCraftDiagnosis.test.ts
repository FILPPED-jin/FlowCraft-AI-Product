import { buildFlowCraftEvalReport } from "./FlowCraftDiagnosis";
import { buildFlowCraftPrompt } from "../../lib/flowcraft";

describe("FlowCraft EvalReport", () => {
  test("turns detected generation gaps into a targeted repair prompt", () => {
    const promptText = [
      "Scenario template: Ecommerce / Shopping",
      "Optimization preference: Safety",
    ].join("\n");
    const code = `
      <html>
        <body>
          <nav>Home Deals Account</nav>
          <main>
            <section class="hero">Go viral with Creati</section>
            <section>Choose variant and quantity</section>
            <button>Add to cart</button>
            <aside>Cart summary and total</aside>
          </main>
        </body>
      </html>
    `;

    const report = buildFlowCraftEvalReport(promptText, code);

    expect(report).not.toBeNull();
    expect(report?.scenario.id).toBe("ecommerce");
    expect(report?.sourceTermLeaks).toContain("creati");
    expect(report?.missingStates.length).toBeGreaterThan(0);
    expect(report?.missingPrimaryCtas).toContain("Proceed to checkout");
    expect(report?.layoutCoverage.topNavigation).toBe(true);
    expect(report?.layoutCoverage.summaryOrUtilityPanel).toBe(true);
    expect(report?.repairPrompt).toContain("Do not regenerate the page from scratch");
    expect(report?.repairPrompt).toContain("Remove the leftover source-domain term");
    expect(report?.repairPrompt).toContain("Proceed to checkout");
  });

  test("uses the user brief as evaluation truth for a custom product task", () => {
    const promptText = buildFlowCraftPrompt(
      "Build a mobile AI assistant with an upgrade flow.",
      "ecommerce",
      "safety",
      {
        userGoal: "Start a chat, open the upgrade sheet, and choose a Pro billing cycle.",
        requirementsText:
          "Chat composer\nUpgrade entry\nMonthly and annual plans\nPurchase confirmation",
      }
    );
    const code = `
      <html><body>
        <main>
          <textarea aria-label="Chat composer"></textarea>
          <button>Upgrade</button>
          <section>Monthly and annual plans</section>
          <p>Purchase confirmation</p>
        </main>
      </body></html>
    `;

    const report = buildFlowCraftEvalReport(promptText, code);

    expect(report?.evaluationBasis).toBe("user-brief");
    expect(report?.coreTask).toContain("Start a chat");
    expect(report?.missingStates).not.toContain("Payment failure recovery");
    expect(report?.missingPrimaryCtas).not.toContain("Proceed to checkout");
    expect(report?.repairPrompt).toContain("Core task and Required details");
    expect(report?.repairPrompt).toContain("new child version");
  });

});
