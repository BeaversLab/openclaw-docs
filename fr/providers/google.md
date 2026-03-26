---
title: "Google (Gemini)"
summary: "Configuration de Google Gemini (clé API + OAuth, génération d'images, compréhension multimédia, recherche Web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Le plugin Google permet d'accéder aux modèles Gemini via Google AI Studio, ainsi qu'à la génération d'images, à la compréhension multimédia (image/audio/vidéo) et à la recherche Web via Gemini Grounding.

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- API : Google Gemini API
- Fournisseur alternatif : `google-gemini-cli` (OAuth)

## Quick start

1. Définir la clé API :

```bash
openclaw onboard --auth-choice google-api-key
```

2. Définir un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice google-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## OAuth (Gemini CLI)

Un fournisseur alternatif `google-gemini-cli` utilise PKCE OAuth au lieu d'une clé API. Il s'agit d'une intégration non officielle ; certains utilisateurs signalent des restrictions de compte. Utilisation à vos propres risques.

Variables d'environnement :

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

(Ou les variantes `GEMINI_CLI_*`.)

## Capabilities

| Capability             | Supported         |
| ---------------------- | ----------------- |
| Chat completions       | Yes               |
| Image generation       | Yes               |
| Image understanding    | Yes               |
| Audio transcription    | Yes               |
| Video understanding    | Yes               |
| Web search (Grounding) | Yes               |
| Thinking/reasoning     | Yes (Gemini 3.1+) |

## Environment note

Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GEMINI_API_KEY` est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).

import fr from "/components/footer/fr.mdx";

<fr />
