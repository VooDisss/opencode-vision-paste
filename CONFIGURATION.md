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

## Example config

```jsonc
{
  "apiBaseUrl": "http://192.168.9.44:5678/v1",
  "apiModel": "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  "apiKey": "",
  "promptTemplate": "Please describe this image in detail. {userText}"
}
```
