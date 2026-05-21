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
  OpenClaw utilise l'API xAI Responses en tant que transport xAI intégré. Les mêmes identifiants de `openclaw models auth login --provider xai --method oauth`, `openclaw models auth login --provider xai --device-code` ou `openclaw models auth login --provider xai --method api-key` peuvent également alimenter les `x_search` de première classe, le `code_execution` à distance, et la génération
  d'images/vidéos xAI. La parole et la transcription nécessitent actuellement `XAI_API_KEY` ou une configuration de fournisseur. `XAI_API_KEY` ou la configuration de recherche web du plugin peuvent également alimenter la `web_search` basée sur Grok. Si vous stockez une clé xAI sous `plugins.entries.xai.config.webSearch.apiKey`, le fournisseur de modèle xAI intégré réutilise également cette clé en
  secours. Définissez `plugins.entries.xai.config.webSearch.baseUrl` pour acheminer la `web_search` Grok et, par défaut, les `x_search` via un proxy operator xAI Responses. Le réglage du `code_execution` se trouve sous `plugins.entries.xai.config.codeExecution`.
</Note>

## Dépannage OAuth

- Si le OAuth du navigateur ne peut pas atteindre `127.0.0.1:56121`, utilisez
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

<Tip>Utilisez `xai-device-code` lors de la connexion depuis SSH, Docker ou un VPS. OpenClaw affiche une URL xAI et un code court ; finalisez la connexion dans n'importe quel navigateur local pendant que le processus distant interroge xAI pour l'échange de jetons terminé.</Tip>

## Catalogue intégré

OpenClaw inclut les modèles de chat xAI actuels prêts à l'emploi, classés du plus
récent au plus ancien dans les sélecteurs de modèles :

| Famille        | IDs de modèle                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

Le plugin résout toujours les anciens identifiants (slugs) Grok 3, Grok 4, Grok 4 Fast, Grok 4.1
Fast et Grok Code pour les configurations existantes, mais OpenClaw ne les affiche plus
dans le catalogue sélectionnable car ces identifiants amont sont retirés.

<Tip>Utilisez `grok-4.3` pour les nouvelles charges de travail de chat et de codage, sauf si vous avez explicitement besoin d'un alias Grok 4.20 bêta.</Tip>

## Couverture des fonctionnalités OpenClaw

Le plugin intégré mappe la surface de l'API publique actuelle de xAI sur les contrats partagés de
provider et d'outil de OpenClaw. Les capacités qui ne correspondent pas au contrat partagé
(par exemple la synthèse vocale en flux et la voix en temps réel) ne sont pas exposées - voir le tableau
ci-dessous.

| Capacité xAI                       | Surface OpenClaw                                      | Statut                                                                     |
| ---------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Chat / Réponses                    | provider de modèle `xai/<model>`                      | Oui                                                                        |
| Recherche web côté serveur         | provider `web_search` `grok`                          | Oui                                                                        |
| Recherche X côté serveur           | outil `x_search`                                      | Oui                                                                        |
| Exécution de code côté serveur     | outil `code_execution`                                | Oui                                                                        |
| Images                             | `image_generate`                                      | Oui                                                                        |
| Vidéos                             | `video_generate`                                      | Oui                                                                        |
| Synthèse vocale par lots           | `messages.tts.provider: "xai"` / `tts`                | Oui                                                                        |
| Synthèse vocale en streaming       | -                                                     | Non exposé ; le contrat TTS de OpenClaw renvoie des tampons audio complets |
| Reconnaissance vocale par lots     | `tools.media.audio` / compréhension des médias        | Oui                                                                        |
| Reconnaissance vocale en streaming | Appel vocal `streaming.provider: "xai"`               | Oui                                                                        |
| Voix en temps réel                 | -                                                     | Pas encore exposé ; contrat session/WebSocket différent                    |
| Fichiers / lots                    | Compatibilité générique de l'API de modèle uniquement | Pas un tool OpenClaw de première classe                                    |

<Note>
  OpenClaw utilise les API REST image/vidéo/TTS/STT d'xAI pour la génération de médias, la parole et la transcription par lots, le WebSocket STT en streaming d'xAI pour la transcription d'appels vocaux en direct, et l'API Responses pour les model, la recherche et les tools d'exécution de code. Les fonctionnalités nécessitant des contrats OpenClaw différents, tels que les sessions voix en temps
  réel, sont documentées ici en tant que capacités en amont plutôt que comme un comportement de plugin masqué.
</Note>

### Mappings en mode rapide

`/fast on` ou `agents.defaults.models["xai/<model>"].params.fastMode: true`
réécrit les requêtes natives xAI comme suit :

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
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## Fonctionnalités

