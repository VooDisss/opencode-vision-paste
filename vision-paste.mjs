import { mkdir, writeFile, readFile, readdir, stat, unlink, appendFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir, homedir } from "node:os"
import { randomUUID } from "node:crypto"

const LOG = join(tmpdir(), "vision-paste", "debug.log")
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")}`
  appendFile(LOG, line + "\n").catch(() => {})
}

const DEFAULT_CONFIG = {
  apiBaseUrl: "http://192.168.9.44:5678/v1",
  apiModel: "Qwen3VL-8B-Instruct-Q4_K_M.gguf",
  apiKey: "",
  promptTemplate: "",
  promptLocale: "zh",
  skipIfModelSupportsVision: true,
  visionModels: [],
  transcribeModels: [],
  healthCheckOnStart: true,
  maxTokens: 2048,
  verbose: false,
  errorHints: true,
}

const PROMPT_LOCALES = {
  en: "Describe this image in detail. {userText}",
  zh: "请用中文详细描述这张图片的内容。{userText}",
  ja: "この画像の内容を詳しく説明してください。{userText}",
  ko: "이 이미지의 내용을 자세히 설명해 주세요. {userText}",
  es: "Describe esta imagen en detalle. {userText}",
  fr: "Décris cette image en détail. {userText}",
  de: "Beschreibe dieses Bild im Detail. {userText}",
  ru: "Подробно опиши это изображение. {userText}",
  pt: "Descreva esta imagem em detalhes. {userText}",
}

const RESPONSE_LOCALES = {
  en: "User question: {userText}\n\nPlease answer the user's question based on the above information.",
  zh: "用户问题：{userText}\n\n请基于以上信息回答用户的问题。",
  ja: "ユーザーの質問：{userText}\n\n上記の情報に基づいてユーザーの質問に答えてください。",
  ko: "사용자 질문: {userText}\n\n위 정보를 바탕으로 사용자의 질문에 답변해 주세요.",
  es: "Pregunta del usuario: {userText}\n\nResponde a la pregunta del usuario basándote en la información anterior.",
  fr: "Question de l'utilisateur : {userText}\n\nVeuillez répondre à la question de l'utilisateur sur la base des informations ci-dessus.",
  de: "Frage des Benutzers: {userText}\n\nBitte beantworten Sie die Frage des Benutzers auf der Grundlage der obigen Informationen.",
  ru: "Вопрос пользователя: {userText}\n\nПожалуйста, ответьте на вопрос пользователя на основе приведенной выше информации.",
  pt: "Pergunta do usuário: {userText}\n\nPor favor, responda à pergunta do usuário com base nas informações acima.",
}

const ERROR_LOCALES = {
  en: { prefix: "Image analysis failed", reason: "Reason", suggestion: "Suggestion" },
  zh: { prefix: "图片分析失败", reason: "原因", suggestion: "建议" },
  ja: { prefix: "画像分析失敗", reason: "理由", suggestion: "提案" },
  ko: { prefix: "이미지 분석 실패", reason: "이유", suggestion: "제안" },
  es: { prefix: "Error al analizar la imagen", reason: "Motivo", suggestion: "Sugerencia" },
  fr: { prefix: "Échec de l'analyse d'image", reason: "Raison", suggestion: "Suggestion" },
  de: { prefix: "Bildanalyse fehlgeschlagen", reason: "Grund", suggestion: "Vorschlag" },
  ru: { prefix: "Ошибка анализа изображения", reason: "Причина", suggestion: "Предложение" },
  pt: { prefix: "Falha na análise de imagem", reason: "Motivo", suggestion: "Sugestão" },
}

const CACHE_MAX = 100

const transcriptionCache = new Map()
const TEMP_DIR = join(tmpdir(), "vision-paste")
const MIME_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/bmp": "bmp" }
const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]))
let currentModel = null
let healthChecked = false
let apiUnreachable = false
let healthWarnInjected = false
const TIMEOUT_MS = 60_000
const MAX_AGE_MS = 24 * 60 * 60 * 1000
function projectConfigPath(directory) {
  return join(directory, ".opencode", "vision-paste.config.jsonc")
}

function userConfigPath() {
  return join(homedir(), ".config", "opencode", "vision-paste.config.jsonc")
}

