# opencode-vision-paste

**OpenCode 插件：拦截粘贴的图片 → 调用本地视觉 API 分析 → 用文本替换图片**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

你在 OpenCode 会话中粘贴了一张图片。LLM 看不到它。但插件可以。

opencode-vision-paste 拦截粘贴的图片，发送到本地 VL API（如通过 llama.cpp 运行的 Qwen3VL），在 LLM 收到消息之前，无缝地将图片替换为详细的文字描述。

无需云服务。无需 API Key。你的图片始终留在本地。

---

## 功能特性

- **透明无感** — 图片被静默转换为文本，LLM 完全不知道图片的存在
- **零依赖** — 单文件 ESM，无需构建步骤，无 npm 依赖
- **多图支持** — 可一次粘贴多张图片，每张独立分析并编号
- **本地优先** — 兼容任意 OpenAI 格式的 VL API（llama.cpp、vLLM 等）
- **智能缓存** — 跨对话轮次复用相同图片的分析结果
- **HTTP 与 data URL** — 同时支持粘贴产生的 data URL 和网络图片

## 安装

### 人类用户

将以下提示词复制粘贴给你的 OpenCode 智能体：

```
请按照以下说明安装和配置 opencode-vision-paste：
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### LLM 智能体

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

或直接阅读[安装指南](INSTALL.md)。

---

## 快速开始

1. **安装**插件（见上方[安装](#安装)说明）
2. **配置** VL API 地址（可选，本地有 llama.cpp 运行时默认配置即可工作）
3. **粘贴图片**到任意 OpenCode 对话中 — 图片会自动转为文字

---

## 配置说明

所有配置项均为可选，插件提供合理的默认值。

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | OpenAI 兼容的 VL API 地址 |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | VL API 使用的模型名 |
| `apiKey` | `""` | API Key（如服务端不需要可留空） |
| `promptTemplate` | `请用中文详细描述这张图片的内容。{userText}` | 发送给 VL 模型的提示词；`{userText}` 会被替换为用户原话 |

**配置加载顺序**（首个找到的生效）：
1. `.opencode/vision-paste.config.jsonc`（项目级）
2. `~/.config/opencode/vision-paste.config.jsonc`（用户级）

完整参考：[CONFIGURATION.md](../CONFIGURATION.md)

---

## 工作原理

```
用户粘贴图片
       ↓
opencode-vision-paste 拦截 `experimental.chat.messages.transform`
       ↓
解码图片 (data URL 或 HTTP) → 保存临时文件
       ↓
发送到本地 VL API (OpenAI 格式的 chat completions)
       ↓
图片部分替换为分析文本
       ↓
临时文件删除 — LLM 只看到文字
```

插件钩入 OpenCode 的 `experimental.chat.messages.transform` 流水线，在消息发送给 LLM 之前执行。

---

## 开发

```
npm test    # 语法检查
npm pack    # 本地打包
```

插件是单文件 (`vision-paste.mjs`)，无需构建。修改后重载即可。

本地测试时，在 `.opencode/opencode.jsonc` 中添加：

```jsonc
{
  "plugin": ["./路径/到/vision-paste.mjs"]
}
```

然后重启 OpenCode 或使用 `/model` 触发重载。

---

## 贡献

欢迎 PR！见 [CONTRIBUTING.md](../CONTRIBUTING.md)。

---

## 许可

[MIT](../LICENSE)
