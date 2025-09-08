# FAQ-AI (Chrome Extension)

Answer questions about the current page using Google Gemini (Flash).

## Install (Load Unpacked)
1. clone this repo.
1. Open Chrome → `chrome://extensions`.
2. Enable Developer mode.
3. Click “Load unpacked” and select this folder.

## Usage
1. Open a page you want to ask about.
2. Click the extension icon.
3. Enter your Gemini API key when prompted (stored via Chrome Sync).
4. Ask a question; the answer streams into the popup.

## Configuration
- Model fixed to `gemini-2.0-flash` in `llm.js`.

## Troubleshooting
- Inspect popup: right‑click inside popup → Inspect → Console/Network.
- Verify API key and model access if requests fail.

## License
MIT
