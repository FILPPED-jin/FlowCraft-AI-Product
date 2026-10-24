# Local Setup

FlowCraft AI currently runs as a local frontend/backend app.

## Requirements

- Node.js and pnpm for the frontend.
- Python and Poetry for the backend.
- At least one supported model provider key.
- For the current V0.1 path, a DeepSeek API key is supported through the
  OpenAI-compatible backend client.

## Backend

Create `backend/.env`:

```env
DEEPSEEK_API_KEY=your_deepseek_key
```

Optional:

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Optional visual reference analyzer. Use an Alibaba Cloud DashScope key
# that has access to a Qwen VL model.
DASHSCOPE_API_KEY=your_dashscope_key
QWEN_VISION_MODEL=qwen-vl-ocr-2025-11-20
QWEN_VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

Run:

```bash
cd backend
poetry install
poetry run uvicorn main:app --port 7001
```

The backend should be available at:

```text
http://127.0.0.1:7001
```

## Frontend

Create `frontend/.env.local`:

```env
VITE_HTTP_BACKEND_URL=http://127.0.0.1:7001
VITE_WS_BACKEND_URL=ws://127.0.0.1:7001
```

Run:

```bash
cd frontend
pnpm install
pnpm dev
```

Open:

```text
http://localhost:5173
```

## Notes

- `backend/.env` and `frontend/.env.local` are ignored by Git.
- Do not commit API keys.
- `generated/` is ignored and should be used only for local smoke-test outputs.
- The current V0.1 DeepSeek path uses one generated variant to avoid multiple
  parallel paid calls.
# Windows One-Click Startup

Double-click `start-flowcraft.cmd` in the repository root. It starts the Poetry
backend on port 7001 and the frontend on port 5173, then opens
http://127.0.0.1:5173/ after the frontend and proxied backend API respond.
Repeat runs reuse recognized project processes. Occupied ports cause an explicit
error instead of switching ports. Logs are in `.flowcraft-runtime/`.
This command starts local services; it does not pull Git changes or install
dependencies, and its readiness checks do not validate model generation.
For terminal use without opening a browser: `./start-flowcraft.ps1 -NoBrowser`.

## Persistent runtime data

FlowCraft stores monitoring history and Good/Bad/Boundary benchmark cases in
`flowcraft.sqlite3`. Local development uses `.flowcraft-runtime` in the project
root. In deployment, set `FLOWCRAFT_DATA_DIR` to a mounted persistent volume:

```bash
FLOWCRAFT_DATA_DIR=/data/flowcraft
```

Do not place the database inside an ephemeral container filesystem. The SQLite
store is intended for a single backend instance; use a managed database before
running multiple backend replicas.
