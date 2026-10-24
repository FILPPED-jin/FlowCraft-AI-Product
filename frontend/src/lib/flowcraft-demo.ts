export const FLOWCRAFT_DEMO_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <title>FlowCraft AI Demo</title>
  </head>
  <body class="bg-slate-50 text-slate-950">
    <main class="mx-auto grid min-h-screen max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section class="flex flex-col justify-center">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">FlowCraft AI prototype</p>
        <h1 class="mt-3 max-w-2xl text-5xl font-semibold tracking-tight">Turn a static pricing screen into a confident signup flow.</h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-slate-600">This demo uses the Conversion page template with the Stronger fallback preference. It makes interaction states visible for product review.</p>
        <div class="mt-7 flex flex-wrap gap-3">
          <button class="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-200">Start free trial</button>
          <button class="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-800">Compare plans</button>
        </div>
        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-slate-200 bg-white p-4">
            <p class="text-sm font-semibold">Loading state</p>
            <div class="mt-3 h-2 rounded-full bg-slate-100"><div class="h-2 w-2/3 rounded-full bg-cyan-500"></div></div>
          </div>
          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p class="text-sm font-semibold text-amber-900">Validation state</p>
            <p class="mt-2 text-xs text-amber-800">Work email is required before checkout.</p>
          </div>
          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p class="text-sm font-semibold text-emerald-900">Success state</p>
            <p class="mt-2 text-xs text-emerald-800">Trial workspace is ready.</p>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p class="text-sm font-semibold">Interaction diagnosis</p>
            <p class="text-xs text-slate-500">Generated decision notes</p>
          </div>
          <span class="rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">V1</span>
        </div>
        <div class="mt-5 space-y-4">
          <article class="rounded-lg bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Experience goals</p>
            <ul class="mt-2 space-y-1 text-sm text-slate-700">
              <li>Clear primary action</li>
              <li>Low-friction decision path</li>
              <li>Trust cues near payment moments</li>
            </ul>
          </article>
          <article class="rounded-lg bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Missing states covered</p>
            <ul class="mt-2 space-y-1 text-sm text-slate-700">
              <li>Empty cart fallback</li>
              <li>Form validation error</li>
              <li>Signup confirmation</li>
            </ul>
          </article>
          <article class="rounded-lg bg-slate-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Tradeoff</p>
            <p class="mt-2 text-sm leading-6 text-slate-700">The safer flow adds more guidance, but the page may feel less lightweight. Keep the first step short and move reassurance into contextual states.</p>
          </article>
        </div>
      </section>
    </main>
  </body>
</html>`;
