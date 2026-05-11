---
summary: "Utilisez OpenAI via des clés API ou un abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI fournit des API développeur pour les modèles GPT, et Codex est également disponible en tant qu'agent de codage avec plan ChatGPT via les clients Codex d'OpenAI. OpenClaw maintient ces surfaces séparées afin que la configuration reste prévisible.

OpenClaw prend en charge trois routes de la famille OpenAI. Le préfixe du modèle sélectionne la route fournisseur/authentification ; un paramètre d'exécution distinct sélectionne qui exécute la boucle de l'agent intégré :

- **Clé API** — accès direct à la plateforme OpenAI avec facturation à l'utilisation (modèles `openai/*`)
- **Abonnement Codex via PI** — connexion ChatGPT/Codex avec accès par abonnement (modèles `openai-codex/*`)
- **Harnais d'application serveur Codex** — exécution native de l'application serveur Codex (modèles `openai/*` plus `agents.defaults.agentRuntime.id: "codex"`)

OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans les outils et workflows externes tels que OpenClaw.

Le fournisseur, le modèle, l'exécution et le canal sont des couches distinctes. Si ces étiquettes sont mélangées, lisez [Agent runtimes](/fr/concepts/agent-runtimes) avant de modifier la configuration.

## Choix rapide

| Objectif                                                          | Utiliser                                         | Remarques                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Facturation directe par clé API                                   | `openai/gpt-5.5`                                 | Définissez `OPENAI_API_KEY` ou exécutez l'intégration de clé OpenAI API.                                |
| GPT-5.5 avec authentification par abonnement ChatGPT/Codex        | `openai-codex/gpt-5.5`                           | Route PI par défaut pour le OAuth Codex. Meilleur premier choix pour les configurations par abonnement. |
| GPT-5.5 avec le comportement natif de l'application serveur Codex | `openai/gpt-5.5` plus `agentRuntime.id: "codex"` | Force le harnais de l'application serveur Codex pour cette référence de modèle.                         |
| Génération ou modification d'images                               | `openai/gpt-image-2`                             | Fonctionne avec `OPENAI_API_KEY` ou l'OpenAI Codex OAuth.                                               |
| Images à fond transparent                                         | `openai/gpt-image-1.5`                           | Utilisez `outputFormat=png` ou `webp` et `openai.background=transparent`.                               |

## Carte de nomenclature

Les noms sont similaires mais pas interchangeables :

| Nom que vous voyez                 | Couche                   | Signification                                                                                            |
| ---------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `openai`                           | Préfixe du fournisseur   | Route directe de l'OpenAI de la plateforme API.                                                          |
| `openai-codex`                     | Préfixe du fournisseur   | Route OAuth/abonnement Codex OpenAI via le lanceur PI OAuth standard.                                    |
| plugin `codex`                     | Plugin                   | Plugin OpenClaw intégré qui fournit un runtime app-server Codex natif et des contrôles de chat `/codex`. |
| `agentRuntime.id: codex`           | Runtime de l'agent       | Force le harnais app-server Codex natif pour les tours intégrés.                                         |
| `/codex ...`                       | Jeu de commandes de chat | Lier/contrôler les fils du serveur d'application Codex depuis une conversation.                          |
| `runtime: "acp", agentId: "codex"` | Route de session ACP     | Chemin de repli explicite qui exécute Codex via ACP/acpx.                                                |

Cela signifie qu'une configuration peut intentionnellement contenir à la fois `openai-codex/*` et le
plugin `codex`. C'est valide lorsque vous souhaitez l'OAuth Codex via PI et que vous souhaitez également
disposer des contrôles de chat natifs `/codex`. `openclaw doctor` avertit à propos de cette
combinaison afin que vous puissiez confirmer qu'elle est intentionnelle ; il ne la réécrit pas.

<Note>GPT-5.5 est disponible via l'accès direct par clé OpenAI de la plateforme API et les routes d'abonnement/OAuth. Utilisez `openai/gpt-5.5` pour le trafic `OPENAI_API_KEY` direct, `openai-codex/gpt-5.5` pour l'OAuth Codex via PI, ou `openai/gpt-5.5` avec `agentRuntime.id: "codex"` pour le harnais app-server Codex natif.</Note>

