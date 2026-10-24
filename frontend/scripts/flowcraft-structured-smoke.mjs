/* eslint-env node */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const imagePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve("flowcraft-structured-smoke.png");
const baseUrl = process.env.FLOWCRAFT_BASE_URL || "http://127.0.0.1:5174/";
const scenario = process.env.FLOWCRAFT_SCENARIO || "ecommerce";
const coreTask = process.env.FLOWCRAFT_CORE_TASK || "";
const requiredDetails = process.env.FLOWCRAFT_REQUIRED_DETAILS || "";
const benchmarkMode = process.env.FLOWCRAFT_BENCHMARK_MODE === "true";

if (!imagePath || !fs.existsSync(imagePath)) {
  console.error(`Missing screenshot: ${imagePath || "(none)"}`);
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(60_000);
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });

  const visualResponses = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/api/flowcraft/analyze-reference")) return;
    let body = "";
    try {
      body = await response.text();
    } catch {
      body = "";
    }
    visualResponses.push({
      status: response.status(),
      body,
    });
  });

  page.on("console", (msg) => {
    const text = msg.text();
    if (/error|warning|FlowCraft|Qwen|LayoutSpec/i.test(text)) {
      console.log(`[browser:${msg.type()}] ${text}`);
    }
  });

  await page.goto(baseUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("#flowcraft-scenario");
  await page.click("#flowcraft-scenario");
  await page.waitForSelector('[role="dialog"]');
  await page.evaluate((scenarioId) => {
    const labels = {
      learning: "Learning / Education",
      ecommerce: "Ecommerce / Shopping",
      finance: "Financial Service",
      "ai-tool": "AI Tool / Assistant",
      saas: "SaaS / Collaboration",
    };
    const label = labels[scenarioId];
    const button = Array.from(document.querySelectorAll('[role="dialog"] button'))
      .find((element) => element.textContent?.includes(label));
    if (!(button instanceof HTMLElement)) throw new Error(`Scenario not found: ${scenarioId}`);
    button.click();
  }, scenario);
  if (coreTask) {
    await page.click("#flowcraft-core-task", { clickCount: 3 });
    await page.type("#flowcraft-core-task", coreTask, { delay: 0 });
  }
  if (requiredDetails) {
    await page.click("#flowcraft-requirements", { clickCount: 3 });
    await page.type("#flowcraft-requirements", requiredDetails, { delay: 0 });
  }

  const input = await page.waitForSelector('input[data-testid="upload-input"]');
  await input.uploadFile(imagePath);
  await page.waitForSelector('[data-testid="upload-generate"]');

  await page.click('[data-testid="upload-generate"]');

  await page.waitForFunction(
    () =>
      !document.body.innerText.includes("Working") &&
      !document.body.innerText.includes("Cancel All Generations") &&
      document.body.innerText.includes("Version 1") &&
      document.querySelector("iframe"),
    { timeout: 300_000 }
  );

  await new Promise((resolve) => setTimeout(resolve, 3_000));

  let benchmarkRecord = null;
  if (benchmarkMode) {
    await page.waitForFunction(
      () => document.body.innerText.includes("Interaction design evaluation"),
      { timeout: 15_000 }
    );
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll("button"))
        .find((element) => element.textContent?.includes("View report"));
      if (!(button instanceof HTMLElement)) throw new Error("Evaluation report button not found");
      button.click();
    });
    await page.waitForFunction(
      () => document.body.innerText.includes("Benchmark record") &&
        !document.body.innerText.includes("Running the prototype in an isolated frame"),
      { timeout: 30_000 }
    );
    const hasTaskReplay = await page.evaluate(() =>
      document.body.innerText.includes("Task replay")
    );
    const clickButton = async (label) => {
      await page.evaluate((buttonLabel) => {
        const button = Array.from(document.querySelectorAll("button"))
          .find((element) => element.textContent?.trim() === buttonLabel);
        if (!(button instanceof HTMLElement)) throw new Error(`Button not found: ${buttonLabel}`);
        button.click();
      }, label);
      await new Promise((resolve) => setTimeout(resolve, 150));
    };
    await clickButton("Bad");
    await clickButton(hasTaskReplay ? "Code generation" : "Evaluation error");
    await clickButton("Save benchmark result");
    await page.waitForFunction(
      () => document.body.innerText.includes("Case saved"),
      { timeout: 10_000 }
    );
    benchmarkRecord = await page.evaluate(() => {
      const records = JSON.parse(localStorage.getItem("flowcraft:benchmark-runs") || "[]");
      return records[0] || null;
    });
  }

  await page.screenshot({ path: outputPath, fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 5000));
  const iframeText = await page
    .evaluate(() => {
      const iframe = document.querySelector("iframe");
      const doc = iframe?.contentDocument;
      return doc?.body?.innerText?.slice(0, 3000) || "";
    })
    .catch(() => "");

  console.log(
    JSON.stringify(
      {
        outputPath,
        visualResponses: visualResponses.map((item) => ({
          status: item.status,
          enabled: /"enabled"\s*:\s*true/.test(item.body),
          hasLayoutSpec: /Qwen visual LayoutSpec|layoutSpec|layoutPattern/i.test(item.body),
          bodyPreview: item.body.slice(0, 500),
        })),
        pageTextPreview: bodyText,
        iframeTextPreview: iframeText,
        benchmarkRecord,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
