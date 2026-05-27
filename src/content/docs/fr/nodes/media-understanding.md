---
summary: "CLICompréhension entrante des images/audios/vidéos (facultatif) avec replis provider + CLI"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "Compréhension des médias"
sidebarTitle: "Compréhension des médias"
---

OpenClaw peut **résumer les médias entrants** (image/audio/vidéo) avant que le pipeline de réponse ne s'exécute. Il détecte automatiquement lorsque des outils locaux ou des clés de provider sont disponibles, et peut être désactivé ou personnalisé. Si la compréhension est désactivée, les modèles reçoivent toujours les fichiers/URL d'origine comme d'habitude.

Le comportement spécifique aux fournisseurs pour les médias est enregistré par les plugins fournisseur, tandis que le cœur d'OpenClaw possède la configuration partagée OpenClaw`tools.media`, l'ordre de repli et l'intégration au pipeline de réponse.

## Objectifs

- Optionnel : pré-digérer les médias entrants en un court texte pour un routage plus rapide + une meilleure analyse des commandes.
- Préserver la livraison des médias d'origine vers le modèle (toujours).
- Prendre en charge les **API de fournisseur** et les **replis CLI**.
- Autoriser plusieurs modèles avec repli ordonné (erreur/taille/expiration).

## Comportement de haut niveau

<Steps>
  <Step title="Collect attachments">
    Collecter les pièces jointes entrantes (`MediaPaths`, `MediaUrls`, `MediaTypes`).
  </Step>
  <Step title="Select per-capability">
    Pour chaque capacité activée (image/audio/vidéo), sélectionner les pièces jointes par stratégie (par défaut : **première**).
  </Step>
  <Step title="Choose model">
    Choisir la première entrée de modèle éligible (taille + capacité + auth).
  </Step>
  <Step title="Fallback on failure">
    Si un modèle échoue ou si le média est trop volumineux, **revenir à l'entrée suivante**.
  </Step>
  <Step title="Apply success block">
    En cas de succès :

    - `Body` devient un bloc `[Image]`, `[Audio]` ou `[Video]`.
    - L'audio définit `{{Transcript}}` ; l'analyse des commandes utilise le texte des sous-titres si présent, sinon la transcription.
    - Les sous-titres sont conservés sous forme de `User text:` à l'intérieur du bloc.

  </Step>
</Steps>

Si la compréhension échoue ou est désactivée, **le flux de réponse continue** avec le corps d'origine + les pièces jointes.

## Aperçu de la configuration

`tools.media` prend en charge les **modèles partagés** ainsi que les remplacements par capacité :