<Note>
  Activer le plugin OpenAI ou sélectionner un modèle `openai-codex/*` n'active pas le plugin app-server Codex intégré. OpenClaw n'active ce plugin que lorsque vous sélectionnez explicitement le harnais Codex natif avec `agentRuntime.id: "codex"` ou utilisez une référence de modèle `codex/*` héritée. Si le plugin intégré `codex` est activé mais que `openai-codex/*` est toujours résolu via PI,
  `openclaw doctor` avertit et laisse la route inchangée.
</Note>

## Couverture des fonctionnalités OpenClaw

| Capacité OpenAI                       | Surface OpenClaw                                             | Statut                                                                 |
| ------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Chat / Réponses                       | fournisseur de modèle `openai/<model>`                       | Oui                                                                    |
| Modèles d'abonnement Codex            | `openai-codex/<model>` avec OAuth `openai-codex`             | Oui                                                                    |
| Harnais app-server Codex              | `openai/<model>` avec `agentRuntime.id: codex`               | Oui                                                                    |
| Recherche Web côté serveur            | Outil Native OpenAI Responses                                | Oui, lorsque la recherche Web est activée et aucun fournisseur épinglé |
| Images                                | `image_generate`                                             | Oui                                                                    |
| Vidéos                                | `video_generate`                                             | Oui                                                                    |
| Synthèse vocale                       | `messages.tts.provider: "openai"` / `tts`                    | Oui                                                                    |
| Reconnaissance vocale par lots        | `tools.media.audio` / compréhension des médias               | Oui                                                                    |
| Reconnaissance vocale en flux continu | Appel Vocal `streaming.provider: "openai"`                   | Oui                                                                    |
| Voix en temps réel                    | Appel Vocal `realtime.provider: "openai"` / Contrôle UI Talk | Oui                                                                    |
| Embeddings                            | provider d'embedding de mémoire                              | Oui                                                                    |

## Embeddings de mémoire

OpenClaw peut utiliser OpenAI, ou un point de terminaison d'embedding compatible OpenAI, pour
l'indexation `memory_search` et les embeddings de requête :

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

