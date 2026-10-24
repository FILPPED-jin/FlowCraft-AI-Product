# FlowCraft AI

FlowCraft AI turns visual references and business requirements into runnable,
cross-scenario interaction prototypes. It separates visual structure from the
source product's semantics, then evaluates whether the generated experience
actually completes the target user task.

## Product Workflow

1. Upload screenshots or a short reference video.
2. Define the scenario, core task, required states, and fidelity level.
3. Run visual understanding, business decision, and prototype generation.
4. Preview responsive desktop and mobile HTML.
5. Evaluate runtime health, task completion, state coverage, behavior
   reliability, and visual/semantic consistency.
6. Classify Good, Bad, or Boundary cases, attach root causes, repair, and run
   regression checks.

## Why FlowCraft

Most screen-to-code tools focus on visual reconstruction. FlowCraft is aimed at
early product and interaction design work:

- It treats screenshots as product references, not only layout inputs.
- It asks users to choose the scenario and optimization direction before
  generation.
- It generates prototypes with interaction-state expectations such as loading,
  empty, error, disabled, success, and confirmation states.
- It explains what the generated interaction is trying to achieve and where it
  should be improved next.

## Architecture

```text
Reference media + business brief
              |
      Visual understanding
              |
       Structured UI Spec
              |
       Business decisions
              |
     Runnable HTML generation
              |
 Behavior audit + human review
              |
 Case library -> repair -> regression
```

The React/TypeScript frontend provides the creation, preview, and evaluation
workspace. The FastAPI backend handles model calls, structured visual analysis,
generation, monitoring, and benchmark-case APIs. Monitoring history and
evaluation cases are persisted in SQLite for a single backend instance.

## Current Features

- Multi-image visual-reference analysis
- Core-task-first requirement prioritization
- Faithful, balanced, and inspired visual-transfer modes
- Cross-scenario semantic mapping
- Runnable desktop and mobile HTML previews
- Task-level interaction audits and recovery-state checks
- Human ratings and Good/Bad/Boundary case management
- Root-cause tags and before/after regression evidence
- Persistent request, latency, and error monitoring
- Classified timeout, validation, and generation-failure feedback

## Local Setup

FlowCraft AI has a React/Vite frontend and a FastAPI backend.

For the current DeepSeek-based local setup, see
[docs/SETUP.md](./docs/SETUP.md).

Short version on Windows:

```powershell
cd backend
poetry install

cd ..\frontend
pnpm install

cd ..
.\start-flowcraft.ps1 -NoBrowser
```

Open:

```text
http://127.0.0.1:5173/
```

Local runtime data is ignored by Git. For deployment, mount a persistent
volume and set `FLOWCRAFT_DATA_DIR=/data/flowcraft`. SQLite is intended for a
single backend instance; use a managed database before horizontal scaling.

For a free, public Render backend deployment, see
[docs/RENDER_DEPLOYMENT.md](./docs/RENDER_DEPLOYMENT.md). The included
`render.yaml` provisions only one Free web service and no paid resources.

## Repository Notes

This repository contains the cleaned FlowCraft product source without the
upstream project's Git history. Local API keys, runtime databases, caches, and
generated artifacts are intentionally excluded.

## Credits

FlowCraft AI was developed from the open-source
[abi/screenshot-to-code](https://github.com/abi/screenshot-to-code) foundation
and retains the original MIT license. The product workflow, semantic-transfer
pipeline, evaluation system, monitoring, and Case regression loop are
FlowCraft extensions.