async function loadConfig(directory) {
  const paths = [
    { path: projectConfigPath(directory) },
    { path: userConfigPath() },
  ]

  for (const { path } of paths) {
    try {
      if (!existsSync(path)) continue
      const raw = await readFile(path, "utf-8")
      const stripped = stripJsoncComments(raw)
      const parsed = JSON.parse(stripped)
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      continue
    }
  }

  return { ...DEFAULT_CONFIG }
}

function resolvePrompt(cfg) {
  if (cfg.promptTemplate) return cfg.promptTemplate
  return PROMPT_LOCALES[cfg.promptLocale] || PROMPT_LOCALES.zh
}

function resolveResponseText(cfg, userText) {
  if (!userText) return ""
  const tmpl = RESPONSE_LOCALES[cfg.promptLocale] || RESPONSE_LOCALES.zh
  return tmpl.replace("{userText}", userText)
}

function cacheSet(url, value) {
  if (transcriptionCache.size >= CACHE_MAX) {
    const oldest = transcriptionCache.keys().next().value
    if (oldest !== undefined) transcriptionCache.delete(oldest)
  }
  transcriptionCache.set(url, value)
}

function stripJsoncComments(text) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, "")
  const lines = out.split("\n")
  out = ""
  for (const line of lines) {
    let inString = false, escaped = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (escaped) { out += ch; escaped = false; continue }
      if (ch === "\\") { out += ch; escaped = true; continue }
      if (ch === '"') { inString = !inString; out += ch; continue }
      if (!inString && ch === "/" && line[i + 1] === "/") break
      out += ch
    }
    out += "\n"
  }
  return out.trim()
}

async function cleanOldTempFiles() {
  const t0 = performance.now()
  try {
    if (!existsSync(TEMP_DIR)) { log("CLEAN", { ms: (performance.now() - t0).toFixed(1), files: 0, skipped: "dir missing" }); return }
    const files = await readdir(TEMP_DIR)
    const now = Date.now()
    let cleaned = 0
    for (const file of files) {
      const fp = join(TEMP_DIR, file)
      const s = await stat(fp).catch(() => null)
      if (s && now - s.mtimeMs > MAX_AGE_MS) { await unlink(fp).catch(() => {}); cleaned++ }
    }
    log("CLEAN", { ms: (performance.now() - t0).toFixed(1), total: files.length, cleaned })
  } catch { log("CLEAN", { ms: (performance.now() - t0).toFixed(1), error: true }) }
}

async function callVisionAPI(imagePath, userText, cfg) {
  const t0 = performance.now()

  const s = await stat(imagePath).catch(() => null)
  if (!s || s.size === 0) throw new Error("image file is empty or missing")
  log("API.stat", { ms: (performance.now() - t0).toFixed(1), sizeKB: (s.size / 1024).toFixed(1) })

  const data = await readFile(imagePath)
  log("API.readFile", { ms: (performance.now() - t0).toFixed(1) })

  const ext = imagePath.split(".").pop()?.toLowerCase()
  const mime = EXT_TO_MIME[ext] ?? "image/jpeg"
  const b64 = data.toString("base64")
  const dataUrl = `data:${mime};base64,${b64}`
  log("API.encode", { ms: (performance.now() - t0).toFixed(1), b64len: b64.length })

  const userTextSuffix = userText ? `\n\n此外，用户还问了以下问题，请根据图片内容直接回答：${userText}` : ""
  const promptText = resolvePrompt(cfg).replace("{userText}", userTextSuffix)

  const body = {
    model: cfg.apiModel,
    max_tokens: cfg.maxTokens ?? 2048,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  }

  const headers = { "Content-Type": "application/json" }
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`

  const tFetch = performance.now()
  const res = await fetch(`${cfg.apiBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  log("API.fetch", { ms: (performance.now() - tFetch).toFixed(1), status: res.status })

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown error")
    throw new Error(`vision API ${res.status}: ${err}`)
  }

  const tParse = performance.now()
  const data2 = await res.json()
  log("API.parse", { ms: (performance.now() - tParse).toFixed(1) })

  const result = data2.choices?.[0]?.message?.content ?? "(no response)"
  log("API.done", { totalMs: (performance.now() - t0).toFixed(1) })
  return result
}

