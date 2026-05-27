---
summary: "OpenClawUtiliser les modèles Grok xAI dans OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw est livré avec un plugin provider OpenClaw`xai`OAuthOpenClawGatewayAPI intégré pour les modèles Grok. Pour la plupart des utilisateurs, le chemin recommandé est Grok OAuth avec un abonnement SuperGrok ou X Premium éligible. OpenClaw reste axé sur le local : le Gateway, la configuration, le routage et les outils s'exécutent sur votre machine, tandis que les requêtes de modèle Grok sont authentifiées via xAI et envoyées à l'API xAI.

OAuth ne nécessite pas de clé API xAI et ne nécessite pas l'application Grok Build. xAI peut toujours afficher Grok Build sur l'écran de consentement car OpenClaw utilise le client OAuth partagé de xAI.

## Choisissez votre chemin de configuration

Utilisez le chemin qui correspond à l'état de votre installation OpenClaw :

<Steps>
  <Step title="OpenClawNouvelle installation OpenClaw"GatewayOAuth>
    Exécutez l'intégration (onboarding) avec l'installation du démon lorsque vous configurez un nouveau Gateway local, puis choisissez l'option xAI/Grok OAuth à l'étape du modèle/authentification :

    ```bash
    openclaw onboard --install-daemon
    ```

    Sur un VPS ou via SSH, utilisez le code d'appareil (device-code) lors de l'intégration :

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```OAuthAPIOpenClawOpenClawOAuth

    OAuth ne nécessite pas de clé API xAI. OpenClaw ne nécessite pas l'application Grok Build. xAI peut toujours étiqueter l'application de consentement comme Grok Build car OpenClaw utilise le client OAuth partagé de xAI.

  </Step>
  <Step title="OpenClawInstallation OpenClaw existante">
    Si OpenClaw est déjà configuré, connectez-vous uniquement à xAI. Ne relancez pas l'intégralité
    de l'intégration ou ne réinstallez pas le daemon simplement pour connecter Grok :

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    Utilisez plutôt le flux par code d'appareil lorsque le Gateway s'exécute via SSH, Docker, ou
    un VPS et qu'un rappel de navigateur localhost est maladroit :

    ```bash
    openclaw models auth login --provider xai --device-code
    ```

    Pour définir Grok comme le modèle par défaut après la connexion, appliquez-le séparément :

    ```bash
    openclaw models set xai/grok-4.3
    ```

    Ne relancez l'intégration complète que si vous souhaitez intentionnellement modifier le Gateway,
    le daemon, le canal, l'espace de travail ou d'autres choix de configuration.

  </Step>
  <Step title="Chemin avec clé d'API">
    La configuration avec clé d'API fonctionne toujours pour les clés xAI Console et pour les surfaces médias qui
    nécessitent une configuration de fournisseur avec clé :

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

  </Step>
  <Step title="Choisir un modèle">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw utilise l'API xAI Responses en tant que transport xAI intégré. Les mêmes identifiants provenant de OpenClawAPI`openclaw models auth login --provider xai --method oauth`, `openclaw models auth login --provider xai --device-code` ou `openclaw models auth login --provider xai --method api-key` peuvent également alimenter les outils `web_search` de première classe, `x_search`, le
  `code_execution` distant, ainsi que la génération d'images/vidéos xAI. La reconnaissance vocale et la transcription nécessitent actuellement `XAI_API_KEY` ou la configuration du fournisseur. Les outils `web_search`OAuth basés sur Grok préfèrent xAI OAuth et reviennent à `XAI_API_KEY` ou à la configuration de recherche web du plugin. Si vous stockez une clé xAI sous
  `plugins.entries.xai.config.webSearch.apiKey`, le fournisseur de modèle xAI intégré réutilise également cette clé en guise de solution de repli. Définissez `plugins.entries.xai.config.webSearch.baseUrl` pour acheminer les outils `web_search` Grok et, par défaut, `x_search` via un proxy xAI Responses d'opérateur. Le réglage du `code_execution` se trouve sous
  `plugins.entries.xai.config.codeExecution`.
</Note>

## Dépannage OAuth

- Si le navigateur OAuth ne peut pas atteindre OAuth`127.0.0.1:56121`, utilisez
  `openclaw models auth login --provider xai --device-code`.
- Si la connexion réussit mais que Grok n'est pas le modèle par défaut, exécutez
  `openclaw models set xai/grok-4.3`.
- Pour inspecter les profils d'authentification xAI enregistrés, exécutez :

  ```bash
  openclaw models auth list --provider xai
  openclaw models status
  ```

- xAI décide quels comptes peuvent recevoir des jetons OAuth API. Si un compte n'est pas
  éligible, essayez la méthode avec la clé API ou vérifiez l'abonnement du côté de xAI.

<Tip>Utilisez `xai-device-code` lors de la connexion via SSH, DockerOpenClaw ou un VPS. OpenClaw affiche une URL xAI et un code court ; finalisez la connexion dans n'importe quel navigateur local pendant que le processus distant interroge xAI pour l'échange de jeton terminé.</Tip>

## Catalogue intégré

OpenClaw inclut les modèles de chat xAI actuels prêts à l'emploi, classés du plus
récent au plus ancien dans les sélecteurs de modèles :

| Famille        | IDs de modèle                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Grok Build 0.1 | `grok-build-0.1`                                                         |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

Le plugin résout toujours par anticipation les slugs Grok 3, Grok 4, Grok 4 Fast, Grok 4.1
Fast et Grok Code plus anciens pour les configurations existantes. Les alias officiels Grok Code Fast
se normalisent en `grok-build-0.1`OpenClaw ; OpenClaw n'affiche plus les autres slugs
amont obsolètes dans le catalogue sélectionnable.

<Tip>Utilisez `grok-4.3` pour la discussion générale et `grok-build-0.1` pour les charges de travail centrées sur la construction/le codage, sauf si vous avez explicitement besoin d'un alias bêta Grok 4.20.</Tip>

## Couverture des fonctionnalités d'OpenClaw

Le plugin intégré mappe la surface de l'API publique actuelle de xAI sur les contrats partagés de fournisseur et d'outil d'OpenClaw. Les fonctionnalités qui ne correspondent pas au contrat partagé (par exemple la synthèse vocale en streaming et la voix en temps réel) ne sont pas exposées - voir le tableau ci-dessous.

| Capacité xAI                       | Surface OpenClaw                                        | Statut                                                                                   |
| ---------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Chat / Réponses                    | Fournisseur de modèle `xai/<model>`                     | Oui                                                                                      |
| Recherche web côté serveur         | Fournisseur `web_search` `grok`                         | Oui                                                                                      |
| Recherche X côté serveur           | Outil `x_search`                                        | Oui                                                                                      |
| Exécution de code côté serveur     | Outil `code_execution`                                  | Oui                                                                                      |
| Images                             | `image_generate`                                        | Oui                                                                                      |
| Vidéos                             | `video_generate`                                        | Oui                                                                                      |
| Synthèse vocale par lot            | `messages.tts.provider: "xai"` / `tts`                  | Oui                                                                                      |
| Synthèse vocale en streaming       | -                                                       | Non exposé ; le contrat de synthèse vocale d'OpenClaw renvoie des tampons audio complets |
| Reconnaissance vocale par lot      | `tools.media.audio` / compréhension des médias          | Oui                                                                                      |
| Reconnaissance vocale en streaming | Appel vocal `streaming.provider: "xai"`                 | Oui                                                                                      |
| Voix en temps réel                 | -                                                       | Pas encore exposé ; contrat de session/WebSocket différent                               |
| Fichiers / lots                    | Compatibilité générique avec l'API de modèle uniquement | Pas un outil de première classe OpenClaw                                                 |

<Note>
  OpenClaw utilise les API REST image/vidéo/TTS/STT de xAI pour la génération de médias, la parole et la transcription par lots, le WebSocket STT en streaming de xAI pour la transcription d'appels vocaux en direct, et l'API Responses pour les outils de modèle, de recherche et d'exécution de code. Les fonctionnalités nécessitant des contrats OpenClaw différents, tels que les sessions vocales en
  temps réel, sont documentées ici en tant que capacités en amont plutôt que comme comportement masqué du plugin.
</Note>

### Mappages en mode rapide

`/fast on` ou `agents.defaults.models["xai/<model>"].params.fastMode: true`
réécrit les requêtes xAI natives comme suit :

| Modèle source | Cible en mode rapide |
| ------------- | -------------------- |
| `grok-3`      | `grok-3-fast`        |
| `grok-3-mini` | `grok-3-mini-fast`   |
| `grok-4`      | `grok-4-fast`        |
| `grok-4-0709` | `grok-4-fast`        |

### Alias de compatibilité hérités

Les alias hérités sont toujours normalisés vers les ids groupés canoniques :

| Alias hérité              | Id canonique                          |
| ------------------------- | ------------------------------------- |
| `grok-code-fast-1`        | `grok-build-0.1`                      |
| `grok-code-fast`          | `grok-build-0.1`                      |
| `grok-code-fast-1-0825`   | `grok-build-0.1`                      |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## Features

<AccordionGroup>
  <Accordion title="Web search">
    Le provider `grok` de recherche web groupé préfère xAI OAuth, puis revient
    à `XAI_API_KEY` ou à une clé de recherche web de plugin :

    ```bash
    openclaw models auth login --provider xai --method oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Génération vidéo">
    Le plugin `xai` intégré enregistre la génération vidéo via l'outil `video_generate` partagé.

    - Modèle vidéo par défaut : `xai/grok-imagine-video`
    - Modes : texte vers vidéo, image vers vidéo, génération d'image de référence, montage vidéo à distance et extension vidéo à distance
    - Formats d'image : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`
    - Résolutions : `480P`, `720P`
    - Durée : 1-15 secondes pour la génération/image vers vidéo, 1-10 secondes lors de l'utilisation des rôles `reference_image`, 2-10 secondes pour l'extension
    - Génération d'image de référence : définissez `imageRoles` sur `reference_image` pour chaque image fournie ; xAI accepte jusqu'à 7 images de ce type
    - Délai d'expiration de l'opération par défaut : 600 secondes, sauf si `video_generate.timeoutMs` ou `agents.defaults.videoGenerationModel.timeoutMs` est défini

    <Warning>
    Les tampons vidéo locaux ne sont pas acceptés. Utilisez des URL `http(s)` distantes pour les entrées de montage/extension vidéo. La conversion image vers vidéo accepte les tampons d'image locale car OpenClaw peut les encoder en URL de données pour xAI.
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
    Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outils partagés, la sélection du fournisseur et le comportement de basculement.
    </Note>

  </Accordion>

  <Accordion title="Génération d'images">
    Le plugin `xai` intégré enregistre la génération d'images via l'outil
    partagé `image_generate`.

    - Modèle d'image par défaut : `xai/grok-imagine-image`
    - Modèle supplémentaire : `xai/grok-imagine-image-quality`
    - Modes : texte vers image et édition d'image de référence
    - Entrées de référence : une `image` ou jusqu'à cinq `images`
    - Rapports d'aspect : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Résolutions : `1K`, `2K`
    - Nombre : jusqu'à 4 images
    - Délai d'expiration de l'opération par défaut : 600 secondes, sauf si `image_generate.timeoutMs`
      ou `agents.defaults.imageGenerationModel.timeoutMs` est défini

    OpenClaw demande à xAI des réponses d'images `b64_json` afin que les médias générés puissent
    être stockés et diffusés via le chemin normal des pièces jointes du channel. Les
    images de référence locales sont converties en URL de données ; les références distantes `http(s)` sont
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
    xAI documente également `quality`, `mask`, `user` et des rapports natifs supplémentaires
    tels que `1:2`, `2:1`, `9:20` et `20:9`. OpenClaw ne transmet aujourd'hui que les
    commandes d'image partagées inter-fournisseurs ; les boutons natifs non pris en charge
    ne sont intentionnellement pas exposés via `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="Synthèse vocale">
    Le plugin intégré `xai` enregistre la synthèse vocale via l'interface de fournisseur `tts`
    partagée.

    - Voix : `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Voix par défaut : `eve`
    - Formats : `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Langue : code BCP-47 ou `auto`
    - Vitesse : substitution de vitesse native du fournisseur
    - Le format de note vocale natif Opus n'est pas pris en charge

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
    OpenClaw utilise le point de terminaison par lots `/v1/tts` d'xAI. xAI propose également un TTS en flux continu
    via WebSocket, mais le contrat du fournisseur de parole OpenClaw attend actuellement
    un tampon audio complet avant la livraison de la réponse.
    </Note>

  </Accordion>

  <Accordion title="Reconnaissance vocale">
    Le plugin intégré `xai` enregistre la reconnaissance vocale par lots via l'interface de transcription de compréhension média de OpenClaw.

    - Modèle par défaut : `grok-stt`
    - Point de terminaison : xAI REST `/v1/stt`
    - Chemin d'entrée : téléchargement de fichier audio multipart
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
      `tools.media.audio`, y compris les segments de canal vocal Discord et
      les pièces jointes audio de canal

    Pour forcer xAI pour la transcription audio entrante :

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

    La langue peut être fournie via la configuration média audio partagée ou par requête de transcription par appel. Les indices de prompt (prompt hints) sont acceptés par l'interface partagée OpenClaw, mais l'intégration xAI REST STT ne transmet que le fichier, le modèle et la langue car ceux-ci correspondent proprement au point de terminaison public actuel d'xAI.

  </Accordion>

  <Accordion title="Streaming speech-to-text">
    Le plugin `xai` intégré enregistre également un provider de transcription en temps réel
    pour l'audio des appels vocaux en direct.

    - Endpoint : xAI WebSocket `wss://api.x.ai/v1/stt`
    - Encodage par défaut : `mulaw`
    - Taux d'échantillonnage par défaut : `8000`
    - Détection de fin de parole par défaut : `800ms`
    - Transcriptions provisoires : activées par défaut

    Le flux multimédia Twilio de Voice Call envoie des trames audio G.711 µ-law, le
    provider xAI peut donc transmettre ces trames directement sans transcodage :

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

    La configuration propriétaire du provider se trouve sous
    `plugins.entries.voice-call.config.streaming.providers.xai`. Les clés prises en charge
    sont `apiKey`, `baseUrl`, `sampleRate`, `encoding` (`pcm`, `mulaw`, ou
    `alaw`), `interimResults`, `endpointingMs` et `language`.

    <Note>
    Ce provider de streaming est destiné au chemin de transcription en temps réel de Voice Call.
    Le vocal Discord enregistre actuellement de courts segments et utilise plutôt le chemin de
    transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    Le plugin xAI inclus expose `x_search`OpenClaw en tant qu'outil OpenClaw pour rechercher
    du contenu X (anciennement Twitter) via Grok.

    Chemin de configuration : `plugins.entries.xai.config.xSearch`

    | Clé                | Type    | Par défaut             | Description                              |
    | ------------------ | ------- | ---------------------- | ---------------------------------------- |
    | `enabled`          | boolean | -                      | Activer ou désactiver x_search          |
    | `model`            | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes x_search |
    | `baseUrl`          | string  | -                      | Remplacement de l'URL de base des réponses xAI |
    | `inlineCitations`  | boolean | -                      | Inclure des citations en ligne dans les résultats |
    | `maxTurns`         | number  | -                      | Nombre maximum de tours de conversation   |
    | `timeoutSeconds`   | number  | -                      | Délai d'expiration de la requête en secondes |
    | `cacheTtlMinutes`  | number  | -                      | Durée de vie du cache en minutes          |

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
    l'exécution de code distant dans l'environnement bac à sable (sandbox) d'xAI.

    Chemin de configuration : `plugins.entries.xai.config.codeExecution`

    | Clé               | Type    | Par défaut             | Description                                  |
    | ----------------- | ------- | ---------------------- | -------------------------------------------- |
    | `enabled`         | boolean | `true` (si clé disponible) | Activer ou désactiver l'exécution de code |
    | `model`           | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes d'exécution de code |
    | `maxTurns`        | number  | -                      | Nombre maximum de tours de conversation       |
    | `timeoutSeconds`  | number  | -                      | Délai d'expiration de la requête en secondes   |

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

