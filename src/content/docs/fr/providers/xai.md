---
summary: "Utiliser les modèles Grok xAI dans OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw fournit un plugin de fournisseur `xai` intégré pour les modèles Grok.

## Getting started

<Steps>
  <Step title="Choisir l'auth">
    Utilisez soit une clé API depuis la [console xAI](https://console.x.ai/) ou
    la connexion par navigateur xAI OAuth avec un compte xAI éligible. OAuth ne nécessite
    pas de clé API xAI, et OpenClaw ne nécessite pas l'application Grok Build.
    xAI peut toujours étiqueter l'application de consentement comme Grok Build car OpenClaw utilise
    le client OAuth partagé de xAI.
  </Step>
  <Step title="Se connecter">
    Définissez `XAI_API_KEY`, exécutez l'assistant de clé API, ou démarrez le flux OAuth :

    ```bash
    openclaw onboard --auth-choice xai-api-key
    openclaw onboard --auth-choice xai-oauth
    openclaw models auth login --provider xai --method oauth
    ```

  </Step>
  <Step title="Choisir un model">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw utilise l'API xAI Responses en tant que transport xAI intégré. Les mêmes identifiants de `openclaw onboard --auth-choice xai-api-key` ou `openclaw onboard --auth-choice xai-oauth` peuvent également alimenter les `x_search` de première classe, le `code_execution` à distance, et la génération d'images/vidéos xAI. La reconnaissance vocale et la transcription nécessitent actuellement
  `XAI_API_KEY` ou une configuration de fournisseur. `XAI_API_KEY` ou la configuration de recherche web du plugin peuvent également alimenter la `web_search` basée sur Grok. Si vous stockez une clé xAI sous `plugins.entries.xai.config.webSearch.apiKey`, le fournisseur de modèle xAI intégré réutilise également cette clé en tant que solution de secours. Définissez
  `plugins.entries.xai.config.webSearch.baseUrl` pour acheminer la `web_search` Grok et, par défaut, les `x_search` via un proxy xAI Responses opérateur. Le réglage du `code_execution` se trouve sous `plugins.entries.xai.config.codeExecution`.
</Note>

## Catalogue intégré

OpenClaw inclut les modèles de chat xAI actuels prêts à l'emploi, classés du plus
récent au plus ancien dans les sélecteurs de modèles :

| Famille        | ID de modèle                                                             |
| -------------- | ------------------------------------------------------------------------ |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

Le plugin résout toujours par anticipation les anciens identifiants Grok 3, Grok 4, Grok 4 Fast, Grok 4.1
Fast et Grok Code pour les configurations existantes, mais OpenClaw n'affiche plus
ces identifiants amonts retirés dans le catalogue sélectionnable.

<Tip>Utilisez `grok-4.3` pour les nouvelles charges de travail de chat et de codage, sauf si vous avez explicitement besoin d'un alias bêta Grok 4.20.</Tip>

## Couverture des fonctionnalités OpenClaw

Le plugin intégré mappe la surface de l'API publique actuelle de xAI sur les contrats partagés de provider et d'outil de OpenClaw. Les fonctionnalités qui ne correspondent pas au contrat partagé (par exemple la diffusion TTS et la voix en temps réel) ne sont pas exposées - voir le tableau ci-dessous.

| Fonctionnalité xAI               | Surface OpenClaw                                     | Statut                                                                     |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Chat / Réponses                  | Provider de model `xai/<model>`                      | Oui                                                                        |
| Recherche Web côté serveur       | Provider `web_search` `grok`                         | Oui                                                                        |
| Recherche X côté serveur         | Outil `x_search`                                     | Oui                                                                        |
| Exécution de code côté serveur   | Outil `code_execution`                               | Oui                                                                        |
| Images                           | `image_generate`                                     | Oui                                                                        |
| Vidéos                           | `video_generate`                                     | Oui                                                                        |
| Synthèse vocale par lot          | `messages.tts.provider: "xai"` / `tts`               | Oui                                                                        |
| Synthèse vocale en continu       | -                                                    | Non exposé ; le contrat TTS de OpenClaw renvoie des tampons audio complets |
| Reconnaissance vocale par lot    | `tools.media.audio` / compréhension des médias       | Oui                                                                        |
| Reconnaissance vocale en continu | Appel vocal `streaming.provider: "xai"`              | Oui                                                                        |
| Voix en temps réel               | -                                                    | Pas encore exposé ; contrat session/WebSocket différent                    |
| Fichiers / lots                  | Compatibilité générique de l'API de model uniquement | Pas un outil OpenClaw de première classe                                   |

<Note>
  OpenClaw utilise les API REST image/vidéo/TTS/STT de xAI pour la génération de médias, la parole et la transcription par lots, le WebSocket STT en continu de xAI pour la transcription d'appels vocaux en direct, et l'OpenClaw Réponses pour les outils de model, de recherche et d'exécution de code. Les fonctionnalités nécessitant des contrats OpenClaw différents, tels que les sessions vocales en
  temps réel, sont documentées ici en tant que capacités en amont plutôt que comme un comportement caché du plugin.
</Note>

### Mappings en mode rapide

`/fast on` ou `agents.defaults.models["xai/<model>"].params.fastMode: true`
réécrit les requêtes xAI natives comme suit :

| Model source  | Cible en mode rapide |
| ------------- | -------------------- |
| `grok-3`      | `grok-3-fast`        |
| `grok-3-mini` | `grok-3-mini-fast`   |
| `grok-4`      | `grok-4-fast`        |
| `grok-4-0709` | `grok-4-fast`        |

### Alias de compatibilité hérités

Les alias hérités sont toujours normalisés vers les ids groupés canoniques :

| Alias hérité              | Id canonique                          |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## Fonctionnalités

<AccordionGroup>
  <Accordion title="Recherche Web">
    Le provider groupé `grok` de recherche web peut utiliser `XAI_API_KEY` ou une clé de
    recherche web de plugin :

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Génération vidéo">
    Le plugin intégré `xai` enregistre la génération vidéo via l'outil
    partagé `video_generate`.

    - Modèle vidéo par défaut : `xai/grok-imagine-video`
    - Modes : texte-vers-vidéo, image-vers-vidéo, génération d'image de référence,
      montage vidéo à distance et extension vidéo à distance
    - Formats d'image : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`
    - Résolutions : `480P`, `720P`
    - Durée : 1-15 secondes pour la génération/image-vers-vidéo, 1-10 secondes lors
      de l'utilisation de rôles `reference_image`, 2-10 secondes pour l'extension
    - Génération d'image de référence : définissez `imageRoles` sur `reference_image` pour
      chaque image fournie ; xAI accepte jusqu'à 7 images de ce type

    <Warning>
    Les tampons vidéo locaux ne sont pas acceptés. Utilisez des URL `http(s)` distantes pour
     les entrées de montage/extension vidéo. Image-vers-vidéo accepte les tampons d'image locale car
    OpenClaw peut les encoder en URL de données pour xAI.
    </Warning>

    Pour utiliser xAI comme fournisseur vidéo par défaut :

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés,
    la sélection du fournisseur et le comportement de basculement.
    </Note>

  </Accordion>

  <Accordion title="Génération d'images">
    Le plugin `xai` intégré enregistre la génération d'images via l'outil partagé `image_generate`.

    - Modèle d'image par défaut : `xai/grok-imagine-image`
    - Modèle supplémentaire : `xai/grok-imagine-image-quality`
    - Modes : texte vers image et modification d'image de référence
    - Entrées de référence : un `image` ou jusqu'à cinq `images`
    - Ratios d'aspect : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Résolutions : `1K`, `2K`
    - Nombre : jusqu'à 4 images

    OpenClaw demande à xAI des réponses d'image `b64_json` afin que les médias générés puissent être stockés et livrés via le chemin normal des pièces jointes du channel. Les images de référence locales sont converties en URL de données ; les références `http(s)` distantes sont transmises telles quelles.

    Pour utiliser xAI comme fournisseur d'images par défaut :

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "xai/grok-imagine-image",
          },
        },
      },
    }
    ```

    <Note>
    xAI documente également `quality`, `mask`, `user`, et des ratios natifs supplémentaires tels que `1:2`, `2:1`, `9:20` et `20:9`. OpenClaw ne transmet aujourd'hui que les commandes d'image partagées entre fournisseurs ; les commandes natives non prises en charge ne sont intentionnellement pas exposées via `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="Synthèse vocale">
    Le plugin `xai` inclus enregistre la synthèse vocale via l'interface de fournisseur `tts` partagée.

    - Voix : `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Voix par défaut : `eve`
    - Formats : `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Langue : code BCP-47 ou `auto`
    - Vitesse : substitution de vitesse native du fournisseur
    - Le format de note vocale Opus natif n'est pas pris en charge

    Pour utiliser xAI comme fournisseur TTS par défaut :

    ```json5
    {
      messages: {
        tts: {
          provider: "xai",
          providers: {
            xai: {
              voiceId: "eve",
            },
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw utilise le point de terminaison par lot `/v1/tts` d'xAI. xAI propose également une diffusion en continu TTS
    via WebSocket, mais le contrat de fournisseur de parole OpenClaw attend actuellement
    un tampon audio complet avant la livraison de la réponse.
    </Note>

  </Accordion>

  <Accordion title="Reconnaissance vocale">
    Le plugin `xai` inclus enregistre la reconnaissance vocale par lots via l'interface de transcription de compréhension des médias de OpenClaw.

    - Modèle par défaut : `grok-stt`
    - Point de terminaison : `/v1/stt` REST xAI
    - Chemin d'entrée : téléchargement de fichier audio en plusieurs parties
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
      `tools.media.audio`, y compris les segments de canal vocal Discord et
      les pièces jointes audio du canal

    Pour forcer l'utilisation d'xAI pour la transcription audio entrante :

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "xai",
                model: "grok-stt",
              },
            ],
          },
        },
      },
    }
    ```

    La langue peut être fournie via la configuration multimédia audio partagée ou par demande de transcription par appel. Les invites de conseils sont acceptées par l'interface partagée OpenClaw, mais l'intégration STT REST xAI ne transfère que le fichier, le modèle et la langue car ceux-ci correspondent proprement au point de terminaison public actuel d'xAI.

  </Accordion>

  <Accordion title="Streaming speech-to-text">
    Le plugin `xai` fourni enregistre également un fournisseur de transcription en temps réel
    pour l'audio des appels vocaux en direct.

    - Endpoint : xAI WebSocket `wss://api.x.ai/v1/stt`
    - Encodage par défaut : `mulaw`
    - Taux d'échantillonnage par défaut : `8000`
    - Endpointing par défaut : `800ms`
    - Transcriptions intermédiaires : activées par défaut

    Le flux média Twilio de l'appel vocal envoie des trames audio G.711 µ-law, donc le
    fournisseur xAI peut transmettre ces trames directement sans transcodage :

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}",
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    La configuration propriétaire du fournisseur se trouve sous
    `plugins.entries.voice-call.config.streaming.providers.xai`. Les clés prises en charge
    sont `apiKey`, `baseUrl`, `sampleRate`, `encoding` (`pcm`, `mulaw`, ou
    `alaw`), `interimResults`, `endpointingMs` et `language`.

    <Note>
    Ce fournisseur de streaming est destiné au chemin de transcription en temps réel des appels vocaux.
    La voix Discord enregistre actuellement de courts segments et utilise le chemin de transcription
    par lots `tools.media.audio` à la place.
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    Le plugin xAI inclus expose `x_search`OpenClaw en tant qu'outil OpenClaw pour rechercher
    du contenu X (anciennement Twitter) via Grok.

    Chemin de configuration : `plugins.entries.xai.config.xSearch`

    | Clé                | Type    | Par défaut         | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | Activer ou désactiver x_search           |
    | `model`            | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes x_search     |
    | `baseUrl`          | string  | -                  | Remplacement de l'URL de base des réponses xAI      |
    | `inlineCitations`  | boolean | -                  | Inclure les citations en ligne dans les résultats  |
    | `maxTurns`         | number  | -                  | Nombre maximum de tours de conversation           |
    | `timeoutSeconds`   | number  | -                  | Délai d'expiration de la requête en secondes           |
    | `cacheTtlMinutes`  | number  | -                  | Durée de vie du cache en minutes        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                baseUrl: "https://api.x.ai/v1",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Code execution configuration">
    Le plugin xAI inclus expose `code_execution`OpenClaw en tant qu'outil OpenClaw pour
    l'exécution de code à distance dans l'environnement bac à sable (sandbox) xAI.

    Chemin de configuration : `plugins.entries.xai.config.codeExecution`

    | Clé               | Type    | Par défaut         | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (si clé disponible) | Activer ou désactiver l'exécution de code  |
    | `model`           | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes d'exécution de code   |
    | `maxTurns`        | number  | -                  | Nombre maximum de tours de conversation               |
    | `timeoutSeconds`  | number  | -                  | Délai d'expiration de la requête en secondes               |

    <Note>
    Il s'agit d'une exécution distante dans le bac à sable xAI, et non d'une [`exec`](/fr/tools/exec) locale.
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="Known limits">
  - xAI auth can use an API key, environment variable, plugin config fallback, or xAI OAuth browser sign-in with an eligible xAI account. OAuth uses a local callback on `127.0.0.1:56121`; for remote hosts, forward that port before opening the sign-in URL. xAI decides which accounts can receive OAuth API tokens, and the consent page may show Grok Build even though OpenClaw does not require the Grok
  Build app. - `grok-4.20-multi-agent-experimental-beta-0304` is not supported on the normal xAI provider path because it requires a different upstream API surface than the standard OpenClaw xAI transport. - xAI Realtime voice is not registered as an OpenClaw provider yet. It needs a different bidirectional voice session contract than batch STT or streaming transcription. - xAI image `quality`,
  image `mask`, and extra native-only aspect ratios are not exposed until the shared `image_generate` tool has corresponding cross-provider controls.