function classifyError(e, cfg) {
  const code = e.cause?.code || e.code || ""
  const name = e.name || ""
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") return {
    cause: `VL API at ${cfg.apiBaseUrl} is not reachable`,
    fix: "Make sure your VL API server is running. Try: npx opencode-vision-paste doctor"
  }
  if (code === "ETIMEDOUT" || name === "AbortError" || name === "TimeoutError") return {
    cause: `VL API timed out after ${60}s`,
    fix: "Check network latency or increase timeout. Verify apiBaseUrl is correct."
  }
  const msg = e.message || ""
  const status = e.status || (msg.match(/vision API (\d+)/) ? parseInt(msg.match(/vision API (\d+)/)[1]) : null)
  if (status === 401 || status === 403) return {
    cause: `VL API returned ${status} (unauthorized)`,
    fix: "Check apiKey in vision-paste.config.jsonc. Run: npx opencode-vision-paste config"
  }
  if (status === 404) return {
    cause: `VL API returned 404 — endpoint not found at ${cfg.apiBaseUrl}`,
    fix: "The URL should end with /v1 for OpenAI-compatible APIs. Check apiBaseUrl in config."
  }
  if (status === 400 || msg.includes("model")) return {
    cause: `VL API error: ${msg}`,
    fix: `Verify apiModel "${cfg.apiModel}" is loaded on the server. Run: npx opencode-vision-paste doctor`
  }
  return { cause: e.message || "Unknown error", fix: "Run `npx opencode-vision-paste doctor` to diagnose" }
}