<Accordion title="Limites connues" APIOAuthOAuthOAuth>
  - L'authentification xAI peut utiliser une clé API, une variable d'environnement, un repli de configuration de plugin, un navigateur OAuth, ou un code de périphérique OAuth avec un compte xAI éligible. Le navigateur OAuth utilise un rappel local sur `127.0.0.1:56121` ; pour les hôtes distants, utilisez `xai-device-code`OAuthAPIOpenClaw sauf si vous souhaitez transmettre ce port avant d'ouvrir
  l'URL de connexion. xAI décide quels comptes peuvent recevoir des jetons API OAuth, et la page de consentement peut afficher Grok Build même si OpenClaw ne nécessite pas l'application Grok Build. - `grok-4.20-multi-agent-experimental-beta-0304`APIOpenClawOpenClaw n'est pas pris en charge sur le chemin normal du fournisseur xAI car il nécessite une surface API en amont différente du transport xAI
  OpenClaw standard. - La voix en temps réel xAI n'est pas encore enregistrée en tant que fournisseur OpenClaw. Elle nécessite un contrat de session vocal bidirectionnel différent de la STT par lots ou de la transcription en continu. - L'image xAI `quality`, l'image `mask` et les rapports de format d'image supplémentaires natifs uniquement ne sont pas exposés tant que l'outil partagé
  `image_generate` ne possède pas de contrôles inter-fournisseurs correspondants.
