---
title: "Google (Gemini)"
summary: "Configuration de Google Gemini (clé API + OAuth, génération d'images, compréhension des médias, recherche web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

Le plugin Google permet d'accéder aux modèles Gemini via Google AI Studio, ainsi qu'à la génération d'images, à la compréhension multimédia (image/audio/vidéo) et à la recherche Web via Gemini Grounding.

- Provider : `google`
- Auth : `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
- API : Google Gemini API
- Provider alternatif : `google-gemini-cli` (OAuth)

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

## OAuth (Gemini CLI)

Un provider alternatif `google-gemini-cli` utilise le OAuth PKCE au lieu d'une clé API. Il s'agit d'une intégration non officielle ; certains utilisateurs signalent des restrictions de compte. Utilisation à vos risques et périls.

- Model par défaut : `google-gemini-cli/gemini-3-flash-preview`
- Alias : `gemini-cli`
- Prérequis d'installation : Gemini CLI local disponible en tant que `gemini`
  - Homebrew : `brew install gemini-cli`
  - npm : `npm install -g @google/gemini-cli`
- Connexion :

```bash
openclaw models auth login --provider google-gemini-cli --set-default
```

Variables d'environnement :

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

(Ou les variantes `GEMINI_CLI_*`.)

Si les requêtes CLI du Gemini OAuth échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle et réessayez.

Si la connexion échoue avant le démarrage du flux du navigateur, assurez-vous que la commande locale `gemini` est installée et se trouve dans `PATH`. OpenClaw prend en charge les installations Homebrew ainsi que les installations globales npm, y compris les configurations courantes Windows/npm.

Notes d'utilisation JSON du Gemini CLI :

- Le texte de la réponse provient du champ JSON `response` du CLI.
- L'utilisation revient à `stats` lorsque le CLI laisse `usage` vide.
- `stats.cached` est normalisé en OpenClaw `cacheRead`.
- Si `stats.input` est manquant, OpenClaw déduit les jetons d'entrée de `stats.input_tokens - stats.cached`.

## Capacités

| Capacité                  | Pris en charge    |
| ------------------------- | ----------------- |
| Chat completions          | Oui               |
| Génération d'images       | Oui               |
| Génération de musique     | Oui               |
| Compréhension d'image     | Oui               |
| Transcription audio       | Oui               |
| Compréhension vidéo       | Oui               |
| Recherche web (Grounding) | Oui               |
| Réflexion/raisonnement    | Oui (Gemini 3.1+) |
| Modèles Gemma 4           | Oui               |

Les modèles Gemma 4 (par exemple `gemma-4-26b-a4b-it`) prennent en charge le mode réflexion. OpenClaw réécrit `thinkingBudget` vers un `thinkingLevel` Google pris en charge pour Gemma 4. Définir la réflexion sur `off` conserve la réflexion désactivée au lieu de la mapper vers `MINIMAL`.

## Réutilisation directe du cache Gemini

Pour les exécutions directes de l'API Gemini (`api: "google-generative-ai"`), OpenClaw transmet désormais un gestionnaire `cachedContent` configuré aux requêtes Gemini.

- Configurez les paramètres globaux ou par modèle avec
  `cachedContent` ou l'ancien `cached_content`
- Si les deux sont présents, `cachedContent` l'emporte
- Exemple de valeur : `cachedContents/prebuilt-context`
- L'utilisation du cache Gemini (cache-hit) est normalisée en OpenClaw `cacheRead` à partir de
  `cachedContentTokenCount` en amont

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

Le fournisseur de génération d'images intégré `google` utilise par défaut
`google/gemini-3.1-flash-image-preview`.

- Prend également en charge `google/gemini-3-pro-image-preview`
- Génération : jusqu'à 4 images par requête
- Mode édition : activé, jusqu'à 5 images en entrée
- Contrôles de géométrie : `size`, `aspectRatio` et `resolution`

Le fournisseur `google-gemini-cli` uniquement OAuth est une surface d'inférence de texte distincte. La génération d'images, la compréhension des médias et Gemini Grounding restent sur
l'identifiant de fournisseur `google`.

Pour utiliser Google comme fournisseur d'images par défaut :

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

Voir [Génération d'images](/en/tools/image-generation) pour les paramètres d'outil partagés,
la sélection du fournisseur et le comportement de basculement.

## Génération de vidéo

Le plugin intégré `google` enregistre également la génération de vidéos via l'outil partagé
`video_generate`.

- Modèle vidéo par défaut : `google/veo-3.1-fast-generate-preview`
- Modes : texte-vers-vidéo, image-vers-vidéo et flux de référence vidéo unique
- Prend en charge `aspectRatio`, `resolution` et `audio`
- Limitation de durée actuelle : **4 à 8 secondes**

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

Voir [Génération de vidéo](/en/tools/video-generation) pour les paramètres de l'outil partagé,
la sélection du fournisseur et le comportement de basculement.

## Génération de musique

Le plugin `google` inclus enregistre également la génération de musique via l'outil partagé
`music_generate`.

- Modèle de musique par défaut : `google/lyria-3-clip-preview`
- Prend également en charge `google/lyria-3-pro-preview`
- Contrôles de prompt : `lyrics` et `instrumental`
- Format de sortie : `mp3` par défaut, plus `wav` sur `google/lyria-3-pro-preview`
- Entrées de référence : jusqu'à 10 images
- Les exécutions sauvegardées par session se détachent via le flux de tâche/statut partagé, y compris `action: "status"`

Pour utiliser Google comme fournisseur de musique par défaut :

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

Voir [Génération de musique](/en/tools/music-generation) pour les paramètres de l'outil partagé,
la sélection du fournisseur et le comportement de basculement.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GEMINI_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).
