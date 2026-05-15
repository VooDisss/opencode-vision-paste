# opencode-vision-paste

OpenCode plugin: intercept pasted images → local VL API analysis → replace with text.

## Structure

- `vision-paste.mjs` — single source file, ESM, zero dependencies, no build step
- `CONFIGURATION.md` — configuration reference
- `readme/` — multilingual README translations (10 languages)

## Entry point

`vision-paste.mjs` default exports `async function(input)` that returns a hook object.

## Hooks

Two hooks are registered:

### `experimental.chat.system.transform`
Captures the current `model: Model` object (with `capabilities.input.image`) and stores it in a module-level variable. Runs first to let the messages transform hook know whether the current chat model natively supports image input.

### `experimental.chat.messages.transform`
Main intercept logic. If `skipIfModelSupportsVision` is enabled and the captured model has `capabilities.input.image === true`, this hook returns early without processing images — the LLM handles them natively.

Processing logic:
1. Check if current model supports vision → skip if so
2. Find the last `role=user` message
3. Find image parts: `type:"file"` with `mime.startsWith("image/")`, or `type:"image"`
4. Decode from data URL → save to `%TMP%/vision-paste/{uuid}.{ext}`
5. Read file → convert to data URL → POST to VL API
6. Replace image part with analysis text, preserving user's original message

All images in the message are analyzed (deduped first). Multi-image results are separated by `---` with numbered labels. On API failure, images are removed and an error hint is injected. Temp files >24h are cleaned on startup; files are deleted immediately after processing.

## Config loading

Reads `vision-paste.config.jsonc` (JSONC with stripped `//` and `/* */` comments):

1. Project-level: `.opencode/vision-paste.config.jsonc` (highest priority)
2. User-level: `~/.config/opencode/vision-paste.config.jsonc`
3. Fallback: built-in defaults

```jsonc
{
  "apiBaseUrl": "http://192.168.9.44:5678/v1",
  "apiModel": "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  "apiKey": "",
  "promptTemplate": "请用中文详细描述这张图片的内容。{userText}",
  "skipIfModelSupportsVision": true,
  "visionModels": []
}
```

## Local development

No tests / no lint / no typecheck. Modify and verify directly in OpenCode Desktop:

1. Reference the local plugin in `.opencode/opencode.jsonc`:
   ```jsonc
   "plugin": ["./path/to/vision-paste.mjs"]
   ```
2. Restart OpenCode Desktop (or `/model` to trigger reload)
3. Paste an image to test

## API

OpenAI-compatible endpoint at `http://192.168.9.44:5678/v1`.
Two available models: Qwen3VL-8B (fast) and Qwen3VL-30B (more capable, switch in config).

## Notes

- Supports data URL images (paste) and HTTP URL images
- JSONC parsing is naive (regex strip), no complex JSONC features
- Image temp files: cleanup >24h on startup, delete immediately after processing
