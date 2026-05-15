# opencode-vision-paste

**Plugin OpenCode : interception des images collées → analyse via API VL locale → remplacement par du texte**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](../README.md) | [简体中文](zh-CN.md) | [繁體中文](zh-TW.md) | [日本語](ja.md) | [한국어](ko.md) | [Español](es.md) | [Français](fr.md) | [Deutsch](de.md) | [Русский](ru.md) | [Português](pt.md)

Vous collez une image dans votre session OpenCode. Le LLM ne peut pas la voir. Mais le plugin le peut.

opencode-vision-paste intercepte les images collées, les envoie à une API VL locale (par ex., Qwen3VL via llama.cpp), et remplace l'image par une description textuelle détaillée — de manière transparente, avant que le LLM ne voie le message.

Aucune dépendance cloud. Aucune clé API requise. Vos images restent locales.

---

## Fonctionnalités

- **Transparent** — les images sont silencieusement converties en texte. Le LLM ne sait jamais qu'il y avait une image
- **Zéro dépendance** — fichier ESM unique, sans étape de build, sans dépendances npm
- **Support multi-image** — collez plusieurs images à la fois ; chacune est analysée et numérotée
- **Local d'abord** — fonctionne avec toute API VL compatible OpenAI (llama.cpp, vLLM, etc.)
- **Cache intelligent** — réutilise les résultats d'analyse pour les images en double entre les tours de conversation
- **HTTP et data URL** — gère à la fois les images collées (data: URLs) et les images hébergées sur le web

## Installation

### Pour les humains

Copiez-collez cette invite dans votre agent OpenCode :

```
Installez et configurez opencode-vision-paste en suivant les instructions ici :
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### Pour les agents LLM

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

Ou lisez directement le [Guide d'installation](INSTALL.md).

---

## Démarrage rapide

1. **Installez** le plugin (voir [Installation](#installation) ci-dessus)
2. **Configurez** votre endpoint API VL dans `.opencode/vision-paste.config.jsonc` (facultatif — les valeurs par défaut fonctionnent si vous avez llama.cpp en local)
3. **Collez une image** dans n'importe quel chat OpenCode — regardez-la se transformer en texte

---

## Configuration

Tous les paramètres sont facultatifs. Le plugin fonctionne avec des valeurs par défaut sensées.

| Option | Défaut | Description |
|--------|--------|-------------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | Endpoint API VL compatible OpenAI |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Nom du modèle pour l'API VL |
| `apiKey` | `""` | Clé API (laissez vide si non requis) |
| `promptTemplate` | `请用中文详细描述这张图片的内容。{userText}` | Prompt envoyé au modèle VL ; `{userText}` est remplacé par le message original de l'utilisateur |

**Emplacements du fichier de configuration** (le premier trouvé prévaut) :
1. `.opencode/vision-paste.config.jsonc` (niveau projet)
2. `~/.config/opencode/vision-paste.config.jsonc` (niveau utilisateur)

Référence complète : [CONFIGURATION.md](../CONFIGURATION.md)

---

## Comment ça fonctionne

```
L'utilisateur colle une image
       ↓
opencode-vision-paste intercepte `experimental.chat.messages.transform`
       ↓
Décode l'image (data URL ou HTTP) → sauvegarde un fichier temporaire
       ↓
Envoie à l'API VL locale (chat completions compatible OpenAI)
       ↓
Remplace la partie image par le texte d'analyse
       ↓
Fichier temporaire supprimé — le LLM ne voit que du texte
```

Le plugin s'accroche au pipeline `experimental.chat.messages.transform` d'OpenCode, s'exécutant avant que le message ne soit envoyé au LLM.

---

## Développement

```
npm test    # vérification de syntaxe
npm pack    # empaquetage local
```

Le plugin est un fichier unique (`vision-paste.mjs`). Sans étape de build. Modifiez et rechargez.

Pour tester localement, ajoutez-le à votre `.opencode/opencode.jsonc` :

```jsonc
{
  "plugin": ["./chemin/vers/vision-paste.mjs"]
}
```

Puis redémarrez OpenCode ou utilisez `/model` pour déclencher un rechargement.

---

## Contribution

Les PR sont les bienvenus ! Voir [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Licence

[MIT](../LICENSE)
