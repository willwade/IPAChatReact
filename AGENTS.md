# AGENTS

## Project Guidance
- Run `CI=true npm test -- --passWithNoTests` to execute tests in CI mode.
- Use `npm run build` to verify the project builds without errors.
- The repository expects Node.js 20.x.

## Environment Variables
The backend server and speech features rely on Azure credentials. Ensure the following environment variables are available when running the app:
- `REACT_APP_AZURE_KEY` - Azure Speech Services subscription key
- `REACT_APP_AZURE_REGION` - Azure region (e.g., 'uksouth', 'eastus')
- `REACT_APP_PHONEMIZE_API` - (Optional) Phonemization service URL

The backend supports both new (`REACT_APP_*`) and legacy (`AZURE_TTS_*`) naming conventions for backward compatibility.

For basic tests that do not require Azure services, these variables can be left unset.
