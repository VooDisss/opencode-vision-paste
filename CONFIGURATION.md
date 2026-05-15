# Configuration Reference

## Config file locations

The plugin loads configuration from `vision-paste.config.jsonc` (JSONC format — supports `//` and `/* */` comments).

Priority (first found wins):

| Level | Path |
|-------|------|
| Project | `.opencode/vision-paste.config.jsonc` |
| User | `~/.config/opencode/vision-paste.config.jsonc` |
| Default | Built-in defaults (see below) |

## Options

### `apiBaseUrl`

- **Type**: `string`
- **Default**: `http://192.168.9.44:5678/v1`
- **Description**: OpenAI-compatible VL API endpoint URL

### `apiModel`

- **Type**: `string`
- **Default**: `Qwen3VL-8B-Instruct-Q4_K_M.gguf`
- **Description**: Model name used for vision-language analysis
- **Available**: Qwen3VL-8B (fast) and Qwen3VL-30B (more capable)

### `apiKey`

- **Type**: `string`
- **Default**: `""`
- **Description**: API key for the VL API (leave empty if the server doesn't require one)

### `promptTemplate`

- **Type**: `string`
- **Default**: `请用中文详细描述这张图片的内容。{userText}`
- **Description**: Prompt sent to the vision model. `{userText}` is replaced with the user's original message text. Change this to your preferred language or style.

### `skipIfModelSupportsVision`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: When `true`, the plugin does NOT intercept images if the current chat model natively supports image input. This avoids redundant processing when using multimodal models like GPT-4o, Claude 3.5 Sonnet, or Gemini. Set to `false` to force the plugin to process all images regardless.

### `visionModels`

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: Additional model ID patterns to treat as vision-capable (case-insensitive substring match). Useful as a fallback if a model doesn't report its capabilities correctly. Example: `["claude", "gemini", "gpt-4o", "qwen-vl"]`

## Example config

```jsonc
{
  "apiBaseUrl": "http://192.168.9.44:5678/v1",
  "apiModel": "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  "apiKey": "",
  "promptTemplate": "Please describe this image in detail. {userText}"
}
```