</Accordion>

  <Accordion title="Advanced notes">
    - OpenClaw applique automatiquement des correctifs de compatibilité spécifiques à xAI pour les schémas d'outil et les appels d'outil
      sur le chemin d'exécution partagé.
    - Les requêtes xAI natives sont `tool_stream: true` par défaut. Définissez
      `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour
      les désactiver.
    - Le wrapper xAI intégré supprime les indicateurs de schéma d'outil strict non pris en charge et
      les clés de payload de raisonnement avant d'envoyer des requêtes xAI natives.
    - `web_search`, `x_search` et `code_execution` sont exposés en tant qu'outils OpenClaw.
      OpenClaw active la fonctionnalité intégrée xAI spécifique dont il a besoin dans chaque demande d'outil
      au lieu d'attacher tous les outils natifs à chaque tour de discussion.
    - Grok `web_search` lit `plugins.entries.xai.config.webSearch.baseUrl`.
      `x_search` lit `plugins.entries.xai.config.xSearch.baseUrl`, puis
      revient à l'URL de base de recherche web Grok.
    - `x_search` et `code_execution` sont détenus par le plugin xAI intégré plutôt
      que d'être codés en dur dans le runtime du modèle de base.
    - `code_execution` est une exécution de bac à sable xAI distante, et non une exécution locale
      [`exec`](/fr/tools/exec).
  </Accordion>
</AccordionGroup>

## Test en direct

Les chemins média xAI sont couverts par des tests unitaires et des suites en direct optionnelles. Exportez
`XAI_API_KEY` dans l'environnement de processus avant d'exécuter des sondes en direct.

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

Le fichier en direct spécifique au fournisseur synthétise du TTS normal, du TTS PCM adapté à la téléphonie,
transcrit de l'audio via le traitement STT par lots xAI, diffuse le même PCM via le STT
en temps réel xAI, génère une sortie texte vers image et modifie une image de référence. Le
fichier en direct d'image partagé vérifie le même fournisseur xAI via la sélection de
runtime, le basculement, la normalisation et le chemin de pièce jointe média de OpenClaw.

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Génération de vidéos" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="Tous les providers" href="/fr/providers/index" icon="grid-2">
    Vue d'ensemble générale des providers.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et solutions.
  </Card>
</CardGroup>
