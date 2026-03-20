---
summary: "Compréhension entrante des images/audios/vidéos (facultatif) avec provider + replis CLI"
read_when:
  - Conception ou refonte de la compréhension des médias
  - Réglage du prétraitement audio/vidéo/image entrant
title: "Compréhension des médias"
---

# Compréhension des médias - Entrant (2026-01-17)

OpenClaw peut **résumer les médias entrants** (image/audio/vidéo) avant l'exécution du pipeline de réponse. Il détecte automatiquement lorsque des outils locaux ou des clés de provider sont disponibles, et peut être désactivé ou personnalisé. Si la compréhension est désactivée, les modèles reçoivent toujours les fichiers/URL d'origine comme d'habitude.

Le comportement spécifique aux fournisseurs pour les médias est enregistré par les plugins de fournisseur, tandis que le cœur de OpenClaw
possède la configuration partagée `tools.media`, l'ordre de repli et l'intégration au pipeline de réponse.

## Objectifs

- Facultatif : pré-digérer les médias entrants en texte court pour un routage plus rapide + un meilleur analyseur de commandes.
- Conserver la livraison originale des médias au model (toujours).
- Prise en charge des **provider APIs** et des **CLI fallbacks**.
- Autoriser plusieurs models avec une fallback ordonnée (erreur/taille/expiration).

## Comportement de haut niveau

1. Collecter les pièces jointes entrantes (`MediaPaths`, `MediaUrls`, `MediaTypes`).
2. Pour chaque capacité activée (image/audio/vidéo), sélectionner les pièces jointes par stratégie (par défaut : **première**).
3. Choisir la première entrée de model éligible (taille + capacité + auth).
4. Si un model échoue ou si le média est trop volumineux, **fall back to the next entry**.
5. En cas de succès :
   - `Body` devient `[Image]`, `[Audio]`, ou un bloc `[Video]`.
   - L'audio définit `{{Transcript}}` ; l'analyse de commande utilise le texte de la légende si présent,
     sinon la transcription.
   - Les légendes sont conservées sous forme de `User text:` à l'intérieur du bloc.

Si la compréhension échoue ou est désactivée, **le flux de réponse continue** avec le corps d'origine + les pièces jointes.

## Présentation de la configuration

`tools.media` prend en charge les **modèles partagés** ainsi que les remplacements par capacité :

