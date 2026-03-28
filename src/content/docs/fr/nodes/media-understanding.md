---
summary: "Compréhension entrante de l'image/audio/vidéo (facultatif) avec provider + replis CLI"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "Media Understanding"
---

# Compréhension des médias - Entrant (2026-01-17)

OpenClaw peut **résumer les médias entrants** (image/audio/vidéo) avant l'exécution du pipeline de réponse. Il détecte automatiquement lorsque les outils locaux ou les clés de provider sont disponibles, et peut être désactivé ou personnalisé. Si la compréhension est désactivée, les modèles reçoivent toujours les fichiers/URL d'origine comme d'habitude.

Le comportement spécifique aux fournisseurs en matière de médias est enregistré par les plugins fournisseurs, tandis que le cœur d'OpenClaw possède la configuration partagée `tools.media`, l'ordre de repli et l'intégration au pipeline de réponse.

## Objectifs

- Optionnel : pré-digérer les médias entrants en un texte court pour un routage plus rapide et une meilleure analyse des commandes.
- Préserver la livraison des médias d'origine vers le modèle (toujours).
- Prendre en charge les **API de fournisseur** et les **replis CLI**.
- Autoriser plusieurs modèles avec repli ordonné (erreur/taille/expiration).

## Comportement de haut niveau

1. Collecter les pièces jointes entrantes (`MediaPaths`, `MediaUrls`, `MediaTypes`).
2. Pour chaque capacité activée (image/audio/vidéo), sélectionner les pièces jointes par stratégie (par défaut : **la première**).
3. Choisir la première entrée de modèle éligible (taille + capacité + auth).
4. Si un modèle échoue ou si le média est trop volumineux, **revenir à l'entrée suivante**.
5. En cas de succès :
   - `Body` devient un bloc `[Image]`, `[Audio]` ou `[Video]`.
   - L'audio définit `{{Transcript}}` ; l'analyse des commandes utilise le texte des sous-titres lorsqu'il est présent, sinon la transcription.
   - Les sous-titres sont conservés sous forme de `User text:` à l'intérieur du bloc.

Si la compréhension échoue ou est désactivée, **le flux de réponse continue** avec le corps original + les pièces jointes.

## Aperçu de la configuration

`tools.media` prend en charge les **modèles partagés** ainsi que les remplacements par capacité :

