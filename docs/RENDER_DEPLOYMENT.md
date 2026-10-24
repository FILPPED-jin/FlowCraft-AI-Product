# Render Free-Tier Backend Deployment

This deployment keeps the existing product behavior unchanged. Cloudflare
Pages serves the frontend, while one Render Free web service runs the existing
FastAPI backend from `backend/Dockerfile`.

## Render Blueprint

The repository-root `render.yaml` creates exactly one resource:

- `flowcraft-ai-backend`: Docker web service on the `free` plan

It does not create a paid disk, paid database, background worker, or additional
service. The backend binds to `0.0.0.0` and reads its port from Render's `PORT`
environment variable.

## Deploy

1. Sign in to Render with the GitHub account that can read this repository.
2. Open **New > Blueprint**.
3. Select `FILPPED-jin/FlowCraft-AI-Product` and branch `main`.
4. Render detects `/render.yaml`. Confirm that the service plan says **Free**.
5. Enter `DEEPSEEK_API_KEY` and `DASHSCOPE_API_KEY` when prompted. Never add
   either key to Cloudflare Pages or commit it to Git.
6. Apply the Blueprint and wait for the Docker build and health check.

Render builds with:

```text
Dockerfile: backend/Dockerfile
Build context: backend
```

Render starts the service with:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

The expected public URL is:

```text
https://flowcraft-ai-backend.onrender.com
```

Render can append a suffix if that globally unique service name is unavailable.
Use the exact URL displayed by Render after the first successful deployment.

## Connect Cloudflare Pages

In the Cloudflare Pages project, add these production variables, replacing the
example host if Render assigned a suffixed name:

```text
VITE_HTTP_BACKEND_URL=https://flowcraft-ai-backend.onrender.com
VITE_WS_BACKEND_URL=wss://flowcraft-ai-backend.onrender.com
VITE_IS_DEPLOYED=true
VITE_DISABLE_CHECKER=true
```

Save the variables and redeploy the Pages project. Vite reads these values at
build time, so an existing deployment does not update automatically.

## Free-Tier Limitations

- The service spins down after 15 minutes without inbound HTTP requests or
  WebSocket messages.
- The first request after sleep has a cold start that can take about one minute.
- The filesystem is ephemeral. SQLite monitoring, evaluation cases, uploaded
  assets, and generated runtime files can be lost on sleep, restart, or deploy.
- Free web services cannot attach a persistent disk and run only one instance.
- The workspace receives a limited number of free instance hours and build
  minutes each month.
- Render has no mainland-China region. Domestic access can have high latency,
  unstable routing, or be unreachable on some networks. This is an external
  network risk rather than an application defect.
- Chromium/Playwright preview work is memory intensive. On the free instance,
  screenshot preview can fail under memory pressure even when normal API and
  generation endpoints remain available.

## Troubleshooting

### Build fails while installing Chromium

- Confirm Render is using Docker and `backend/Dockerfile`.
- Confirm the Docker build context is `backend`.
- Retry once in case an upstream package mirror timed out.
- Inspect the first failing command in the Render build log.

### Port scan timeout or 502

- Confirm the start command contains both `--host 0.0.0.0` and `--port $PORT`.
- Confirm `PORT=10000` exists in the service environment.
- Check runtime logs for an import error before Uvicorn starts.

### Frontend says it cannot load backend data

- Open the Render service URL directly and confirm it returns the backend home
  response.
- Verify `VITE_HTTP_BACKEND_URL` uses `https://` and has no trailing slash.
- Verify `VITE_WS_BACKEND_URL` uses `wss://`.
- Redeploy Cloudflare Pages after changing a Vite environment variable.

### Generation connects but fails

- Confirm both model API keys are present only in Render's environment.
- Check Render runtime logs for timeout, quota, or upstream API errors.
- Wake the sleeping backend in a browser before starting a long demo.

### Data disappears

This is expected on Render Free because local SQLite and files are ephemeral.
Persistent storage requires a later database migration or a paid disk; neither
is included in this free-only deployment.

### Slow or inaccessible from mainland China

- Test the Render URL from a second network before changing application code.
- Compare direct Render access with Cloudflare Pages access.
- If multiple domestic networks cannot reach Render reliably, use a backend
  provider with a more suitable region as a fallback; Render remains the
  primary deployment described here.
