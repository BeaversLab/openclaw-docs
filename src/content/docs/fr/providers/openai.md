---
summary: "Utilisez OpenAI via des clés d'API ou un abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

# OpenAI

OpenAI fournit des API de développeur pour les modèles GPT. OpenClaw prend en charge deux méthodes d'authentification :

- **Clé d'API** — accès direct à la plateforme OpenAI avec une facturation à l'utilisation (modèles `openai/*`)
- **Abonnement Codex** — connexion via ChatGPT/Codex avec un accès par abonnement (modèles `openai-codex/*`)

OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans les outils et flux de travail externes tels que OpenClaw.

## Couverture des fonctionnalités OpenClaw

| Capacité OpenAI                    | Surface OpenClaw                               | Statut                                                                       |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Chat / Réponses                    | Fournisseur de modèle `openai/<model>`         | Oui                                                                          |
| Modèles d'abonnement Codex         | Fournisseur de modèle `openai-codex/<model>`   | Oui                                                                          |
| Recherche Web côté serveur         | Outil de réponses OpenAI natif                 | Oui, lorsque la recherche Web est activée et aucun fournisseur n'est épinglé |
| Images                             | `image_generate`                               | Oui                                                                          |
| Vidéos                             | `video_generate`                               | Oui                                                                          |
| Synthèse vocale                    | `messages.tts.provider: "openai"` / `tts`      | Oui                                                                          |
| Reconnaissance vocale en lot       | `tools.media.audio` / compréhension des médias | Oui                                                                          |
| Reconnaissance vocale en streaming | Appel vocal `streaming.provider: "openai"`     | Oui                                                                          |
| Voix en temps réel                 | Appel vocal `realtime.provider: "openai"`      | Oui                                                                          |
| Embeddings                         | Fournisseur d'embedding de mémoire             | Oui                                                                          |

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Clé API (plateforme OpenAI)">
    **Idéal pour :** un accès direct à l'API et une facturation à l'utilisation.

    <Steps>
      <Step title="Obtenir votre clé API">
        Créez ou copiez une clé API depuis le [tableau de bord de la plateforme OpenAI](https://platform.openai.com/api-keys).
      </Step>
      <Step title="Exécuter l'intégration (onboarding)">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        Ou passez la clé directement :

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### Résumé de l'itinéraire

    | Réf. modèle | Itinéraire | Auth |
    |-----------|-------|------|
    | `openai/gpt-5.4` | API directe de la plateforme OpenAI | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-pro` | API directe de la plateforme OpenAI | `OPENAI_API_KEY` |

    <Note>
    La connexion ChatGPT/Codex est acheminée via `openai-codex/*`, et non `openai/*`.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
    }
    ```

    <Warning>
    OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark` sur le chemin de l'API directe. Les requêtes en direct à l'API OpenAI rejettent ce modèle. Spark est réservé à Codex.
    </Warning>

  </Tab>

  <Tab title="Abonnement Codex">
    **Idéal pour :** utiliser votre abonnement ChatGPT/Codex au lieu d'une clé API distincte. Le cloud Codex nécessite une connexion ChatGPT.

    <Steps>
      <Step title="Exécuter Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        Ou exécuter OAuth directement :

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Pour les configurations sans tête ou hostiles aux rappels (callbacks), ajoutez `--device-code` pour vous connecter avec un flux de code d'appareil ChatGPT au lieu du rappel du navigateur localhost :

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Définir le modèle par défaut">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.4
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### Résumé de la route

    | Réf. modèle | Route | Auth |
    |-----------|-------|------|
    | `openai-codex/gpt-5.4` | ChatGPT/Codex OAuth | Connexion Codex |
    | `openai-codex/gpt-5.3-codex-spark` | ChatGPT/Codex OAuth | Connexion Codex (dépendant des droits) |

    <Note>
    Cette route est intentionnellement séparée de `openai/gpt-5.4`. Utilisez `openai/*` avec une clé API pour un accès direct à la Plateforme, et `openai-codex/*` pour l'accès par abonnement Codex.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
    }
    ```

    <Note>
    L'intégration (Onboarding) n'importe plus le matériel OAuth depuis `~/.codex`. Connectez-vous via le OAuth du navigateur (par défaut) ou le flux de code d'appareil ci-dessus — OpenClaw gère les informations d'identification résultantes dans son propre magasin d'authentification d'agent.
    </Note>

    ### Plafond de la fenêtre de contexte

    OpenClaw traite les métadonnées du modèle et le plafond du contexte d'exécution comme des valeurs distinctes.

    Pour `openai-codex/gpt-5.4` :

    - `contextWindow` natif : `1050000`
    - Plafond d'exécution `contextTokens` par défaut : `272000`

    Le plafond par défaut plus petit offre de meilleures caractéristiques de latence et de qualité en pratique. Remplacez-le avec `contextTokens` :

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.4", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Utilisez `contextWindow` pour déclarer les métadonnées natives du modèle. Utilisez `contextTokens` pour limiter le budget de contexte d'exécution.
    </Note>

  </Tab>
</Tabs>

## Génération d'images

Le plugin `openai` inclus enregistre la génération d'images via l'outil `image_generate`.

| Fonctionnalité          | Valeur                                      |
| ----------------------- | ------------------------------------------- |
| Modèle par défaut       | `openai/gpt-image-2`                        |
| Max images par requête  | 4                                           |
| Mode édition            | Activé (jusqu'à 5 images de référence)      |
| Remplacements de taille | Pris en charge, y compris les tailles 2K/4K |
| Format / résolution     | Non transmis à l'API Images OpenAI          |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection de fournisseur et le comportement de basculement.</Note>

`gpt-image-2` est la valeur par défaut pour la génération de texte vers image et l'édition d'images OpenAI. `gpt-image-1` reste utilisable comme remplacement explicite de modèle, mais les nouveaux flux de travail d'images OpenAI devraient utiliser `openai/gpt-image-2`.

Générer :

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

Modifier :

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## Génération vidéo

Le plugin `openai` inclus enregistre la génération vidéo via l'outil `video_generate`.

| Fonctionnalité          | Valeur                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Modèle par défaut       | `openai/sora-2`                                                                                 |
| Modes                   | Texte vers vidéo, image vers vidéo, édition vidéo unique                                        |
| Entrées de référence    | 1 image ou 1 vidéo                                                                              |
| Remplacements de taille | Pris en charge                                                                                  |
| Autres remplacements    | `aspectRatio`, `resolution`, `audio`, `watermark` sont ignorés avec un avertissement de l'outil |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection de fournisseur et le comportement de basculement.</Note>

## Contribution de l'invite GPT-5

OpenClaw ajoute une contribution d'invite GPT-5 partagée pour les exécutions de la famille GPT-5 sur plusieurs fournisseurs. Elle s'applique par ID de modèle, donc `openai/gpt-5.4`, `openai-codex/gpt-5.4`, `openrouter/openai/gpt-5.4`, `opencode/gpt-5.4` et autres références GPT-5 compatibles reçoivent la même superposition. Les modèles GPT-4.x plus anciens ne le reçoivent pas.

Le fournisseur de harnais Codex natif inclus (`codex/*`) utilise le même comportement GPT-5 et la même superposition de battement de cœur via les instructions développeur du serveur d'application Codex, donc les sessions `codex/gpt-5.x` conservent le même suivi et les mêmes conseils proactifs de battement de cœur même si Codex possède le reste de l'invite du harnais.

La contribution GPT-5 ajoute un contrat de comportement balisé pour la persistance de la persona, la sécurité de l'exécution, la discipline des outils, la forme de la sortie, les vérifications d'achèvement et la vérification. Le comportement de réponse spécifique au canal et le comportement des messages silencieux restent dans le système de prompt partagé OpenClaw et la politique de livraison sortante. Les instructions GPT-5 sont toujours activées pour les modèles correspondants. La couche de style d'interaction conviviale est distincte et configurable.

| Valeur                    | Effet                                               |
| ------------------------- | --------------------------------------------------- |
| `"friendly"` (par défaut) | Activer la couche de style d'interaction conviviale |
| `"on"`                    | Alias pour `"friendly"`                             |
| `"off"`                   | Désactiver uniquement la couche de style conviviale |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>Les valeurs ne sont pas sensibles à la casse lors de l'exécution, donc `"Off"` et `"off"` désactivent tous deux la couche de style conviviale.</Tip>

<Note>L'ancien `plugins.entries.openai.config.personality` est toujours lu comme solution de repli de compatibilité lorsque le paramètre partagé `agents.defaults.promptOverlays.gpt5.personality` n'est pas défini.</Note>

## Voix et synthèse vocale

<AccordionGroup>
  <Accordion title="Synthèse vocale (TTS)">
    Le plugin intégré `openai` enregistre la synthèse vocale pour la surface `messages.tts`.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voix | `messages.tts.providers.openai.voice` | `coral` |
    | Vitesse | `messages.tts.providers.openai.speed` | (non défini) |
    | Instructions | `messages.tts.providers.openai.instructions` | (non défini, `gpt-4o-mini-tts` uniquement) |
    | Format | `messages.tts.providers.openai.responseFormat` | `opus` pour les notes vocales, `mp3` pour les fichiers |
    | Clé API | `messages.tts.providers.openai.apiKey` | Revient à `OPENAI_API_KEY` |
    | URL de base | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |

    Modèles disponibles : `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voix disponibles : `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    Définissez `OPENAI_TTS_BASE_URL` pour remplacer l'URL de base TTS sans affecter le point de terminaison de l'API de chat.
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    Le plugin intégré `openai` enregistre la conversion parlot de parole en texte via
    la surface de transcription de compréhension média d'OpenClaw.

    - Modèle par défaut : `gpt-4o-transcribe`
    - Point de terminaison : OpenAI REST `/v1/audio/transcriptions`
    - Chemin d'entrée : téléchargement de fichier audio multipart
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
      `tools.media.audio`, y compris les segments de canal vocal Discord et les pièces jointes
      audio de canal

    Pour forcer OpenAI pour la transcription audio entrante :

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    Les indications de langue et de prompt sont transmises à OpenAI lorsqu'elles sont fournies par la
    configuration média audio partagée ou la demande de transcription par appel.

  </Accordion>

  <Accordion title="Realtime transcription">
    Le plugin intégré `openai` enregistre la transcription en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Langue | `...openai.language` | (non défini) |
    | Invite | `...openai.prompt` | (non défini) |
    | Durée de silence | `...openai.silenceDurationMs` | `800` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Clé API | `...openai.apiKey` | Revient à `OPENAI_API_KEY` |

    <Note>
    Utilise une connexion WebSocket vers `wss://api.openai.com/v1/realtime` avec de l'audio G.711 mu-law (`g711_ulaw` / `audio/pcmu`). Ce fournisseur de streaming est pour le chemin de transcription en temps réel de Voice Call ; la voix Discord enregistre actuellement des segments courts et utilise à la place le chemin de transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="Voix en temps réel">
    Le plugin intégré `openai` enregistre la voix en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime` |
    | Voix | `...openai.voice` | `alloy` |
    | Température | `...openai.temperature` | `0.8` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Durée de silence | `...openai.silenceDurationMs` | `500` |
    | Clé API | `...openai.apiKey` | Revient à `OPENAI_API_KEY` |

    <Note>
    Prend en charge Azure OpenAI via les clés de configuration `azureEndpoint` et `azureDeployment`. Prend en charge l'appel de tool bidirectionnel. Utilise le format audio G.711 u-law.
    </Note>

  </Accordion>
</AccordionGroup>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw utilise WebSocket en priorité avec repli SSE (`"auto"`) pour `openai/*` et `openai-codex/*`.

    En mode `"auto"`, OpenClaw :
    - Réessaie un échec précoce de WebSocket avant de revenir au SSE
    - Après un échec, marque WebSocket comme dégradé pendant ~60 secondes et utilise le SSE pendant le refroidissement
    - Attache des en-têtes d'identité de session et de tour stables pour les nouvelles tentatives et reconnexions
    - Normalise les compteurs d'utilisation (`input_tokens` / `prompt_tokens`) selon les variantes de transport

    | Valeur | Comportement |
    |-------|----------|
    | `"auto"` (par défaut) | WebSocket en priorité, repli SSE |
    | `"sse"` | Forcer uniquement SSE |
    | `"websocket"` | Forcer uniquement WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai-codex/gpt-5.4": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    Documentation OpenAI connexe :
    - [API en temps réel avec WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Réponses de streaming de l'API (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket warm-up">
    OpenClaw active le préchauffage WebSocket par défaut pour `openai/*` afin de réduire la latence du premier tour.

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<a id="openai-fast-mode"></a>

  <Accordion title="Fast mode">
    OpenClaw expose un bouton de mode rapide partagé pour `openai/*` et `openai-codex/*` :

    - **Chat/UI :** `/fast status|on|off`
    - **Config :** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Lorsqu'il est activé, OpenClaw mappe le mode rapide au traitement prioritaire OpenAI (`service_tier = "priority"`). Les valeurs `service_tier` existantes sont conservées, et le mode rapide ne réécrit pas `reasoning` ou `text.verbosity`.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { fastMode: true } },
            "openai-codex/gpt-5.4": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    Les overrides de session l'emportent sur la configuration. Effacer l'override de session dans l'interface Sessions ramène la session à la valeur par défaut configurée.
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)">
    L'API d'OpenAI expose le traitement prioritaire via `service_tier`. Définissez-le par modèle dans OpenClaw :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { serviceTier: "priority" } },
            "openai-codex/gpt-5.4": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    Valeurs prises en charge : `auto`, `default`, `flex`, `priority`.

    <Warning>
    `serviceTier` est uniquement transmis aux points de terminaison natifs OpenAI (`api.openai.com`) et aux points de terminaison natifs Codex (`chatgpt.com/backend-api`). Si vous acheminez l'un ou l'autre fournisseur via un proxy, OpenClaw laisse `service_tier` intact.
    </Warning>

  </Accordion>

  <Accordion title="Compactage côté serveur (API Responses)">
    Pour les modèles Responses API directs (`openai/*` sur `api.openai.com`), OpenAI active automatiquement le compactage côté serveur :

    - Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
    - Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` par défaut : 70 % de `contextWindow` (ou `80000` si indisponible)

    <Tabs>
      <Tab title="Activer explicitement">
        Utile pour les points de terminaison compatibles comme Azure OpenClaw Responses :

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.4": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Seuil personnalisé">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Désactiver">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` contrôle uniquement l'injection de `context_management`. Les modèles Responses OpenAI directs forcent toujours `store: true` sauf si la compatibilité définit `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Mode GPT agencique strict">
    Pour les exécutions de la famille GPT-5 sur `openai/*` et `openai-codex/*`, OpenClaw peut utiliser un contrat d'exécution intégré plus strict :

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    Avec `strict-agentic`, OpenClaw :
    - Ne considère plus un tour de planification uniquement comme une progression réussie lorsqu'une action d'outil est disponible
    - Réessaie le tour avec une directive d'action immédiate
    - Active automatiquement `update_plan` pour un travail important
    - Affiche un état bloqué explicite si le modèle continue de planifier sans agir

    <Note>
    Limité aux exécutions de la famille GPT-5 de OpenAI et Codex uniquement. Les autres fournisseurs et les familles de modèles plus anciennes conservent le comportement par défaut.
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw treats direct OpenAI, Codex, and Azure OpenAI endpoints differently from generic OpenAI-compatible `/v1` proxies:

    **Native routes** (`openai/*`, `openai-codex/*`, Azure OpenAI):
    - Keep `reasoning: { effort: "none" }` only for models that support the OpenAI `none` effort
    - Omit disabled reasoning for models or proxies that reject `reasoning.effort: "none"`
    - Default tool schemas to strict mode
    - Attach hidden attribution headers on verified native hosts only
    - Keep OpenAI-only request shaping (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **Proxy/compatible routes:**
    - Use looser compat behavior
    - Do not force strict tool schemas or native-only headers

    Azure OpenAI uses native transport and compat behavior but does not receive the hidden attribution headers.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Choosing providers, model refs, and failover behavior.
  </Card>
  <Card title="Image generation" href="/fr/tools/image-generation" icon="image">
    Shared image tool parameters and provider selection.
  </Card>
  <Card title="Video generation" href="/fr/tools/video-generation" icon="video">
    Shared video tool parameters and provider selection.
  </Card>
  <Card title="OAuth and auth" href="/fr/gateway/authentication" icon="key">
    Auth details and credential reuse rules.
  </Card>
</CardGroup>