- `tools.media.models` : liste de modèles partagés (utiliser `capabilities` pour activer/désactiver).
- `tools.media.image` / `tools.media.audio` / `tools.media.video` :
  - valeurs par défaut (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - remplacements de fournisseur (`baseUrl`, `headers`, `providerOptions`)
  - options audio Deepgram via `tools.media.audio.providerOptions.deepgram`
  - contrôles d'écho de transcription audio (`echoTranscript`, par défaut `false` ; `echoFormat`)
  - **liste** `models` **par capacité** facultative (préférée avant les modèles partagés)
  - stratégie `attachments` (`mode`, `maxAttachments`, `prefer`)
  - `scope` (filtrage facultatif par clé channel/chatType/session)
- `tools.media.concurrency` : exécutions maximales simultanées de capacités (par défaut **2**).

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

Chaque entrée `models[]` peut être un **provider** ou une **CLI** :

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
  args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
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
  - image : **10 Mo**
  - audio : **20 Mo**
  - vidéo : **50 Mo**

Règles :

- Si le média dépasse `maxBytes`, ce modèle est ignoré et le **modèle suivant est essayé**.
- Les fichiers audio de moins de **1024 octets** sont traités comme vides/corrompus et ignorés avant la transcription par le provider/CLI.
- Si le modèle renvoie plus de `maxChars`, la sortie est tronquée.
- `prompt` correspond par défaut à « Décrivez le {media}. » simple, plus les directives `maxChars` (image/vidéo uniquement).
- Si `<capability>.enabled: true` mais qu'aucun modèle n'est configuré, OpenClaw essaie
  le **modèle de réponse actif** lorsque son provider prend en charge la capacité.

### Détection automatique de la compréhension des médias (par défaut)

Si `tools.media.<capability>.enabled` n'est **pas** défini sur `false` et que vous n'avez
pas configuré de modèles, OpenClaw détecte automatiquement dans cet ordre et **s'arrête à la première
option fonctionnelle** :

1. **CLI locaux** (audio uniquement ; si installés)
   - `sherpa-onnx-offline` (nécessite `SHERPA_ONNX_MODEL_DIR` avec encodeur/decodeur/joiner/tokens)
   - `whisper-cli` (`whisper-cpp` ; utilise `WHISPER_CPP_MODEL` ou le petit modèle inclus)
   - `whisper` (Python CLI ; télécharge les modèles automatiquement)
2. **Gemini CLI** (`gemini`) utilisant `read_many_files`
3. **Clés de fournisseur**
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

Remarque : La détection binaire est effectuée au mieux sous macOS/Linux/Windows ; assurez-vous que le CLI est sur `PATH` (nous développons `~`), ou définissez un modèle CLI explicite avec un chemin de commande complet.

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

Si vous définissez `capabilities`, l'entrée ne s'exécute que pour ces types de médias. Pour les listes
partagées, OpenClaw peut déduire les valeurs par défaut :

- `openai`, `anthropic`, `minimax` : **image**
- `moonshot` : **image + vidéo**
- `google` (API Gemini) : **image + audio + vidéo**
- `mistral` : **audio**
- `zai` : **image**
- `groq` : **audio**
- `deepgram` : **audio**

Pour les entrées CLI, **définissez `capabilities` explicitement** pour éviter les correspondances surprenantes.
Si vous omettez `capabilities`, l'entrée est éligible pour la liste dans laquelle elle apparaît.

## Matrice de prise en charge des fournisseurs (intégrations OpenClaw)

| Capacité | Intégration de fournisseur                         | Notes                                                                                                                     |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Image    | OpenAI, Anthropic, Google, MiniMax, Moonshot, Z.AI | Les plugins de fournisseur enregistrent la prise en charge des images par rapport à la compréhension centrale des médias. |
| Audio    | OpenAI, Groq, Deepgram, Google, Mistral            | Transcription par fournisseur (Whisper/Deepgram/Gemini/Voxtral).                                                          |
| Vidéo    | Google, Moonshot                                   | Compréhension vidéo par fournisseur via les plugins de fournisseur.                                                       |

## Conseils pour la sélection du modèle

- Privilégiez le model de dernière génération le plus performant disponible pour chaque capacité média lorsque la qualité et la sécurité sont importantes.
- Pour les agents utilisant des tool et gérant des entrées non fiables, évitez les model média plus anciens ou plus faibles.
- Conservez au moins une solution de repli par capacité pour assurer la disponibilité (model de qualité + model plus rapide/moins coûteux).
- Les solutions de repli CLI (`whisper-cli`, `whisper`, `gemini`) sont utiles lorsque les API des provider sont indisponibles.
- Note `parakeet-mlx` : avec `--output-dir`, OpenClaw lit `<output-dir>/<media-basename>.txt` lorsque le format de sortie est `txt` (ou non spécifié) ; les formats autres que `txt` reviennent à stdout.

## Stratégie de pièces jointes

Le `attachments` par capacité contrôle quelles pièces jointes sont traitées :

- `mode` : `first` (par défaut) ou `all`
- `maxAttachments` : limiter le nombre traité (par défaut **1**)
- `prefer` : `first`, `last`, `path`, `url`

Lorsque `mode: "all"`, les sorties sont étiquetées `[Image 1/2]`, `[Audio 2/2]`, etc.

## Exemples de configuration

### 1) Liste de model partagée + substitutions

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
          args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
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
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          },
        ],
      },
    },
  },
}
```

### 3) Compréhension d'image facultative

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
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
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

## Sortie de statut

Lorsque la compréhension des média s'exécute, `/status` inclut une ligne de résumé courte :

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

Cela affiche les résultats par capacité et le provider/model choisi le cas échéant.

## Notes

- La compréhension est effectuée sur la base du **meilleur effort**. Les erreurs ne bloquent pas les réponses.
- Les pièces jointes sont toujours transmises aux model même lorsque la compréhension est désactivée.
- Utilisez `scope` pour limiter l'exécution de la compréhension (par ex. uniquement les DMs).

## Documentation connexe

- [Configuration](/fr/gateway/configuration)
- [Prise en charge des images et des média](/fr/nodes/images)
