---
title: "Groq"
summary: "Configuration de Groq (auth + sélection de modèle)"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Groq

[Groq](https://groq.com) fournit une inférence ultra-rapide sur des modèles open source
(Llama, Gemma, Mistral, etc.) grâce à un matériel LPU personnalisé. OpenClaw se connecte
à Groq via son API compatible OpenAI.

- Provider : `groq`
- Auth : `GROQ_API_KEY`
- API : compatible OpenAI

## Quick start

1. Obtenez une clé API auprès de [console.groq.com/keys](https://console.groq.com/keys).

2. Définissez la clé API :

```bash
export GROQ_API_KEY="gsk_..."
```

3. Définir un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## Exemple de fichier de configuration

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## Transcription audio

Groq fournit également une transcription audio rapide basée sur Whisper. Lorsqu'il est configuré en tant que
fournisseur de compréhension de média, OpenClaw utilise le modèle `whisper-large-v3-turbo`
de Groq pour transcrire les messages vocaux via l'interface `tools.media.audio`
partagée.

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

## Note sur l'environnement

Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GROQ_API_KEY` est
accessible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Notes audio

- Chemin de config partagé : `tools.media.audio`
- URL de base audio Groq par défaut : `https://api.groq.com/openai/v1`
- Modèle audio Groq par défaut : `whisper-large-v3-turbo`
- La transcription audio Groq utilise le chemin `/audio/transcriptions`
  compatible OpenAI

## Modèles disponibles

Le catalogue de modèles de Groq change fréquemment. Exécutez `openclaw models list | grep groq`
pour voir les modèles actuellement disponibles, ou consultez
[console.groq.com/docs/models](https://console.groq.com/docs/models).

Les choix populaires incluent :

- **Llama 3.3 70B Versatile** - polyvalent, contexte large
- **Llama 3.1 8B Instant** - rapide, léger
- **Gemma 2 9B** - compact, efficace
- **Mixtral 8x7B** - architecture MoE, raisonnement puissant

## Liens

- [Groq Console](https://console.groq.com)
- [Documentation API](https://console.groq.com/docs)
- [Liste des modèles](https://console.groq.com/docs/models)
- [Tarifs](https://groq.com/pricing)
