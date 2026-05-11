---
summary: "Utiliser la synthèse vocale Gradium dans OpenClaw"
read_when:
  - You want Gradium for text-to-speech
  - You need Gradium API key or voice configuration
title: "Gradium"
---

Gradium est un fournisseur de synthèse vocale intégré pour OpenClaw. Il peut générer des réponses audio normales, une sortie Opus compatible avec les notes vocales et de l'audio u-law à 8 kHz pour les surfaces de téléphonie.

## Configuration

Créez une clé API Gradium, puis exposez-la à OpenClaw :

```bash
export GRADIUM_API_KEY="gsk_..."
```

Vous pouvez également stocker la clé dans la configuration sous `messages.tts.providers.gradium.apiKey`.

## Config

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          voiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

## Voix

| Nom       | ID de voix         |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

Voix par défaut : Emma.

## Sortie

- Les réponses sous forme de fichiers audio utilisent WAV.
- Les réponses sous forme de notes vocales utilisent Opus et sont marquées comme compatibles avec la voix.
- La synthèse téléphonique utilise `ulaw_8000` à 8 kHz.

## Connexes

- [Synthèse vocale](/fr/tools/tts)
- [Aperçu des médias](/fr/tools/media-overview)