</Accordion>

  <Accordion title="Notes avancées"OpenClaw>
    - OpenClaw applique automatiquement les correctifs de compatibilité tool-schema et tool-call spécifiques à xAI
      sur le chemin d'exécution partagé.
    - Les requêtes xAI natives utilisent par défaut `tool_stream: true`. Définissez
      `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour
      le désactiver.
    - Le wrapper xAI intégré supprime les indicateurs stricts de tool-schema non pris en charge et
      les clés de payload de raisonnement avant d'envoyer les requêtes xAI natives.
    - `web_search`, `x_search` et `code_execution`OpenClawOpenClaw sont exposés en tant qu'outils OpenClaw.
      OpenClaw active la fonctionnalité intégrée xAI spécifique dont il a besoin à l'intérieur de chaque requête d'outil
      au lieu d'attacher tous les outils natifs à chaque tour de discussion.
    - Grok `web_search` lit `plugins.entries.xai.config.webSearch.baseUrl`.
      `x_search` lit `plugins.entries.xai.config.xSearch.baseUrl`, puis
      revient à l'URL de base de la recherche web Grok.
    - `x_search` et `code_execution` sont détenus par le plugin xAI intégré plutôt
      que d'être codés en dur dans le moteur d'exécution du modèle principal.
    - `code_execution` est une exécution de sandbox xAI distante, et non locale
      [`exec`](/fr/tools/exec).
  </Accordion>
</AccordionGroup>

## Test en direct

Les chemins média xAI sont couverts par des tests unitaires et des suites en direct optionnelles. Exportez
`XAI_API_KEY` dans l'environnement du processus avant d'exécuter des sondes en direct.

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

Le fichier en direct spécifique au fournisseur synthétise un TTS normal, un TTS PCM
adapté à la téléphonie, transcrit l'audio via le STT par lots xAI, diffuse le même PCM via le STT
en temps réel xAI, génère une sortie texte-vers-image et modifie une image de référence. Le
fichier d'image partagée en direct vérifie le même fournisseur xAI via la sélection
d'exécution d'OpenClaw, le basculement, la normalisation et le chemin de pièce jointe média.

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Génération de vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="Tous les providers" href="/fr/providers/index" icon="grid-2">
    Vue d'ensemble générale des providers.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et solutions.
  </Card>
</CardGroup>
