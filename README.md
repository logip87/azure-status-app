# azure-status-app

A small learning project that shows the full path from code to cloud:

- a simple Node.js app
- Azure App Service deployment
- Azure Blob Storage for file uploads
- Infrastructure as Code in Bicep
- GitHub Actions pipeline with Playwright smoke tests

This repo was built while practicing a "QA to Azure Cloud" style task: deploy something real, automate tests, and make the infrastructure reproducible.

## Live demo

- App: https://statusapp56040.azurewebsites.net
- Status endpoint: https://statusapp56040.azurewebsites.net/status
- List files: https://statusapp56040.azurewebsites.net/files

## What the app does

You can upload files (images too) into Azure Blob Storage and then:

- see the list of uploaded files
- preview images in the UI
- open/download any file
- delete files from the UI (protected by a password)

## Main features

- Upload UI: `GET /`
- Health/status: `GET /status`
- Upload file: `POST /upload` (multipart form-data, field name: `file`)
- List blobs: `GET /files`
- Download/view blob: `GET /file/:name`
- Delete blob: `DELETE /file/:name`
- Password check used by UI: `POST /auth/check`

## Basic security (simple on purpose)

This project uses a very simple protection:

- `UPLOAD_PASSWORD` is required to enable Upload and Delete
- the password is stored in GitHub Secrets and injected into Azure App Service via Bicep

This is not production auth. It is just a small access gate for the learning task.

## Project structure

```txt
.
├─ infra/
│  ├─ rg.bicep          # creates resource group (subscription scope)
│  └─ app.bicep         # app service + storage + container + app settings
├─ public/
│  └─ upload.html       # simple UI page
├─ tests/
│  └─ status.spec.js    # Playwright smoke tests
├─ server.js            # Node.js/Express server
└─ .github/workflows/
   └─ deploy.yml        # CI/CD pipeline
```

## Tech stack

- Node.js + Express
- Azure App Service (Linux, Node 20 LTS)
- Azure Storage (Blob)
- Bicep (IaC)
- GitHub Actions
- Playwright (smoke tests)

## Environment variables

The app uses:

- `AZURE_STORAGE_CONNECTION_STRING` or `CUSTOMCONNSTR_AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER` (default: `uploads`)
- `UPLOAD_PASSWORD` (required for upload/delete)
- `PORT` (optional, default: `3000`)

## Run locally

### Install deps

```bash
npm ci
```

### Set env vars (PowerShell example)

```powershell
$env:AZURE_STORAGE_CONNECTION_STRING="..."
$env:AZURE_STORAGE_CONTAINER="uploads"
$env:UPLOAD_PASSWORD="your-password"
```

### Start

```bash
npm start
```

### Open

- http://localhost:3000

## Infrastructure (Bicep)

Files in `infra/`:

- `rg.bicep` creates the Resource Group at subscription level
- `app.bicep` creates App Service Plan, Web App, Storage Account and Blob container

`app.bicep` also sets App Service settings like:

- storage connection string
- container name
- upload password

## CI/CD pipeline (GitHub Actions)

Workflow: `.github/workflows/deploy.yml`

What it does:

- checkout repo
- install dependencies (`npm ci`)
- run lint and formatting checks (if enabled)
- run Playwright smoke tests
- deploy infrastructure using Bicep
- zip deploy app to Azure Web App
- upload Playwright reports as artifacts (if enabled)

### Required GitHub Secrets

- `AZURE_CREDENTIALS` (Service Principal JSON used by `azure/login`)
- `UPLOAD_PASSWORD`

### Required GitHub Variables

- `AZURE_LOCATION`
- `AZURE_RESOURCE_GROUP`
- `AZURE_WEBAPP_NAME`
- `AZURE_APP_SERVICE_PLAN`
- `AZURE_STORAGE_ACCOUNT`
- `AZURE_STORAGE_CONTAINER`
- `APP_URL`

## Tests

### Run locally

```bash
npx playwright test
```

### What is tested

- the app loads and shows "System Status: Online"
- `/files` returns JSON with an array named `files`

## Common issues I hit (and fixed)

- App Service Node runtime must be supported (Node 18 LTS was not available, used Node 20 LTS)
- missing env vars caused 502 because the app crashed on startup
- storage container did not exist at first, so the app now creates it when needed
- PowerShell has reserved variables (like `$host`), so I used a different variable name

## Ideas for next improvements

- use Managed Identity instead of storage keys
- add Application Insights for logs and metrics
- seed a sample image during CI so the UI is never empty after infra recreation
- add rate limiting and real auth if this was a real product