<AccordionGroup>
  <Accordion title="Top-level keys">
    - `tools.media.models` : liste de modèles partagés (utilisez `capabilities` pour restreindre).
    - `tools.media.image` / `tools.media.audio` / `tools.media.video` :
      - valeurs par défaut (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
      - substitutions de fournisseur (`baseUrl`, `headers`, `providerOptions`Deepgram)
      - options audio Deepgram via `tools.media.audio.providerOptions.deepgram`
      - contrôles d'écho de transcription audio (`echoTranscript`, défaut `false` ; `echoFormat`)
      - **liste `models` par capacité** facultative (préférée avant les modèles partagés)
      - politique `attachments` (`mode`, `maxAttachments`, `prefer`)
      - `scope` (restriction facultative par clé de channel/chatType/session)
    - `tools.media.concurrency` : nombre maximum d'exécutions simultanées de capacités (défaut **2**).

  </Accordion>
</AccordionGroup>

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

Chaque entrée `models[]` peut être de type **provider** ou **CLI** :

<Tabs>
  <Tab title="Provider entry">
    ```json5
    {
      type: "provider", // default if omitted
      provider: "openai",
      model: "gpt-5.5",
      prompt: "Describe the image in <= 500 chars.",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"], // optional, used for multi-modal entries
      profile: "vision-profile",
      preferredProfile: "vision-fallback",
    }
    ```
  </Tab>
  <Tab title="CLI entry">
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

  </Tab>
</Tabs>

### Identifiants du fournisseur (`apiKey`)

La compréhension des médias par le fournisseur utilise la même résolution d'authentification fournisseur que les appels de modèle normaux : profils d'authentification, variables d'environnement, puis `models.providers.<providerId>.apiKey`.

Les entrées `tools.media.*.models[]` n'acceptent pas de champ `apiKey` en ligne. La
valeur `provider` dans une entrée de modèle média, telle que `openai` ou `moonshot`, doit
avoir des identifiants disponibles via l'une des sources d'authentification de provider standard.

Exemple minimal :

```json5
{
  models: {
    providers: {
      openai: { apiKey: "<OPENAI_API_KEY>" },
      moonshot: { apiKey: "<MOONSHOT_API_KEY>" },
    },
  },
}
```

Pour la référence complète de l'authentification du provider, y compris les profils, les variables d'environnement
et les URL de base personnalisées, consultez [Outils et providers personnalisés](/fr/gateway/config-tools).

## Valeurs par défaut et limites

Valeurs par défaut recommandées :

- `maxChars` : **500** pour image/vidéo (court, adapté aux commandes)
- `maxChars` : **non défini** pour l'audio (transcription complète sauf si vous définissez une limite)
- `maxBytes` :
  - image : **10 Mo**
  - audio : **20 Mo**
  - vidéo : **50 Mo**

<AccordionGroup>
  <Accordion title="Règles">
    - Si le média dépasse `maxBytes`CLI, ce modèle est ignoré et le **modèle suivant est essayé**.
    - Les fichiers audio de moins de **1024 octets** sont traités comme vides/corrompus et ignorés avant la transcription par le provider/CLI ; le contexte de réponse entrant reçoit une transcription substitutive déterministe pour que l'agent sache que la note était trop petite.
    - Si le modèle renvoie plus de `maxChars`, la sortie est réduite.
    - `prompt` correspond par défaut à « Décrivez le {media}. » plus les directives `maxChars`OpenClaw (image/vidéo uniquement).
    - Si le modèle d'image principal actif prend déjà en charge la vision nativement, OpenClaw ignore le bloc de résumé `[Image]`GatewayWebChat et transmet l'image originale directement au modèle.
    - Si le modèle principal d'une passerelle/WebChat est textuel uniquement, les pièces jointes d'image sont conservées sous forme de références `media://inbound/*` déchargées afin que les outils d'image/PDF ou le modèle d'image configuré puissent toujours les inspecter au lieu de perdre la pièce jointe.
    - Les demandes `openclaw infer image describe --model <provider/model>`Ollama explicites sont différentes : elles exécutent directement ce provider/modèle compatible avec les images, y compris les références Ollama telles que `ollama/qwen2.5vl:7b`.
    - Si `<capability>.enabled: true`OpenClaw mais qu'aucun modèle n'est configuré, OpenClaw tente d'utiliser le **modèle de réponse actif** si son provider prend en charge cette capacité.

  </Accordion>
</AccordionGroup>

### Détection automatique de la compréhension des médias (par défaut)

Si `tools.media.<capability>.enabled` n'est **pas** défini sur `false`OpenClaw et que vous n'avez pas configuré de modèles, OpenClaw détecte automatiquement dans cet ordre et **s'arrête à la première option fonctionnelle** :

<Steps>
  <Step title="Modèle de réponse actif">
    Modèle de réponse actif lorsque son provider prend en charge la capacité.
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` références primaires/secours (image uniquement).
    Préférez les références `provider/model`. Les références nues sont qualifiées à partir des entrées de modèle de fournisseur capables d'image configurées uniquement lorsque la correspondance est unique.
  </Step>
  <Step title="Local CLIs (audio only)">
    CLIs locales (si installées) :

    - `sherpa-onnx-offline` (requiert `SHERPA_ONNX_MODEL_DIR` avec encodeur/décodeur/joiner/jetons)
    - `whisper-cli` (`whisper-cpp` ; utilise `WHISPER_CPP_MODEL` ou le tiny modèle inclus)
    - `whisper`CLI (CLI Python ; télécharge les modèles automatiquement)

  </Step>
  <Step title="CLIGemini CLI">
    `gemini` en utilisant `read_many_files`.
  </Step>
  <Step title="Provider auth">
    - Les entrées `models.providers.*`Ollama configurées qui prennent en charge la fonctionnalité sont essayées avant l'ordre de repli inclus.
    - Les fournisseurs de configuration image uniquement avec un modèle capable d'image s'enregistrent automatiquement pour la compréhension des médias même s'ils ne sont pas un plugin de fournisseur inclus.
    - La compréhension d'image Ollama est disponible lorsqu'elle est sélectionnée explicitement, par exemple via `agents.defaults.imageModel` ou `openclaw infer image describe --model ollama/<vision-model>`OpenAIDeepgramOpenRouterOpenAIAnthropicMiniMaxMiniMaxQwenMoonshot.

    Ordre de repli inclus :

    - Audio : OpenAI → Groq → xAI → Deepgram → OpenRouter → Google → SenseAudio → ElevenLabs → Mistral
    - Image : OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
    - Vidéo : Google → Qwen → Moonshot

  </Step>
</Steps>

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

<Note>La détection des binaires est « au mieux » (best-effort) sur macOS/Linux/Windows ; assurez-vous que la CLI est sur `PATH` (nous développons `~`), ou définissez un CLI explicite avec un chemin de commande complet.</Note>

### Prise en charge du proxy de l'environnement (modèles de fournisseur)

Lorsque la compréhension des médias **audio** et **vidéo** basée sur le fournisseur est activée, OpenClaw respecte les variables d'environnement de proxy sortant standard pour les appels HTTP du fournisseur :

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

Si aucune env vars de proxy n'est définie, la compréhension des médias utilise une sortie directe. Si la valeur du proxy est malformée, OpenClaw enregistre un avertissement et revient à une récupération directe.

## Capacités (optionnel)

Si vous définissez `capabilities`, l'entrée ne s'exécute que pour ces types de médias. Pour les listes partagées, OpenClaw peut déduire les valeurs par défaut :

- `openai`, `anthropic`, `minimax` : **image**
- `minimax-portal` : **image**
- `moonshot` : **image + vidéo**
- `openrouter` : **image + audio**
- `google` (Gemini API) : **image + audio + vidéo**
- `qwen` : **image + vidéo**
- `mistral` : **audio**
- `zai` : **image**
- `groq` : **audio**
- `xai` : **audio**
- `deepgram` : **audio**
- Tout catalogue `models.providers.<id>.models[]` avec un modèle compatible avec les images : **image**

Pour les entrées CLI, **définissez `capabilities` explicitement** pour éviter les correspondances inattendues. Si vous omettez `capabilities`, l'entrée est éligible pour la liste dans laquelle elle apparaît.

## Matrice de prise en charge des fournisseurs (intégrations OpenClaw)

| Capacité | Intégration du provider                                                                                                      | Notes                                                                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Image    | OpenAI, OpenAI Codex OAuth, Codex app-server, OpenRouter, Anthropic, Google, MiniMax, Moonshot, Qwen, Z.AI, config providers | Les plugins de fournisseur enregistrent la prise en charge des images ; `openai-codex/*` utilise l'infrastructure du provider OAuth ; `codex/*` utilise un tour app-server Codex borné ; MiniMax et MiniMax OAuth utilisent tous deux `MiniMax-VL-01` ; les config providers capables d'images s'enregistrent automatiquement. |
| Audio    | OpenAI, Groq, xAI, Deepgram, OpenRouter, Google, SenseAudio, ElevenLabs, Mistral                                             | Transcription du provider (Whisper/Groq/xAI/Deepgram/OpenRouter STT/Gemini/SenseAudio/Scribe/Voxtral).                                                                                                                                                                                                                         |
| Vidéo    | Google, Qwen, Moonshot                                                                                                       | Compréhension vidéo du provider via les plugins de fournisseur ; la compréhension vidéo Qwen utilise les points de terminaison Standard DashScope.                                                                                                                                                                             |

<Note>
**Remarque MiniMax**

- La compréhension d'image `minimax`, `minimax-cn`, `minimax-portal` et `minimax-portal-cn` provient du provider média `MiniMax-VL-01` appartenant au plugin.
- Le routage automatique des images continue d'utiliser `MiniMax-VL-01` même si les métadonnées de chat héritées MiniMax M2.x indiquent une entrée d'image.

</Note>

## Conseils de sélection de model

- Privilégiez le model de dernière génération le plus puissant disponible pour chaque capacité média lorsque la qualité et la sécurité sont importantes.
- Pour les agents activés par tool gérant des entrées non fiables, évitez les models média plus anciens ou plus faibles.
- Conservez au moins un repli par capacité pour la disponibilité (model de qualité + model plus rapide/plus économique).
- Les solutions de repli du CLI (`whisper-cli`, `whisper`, `gemini`) sont utiles lorsque les API des providers sont indisponibles.
- `parakeet-mlx` note : avec `--output-dir`, OpenClaw lit `<output-dir>/<media-basename>.txt` lorsque le format de sortie est `txt` (ou non spécifié) ; les formats autres que `txt` reviennent à stdout.

## Politique de pièce jointe

Le `attachments` par capacité contrôle quelles pièces jointes sont traitées :

<ParamField path="mode" type='"first" | "all"' default="first">
  S'il faut traiter la première pièce jointe sélectionnée ou toutes.
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  Limiter le nombre traité.
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  Préférence de sélection parmi les pièces jointes candidates.
</ParamField>

Lorsque `mode: "all"`, les sorties sont étiquetées `[Image 1/2]`, `[Audio 2/2]`, etc.

<AccordionGroup>
  <Accordion title="Comportement d'extraction des fichiers joints">
    - Le texte extrait du fichier est encapsulé en tant que **contenu externe non approuvé** avant d'être ajouté à l'invite média.
    - Le bloc injecté utilise des marqueurs de limite explicites comme `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` et inclut une ligne de métadonnées `Source: External`.
    - Ce chemin d'extraction de pièces jointes omet intentionnellement la longue bannière `SECURITY NOTICE:` pour éviter de surcharger l'invite média ; les marqueurs de limite et les métadonnées restent tout de même.
    - Si un fichier n'a pas de texte extractible, OpenClaw injecte `[No extractable text]`.
    - Si un PDF revient aux images de page rendues dans ce chemin, l'invite média conserve l'espace réservé `[PDF content rendered to images; images not forwarded to model]` car cette étape d'extraction de pièce jointe transmet des blocs de texte, et non les images PDF rendues.

  </Accordion>
</AccordionGroup>

## Exemples de configuration

<Tabs>
  <Tab title="Modèles partagés + remplacements">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-5.5", capabilities: ["image"] },
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
  </Tab>
  <Tab title="Audio + vidéo uniquement">
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
  </Tab>
  <Tab title="Images uniquement">
    ```json5
    {
      tools: {
        media: {
          image: {
            enabled: true,
            maxBytes: 10485760,
            maxChars: 500,
            models: [
              { provider: "openai", model: "gpt-5.5" },
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
  </Tab>
  <Tab title="Entrée unique multimodale">
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
  </Tab>
</Tabs>

## Sortie de statut

Lorsque la compréhension des médias s'exécute, `/status` inclut une courte ligne de résumé :

```
📎 Media: image ok (openai/gpt-5.4) · audio skipped (maxBytes)
```

Cela indique les résultats par capacité et le provider/model choisi le cas échéant.

## Remarques

- La compréhension est effectuée sur la base du **meilleur effort**. Les erreurs ne bloquent pas les réponses.
- Les pièces jointes sont toujours transmises aux modèles même lorsque la compréhension est désactivée.
- Utilisez `scope` pour limiter l'exécution de la compréhension (par ex. uniquement dans les DMs).

## Connexes

- [Configuration](/fr/gateway/configuration)
- [Prise en charge des images et des médias](/fr/nodes/images)
