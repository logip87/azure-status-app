```md
# azure-status-app

A small DevOps + QA automation project: a Node.js/Express app deployed to **Azure App Service**, integrated with **Azure Blob Storage** (upload/list/download/delete), with **Infrastructure as Code (Bicep)** and a **GitHub Actions CI/CD** pipeline running **Playwright smoke tests**.

This repository was built as part of a learning task often described as “QA to Azure Cloud” (build a simple app, deploy to Azure, add automated tests, and make the infrastructure reproducible).

## What’s included

### Application (Node.js/Express)
- Web UI for uploads: `GET /` (upload form + file list + image previews)
- Health/status endpoint: `GET /status` (Online + server time)
- Upload: `POST /upload` (multipart form-data, field `file`)
- List blobs: `GET /files`
- View/download blob: `GET /file/:name`
- Delete blob: `DELETE /file/:name`
- Simple access gate:
  - `UPLOAD_PASSWORD` required for upload/delete
  - `POST /auth/check` used by the UI to enable the Upload button

### Infrastructure as Code (Bicep)
Located in `infra/`:
- `rg.bicep` creates the **Resource Group** (subscription scope)
- `app.bicep` creates:
  - App Service Plan (Linux, B1)
  - Web App (Node runtime `NODE|20-lts`)
  - Storage Account (Blob)
  - Blob container (default `uploads`)
  - App settings, including `UPLOAD_PASSWORD` injected from GitHub Secrets via a secure Bicep parameter

### CI/CD (GitHub Actions)
Workflow: `.github/workflows/deploy.yml`
- checkout
- `npm ci`
- install Playwright browser dependencies
- run Playwright smoke tests
- package the app into `app.zip` (zip deploy)
- Azure login via Service Principal (`azure/login`)
- deploy infra (Bicep)
- deploy app (zip deploy to Web App)

## Why this repo is useful for recruitment
It demonstrates end-to-end delivery:
- code → infrastructure → CI/CD → running cloud service
- IaC with reproducible environments (RG + App + Storage)
- automated tests in the pipeline (Playwright)
- handling typical Azure/App Service issues (supported runtimes, 502 on crash, missing env vars, container initialization, PowerShell CLI gotchas)

## Requirements
- Node.js 18+ locally (production uses `NODE|20-lts`)
- Azure subscription
- GitHub repository with Actions enabled

## Environment variables
The app reads:
- `AZURE_STORAGE_CONNECTION_STRING` or `CUSTOMCONNSTR_AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER` (default: `uploads`)
- `UPLOAD_PASSWORD` (required for upload/delete and `/auth/check`)
- `PORT` (optional, default: `3000`)

## Run locally
1. Install:
   - `npm ci`
2. Set env vars (PowerShell example):
   - `$env:AZURE_STORAGE_CONNECTION_STRING="..."`
   - `$env:AZURE_STORAGE_CONTAINER="uploads"`
   - `$env:UPLOAD_PASSWORD="your-password"`
3. Start:
   - `npm start`
4. Open:
   - `http://localhost:3000`

## Endpoints
- `GET /` – upload UI (file list + image previews)
- `GET /status` – status + server time
- `POST /auth/check` – password check (JSON: `{ "pw": "..." }`)
- `POST /upload` – upload (multipart form-data, field `file`, includes `pw`)
- `GET /files` – list blobs in the container
- `GET /file/:name` – view/download file (inline)
- `DELETE /file/:name` – delete file (JSON body includes `pw`)

## Tests (Playwright)
Smoke tests run locally and in CI:
- UI smoke: page loads and shows `System Status: Online`
- API smoke: `/files` returns a valid `files[]` array (optionally checks a known filename)

Run:
- `npx playwright test`

CI uses:
- `APP_URL` (deployed app URL)
- `CI=true`

Note: after recreating infrastructure, the storage container may be empty. Tests should be resilient to “no files” unless you seed a sample blob during the pipeline.

## Security (intentionally simple)
This is not production-grade authentication. It’s a task-level access gate:
- upload and delete require `UPLOAD_PASSWORD`
- the password is stored in **GitHub Secrets** and injected into App Service through **Bicep** using a secure parameter
- if `UPLOAD_PASSWORD` is missing, upload/delete are blocked

## CI/CD configuration: required Secrets and Variables

### GitHub Secrets
- `AZURE_CREDENTIALS` – Service Principal JSON for `azure/login`
- `UPLOAD_PASSWORD` – password used by UI/API for upload/delete

### GitHub Variables
- `AZURE_LOCATION`
- `AZURE_RESOURCE_GROUP`
- `AZURE_WEBAPP_NAME`
- `AZURE_APP_SERVICE_PLAN`
- `AZURE_STORAGE_ACCOUNT`
- `AZURE_STORAGE_CONTAINER`
- `APP_URL`

## Infrastructure overview
`app.bicep` creates all required Azure resources and sets App Settings:
- `AZURE_STORAGE_CONNECTION_STRING` is built using Storage Account keys (`listKeys()`)
- `UPLOAD_PASSWORD` is injected from GitHub Secrets as a secure parameter

## Common issues (handled during development)
- App Service Node runtime must be a supported value (e.g., `NODE|20-lts`)
- PowerShell reserved variables (e.g., `$host`) can break CLI scripts
- 502 after deploy often means the app crashed due to missing env vars or code errors
- “The specified container does not exist” requires creating the container (or `createIfNotExists()`)

## Next improvements (ideas)
- seed a sample blob in the pipeline (so the UI always shows an image after infra recreation)
- upload Playwright artifacts (`test-results`, `playwright-report`) as GitHub Actions artifacts
- add ESLint + Prettier and enforce lint/format in CI
- add Application Insights for basic observability

---
This repo is a practical demo of Azure App Service + Storage, Bicep IaC, GitHub Actions CI/CD, zip deploy, and Playwright smoke testing.
```
