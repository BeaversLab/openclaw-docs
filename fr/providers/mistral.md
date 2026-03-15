---
summary: "Utiliser les modèles Mistral et la transcription Voxtral avec OpenClaw"
read_when:
  - You want to use Mistral models in OpenClaw
  - You need Mistral API key onboarding and model refs
title: "Mistral"
---

# Mistral

OpenClaw prend en charge Mistral à la fois pour le routage de modèles texte/image (`mistral/...`) et
pour la transcription audio via Voxtral dans la compréhension des médias.
Mistral peut également être utilisé pour les embeddings de mémoire (`memorySearch.provider = "mistral"`).

## Configuration CLI

```bash
openclaw onboard --auth-choice mistral-api-key
# or non-interactive
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
```

## Extrait de configuration (provider LLM)

```json5
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}
```

## Extrait de configuration (transcription audio avec Voxtral)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

## Notes

- L'authentification Mistral utilise `MISTRAL_API_KEY`.
- L'URL de base du provider par défaut est `https://api.mistral.ai/v1`.
- Le modèle par défaut lors de l'intégration est `mistral/mistral-large-latest`.
- Le modèle audio par défaut pour la compréhension des médias avec Mistral est `voxtral-mini-latest`.
- Le chemin de transcription des médias utilise `/v1/audio/transcriptions`.
- Le chemin des embeddings de mémoire utilise `/v1/embeddings` (modèle par défaut : `mistral-embed`).

import fr from '/components/footer/fr.mdx';

<fr />
