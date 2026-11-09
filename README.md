# AI Hub

A multi-model AI assistant web app powered by OpenRouter and Netlify Functions.

## Features
- Chat with multiple AI models through one API provider.
- Automatically rotate through personal API keys when a key is rate-limited, out of credits, invalid, or temporarily failing.
- Optional shared key pool configured by the site owner.
- Personal keys are stored locally in the user's browser and are never written to the repository or server database.
- Responsive dark interface.

## Personal API key pool
1. Open Settings → Personal API keys.
2. Add one or more OpenRouter API keys.
3. The chat function tries personal keys in order, then falls back to the site owner's shared pool.
4. Keys with errors are skipped for the current request; successful keys are marked in the UI.

Personal keys are stored on that browser/device only. This version does not include accounts or cloud sync. Anyone with access to the browser profile may be able to access its locally stored keys, so use a device you control and never share keys.

## Optional shared pool (site owner)
Set `OPENROUTER_API_KEYS` in Netlify environment variables. Add keys separated by commas or new lines. The existing `OPENROUTER_API_KEY` variable is also supported. Shared keys are used only after the request's personal keys have been tried. Be aware that shared keys can incur usage costs for the site owner.

## Setup
1. Install dependencies with `npm install`.
2. Optionally set `OPENROUTER_API_KEY` or `OPENROUTER_API_KEYS` in Netlify environment variables.
3. Deploy the site on Netlify.
4. Open the app, add your own key(s) in Settings, and choose a model.

Never commit API keys or put them in frontend source files. Rotation cannot bypass provider limits, billing requirements, or account restrictions; it only switches to another valid key you are authorized to use.
