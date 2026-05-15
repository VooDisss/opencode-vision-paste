# opencode-vision-paste

**OpenCode 插件：攔截貼上的圖片 → 呼叫本地視覺 API 分析 → 用文字取代圖片**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

你在 OpenCode 對話中貼上了一張圖片。LLM 看不到它。但外掛可以。

opencode-vision-paste 攔截貼上的圖片，傳送到本地 VL API（如透過 llama.cpp 執行的 Qwen3VL），在 LLM 收到訊息之前，無縫地將圖片替換為詳細的文字描述。

無需雲端服務。無需 API Key。你的圖片始終留在本地。

---

## 功能特色

- **透明無感** — 圖片被靜默轉換為文字，LLM 完全不知道圖片的存在
- **零依賴** — 單一 ESM 檔案，無需建置步驟，無 npm 相依
- **多圖支援** — 可一次貼上多張圖片，每張獨立分析並編號
- **在地優先** — 相容任意 OpenAI 格式的 VL API（llama.cpp、vLLM 等）
- **智慧快取** — 跨對話輪次重複使用相同圖片的分析結果
- **HTTP 與 data URL** — 同時支援貼上產生的 data URL 與網路圖片

## 安裝

### 人類使用者

將以下提示詞複製貼上給你的 OpenCode 代理人：

```
請按照以下說明安裝和設定 opencode-vision-paste：
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### LLM 代理人

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

或直接閱讀[安裝指南](INSTALL.md)。

---

## 快速開始

1. **安裝**外掛（見上方[安裝](#安裝)說明）
2. **設定** VL API 位址（可選，本地有 llama.cpp 執行時預設即可運作）
3. **貼上圖片**到任意 OpenCode 對話中 — 圖片會自動轉為文字

---

## 設定說明

所有設定皆為可選，外掛提供合理的預設值。

| 選項 | 預設值 | 說明 |
|------|--------|------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | OpenAI 相容的 VL API 位址 |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | VL API 使用的模型名稱 |
| `apiKey` | `""` | API Key（如伺服端不需要可留空） |
| `promptTemplate` | `請用中文詳細描述這張圖片的內容。{userText}` | 傳送給 VL 模型的提示詞；`{userText}` 會被替換為使用者原話 |

**設定載入順序**（首個找到的生效）：
1. `.opencode/vision-paste.config.jsonc`（專案層級）
2. `~/.config/opencode/vision-paste.config.jsonc`（使用者層級）

完整參考：[CONFIGURATION.md](../CONFIGURATION.md)

---

## 運作原理

```
使用者貼上圖片
       ↓
opencode-vision-paste 攔截 `experimental.chat.messages.transform`
       ↓
解碼圖片 (data URL 或 HTTP) → 儲存暫存檔
       ↓
傳送到本地 VL API (OpenAI 格式的 chat completions)
       ↓
圖片部分取代為分析文字
       ↓
暫存檔刪除 — LLM 只看到文字
```

外掛鉤入 OpenCode 的 `experimental.chat.messages.transform` 管線，在訊息傳送給 LLM 之前執行。

---

## 開發

```
npm test    # 語法檢查
npm pack    # 本地打包
```

外掛是單一檔案 (`vision-paste.mjs`)，無需建置。修改後重新載入即可。

本地測試時，在 `.opencode/opencode.jsonc` 中加入：

```jsonc
{
  "plugin": ["./路徑/到/vision-paste.mjs"]
}
```

然後重新啟動 OpenCode 或使用 `/model` 觸發重新載入。

---

## 貢獻

歡迎 PR！見 [CONTRIBUTING.md](../CONTRIBUTING.md)。

---

## 授權

[MIT](../LICENSE)