- `tools.media.models` : liste de modèles partagés (utilisez `capabilities` pour conditionner).
- `tools.media.image` / `tools.media.audio` / `tools.media.video` :
  - valeurs par défaut (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - remplacements de provider (`baseUrl`, `headers`, `providerOptions`)
  - options audio Deepgram via `tools.media.audio.providerOptions.deepgram`
  - contrôles d'écho de transcription audio (`echoTranscript`, par défaut `false` ; `echoFormat`)
  - **liste `models` par capacité** facultative (préférée avant les modèles partagés)
  - stratégie `attachments` (`mode`, `maxAttachments`, `prefer`)
  - `scope` (filtrage facultatif par clé de channel/chatType/session)
- `tools.media.concurrency` : nombre maximum d'exécutions simultanées de capacités (par défaut **2**).

```json5
{
  tools: {
    media: {
      models: [
        /* shared list */
      ],
      image: {
        /* optional overrides */
      },
      audio: {
        /* optional overrides */
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
      video: {
        /* optional overrides */
      },
    },
  },
}
```

### Entrées de modèle

Chaque entrée `models[]` peut être un **provider** ou **CLI** :

```json5
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.2",
  prompt: "Describe the image in <= 500 chars.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // optional, used for multi‑modal entries
  profile: "vision-profile",
  preferredProfile: "vision-fallback",
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: [
    "-m",
    "gemini-3-flash",
    "--allowed-tools",
    "read_file",
    "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
  ],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"],
}
```

Les modèles CLI peuvent également utiliser :

- `{{MediaDir}}` (répertoire contenant le fichier média)
- `{{OutputDir}}` (répertoire temporaire créé pour cette exécution)
- `{{OutputBase}}` (chemin de base du fichier temporaire, sans extension)

## Valeurs par défaut et limites

Valeurs par défaut recommandées :

- `maxChars` : **500** pour image/vidéo (court, adapté aux commandes)
- `maxChars` : **non défini** pour l'audio (transcription complète sauf si vous définissez une limite)
- `maxBytes` :
  - image : **10 Mo**
  - audio : **20 Mo**
  - vidéo : **50 Mo**

Règles :

- Si le média dépasse `maxBytes`, ce modèle est ignoré et le **modèle suivant est essayé**.
- Les fichiers audio de moins de **1024 octets** sont considérés comme vides/corrompus et ignorés avant la transcription par le fournisseur/CLI.
- Si le modèle renvoie plus de `maxChars`, la sortie est réduite.
- `prompt` correspond par défaut à « Décrivez le {media}. » plus les directives `maxChars` (image/vidéo uniquement).
- Si `<capability>.enabled: true` mais que aucun modèle n'est configuré, OpenClaw tente le **modèle de réponse actif** lorsque son provider prend en charge la fonctionnalité.

### Détection automatique de la compréhension des médias (par défaut)

Si `tools.media.<capability>.enabled` n'est **pas** défini sur `false` et que vous n'avez pas configuré de modèles, OpenClaw détecte automatiquement dans cet ordre et **s'arrête à la première option fonctionnelle** :

1. **CLI locales** (audio uniquement ; si installées)
   - `sherpa-onnx-offline` (nécessite `SHERPA_ONNX_MODEL_DIR` avec encodeur/décodeur/joineur/tokens)
   - `whisper-cli` (`whisper-cpp` ; utilise `WHISPER_CPP_MODEL` ou le tiny modèle inclus)
   - `whisper` (CLI Python ; télécharge les modèles automatiquement)
2. **Gemini CLI** (`gemini`) utilisant `read_many_files`
3. **Clés de provider**
   - Audio : OpenAI → Groq → Deepgram → Google
   - Image : OpenAI → Anthropic → Google → MiniMax
   - Vidéo : Google

Pour désactiver la détection automatique, définissez :

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

Remarque : La détection binaire est effectuée au mieux sur macOS/Linux/Windows ; assurez-vous que la CLI est sur `PATH` (nous développons `~`), ou définissez un CLI CLI explicite avec un chemin de commande complet.

### Prise en charge de l'environnement proxy (modèles de fournisseur)

Lorsque la compréhension des médias **audio** et **vidéo** basée sur le fournisseur est activée, OpenClaw
honore les variables d'environnement de proxy sortant standard pour les appels HTTP du fournisseur :

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

Si aucune variable d'environnement de proxy n'est définie, la compréhension des médias utilise une sortie directe.
Si la valeur du proxy est malformée, OpenClaw enregistre un avertissement et revient à une récupération
directe.

## Capacités (facultatif)

Si vous définissez `capabilities`, l'entrée ne s'exécute que pour ces types de médias. Pour les listes partagées, OpenClaw peut déduire les valeurs par défaut :

- `openai`, `anthropic`, `minimax` : **image**
- `moonshot` : **image + vidéo**
- `google` (Gemini API) : **image + audio + vidéo**
- `mistral` : **audio**
- `zai` : **image**
- `groq` : **audio**
- `deepgram` : **audio**

Pour les entrées CLI, **définissez `capabilities` explicitement** pour éviter les correspondances surprenantes.
Si vous omettez `capabilities`, l'entrée est éligible pour la liste dans laquelle elle apparaît.

## Matrice de prise en charge des fournisseurs (intégrations OpenClaw)

| Capacité | Intégration de fournisseur                               | Notes                                                                   |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| Image      | OpenAI, Anthropic, Google, MiniMax, Moonshot, Z.AI | Les plugins fournisseur enregistrent la prise en charge des images pour la compréhension principale des médias. |
| Audio      | OpenAI, Groq, Deepgram, Google, Mistral            | Transcription par le fournisseur (Whisper/Deepgram/Gemini/Voxtral).               |
| Vidéo      | Google, Moonshot                                   | Compréhension vidéo par le fournisseur via les plugins fournisseur.                        |

## Recommandations pour la sélection du modèle

- Privilégiez le modèle le plus puissant de la dernière génération disponible pour chaque capacité média lorsque la qualité et la sécurité sont importantes.
- Pour les agents avec outils (tool-enabled) gérant des entrées non fiables, évitez les modèles média plus anciens ou plus faibles.
- Conservez au moins une solution de repli par capacité pour la disponibilité (modèle de qualité + modèle plus rapide/moins coûteux).
- Les solutions de repli CLI (`whisper-cli`, `whisper`, `gemini`) sont utiles lorsque les API fournisseur sont indisponibles.
- `parakeet-mlx` note : avec `--output-dir`, OpenClaw lit `<output-dir>/<media-basename>.txt` lorsque le format de sortie est `txt` (ou non spécifié) ; les formats autres que `txt` reviennent à stdout.

## Politique de pièce jointe

Le `attachments` par capacité contrôle les pièces jointes traitées :

- `mode` : `first` (par défaut) ou `all`
- `maxAttachments` : limiter le nombre traité (par défaut **1**)
- `prefer` : `first`, `last`, `path`, `url`

Lorsque `mode: "all"`, les sorties sont étiquetées `[Image 1/2]`, `[Audio 2/2]`, etc.

## Exemples de configuration

### 1) Liste de modèles partagés + substitutions

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
        {
          provider: "google",
          model: "gemini-3-flash-preview",
          capabilities: ["image", "audio", "video"],
        },
        {
          type: "cli",
          command: "gemini",
          args: [
            "-m",
            "gemini-3-flash",
            "--allowed-tools",
            "read_file",
            "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
          ],
          capabilities: ["image", "video"],
        },
      ],
      audio: {
        attachments: { mode: "all", maxAttachments: 2 },
      },
      video: {
        maxChars: 500,
      },
    },
  },
}
```

### 2) Audio + Vidéo uniquement (image désactivée)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
          },
        ],
      },
      video: {
        enabled: true,
        maxChars: 500,
        models: [
          { provider: "google", model: "gemini-3-flash-preview" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
            ],
          },
        ],
      },
    },
  },
}
```

### 3) Compréhension d'image optionnelle

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
          { provider: "anthropic", model: "claude-opus-4-6" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
            ],
          },
        ],
      },
    },
  },
}
```

### 4) Entrée unique multimodale (capacités explicites)

```json5
{
  tools: {
    media: {
      image: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      audio: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      video: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
    },
  },
}
```

## Sortie d'état

Lorsque la compréhension des médias s'exécute, `/status` inclut une ligne récapitulative courte :

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

Cela indique les résultats par capacité et le provider/model choisi le cas échéant.

## Notes

- La compréhension est **best‑effort** (au mieux). Les erreurs ne bloquent pas les réponses.
- Les pièces jointes sont toujours transmises aux modèles même lorsque la compréhension est désactivée.
- Utilisez `scope` pour limiter l'exécution de la compréhension (par ex. uniquement les DMs).

## Documentation connexe

- [Configuration](/fr/gateway/configuration)
- [Prise en charge des images et des médias](/fr/nodes/images)

import en from "/components/footer/en.mdx";

<en />
