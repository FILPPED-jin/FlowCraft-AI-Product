# Koyeb Free-Tier Backend Deployment

This option deploys the existing FastAPI backend as a Docker Web Service and
keeps Cloudflare Pages as the frontend. It does not require any paid resource.

## Create the service

1. Sign in to Koyeb with GitHub.
2. Create an App and select **GitHub** as the deployment source.
3. Select `FILPPED-jin/FlowCraft-AI-Product`, branch `main`.
4. Choose **Dockerfile** as the builder.
5. Set the work directory to `backend` and Dockerfile to `Dockerfile`.
6. Select the **Free** instance and create one Web Service.
7. Expose HTTP port `8000` with route `/`.

The image starts with the command already defined in `backend/Dockerfile`:

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Environment variables

Add these secrets in Koyeb, never in Cloudflare Pages or Git:

```text
PORT=8000
DEEPSEEK_API_KEY=<your key>
DASHSCOPE_API_KEY=<your key>
IS_PROD=true
FLOWCRAFT_DATA_DIR=/tmp/flowcraft
LOCAL_ASSET_DIR=/tmp/flowcraft/local-assets
```

## Connect Cloudflare Pages

After Koyeb provides `https://<service>.koyeb.app`, add these Cloudflare Pages
production variables and redeploy the frontend:

```text
VITE_HTTP_BACKEND_URL=https://<service>.koyeb.app
VITE_WS_BACKEND_URL=wss://<service>.koyeb.app
VITE_IS_DEPLOYED=true
VITE_DISABLE_CHECKER=true
```

## Free-instance limitations

- The free instance can sleep or scale to zero and has cold-start latency.
- Its CPU and memory are limited; Chromium screenshot preview is the most likely
  operation to fail under memory pressure.
- Local files and SQLite data are ephemeral across replacement or redeployment.
- Koyeb persistent Volumes cannot be attached to a Free instance.
- Mainland-China access can have high latency, unstable routing, or be
  unreachable on some networks because no mainland region is provided.
