# Security

## Secrets

Never commit secrets to the repository.

Use GitHub Secrets for:

- AZURE_CREDENTIALS
- UPLOAD_PASSWORD

## Azure

UPLOAD_PASSWORD is injected into App Service via Bicep parameter marked as secure.

## Incident

If a secret is exposed, rotate it immediately in Azure and update GitHub Secrets.
