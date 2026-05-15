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
  <Step title="Créer une clé API">
    Créez une clé API dans la [console xAI](https://console.x.ai/).
  </Step>
  <Step title="Définir votre clé API">
    Définissez `XAI_API_KEY`, ou exécutez :

    ```bash
    openclaw onboard --auth-choice xai-api-key
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
  OpenClaw utilise l'API Responses xAI comme transport xAI groupé. La même clé API que `openclaw onboard --auth-choice xai-api-key` peut également alimenter les `x_search` de première classe et le `code_execution` distant ; la config de `XAI_API_KEY` ou le plugin de recherche web peuvent également alimenter des `web_search` basées sur Grok. Si vous stockez une clé xAI sous
  `plugins.entries.xai.config.webSearch.apiKey`, le provider de model xAI groupé réutilise également cette clé en guise de solution de repli. Définissez `plugins.entries.xai.config.webSearch.baseUrl` pour acheminer les `web_search` Grok et, par défaut, les `x_search` via un proxy de réponses xAI opérateur. Le réglage du `code_execution` se trouve sous `plugins.entries.xai.config.codeExecution`.
</Note>

## Catalogue intégré

OpenClaw inclut ces familles de modèles xAI prêtes à l'emploi :

| Famille        | ID de modèle                                                             |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

Le plugin résout également par anticipation les identifiants `grok-4*` et `grok-code-fast*` plus récents lorsqu'ils
suivent la même forme de API.

<Tip>`grok-4.3`, `grok-4-fast`, `grok-4-1-fast`, et les variantes `grok-4.20-beta-*` sont les références Grok actuelles capables d'images dans le catalogue groupé.</Tip>

## Couverture des fonctionnalités OpenClaw

Le plugin groupé mappe la surface de l'API publique actuelle de xAI sur les contrats de provider et d'outil partagés de OpenClaw. Les fonctionnalités qui ne correspondent pas au contrat partagé (par exemple le streaming TTS et la voix en temps réel) ne sont pas exposées - voir le tableau ci-dessous.

| Capacité xAI                       | Surface OpenClaw                               | Statut                                                                     |
| ---------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Chat / Réponses                    | Provider de model `xai/<model>`                | Oui                                                                        |
| Recherche web côté serveur         | Provider `web_search` `grok`                   | Oui                                                                        |
| Recherche X côté serveur           | Outil `x_search`                               | Oui                                                                        |
| Exécution de code côté serveur     | Outil `code_execution`                         | Oui                                                                        |
| Images                             | `image_generate`                               | Oui                                                                        |
| Vidéos                             | `video_generate`                               | Oui                                                                        |
| Synthèse vocale par lot            | `messages.tts.provider: "xai"` / `tts`         | Oui                                                                        |
| Streaming TTS                      | -                                              | Non exposé ; le contrat TTS de OpenClaw renvoie des tampons audio complets |
| Reconnaissance vocale par lot      | `tools.media.audio` / compréhension des médias | Oui                                                                        |
| Reconnaissance vocale en streaming | Appel vocal `streaming.provider: "xai"`        | Oui                                                                        |
| Voix en temps réel                 | -                                              | Pas encore exposé ; contrat session/WebSocket différent                    |
| Fichiers / lots                    | Compatibilité model API générique uniquement   | Pas un outil OpenClaw de première classe                                   |

<Note>
  OpenClaw utilise les API REST image/vidéo/TTS/STT de xAI pour la génération de médias, la parole et la transcription par lot, le WebSocket STT en streaming de xAI pour la transcription d'appels vocaux en direct, et l'OpenClaw Réponses pour les outils de model, de recherche et d'exécution de code. Les fonctionnalités qui nécessitent des contrats OpenClaw différents, tels que les sessions voix en
  temps réel, sont documentées ici en tant que capacités en amont plutôt que comme un comportement masqué du plugin.
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
    Le provider `grok` de recherche web groupé peut utiliser `XAI_API_KEY` ou une clé
    de recherche web de plugin :

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Génération de vidéo">
    Le plugin `xai` intégré enregistre la génération de vidéo via l'outil partagé `video_generate`.

    - Modèle vidéo par défaut : `xai/grok-imagine-video`
    - Modes : texte vers vidéo, image vers vidéo, génération d'image de référence, montage vidéo à distance et extension vidéo à distance
    - Formats d'image : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`
    - Résolutions : `480P`, `720P`
    - Durée : 1-15 secondes pour la génération/image vers vidéo, 1-10 secondes lors de l'utilisation des rôles `reference_image`, 2-10 secondes pour l'extension
    - Génération d'image de référence : définissez `imageRoles` sur `reference_image` pour chaque image fournie ; xAI accepte jusqu'à 7 de ces images

    <Warning>
    Les tampons vidéo locaux ne sont pas acceptés. Utilisez des URL `http(s)` distantes pour les entrées de montage/extension de vidéo. Image vers vidéo accepte les tampons d'image locaux car OpenClaw peut les encoder en URL de données pour xAI.
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
    Consultez [Génération de vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.
    </Note>

  </Accordion>

  <Accordion title="Génération d'images">
    Le plugin `xai` inclus enregistre la génération d'images via l'outil
    `image_generate` partagé.

    - Modèle d'image par défaut : `xai/grok-imagine-image`
    - Modèle supplémentaire : `xai/grok-imagine-image-pro`
    - Modes : texte vers image et édition d'image de référence
    - Entrées de référence : une `image` ou jusqu'à cinq `images`
    - Ratios d'aspect : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Résolutions : `1K`, `2K`
    - Nombre : jusqu'à 4 images

    OpenClaw demande à xAI des réponses d'image `b64_json` afin que les médias générés puissent
    être stockés et livrés via le chemin normal des pièces jointes du canal. Les
    images de référence locales sont converties en URL de données ; les références `http(s)` distantes sont
    transmises telles quelles.

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
    xAI documente également `quality`, `mask`, `user`, et des ratios natifs supplémentaires
    tels que `1:2`, `2:1`, `9:20` et `20:9`. OpenClaw ne transmet aujourd'hui que les
    contrôles d'image partagés inter-fournisseurs ; les commandes natives non prises en charge
    ne sont intentionnellement pas exposées via `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="Synthèse vocale">
    Le plugin `xai` intégré enregistre la synthèse vocale via l'interface de `tts`
    partagée.

    - Voix : `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Voix par défaut : `eve`
    - Formats : `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Langue : code BCP-47 ou `auto`
    - Vitesse : remplacement de la vitesse native du fournisseur
    - Le format natif de note vocale Opus n'est pas pris en charge

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
    OpenClaw utilise le point de terminaison par lots `/v1/tts` de xAI. xAI propose également une diffusion en continu TTS
    via WebSocket, mais le contrat du fournisseur de parole de OpenClaw s'attend actuellement à
    un tampon audio complet avant la livraison de la réponse.
    </Note>

  </Accordion>

  <Accordion title="Reconnaissance vocale">
    Le plugin `xai` intégré enregistre la reconnaissance vocale par lots via l'interface
    de transcription de compréhension multimédia de OpenClaw.

    - Modèle par défaut : `grok-stt`
    - Point de terminaison : xAI REST `/v1/stt`
    - Chemin d'entrée : téléchargement de fichier audio multipart
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
      `tools.media.audio`, y compris les segments de canal vocal Discord et
      les pièces jointes audio de canal

    Pour forcer l'utilisation de xAI pour la transcription audio entrante :

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

    La langue peut être fournie via la configuration multimédia audio partagée ou via la requête
    de transcription par appel. Les indices de prompt sont acceptés par l'interface partagée OpenClaw,
    mais l'intégration xAI REST STT ne transmet que le fichier, le modèle et la
    langue car ceux-ci correspondent proprement au point de terminaison public actuel de xAI.

  </Accordion>

  <Accordion title="Streaming speech-to-text">
    Le plugin `xai` intégré enregistre également un fournisseur de transcription en temps réel
    pour l'audio des appels vocaux en direct.

    - Point de terminaison : xAI WebSocket `wss://api.x.ai/v1/stt`
    - Encodage par défaut : `mulaw`
    - Taux d'échantillonnage par défaut : `8000`
    - Détection de fin de mot par défaut : `800ms`
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
    `alaw`), `interimResults`, `endpointingMs`, et `language`.

    <Note>
    Ce fournisseur de streaming est pour le chemin de transcription en temps réel de l'appel vocal.
    Discord voice enregistre actuellement de courts segments et utilise le chemin de transcription
    `tools.media.audio` par lot à la place.
    </Note>

  </Accordion>

  <Accordion title="configuration de x_search">
    Le plugin xAI inclus expose `x_search`OpenClaw en tant qu'outil OpenClaw pour rechercher
    du contenu sur X (anciennement Twitter) via Grok.

    Chemin de configuration : `plugins.entries.xai.config.xSearch`

    | Clé                | Type    | Par défaut         | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | Activer ou désactiver x_search           |
    | `model`            | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes x_search     |
    | `baseUrl`          | string  | -                  | Remplacement de l'URL de base des réponses xAI      |
    | `inlineCitations`  | boolean | -                  | Inclure des citations en ligne dans les résultats  |
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

  <Accordion title="Configuration de l'exécution de code">
    Le plugin xAI inclus expose `code_execution`OpenClaw en tant qu'outil OpenClaw pour
    l'exécution de code à distance dans l'environnement de bac à sable (sandbox) d'xAI.

    Chemin de configuration : `plugins.entries.xai.config.codeExecution`

    | Clé               | Type    | Par défaut         | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (si clé disponible) | Activer ou désactiver l'exécution de code  |
    | `model`           | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes d'exécution de code   |
    | `maxTurns`        | number  | -                  | Nombre maximum de tours de conversation               |
    | `timeoutSeconds`  | number  | -                  | Délai d'expiration de la requête en secondes               |

    <Note>
    Il s'agit d'une exécution à distance dans le bac à sable xAI, et non d'une [`exec`](/fr/tools/exec) locale.
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

<Accordion title="Limites connues" API>
  - L'authentification se fait aujourd'hui uniquement par clé API. La clé API peut être stockée dans un profil d'authentification xAI, une variable d'environnement ou une configuration de plugin ; il n'y a pas encore de flux OAuth OAuth ou de code d'appareil dans OpenClaw. - `grok-4.20-multi-agent-experimental-beta-0304` n'est pas pris en charge sur le chemin normal du fournisseur xAI car il
  nécessite une surface API en amont différente du transport xAI standard de OpenClaw. - xAI Realtime voice n'est pas encore enregistré en tant que fournisseur OpenClaw. Il nécessite un contrat de session vocale bidirectionnel différent de la STT par lot ou de la transcription en continu. - xAI image `quality`, image `mask` et les rapports de format natif supplémentaires ne sont pas exposés tant
  que l'outil `image_generate` partagé ne dispose pas des contrôles multi-fournisseurs correspondants.
</Accordion>

  <Accordion title="Advanced notes"OpenClaw>
    - OpenClaw applique automatiquement les correctifs de compatibilité tool-schema et tool-call spécifiques à xAI sur le chemin d'exécution partagé.
    - Les requêtes xAI natives sont `tool_stream: true` par défaut. Définissez `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour les désactiver.
    - Le wrapper xAI intégré supprime les indicateurs stricts tool-schema non pris en charge et les clés de payload de raisonnement avant d'envoyer des requêtes xAI natives.
    - `web_search`, `x_search` et `code_execution`OpenClawOpenClaw sont exposés en tant qu'outils OpenClaw. OpenClaw active la fonctionnalité intégrée xAI spécifique dont il a besoin dans chaque requête d'outil, au lieu d'attacher tous les outils natifs à chaque tour de conversation.
    - Grok `web_search` lit `plugins.entries.xai.config.webSearch.baseUrl`.
      `x_search` lit `plugins.entries.xai.config.xSearch.baseUrl`, puis
      revient à l'URL de base de recherche Web Grok.
    - `x_search` et `code_execution` sont détenus par le plugin xAI intégré plutôt que codés en dur dans le runtime du modèle principal.
    - `code_execution` est une exécution de bac à sable xAI distante, et non une exécution [`exec`](/fr/tools/exec) locale.
  </Accordion>
</AccordionGroup>

## Tests en direct

Les chemins d'accès média xAI sont couverts par des tests unitaires et des suites de tests en direct optionnels. Les commandes en direct chargent les secrets de votre shell de connexion, y compris `~/.profile`, avant de sonder `XAI_API_KEY`.

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

Le fichier en direct spécifique au fournisseur synthétise une TTS normale, une TTS PCM adaptée à la téléphonie, transcrit de l'audio via le traitement STT par lots xAI, diffuse le même PCM via le STT temps réel xAI, génère une sortie texte-vers-image et modifie une image de référence. Le fichier d'image partagé en direct vérifie le même fournisseur xAI via la sélection d'exécution, le repli, la normalisation et le chemin de pièce jointe média d'OpenClaw.

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Génération de vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="Tous les providers" href="/fr/providers/index" icon="grid-2">
    Aperçu général des providers.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et solutions.
  </Card>
</CardGroup>
