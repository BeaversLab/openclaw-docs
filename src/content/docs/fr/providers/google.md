---
title: "Google (Gemini)"
summary: "Configuration de Google Gemini (clé API, génération d'images, compréhension des médias, recherche web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key auth flow
---

# Google (Gemini)

Le plugin Google permet d'accéder aux modèles Gemini via Google AI Studio, ainsi qu'à la génération d'images, à la compréhension multimédia (image/audio/vidéo) et à la recherche Web via Gemini Grounding.

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- API : Google Gemini API

## Quick start

1. Définir la clé API :

```bash
openclaw onboard --auth-choice gemini-api-key
```

2. Définir un model par défaut :

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
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## Capacités

| Capacité                  | Pris en charge    |
| ------------------------- | ----------------- |
| Chat completions          | Oui               |
| Génération d'images       | Oui               |
| Génération de musique     | Oui               |
| Compréhension d'images    | Oui               |
| Transcription audio       | Oui               |
| Compréhension vidéo       | Oui               |
| Recherche web (Grounding) | Oui               |
| Réflexion/raisonnement    | Oui (Gemini 3.1+) |

## Réutilisation directe du cache Gemini

Pour les exécutions directes de l'API Gemini (`api: "google-generative-ai"`), OpenClaw transmet désormais
un gestionnaire `cachedContent` configuré aux requêtes Gemini.

- Configurez les paramètres globaux ou par model avec
  `cachedContent` ou l'ancien `cached_content`
- Si les deux sont présents, `cachedContent` l'emporte
- Exemple de valeur : `cachedContents/prebuilt-context`
- L'utilisation du cache Gemini est normalisée en OpenClaw `cacheRead` depuis
  le `cachedContentTokenCount` en amont

Exemple :

```json5
{
  agents: {
    defaults: {
      models: {
        "google/gemini-2.5-pro": {
          params: {
            cachedContent: "cachedContents/prebuilt-context",
          },
        },
      },
    },
  },
}
```

## Génération d'images

Le provider de génération d'images intégré `google` utilise par défaut
`google/gemini-3.1-flash-image-preview`.

- Prend également en charge `google/gemini-3-pro-image-preview`
- Génération : jusqu'à 4 images par requête
- Mode édition : activé, jusqu'à 5 images en entrée
- Contrôles géométriques : `size`, `aspectRatio` et `resolution`

La génération d'images, la compréhension des médias et Gemini Grounding conservent tous
l'identifiant de provider `google`.

Pour utiliser Google comme provider d'images par défaut :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3.1-flash-image-preview",
      },
    },
  },
}
```

Consultez [Image Generation](/en/tools/image-generation) pour connaître les paramètres du tool
partagés, la sélection du provider et le comportement de basculement.

## Génération vidéo

Le plugin intégré `google` enregistre également la génération vidéo via le tool
partagé `video_generate`.

- Modèle vidéo par défaut : `google/veo-3.1-fast-generate-preview`
- Modes : texte vers vidéo, image vers vidéo et flux de référence vidéo unique
- Prend en charge `aspectRatio`, `resolution` et `audio`
- Durée actuelle limitée : **4 à 8 secondes**

Pour utiliser Google comme fournisseur vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
      },
    },
  },
}
```

Voir [Génération vidéo](/en/tools/video-generation) pour les paramètres d'outil
partagés, la sélection du fournisseur et le comportement de basculement.

## Génération musicale

Le plugin `google` inclus enregistre également la génération de musique via l'outil
partagé `music_generate`.

- Modèle musical par défaut : `google/lyria-3-clip-preview`
- Prend également en charge `google/lyria-3-pro-preview`
- Contrôles de prompt : `lyrics` et `instrumental`
- Format de sortie : `mp3` par défaut, plus `wav` sur `google/lyria-3-pro-preview`
- Entrées de référence : jusqu'à 10 images
- Les exécutions sauvegardées par session se détachent via le flux de tâches/statuts partagé, y compris `action: "status"`

Pour utiliser Google comme fournisseur musical par défaut :

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

Voir [Génération musicale](/en/tools/music-generation) pour les paramètres d'outil
partagés, la sélection du fournisseur et le comportement de basculement.

## Note sur l'environnement

Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GEMINI_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).