export default async function (input) {
  const cfg = await loadConfig(input.directory)
  await cleanOldTempFiles()
  log("INIT", { dir: input.directory, api: cfg.apiBaseUrl, model: cfg.apiModel })

  return {
    async event({ event }) {
      if (!cfg.healthCheckOnStart || event.type !== "session.created") return
      if (healthChecked) return
      healthChecked = true
      try {
        const url = cfg.apiBaseUrl.replace(/\/+$/, "") + "/models"
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) { apiUnreachable = true; log("HEALTH", { status: res.status }) }
        else log("HEALTH", { status: "ok" })
      } catch (e) {
        apiUnreachable = true
        log("HEALTH", { error: e.message })
      }
    },
    "experimental.chat.system.transform": async (input) => {
      currentModel = input.model
      log("MODEL", { id: currentModel?.id, providerID: currentModel?.providerID, imageCapability: currentModel?.capabilities?.input?.image })
    },
    "experimental.chat.messages.transform": async (_in, output) => {
      const tHook = performance.now()
      const msgs = output.messages
      log("HOOK", { msgCount: msgs.length })

      // Always transcribe for text-only models in transcribeModels list
      if (currentModel) {
        const modelId = (currentModel.id || "").toLowerCase()
        const isTextOnly = cfg.transcribeModels?.some(p => modelId.includes(p.toLowerCase()))
        if (isTextOnly) {
          log("ALWAYS_TRANSCRIBE", { model: currentModel.id })
        } else if (cfg.skipIfModelSupportsVision) {
          if (
            currentModel.capabilities?.input?.image ||
            cfg.visionModels.some(p => modelId.includes(p.toLowerCase()))
          ) {
            log("SKIP", { model: currentModel.id, reason: "model supports vision natively" })
            return
          }
        }
      }

      // Health check warning — inject once if VL API was unreachable at startup
      if (cfg.healthCheckOnStart && apiUnreachable && !healthWarnInjected) {
        healthWarnInjected = true
        const lastUser = msgs.filter(m => m.info?.role === "user").pop()
        if (lastUser) {
          const parts = [...lastUser.parts]
          parts.push({ type: "text", text: `\n[opencode-vision-paste] VL API (${cfg.apiBaseUrl}) is unreachable. Images will not be analyzed. Run \`npx opencode-vision-paste doctor\` to diagnose.` })
          const idx = msgs.indexOf(lastUser)
          msgs[idx] = { ...lastUser, parts }
        }
      }

      // Process ALL user messages' images, not just the last
      const userMessages = []
      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].info?.role === "user") userMessages.push({ msg: msgs[i], idx: i })
      }
      if (userMessages.length === 0) { log("HOOK exit: no user msg"); return }

      let totalImages = 0
      for (const { msg } of userMessages) {
        if (msg.parts) totalImages += msg.parts.filter(isImageFile).length
      }
      if (totalImages === 0) { log("HOOK exit: no images"); return }
      log("IMAGES", { total: totalImages, msgCount: userMessages.length })

      const tempFiles = []

      for (const { msg, idx } of userMessages) {
        if (!msg.parts || msg.parts.length === 0) continue

        const images = msg.parts.filter(isImageFile)
        if (images.length === 0) continue

        // Dedup images by URL
        const seen = new Set()
        const uniqueImages = images.filter(img => {
          const url = getImageUrl(img)
          if (!url || seen.has(url)) return false
          seen.add(url)
          return true
        })

        // Check cache and determine which need transcription
        const toTranscribe = []
        const results = []
        for (const img of uniqueImages) {
          const url = getImageUrl(img)
          if (transcriptionCache.has(url)) {
            results.push(transcriptionCache.get(url))
          } else {
            toTranscribe.push(img)
          }
        }

        // Transcribe uncached images
        if (toTranscribe.length > 0) {
          const textPart = msg.parts.find(p => p.type === "text")
          const userText = textPart?.text ?? ""
          const saved = (await Promise.all(toTranscribe.map(saveImage))).filter(Boolean)
          tempFiles.push(...saved)

          try {
            for (let i = 0; i < saved.length; i++) {
              log("API_CALL", { idx, i, total: saved.length, imagePath: saved[i] })
              const tApi = performance.now()
              const result = await callVisionAPI(saved[i], userText, cfg)
              log("API_OK", { idx, i, ms: (performance.now() - tApi).toFixed(1), len: result.length })
              const imgUrl = getImageUrl(toTranscribe[i])
              cacheSet(imgUrl, result)
              results.push(result)
            }
          } catch (e) {
            log("API_ERR", { idx, message: e.message })
            const el = ERROR_LOCALES[cfg.promptLocale] || ERROR_LOCALES.zh
            const err = cfg.errorHints !== false ? classifyError(e, cfg) : { cause: e.message, fix: "" }
            const errorText = err.fix
              ? `[${el.prefix}]\n${el.reason}: ${err.cause}\n${el.suggestion}: ${err.fix}`
              : `[${el.prefix}] ${err.cause}`

            const newParts = msg.parts.filter(p => !isImageFile(p))
            const textIdx = newParts.findIndex(p => p.type === "text")
            if (textIdx === -1) {
              newParts.push({ type: "text", text: errorText })
            } else {
              newParts[textIdx] = { ...newParts[textIdx], text: `${newParts[textIdx].text}\n\n${errorText}` }
            }
            msgs[idx] = { ...msg, parts: newParts }
            continue
          }
        }

        // Build combined text and replace images in this message
        const combined = results.join("\n\n---\n\n")
        const textPart = msg.parts.find(p => p.type === "text")
        const userText = textPart?.text ?? ""
        const suffix = resolveResponseText(cfg, userText)
        const injectedText = suffix ? `${combined}\n\n${suffix}` : combined

        const newParts = msg.parts.filter(p => !isImageFile(p))
        const textIdx = newParts.findIndex(p => p.type === "text")
        if (textIdx !== -1) {
          newParts[textIdx] = { ...newParts[textIdx], text: injectedText }
        } else {
          newParts.push({ type: "text", text: injectedText })
        }
        msgs[idx] = { ...msg, parts: newParts }
        log("DONE replaced", { idx, totalMs: (performance.now() - tHook).toFixed(1) })
      }

      // Cleanup temp files
      if (tempFiles.length > 0) {
        await Promise.all(tempFiles.map(fp => unlink(fp).catch(() => {})))
        log("CLEANUP", { count: tempFiles.length })
      }
    },
  }
}

function isImageFile(part) {
  return (part.type === "file" && part.mime?.startsWith("image/")) || part.type === "image"
}

function getImageUrl(part) {
  return part.url || part.image_url?.url || null
}

function guessExt(url) {
  const m = url.match(/\.(\w+)(?:\?|#|$)/)
  return m && ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(m[1]) ? m[1] : null
}

async function writeTempFile(buf, ext) {
  if (!existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true })
  const fp = join(TEMP_DIR, `${randomUUID()}.${ext}`)
  await writeFile(fp, buf)
  return fp
}

async function saveImage(part) {
  try {
    const url = getImageUrl(part)
    if (!url) return null

    if (url.startsWith("data:")) {
      const m = url.match(/^data:([^;]+);base64,(.+)$/)
      if (!m) return null
      const ext = MIME_EXT[m[1]?.toLowerCase()] ?? "png"
      const buf = Buffer.from(m[2], "base64")
      return await writeTempFile(buf, ext)
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      const ct = res.headers.get("content-type") || ""
      const ext = MIME_EXT[ct?.toLowerCase()] ?? guessExt(url) ?? "png"
      return await writeTempFile(buf, ext)
    }

    return null
  } catch {
    return null
  }
}
