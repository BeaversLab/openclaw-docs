---
summary: "Compréhension entrante de l'image/audio/vidéo (facultatif) avec provider + replis CLI"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "Media Understanding"
---

# Compréhension des médias - Entrant (2026-01-17)

OpenClaw peut **résumer les médias entrants** (image/audio/vidéo) avant l'exécution du pipeline de réponse. Il détecte automatiquement lorsque les outils locaux ou les clés de provider sont disponibles, et peut être désactivé ou personnalisé. Si la compréhension est désactivée, les modèles reçoivent toujours les fichiers/URL d'origine comme d'habitude.

Le comportement spécifique au fournisseur pour les médias est enregistré par les plugins de fournisseur, tandis que le cœur d'OpenClaw possède la configuration partagée `tools.media`, l'ordre de repli et l'intégration au pipeline de réponse.

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

`tools.media` prend en charge les **modèles partagés** ainsi que les substitutions par capacité :

- `tools.media.models` : liste de modèles partagés (utilisez `capabilities` pour conditionner).
- `tools.media.image` / `tools.media.audio` / `tools.media.video` :
  - valeurs par défaut (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - substitutions de fournisseur (`baseUrl`, `headers`, `providerOptions`)
  - options audio Deepgram via `tools.media.audio.providerOptions.deepgram`
  - contrôles d'écho de transcription audio (`echoTranscript`, par défaut `false` ; `echoFormat`)
  - **liste `models` par capacité** facultative (préférée avant les modèles partagés)
  - stratégie `attachments` (`mode`, `maxAttachments`, `prefer`)
  - `scope` (conditionnement facultatif par clé de canal/chatType/session)
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

Chaque entrée `models[]` peut être un **fournisseur** ou une **CLI** :

```json5
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.4-mini",
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
- Si le modèle renvoie plus de `maxChars`, la sortie est réduite.
- `prompt` est par défaut « Décrivez le {media}. » plus les directives `maxChars` (image/vidéo uniquement).
- Si le modèle d'image principal actuel prend déjà en charge la vision nativement, OpenClaw
  ignore le bloc de résumé `[Image]` et transmet l'image originale directement au
  modèle.
- Si `<capability>.enabled: true` mais qu'aucun modèle n'est configuré, OpenClaw essaie le
  **modèle de réponse actif** lorsque son fournisseur prend en charge cette fonctionnalité.

### Détection automatique de la compréhension des médias (par défaut)

Si `tools.media.<capability>.enabled` n'est **pas** défini sur `false` et que vous n'avez
pas configuré de modèles, OpenClaw détecte automatiquement dans cet ordre et **s'arrête à la première
option fonctionnelle** :

1. **Modèle de réponse actif** lorsque son fournisseur prend en charge la fonctionnalité.
2. Références primaires/secours **`agents.defaults.imageModel`** (image uniquement).
3. **CLI locales** (audio uniquement ; si installées)
   - `sherpa-onnx-offline` (nécessite `SHERPA_ONNX_MODEL_DIR` avec encodeur/décodeur/joineur/tokens)
   - `whisper-cli` (`whisper-cpp` ; utilise `WHISPER_CPP_MODEL` ou le petit modèle inclus)
   - `whisper` (CLI Python ; télécharge les modèles automatiquement)
4. **CLI Gemini** (`gemini`) utilisant `read_many_files`
5. **Authentification du fournisseur**
   - Les entrées `models.providers.*` configurées qui prennent en charge la fonctionnalité sont
     essayées avant l'ordre de secours inclus.
   - Les fournisseurs de configuration images uniquement avec un modèle capable de traiter les images s'enregistrent automatiquement pour
     la compréhension des médias même s'ils ne sont pas un plugin fournisseur inclus.
   - Ordre de secours inclus :
     - Audio : OpenAI → Groq → Deepgram → Google → Mistral
     - Image : OpenAI → Anthropic → Google → MiniMax → Portail MiniMax → Z.AI
     - Vidéo : Google → Qwen → Moonshot

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

Remarque : La détection binaire est de type « meilleur effort » sur macOS/Linux/Windows ; assurez-vous que la CLI est sur `PATH` (nous développons `~`), ou définissez un modèle CLI explicite avec un chemin de commande complet.

### Prise en charge de l'environnement proxy (modèles de provider)

Lorsque la compréhension multimédia **audio** et **vidéo** basée sur le provider est activée, OpenClaw
honore les variables d'environnement de proxy sortant standard pour les appels HTTP du provider :

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

Si aucune variable d'environnement de proxy n'est définie, la compréhension multimédia utilise une sortie directe.
Si la valeur du proxy est malformée, OpenClaw enregistre un avertissement et revient à une récupération
directe.

## Capacités (facultatif)

Si vous définissez `capabilities`, l'entrée ne s'exécute que pour ces types de médias. Pour les listes
partagées, OpenClaw peut déduire les valeurs par défaut :

- `openai`, `anthropic`, `minimax` : **image**
- `minimax-portal` : **image**
- `moonshot` : **image + vidéo**
- `openrouter` : **image**
- `google` (Gemini API) : **image + audio + vidéo**
- `qwen` : **image + vidéo**
- `mistral` : **audio**
- `zai` : **image**
- `groq` : **audio**
- `deepgram` : **audio**
- Tout catalogue `models.providers.<id>.models[]` avec un modèle compatible image :
  **image**

Pour les entrées CLI, **définissez `capabilities` explicitement** pour éviter les correspondances surprenantes.
Si vous omettez `capabilities`, l'entrée est éligible pour la liste dans laquelle elle apparaît.

## Matrice de prise en charge des providers (intégrations OpenClaw)

| Capacité | Intégration du provider                                                                          | Remarques                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image    | OpenAI, OpenRouter, Anthropic, Google, MiniMax, Moonshot, Qwen, Z.AI, providers de configuration | Les plugins fournisseurs enregistrent la prise en charge des images ; MiniMax et MiniMax OAuth utilisent tous deux `MiniMax-VL-01` ; les providers de configuration compatibles image s'enregistrent automatiquement. |
| Audio    | OpenAI, Groq, Deepgram, Google, Mistral                                                          | Transcription du provider (Whisper/Deepgram/Gemini/Voxtral).                                                                                                                                                          |
| Vidéo    | Google, Qwen, Moonshot                                                                           | Compréhension vidéo du fournisseur via les plugins fournisseurs ; la compréhension vidéo Qwen utilise les points de terminaison Standard DashScope.                                                                   |

Note MiniMax :

- La compréhension d'image `minimax` et `minimax-portal` provient du fournisseur de média
  `MiniMax-VL-01` propriétaire du plugin.
- Le catalogue de texte MiniMax fourni démarre toujours en mode texte seul ; les entrées
  `models.providers.minimax` explicites matérialisent les références de chat M2.7 compatibles avec les images.

## Recommandations de sélection de modèle

- Privilégiez le modèle le plus puissant de la dernière génération disponible pour chaque capacité média lorsque la qualité et la sécurité sont importantes.
- Pour les agents activés pour les outils gérant des entrées non fiables, évitez les modèles média plus anciens ou plus faibles.
- Conservez au moins un repli par capacité pour la disponibilité (modèle de qualité + modèle plus rapide/moins coûteux).
- Les replis CLI (`whisper-cli`, `whisper`, `gemini`) sont utiles lorsque les API des fournisseurs ne sont pas disponibles.
- Note `parakeet-mlx` : avec `--output-dir`, OpenClaw lit `<output-dir>/<media-basename>.txt` lorsque le format de sortie est `txt` (ou non spécifié) ; les formats autres que `txt` reviennent à stdout.

## Politique de pièce jointe

Le `attachments` par capacité contrôle quelles pièces jointes sont traitées :

- `mode` : `first` (par défaut) ou `all`
- `maxAttachments` : limiter le nombre traité (par défaut **1**)
- `prefer` : `first`, `last`, `path`, `url`

Lorsque `mode: "all"`, les sorties sont étiquetées `[Image 1/2]`, `[Audio 2/2]`, etc.

Comportement d'extraction des fichiers joints :

- Le texte du fichier extrait est encapsulé en tant que **contenu externe non fiable** avant d'être
  ajouté à l'invite média.
- Le bloc injecté utilise des marqueurs de délimitation explicites comme
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` et inclut une
  ligne de métadonnées `Source: External`.
- Ce chemin d'extraction de pièces jointes omet intentionnellement la longue bannière `SECURITY NOTICE:` pour éviter d'alourdir le prompt média ; les marqueurs de frontière et les métadonnées restent toutefois présents.
- Si un fichier ne contient pas de texte extractible, OpenClaw injecte `[No extractable text]`.
- Si un PDF revient à des images de page rendues dans ce chemin, le prompt média conserve l'espace réservé `[PDF content rendered to images; images not forwarded to model]` car cette étape d'extraction de pièces jointes transfère des blocs de texte, et non les images PDF rendues.

## Exemples de configuration

### 1) Liste de models partagée + overrides

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.4-mini", capabilities: ["image"] },
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
          { provider: "openai", model: "gpt-5.4-mini" },
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

Lorsque la compréhension des médias s'exécute, `/status` inclut une ligne récapitulative courte :

```
📎 Media: image ok (openai/gpt-5.4-mini) · audio skipped (maxBytes)
```

Cela affiche les résultats par capacité et le provider/model choisi le cas échéant.

## Notes

- La compréhension est sur le principe du **meilleur effort** (best‑effort). Les erreurs ne bloquent pas les réponses.
- Les pièces jointes sont toujours transmises aux models même lorsque la compréhension est désactivée.
- Utilisez `scope` pour limiter l'endroit où s'exécute la compréhension (par exemple, uniquement les DMs).

## Documentation connexe

- [Configuration](/fr/gateway/configuration)
- [Support des images et des médias](/fr/nodes/images)