<AccordionGroup>
  <Accordion title="Recherche Web">
    Le provider de recherche Web intégré `grok` peut utiliser `XAI_API_KEY` ou une clé
    de recherche Web de plugin :

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Génération de vidéo">
    Le plugin intégré `xai` enregistre la génération de vidéo via l'outil
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
    Les tampons vidéo locaux ne sont pas acceptés. Utilisez des URL distantes `http(s)` pour
    les entrées de montage/extension de vidéo. Le mode image-vers-vidéo accepte les tampons d'image locale car
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
    Voir [Génération de vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés,
    la sélection du fournisseur et le comportement de basculement.
    </Note>

  </Accordion>

  <Accordion title="Génération d'images">
    Le plugin `xai` intégré enregistre la génération d'images via l'outil
    partagé `image_generate`.

    - Modèle d'image par défaut : `xai/grok-imagine-image`
    - Modèle supplémentaire : `xai/grok-imagine-image-quality`
    - Modes : texte vers image et modification d'image de référence
    - Entrées de référence : une `image` ou jusqu'à cinq `images`
    - Rapports d'aspect : `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Résolutions : `1K`, `2K`OpenClaw
    - Nombre : jusqu'à 4 images

    OpenClaw demande à xAI des réponses d'image `b64_json` afin que les médias générés puissent
    être stockés et livrés via le chemin normal des pièces jointes du canal. Les
    images de référence locales sont converties en URL de données ; les références `http(s)`
    distantes sont transmises telles quelles.

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
    xAI documente également `quality`, `mask`, `user`, et des rapports natifs
    supplémentaires tels que `1:2`, `2:1`, `9:20` et `20:9`OpenClaw. OpenClaw ne transmet aujourd'hui que les
    commandes d'image partagées entre les fournisseurs ; les réglages natifs non pris en charge
    ne sont intentionnellement pas exposés via `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="Synthèse vocale">
    Le plugin intégré `xai` enregistre la synthèse vocale via l'interface `tts`
    partagée.

    - Voix : `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Voix par défaut : `eve`
    - Formats : `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Langue : code BCP-47 ou `auto`
    - Vitesse : remplacement de vitesse natif du provider
    - Le format de note vocale Opus natif n'est pas pris en charge

    Pour utiliser xAI comme provider TTS par défaut :

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
    OpenClaw utilise le point de terminaison de lot `/v1/tts` de xAI. xAI propose également une diffusion en continu TTS
    via WebSocket, mais le contrat du provider de synthèse vocale OpenClaw s'attend actuellement à
    un tampon audio complet avant la livraison de la réponse.
    </Note>

  </Accordion>

  <Accordion title="Reconnaissance vocale">
    Le plugin intégré `xai` enregistre la reconnaissance vocale par lots via l'interface de transcription
    de compréhension multimédia de OpenClaw.

    - Modèle par défaut : `grok-stt`
    - Point de terminaison : xAI REST `/v1/stt`
    - Chemin d'entrée : téléchargement de fichier audio multiparts
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
      `tools.media.audio`, y compris les segments de channel vocal Discord et
      les pièces jointes audio de channel

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

    La langue peut être fournie via la configuration multimédia audio partagée ou par requête de
    transcription par appel. Les indices de prompt sont acceptés par l'interface partagée OpenClaw,
    mais l'intégration STT REST de xAI ne transfère que le fichier, le modèle et
    la langue car ils correspondent proprement au point de terminaison public actuel de xAI.

  </Accordion>

  <Accordion title="Streaming speech-to-text">
    Le plugin `xai` intégré enregistre également un provider de transcription en temps réel
    pour l'audio des appels vocaux en direct.

    - Point de terminaison : xAI WebSocket `wss://api.x.ai/v1/stt`
    - Encodage par défaut : `mulaw`
    - Taux d'échantillonnage par défaut : `8000`
    - Détection de fin de parole par défaut : `800ms`
    - Transcriptions intermédiaires : activées par défaut

    Le flux média Twilio de Voice Call envoie des trames audio G.711 µ-law, le
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

    La configuration détenue par le provider se trouve sous
    `plugins.entries.voice-call.config.streaming.providers.xai`. Les clés prises en charge
    sont `apiKey`, `baseUrl`, `sampleRate`, `encoding` (`pcm`, `mulaw`, ou
    `alaw`), `interimResults`, `endpointingMs` et `language`.

    <Note>
    Ce provider de diffusion en continu est destiné au chemin de transcription en temps réel de Voice Call.
    Discord voice enregistre actuellement de courts segments et utilise plutôt le chemin de
    transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    Le plugin xAI inclus expose `x_search`OpenClaw en tant qu'outil OpenClaw pour rechercher
    du contenu X (anciennement Twitter) via Grok.

    Chemin de config : `plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
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

  <Accordion title="Code execution configuration">
    Le plugin xAI inclus expose `code_execution`OpenClaw en tant qu'outil OpenClaw pour
    l'exécution de code à distance dans l'environnement de bac à sable (sandbox) d'xAI.

    Chemin de config : `plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (if key available) | Activer ou désactiver l'exécution du code  |
    | `model`           | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes d'exécution de code   |
    | `maxTurns`        | number  | -                  | Nombre maximum de tours de conversation               |
    | `timeoutSeconds`  | number  | -                  | Délai d'expiration de la requête en secondes               |

    <Note>
    Il s'agit d'une exécution distante dans le bac à sable (sandbox) xAI, et non d'une exécution locale [`exec`](/fr/tools/exec).
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

<Accordion title="Limites connues">
  - L'authentification xAI peut utiliser une clé d'API, une variable d'environnement, une solution de repli de configuration de plugin, OAuth navigateur, ou OAuth par code de périphérique avec un compte xAI éligible. Le OAuth navigateur utilise un rappel local sur `127.0.0.1:56121` ; pour les hôtes distants, utilisez `xai-device-code` sauf si vous souhaitez transférer ce port avant d'ouvrir l'URL
  de connexion. xAI décide quels comptes peuvent recevoir des jetons d'OAuth API, et la page de consentement peut afficher Grok Build même si OpenClaw ne nécessite pas l'application Grok Build. - `grok-4.20-multi-agent-experimental-beta-0304` n'est pas pris en charge sur le chemin normal du fournisseur xAI car il nécessite une surface d'API en amont différente du transport xAI standard de
  OpenClaw. - xAI Realtime voice n'est pas encore enregistré en tant que fournisseur OpenClaw. Il nécessite un contrat de session vocal bidirectionnel différent de la STT par lots ou de la transcription en continu. - xAI image `quality`, image `mask` et les ratios d'aspect supplémentaires natifs uniquement ne sont pas exposés tant que l'outil `image_generate` partagé ne dispose pas des contrôles
  correspondants inter-fournisseurs.
</Accordion>

  <Accordion title="Notes avancées">
    - OpenClaw applique automatiquement des correctifs de compatibilité spécifiques à xAI pour le schéma d'outils et les appels d'outils sur le chemin d'exécution partagé.
    - Les requêtes xAI natives utilisent par défaut `tool_stream: true`. Définissez `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour le désactiver.
    - Le wrapper xAI inclus supprime les indicateurs de schéma d'outils stricts non pris en charge et les clés de payload de raisonnement avant d'envoyer des requêtes xAI natives.
    - `web_search`, `x_search` et `code_execution` sont exposés en tant qu'outils OpenClaw. OpenClaw active la fonctionnalité native xAI spécifique dont il a besoin dans chaque demande d'outil au lieu d'attacher tous les outils natifs à chaque tour de conversation.
    - Le `web_search` de Grok lit `plugins.entries.xai.config.webSearch.baseUrl`.
      `x_search` lit `plugins.entries.xai.config.xSearch.baseUrl`, puis
      revient à l'URL de base de la recherche web Grok.
    - `x_search` et `code_execution` sont détenus par le plugin xAI inclus plutôt que codés en dur dans l'exécution du modèle principal.
    - `code_execution` est une exécution de bac à sable xAI distante, et non une exécution [`exec`](/fr/tools/exec) locale.
  </Accordion>
</AccordionGroup>

## Tests en direct

Les chemins d'accès aux médias xAI sont couverts par des tests unitaires et des suites en direct en option. Exportez `XAI_API_KEY` dans l'environnement de processus avant d'exécuter des sondes en direct.

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

Le fichier dynamique spécifique au fournisseur synthétise une TTS normale, une TTS PCM adaptée à la téléphonie,
transcrit l'audio via le traitement STT par lots xAI, diffuse le même PCM via le STT
temps réel xAI, génère une sortie texte-vers-image et modifie une image de référence. Le
fichier dynamique d'image partagé vérifie le même fournisseur xAI via la sélection
à l'exécution, le basculement, la normalisation et le chemin de pièce jointe média d'OpenClaw.

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="Tous les fournisseurs" href="/fr/providers/index" icon="grid-2">
    La vue d'ensemble élargie des fournisseurs.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et solutions.
  </Card>
</CardGroup>