Pour les points de terminaison compatibles OpenAI qui nécessitent des étiquettes d'embedding asymétriques, définissez
`queryInputType` et `documentInputType` sous `memorySearch`. OpenClaw transfère
ceux-ci en tant que champs de requête `input_type` spécifiques au fournisseur : les embeddings de requête utilisent
`queryInputType` ; les chunks de mémoire indexés et l'indexation par lots utilisent
`documentInputType`. Voir la [référence de configuration de la mémoire](/fr/reference/memory-config#provider-specific-config) pour l'exemple complet.

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Clé API (Plateforme OpenAI)">
    **Idéal pour :** accès direct à l'API et facturation à l'usage.

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

    ### Résumé de l'acheminement

    | Réf. Modèle          | Config. d'exécution         | Acheminement                     | Auth.               |
    | --------------------- | --------------------------- | -------------------------------- | ------------------- |
    | `openai/gpt-5.5`       | omis / `agentRuntime.id: "pi"`    | API directe de la plateforme OpenAI | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-mini`  | omis / `agentRuntime.id: "pi"`    | API directe de la plateforme OpenAI | `OPENAI_API_KEY` |
    | `openai/gpt-5.5`       | `agentRuntime.id: "codex"`           | Harnais de serveur d'app Codex    | Serveur d'app Codex |

    <Note>
    `openai/*` est l'acheminement direct par clé API OpenAI, sauf si vous forcez explicitement
    le harnais de serveur d'app Codex. Utilisez `openai-codex/*` pour l'OAuth Codex via
    le runner PI par défaut, ou utilisez `openai/gpt-5.5` avec
    `agentRuntime.id: "codex"` pour une exécution native sur le serveur d'app Codex.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    <Warning>
    OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark`. Les requêtes en direct à l'API OpenAI rejettent ce modèle, et le catalogue Codex actuel ne l'expose pas non plus.
    </Warning>

  </Tab>

  <Tab title="Abonnement Codex">
    **Idéal pour :** utiliser votre abonnement ChatGPT/Codex au lieu d'une clé API distincte. Le cloud Codex nécessite une connexion ChatGPT.

    <Steps>
      <Step title="Exécuter Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        Ou exécutez OAuth directement :

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Pour les configurations sans interface graphique ou hostiles aux rappels (callback), ajoutez `--device-code` pour vous connecter avec un flux de code d'appareil ChatGPT au lieu du rappel du navigateur localhost :

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Définir le modèle par défaut">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.5
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### Résumé de l'acheminement

    | Réf. modèle | Config. d'exécution | Route | Auth |
    |-----------|----------------|-------|------|
    | `openai-codex/gpt-5.5` | omis / `runtime: "pi"` | ChatGPT/Codex OAuth via PI | Connexion Codex |
    | `openai-codex/gpt-5.5` | `runtime: "auto"` | Toujours PI sauf si un plugin réclame explicitement `openai-codex` | Connexion Codex |
    | `openai/gpt-5.5` | `agentRuntime.id: "codex"` | Harnais app-server Codex | Auth app-server Codex |

    <Note>
    Continuez à utiliser l'identifiant de fournisseur `openai-codex` pour les commandes d'authentification/de profil. Le préfixe de modèle `openai-codex/*` est également la route PI explicite pour Codex OAuth.
    Il ne sélectionne ni n'active automatiquement le harnais app-server Codex inclus.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
    }
    ```

    <Note>
    L'intégration n'importe plus les éléments OAuth depuis `~/.codex`. Connectez-vous via le navigateur OAuth (par défaut) ou le flux de code d'appareil ci-dessus — OpenClaw gère les informations d'identification résultantes dans son propre magasin d'authentification d'agent.
    </Note>

    ### Indicateur de statut

    Le chat `/status` indique quel runtime de modèle est actif pour la session actuelle.
    Le harnais PI par défaut apparaît comme `Runtime: OpenClaw Pi Default`. Lorsque le
    harnais app-server Codex inclus est sélectionné, `/status` affiche
    `Runtime: OpenAI Codex`. Les sessions existantes conservent leur identifiant de harnais enregistré, utilisez donc
    `/new` ou `/reset` après avoir modifié `agentRuntime` si vous voulez que `/status`
    reflète un nouveau choix PI/Codex.

    ### Avertissement du docteur

    Si le plugin `codex` inclus est activé alors que la route
    `openai-codex/*` de cet onglet est sélectionnée, `openclaw doctor` avertit que le modèle
    se résout toujours via PI. Conservez la configuration inchangée lorsqu'il s'agit de
    la route d'authentification par abonnement prévue. Passez à `openai/<model>` plus
    `agentRuntime.id: "codex"` uniquement lorsque vous souhaitez une exécution native de l'app-server
    Codex.

    ### Plafond de la fenêtre de contexte

    OpenClaw traite les métadonnées du modèle et le plafond du contexte d'exécution comme des valeurs distinctes.

    Pour `openai-codex/gpt-5.5` via Codex OAuth :

    - `contextWindow` natif : `1000000`
    - Plafond de `contextTokens` d'exécution par défaut : `272000`

    Le plafond par défaut plus petit offre de meilleures caractéristiques de latence et de qualité en pratique. Remplacez-le avec `contextTokens` :

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Utilisez `contextWindow` pour déclarer les métadonnées natives du modèle. Utilisez `contextTokens` pour limiter le budget de contexte d'exécution.
    </Note>

    ### Récupération du catalogue

    OpenClaw utilise les métadonnées du catalogue amont Codex pour `gpt-5.5` lorsqu'elles sont
    présentes. Si la découverte en direct de Codex omet la ligne `openai-codex/gpt-5.5` alors
    que le compte est authentifié, OpenClaw synthétise cette ligne de modèle OAuth afin que
    cron, sous-agent et les exécutions de modèle par défaut configurées n'échouent pas avec
    `Unknown model`.

  </Tab>
</Tabs>

## Génération d'images

Le plugin `openai` intégré enregistre la génération d'images via l'outil `image_generate`.
Il prend en charge à la fois la génération d'images avec une clé OpenAI API et la génération d'images OAuth Codex via la même référence de modèle `openai/gpt-image-2`.

| Fonctionnalité                | Clé OpenAI API                              | Codex OAuth                                                     |
| ----------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Référence de modèle           | `openai/gpt-image-2`                        | `openai/gpt-image-2`                                            |
| Auth                          | `OPENAI_API_KEY`                            | Connexion OpenAI Codex OAuth                                    |
| Transport                     | Images OpenAI API                           | Backend Codex Responses                                         |
| Max images par requête        | 4                                           | 4                                                               |
| Mode édition                  | Activé (jusqu'à 5 images de référence)      | Activé (jusqu'à 5 images de référence)                          |
| Remplacements de taille       | Pris en charge, y compris les tailles 2K/4K | Pris en charge, y compris les tailles 2K/4K                     |
| Rapport d'aspect / résolution | Non transféré à l'OpenAI Images API         | Mappé à une taille prise en charge lorsque cela est sans risque |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

`gpt-image-2` est la valeur par défaut pour la génération de texte vers image OpenAI et l'édition d'images.
`gpt-image-1.5`, `gpt-image-1` et `gpt-image-1-mini` restent utilisables en tant que substitutions explicites de modèle.
Utilisez `openai/gpt-image-1.5` pour la sortie PNG/WebP avec fond transparent ; l'API `gpt-image-2` actuelle rejette
`background: "transparent"`.

Pour une demande avec fond transparent, les agents doivent appeler `image_generate` avec
`model: "openai/gpt-image-1.5"`, `outputFormat: "png"` ou `"webp"`, et
`background: "transparent"` ; l'ancienne option de fournisseur `openai.background` est
toujours acceptée. OpenClaw protège également les itinéraires publics OpenAI et
OpenAI Codex OAuth en réécrivant les demandes transparentes par défaut `openai/gpt-image-2` en
`gpt-image-1.5` ; les points de terminaison Azure personnalisés compatibles OpenAI conservent leurs noms de déploiement/modèle configurés.

Le même paramètre est exposé pour les exécutions CLI sans interface graphique :

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

Utilisez les mêmes indicateurs `--output-format` et `--background` avec
`openclaw infer image edit` lors du démarrage à partir d'un fichier d'entrée.
`--openai-background` reste disponible comme un alias spécifique à OpenAI.

Pour les installations Codex OAuth, conservez la même référence `openai/gpt-image-2`. Lorsqu'un profil OAuth `openai-codex` est configuré, OpenClaw résout ce jeton d'accès OAuth stocké et envoie des requêtes d'image via le backend Codex Responses. Il n'essaie pas d'abord `OPENAI_API_KEY` ni ne revient silencieusement à une clé API pour cette requête. Configurez `models.providers.openai` explicitement avec une clé API, une URL de base personnalisée ou un point de terminaison Azure lorsque vous souhaitez utiliser la route directe de l'API Images OpenAI à la place.
Si ce point de terminaison d'image personnalisé se trouve sur une adresse LAN/privée de confiance, définissez également `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` ; API maintient les points de terminaison d'image compatibles OpenClaw privés/internes bloqués, sauf si cette option d'adhésion est présente.

Générer :

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

Générer un PNG transparent :

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

Modifier :

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## Génération vidéo

Le plugin `openai` inclus enregistre la génération vidéo via l'outil `video_generate`.

| Capacité                | Valeur                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Modèle par défaut       | `openai/sora-2`                                                                                 |
| Modes                   | Texte vers vidéo, image vers vidéo, modification vidéo unique                                   |
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

<Note>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Contribution de prompt GPT-5

OpenClaw ajoute une contribution de prompt GPT-5 partagée pour les exécutions de la famille GPT-5 sur tous les fournisseurs. Elle s'applique par ID de modèle, donc `openai-codex/gpt-5.5`, `openai/gpt-5.5`, `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` et autres références GPT-5 compatibles reçoivent la même superposition. Les modèles plus anciens GPT-4.x ne le font pas.

Le harnais natif Codex inclus utilise le même comportement GPT-5 et la superposition de battement de cœur via les instructions développeur du serveur d'application Codex, donc les sessions `openai/gpt-5.x` forcées via `agentRuntime.id: "codex"` conservent le même suivi et la même guidance proactive de battement de cœur même si Codex possède le reste du prompt du harnais.

La contribution GPT-5 ajoute un contrat de comportement étiqueté pour la persistance de la persona, la sécurité d'exécution, la discipline des outils, la forme de la sortie, les vérifications de complétion et la vérification. Le comportement de réponse et de message silencieux spécifique au canal reste dans le système de prompt partagé OpenClaw et la politique de livraison sortante. La guidance GPT-5 est toujours activée pour les modèles correspondants. La couche de style d'interaction convivial est séparée et configurable.

| Valeur                    | Effet                                              |
| ------------------------- | -------------------------------------------------- |
| `"friendly"` (par défaut) | Activer la couche de style d'interaction convivial |
| `"on"`                    | Alias pour `"friendly"`                            |
| `"off"`                   | Désactiver uniquement la couche de style convivial |

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

<Tip>Les valeurs ne respectent pas la casse lors de l'exécution, donc `"Off"` et `"off"` désactivent tous les deux la couche de style convivial.</Tip>

<Note>L'ancien `plugins.entries.openai.config.personality` est toujours lu comme solution de repli de compatibilité lorsque le paramètre partagé `agents.defaults.promptOverlays.gpt5.personality` n'est pas défini.</Note>

## Voix et parole

<AccordionGroup>
  <Accordion title="Synthèse vocale (TTS)">
    Le plugin `openai` intégré enregistre la synthèse vocale pour la surface `messages.tts`.

    | Paramètre | Chemin de configuration | Par défaut |
    |-----------|------------------------|-----------|
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
    Le plugin `openai` inclus enregistre la conversion par lot de parole en texte via
    la surface de transcription de compréhension média d'OpenClaw.

    - Modèle par défaut : `gpt-4o-transcribe`
    - Point de terminaison : OpenAI REST `/v1/audio/transcriptions`
    - Chemin d'entrée : téléchargement de fichier audio multipart
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
      `tools.media.audio`, y compris les segments de canal vocal Discord et les pièces jointes audio
      de canal

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
    Le plugin `openai` inclus enregistre la transcription en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de config | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Langue | `...openai.language` | (non défini) |
    | Prompt | `...openai.prompt` | (non défini) |
    | Durée de silence | `...openai.silenceDurationMs` | `800` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Clé API | `...openai.apiKey` | Revient à `OPENAI_API_KEY` |

    <Note>
    Utilise une connexion WebSocket vers `wss://api.openai.com/v1/realtime` avec audio G.711 u-law (`g711_ulaw` / `audio/pcmu`). Ce fournisseur de streaming est pour le chemin de transcription en temps réel de Voice Call ; la voix Discord enregistre actuellement des segments courts et utilise à la place le chemin de transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="Voix en temps réel">
    Le plugin `openai` intégré enregistre la voix en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-1.5` |
    | Voix | `...openai.voice` | `alloy` |
    | Température | `...openai.temperature` | `0.8` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Durée de silence | `...openai.silenceDurationMs` | `500` |
    | Clé API | `...openai.apiKey` | Revient à `OPENAI_API_KEY` |

    <Note>
    Prend en charge Azure OpenAI via les clés de configuration `azureEndpoint` et `azureDeployment` pour les ponts en temps réel du backend. Prend en charge l'appel d'outil bidirectionnel. Utilise le format audio G.711 mu-law.
    </Note>

    <Note>
    Control UI Talk utilise les sessions en temps réel du navigateur OpenAI avec un secret client éphémère créé par Gateway
    et un échange SDP WebRTC direct de navigateur vers l'OpenAI en temps réel API. La vérification en direct par le responsable est disponible avec
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` ;
    la partie OpenAI crée un secret client dans Node, génère une offre SDP de navigateur
    avec de faux médias de microphone, la poste à OpenAI et applique la réponse SDP
    sans enregistrer les secrets.
    </Note>

  </Accordion>
</AccordionGroup>

## Points de terminaison Azure OpenAI

Le provider `openai` intégré peut cibler une ressource Azure OpenAI pour la
génération d'images en remplaçant l'URL de base. Sur le chemin de génération d'images, OpenClaw
détecte les noms d'hôte Azure sur `models.providers.openai.baseUrl` et passe automatiquement au
format de requête d'Azure.

<Note>La voix en temps réel utilise un chemin de configuration séparé (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) et n'est pas affectée par `models.providers.openai.baseUrl`. Voir l'accordéon **Voix en temps réel** sous [Voix et parole](#voice-and-speech) pour ses paramètres Azure.</Note>

Utilisez Azure OpenAI lorsque :

- Vous possédez déjà un abonnement Azure OpenAI, un quota ou un contrat entreprise
- Vous avez besoin de résidence régionale des données ou de contrôles de conformité fournis par Azure
- Vous souhaitez conserver le trafic au sein d'un client Azure existant

### Configuration

Pour la génération d'images Azure via le fournisseur `openai` intégré, pointez
`models.providers.openai.baseUrl` vers votre ressource Azure et définissez `apiKey` sur
la clé Azure OpenAI (et non une clé de plateforme OpenAI) :

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw reconnaît ces suffixes d'hôte Azure pour le routage de génération
d'images Azure :

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Pour les demandes de génération d'images sur un hôte Azure reconnu, OpenClaw :

- Envoie l'en-tête `api-key` au lieu de `Authorization: Bearer`
- Utilise des chemins délimités par le déploiement (`/openai/deployments/{deployment}/...`)
- Ajoute `?api-version=...` à chaque demande
- Utilise un délai d'expiration de demande par défaut de 600 s pour les appels de génération
  d'images Azure. Les valeurs `timeoutMs` par appel remplacent toujours cette valeur par défaut.

Les autres URL de base (OpenAI public, proxys compatibles OpenAI) conservent la forme standard
de demande d'image OpenAI.

<Note>Le routage Azure pour le chemin de génération d'images du fournisseur `openai` nécessite OpenClaw 2026.4.22 ou version ultérieure. Les versions antérieures traitent tout `openai.baseUrl` personnalisé comme le point de terminaison public OpenAI et échoueront face aux déploiements d'images Azure.</Note>

### Version de l'API

Définissez `AZURE_OPENAI_API_VERSION` pour figer une version de prévisualisation ou GA Azure spécifique
pour le chemin de génération d'images Azure :

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

La valeur par défaut est `2024-12-01-preview` lorsque la variable n'est pas définie.

### Les noms de modèle sont des noms de déploiement

Azure OpenAI lie les modèles aux déploiements. Pour les demandes de génération d'images Azure
routées via le fournisseur `openai` intégré, le champ `model` dans OpenClaw
doit être le **nom du déploiement Azure** que vous avez configuré dans le portail Azure, et non
l'identifiant du modèle public OpenAI.

Si vous créez un déploiement nommé `gpt-image-2-prod` qui sert `gpt-image-2` :

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La même règle de nom de déploiement s'applique aux appels de génération d'images routés via
le fournisseur `openai` intégré.

### Disponibilité régionale

La génération d'images Azure est actuellement disponible uniquement dans un sous-ensemble de régions
(par exemple `eastus2`, `swedencentral`, `polandcentral`, `westus3`,
`uaenorth`). Consultez la liste actuelle des régions de Microsoft avant de créer un
déploiement, et confirmez que le modèle spécifique est proposé dans votre région.

### Différences de paramètres

Azure OpenAI et le OpenAI public n'acceptent pas toujours les mêmes paramètres d'image.
Azure peut rejeter des options que le OpenAI public autorise (par exemple certaines
valeurs `background` sur `gpt-image-2`) ou ne les exposer que sur des versions de modèle
spécifiques. Ces différences proviennent d'Azure et du modèle sous-jacent, et non
de OpenClaw. Si une requête Azure échoue avec une erreur de validation, vérifiez
l'ensemble de paramètres pris en charge par votre déploiement spécifique et la version de l'API dans le
portail Azure.

<Note>
Azure OpenAI utilise un transport natif et un comportement de compatibilité mais ne reçoit pas
les en-têtes d'attribution cachés de OpenClaw — voir l'accordéon **Native vs OpenAI-compatible
routes** sous [Advanced configuration](#advanced-configuration).

Pour le trafic de chat ou de réponses sur Azure (au-delà de la génération d'images), utilisez le
flux d'intégration (onboarding) ou une configuration de fournisseur Azure dédiée — `openai.baseUrl` seul
ne prend pas en charge la forme de l'API/auth Azure. Un fournisseur
`azure-openai-responses/*` distinct existe ; voir
l'accordéon Server-side compaction ci-dessous.

</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw privilégie WebSocket avec repli sur SSE (`"auto"`) pour `openai/*` et `openai-codex/*`.

    En mode `"auto"`, OpenClaw :
    - Réessaie une défaillance précoce de WebSocket avant de basculer sur SSE
    - Après une défaillance, marque WebSocket comme dégradé pendant ~60 secondes et utilise SSE pendant le refroidissement
    - Attache des en-têtes d'identité de session et de tour stables pour les tentatives et reconnexions
    - Normalise les compteurs d'utilisation (`input_tokens` / `prompt_tokens`) selon les variantes de transport

    | Valeur | Comportement |
    |-------|----------|
    | `"auto"` (par défaut) | WebSocket d'abord, repli SSE |
    | `"sse"` | Forcer SSE uniquement |
    | `"websocket"` | Forcer WebSocket uniquement |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
            "openai-codex/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    Documentation OpenAI connexe :
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="WebSocket warm-up">
    OpenClaw active le préchauffage WebSocket par défaut pour `openai/*` et `openai-codex/*` afin de réduire la latence du premier tour.

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Fast mode">
    OpenClaw expose un commutateur de mode rapide partagé pour `openai/*` et `openai-codex/*` :

    - **Chat/UI :** `/fast status|on|off`
    - **Config :** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Lorsqu'il est activé, OpenClaw mappe le mode rapide au traitement prioritaire OpenAI (`service_tier = "priority"`). Les valeurs `service_tier` existantes sont conservées, et le mode rapide ne réécrit pas `reasoning` ou `text.verbosity`.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    Les remplacements de session prévalent sur la configuration. Effacer le remplacement de session dans l'interface Sessions renvoie la session à la valeur par défaut configurée.
    </Note>

  </Accordion>

  <Accordion title="Traitement prioritaire (service_tier)">
    L'OpenAI d'API expose un traitement prioritaire via `service_tier`. Définissez-le par modèle dans OpenClaw :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    Valeurs prises en charge : `auto`, `default`, `flex`, `priority`.

    <Warning>
    `serviceTier` est transmis uniquement aux points de terminaison natifs d'OpenAI (`api.openai.com`) et aux points de terminaison natifs de Codex (`chatgpt.com/backend-api`). Si vous acheminez l'un ou l'autre fournisseur via un proxy, OpenClaw laisse `service_tier` intact.
    </Warning>

  </Accordion>

  <Accordion title="Compactage côté serveur (API Responses)">
    Pour les modèles Responses directs d'OpenAI (`openai/*` sur `api.openai.com`), le wrapper de flux Pi-harness du plugin OpenAI active automatiquement le compactage côté serveur :

    - Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
    - Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` par défaut : 70 % de `contextWindow` (ou `80000` si indisponible)

    Cela s'applique au chemin du harnais Pi intégré et aux hooks de fournisseur OpenAI utilisés par les exécutions intégrées. Le harnais du serveur d'application Codex natif gère son propre contexte via Codex et est configuré séparément avec `agents.defaults.agentRuntime.id`.

    <Tabs>
      <Tab title="Activer explicitement">
        Utile pour les points de terminaison compatibles comme Azure OpenAI Responses :

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
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
                "openai/gpt-5.5": {
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
                "openai/gpt-5.5": {
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
    `responsesServerCompaction` contrôle uniquement l'injection de `context_management`. Les modèles Responses directs d'OpenAI forcent toujours `store: true` sauf si la compatibilité définit `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    Pour les exécutions de la famille GPT-5 sur `openai/*`, OpenClaw peut utiliser un contrat d'exécution intégré plus strict :

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
    - Active automatiquement `update_plan` pour un travail substantiel
    - Affiche un état bloqué explicite si le modèle continue de planifier sans agir

    <Note>
    Limité aux exécutions de la famille GPT-5 avec OpenAI et Codex. Les autres fournisseurs et les familles de modèles plus anciennes conservent le comportement par défaut.
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenAI traite différemment les points de terminaison OpenClaw directs, Codex et Azure OpenAI par rapport aux proxys `/v1` génériques compatibles OpenAI :

    **Routes natives** (`openai/*`, Azure OpenAI) :
    - Conserve `reasoning: { effort: "none" }` uniquement pour les modèles qui prennent en charge l'effort `none` OpenAI
    - Omet le raisonnement désactivé pour les modèles ou proxys qui rejettent `reasoning.effort: "none"`
    - Définit les schémas d'outils en mode strict par défaut
    - Joint des en-têtes d'attribution masqués uniquement sur les hôtes natifs vérifiés
    - Conserve le façonnage des requêtes OpenAI uniquement (`service_tier`, `store`, reasoning-compat, indications de cache de prompt)

    **Routes de proxy/compatibilité :**
    - Utilise un comportement de compatibilité plus souple
    - Supprime `store` des Completions des payloads `openai-completions` non natifs
    - Accepte le JSON de passage avancé `params.extra_body`/`params.extraBody` pour les proxys de Completions compatibles OpenAI
    - Accepte `params.chat_template_kwargs` pour les proxys de Completions compatibles OpenAI tels que vLLM
    - N'impose pas de schémas d'outils stricts ni d'en-tères natifs uniquement

    Azure OpenAI utilise un transport natif et un comportement de compatibilité mais ne reçoit pas les en-têtes d'attribution masqués.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres partagés de l'outil d'image et sélection du fournisseur.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres partagés de l'outil vidéo et sélection du fournisseur.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
