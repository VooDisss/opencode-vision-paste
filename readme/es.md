# opencode-vision-paste

**Plugin de OpenCode: intercepta imágenes pegadas → análisis con API VL local → reemplaza con texto**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

Pegas una imagen en tu sesión de OpenCode. El LLM no puede verla. Pero el plugin sí.

opencode-vision-paste intercepta las imágenes pegadas, las envía a una API VL local (p.ej., Qwen3VL ejecutándose con llama.cpp), y reemplaza la imagen con una descripción textual detallada — sin problemas, antes de que el LLM vea el mensaje.

Sin dependencias en la nube. Sin necesidad de claves API. Tus imágenes se quedan en local.

---

## Características

- **Transparente** — las imágenes se convierten silenciosamente a texto. El LLM nunca sabe que había una imagen
- **Cero dependencias** — archivo ESM único, sin paso de compilación, sin dependencias npm
- **Soporte multi-imagen** — pega varias imágenes a la vez; cada una se analiza y numera
- **Local primero** — funciona con cualquier API VL compatible con OpenAI (llama.cpp, vLLM, etc.)
- **Caché inteligente** — reutiliza resultados de análisis para imágenes duplicadas entre turnos de conversación
- **HTTP y data URL** — maneja tanto imágenes pegadas (data: URLs) como imágenes alojadas en web

## Instalación

### Para humanos

Copia y pega este prompt en tu agente OpenCode:

```
Instala y configura opencode-vision-paste siguiendo las instrucciones aquí:
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### Para agentes LLM

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

O lee la [Guía de instalación](INSTALL.md) directamente.

---

## Inicio rápido

1. **Instala** el plugin (ver [Instalación](#instalación) arriba)
2. **Configura** tu endpoint de API VL en `.opencode/vision-paste.config.jsonc` (opcional — los valores por defecto funcionan si tienes llama.cpp ejecutándose localmente)
3. **Pega una imagen** en cualquier chat de OpenCode — mira cómo se convierte en texto

---

## Configuración

Todos los ajustes son opcionales. El plugin funciona con valores predeterminados sensatos.

| Opción | Predeterminado | Descripción |
|--------|---------------|-------------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | Endpoint de API VL compatible con OpenAI |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Nombre del modelo para la API VL |
| `apiKey` | `""` | Clave API (déjalo vacío si no es necesario) |
| `promptTemplate` | `请用中文详细描述这张图片的内容。{userText}` | Prompt enviado al modelo VL; `{userText}` se reemplaza con el mensaje original del usuario |

**Ubicaciones del archivo de configuración** (primero encontrado tiene prioridad):
1. `.opencode/vision-paste.config.jsonc` (nivel de proyecto)
2. `~/.config/opencode/vision-paste.config.jsonc` (nivel de usuario)

Referencia completa: [CONFIGURATION.md](../CONFIGURATION.md)

---

## Cómo funciona

```
El usuario pega una imagen
       ↓
opencode-vision-paste intercepta `experimental.chat.messages.transform`
       ↓
Decodifica la imagen (data URL o HTTP) → guarda archivo temporal
       ↓
Envía a la API VL local (chat completions compatible con OpenAI)
       ↓
Reemplaza la parte de la imagen con el texto de análisis
       ↓
Archivo temporal eliminado — el LLM solo ve texto
```

El plugin se engancha en el pipeline `experimental.chat.messages.transform` de OpenCode, ejecutándose antes de que el mensaje se envíe al LLM.

---

## Desarrollo

```
npm test    # verificación de sintaxis
npm pack    # empaquetado local
```

El plugin es un solo archivo (`vision-paste.mjs`). Sin paso de compilación. Edita y recarga.

Para probar localmente, añádelo a tu `.opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["./ruta/hacia/vision-paste.mjs"]
}
```

Luego reinicia OpenCode o usa `/model` para provocar una recarga.

---

## Contribuciones

¡PRs bienvenidos! Ver [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Licencia

[MIT](../LICENSE)
