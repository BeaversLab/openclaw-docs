---
summary: "Utiliser OpenAI via des clés API ou un abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI fournit des API de développeur pour les modèles GPT, et Codex est également disponible en tant qu'agent de codage ChatGPT-plan via les clients Codex d'OpenAI. OpenClaw garde ces surfaces séparées pour que la configuration reste prévisible.

OpenClaw utilise OpenClaw`openai/*`OpenAIOpenAIOpenAIAPIOpenAI comme la route OpenAI canonique. L'agent embarqué active les modèles OpenAI exécutés via le runtime d'application natif de Codex par défaut ; l'authentification par clé API OpenAI directe reste disponible pour les surfaces non-agent d'OpenAI telles que les images, les embeddings, la voix et le temps réel.

- **Modèles d'agent** - Modèles `openai/*`OpenAIAPIAPI via le runtime Codex ; connectez-vous avec l'authentification Codex pour une utilisation par abonnement ChatGPT/Codex, ou configurez une clé API OpenAI compatible Codex comme sauvegarde lorsque vous souhaitez intentionnellement une authentification par clé API.
- **API OpenAI non-agent** - accès direct à la plateforme OpenAIOpenAI avec une facturation à l'utilisation via `OPENAI_API_KEY` ou l'onboarding de clé API OpenAIAPI.
- **Configuration héritée** - les références de modèle `openai-codex/*` sont réparées par `openclaw doctor --fix` vers `openai/*` plus le runtime Codex.

OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans les outils et workflows externes tels que OpenClaw.

Le fournisseur, le modèle, le runtime et le canal sont des couches distinctes. Si ces étiquettes sont mélangées, lisez [Runtimes d'agent](/fr/concepts/agent-runtimes) avant de modifier la configuration.

## Choix rapide

| Objectif                                                          | Utilisation                                                             | Notes                                                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec runtime Codex natif                 | `openai/gpt-5.5`                                                        | Configuration par défaut de l'agent OpenAI. Connectez-vous avec l'authentification Codex.       |
| Facturation directe par clé API pour les modèles d'agent          | `openai/gpt-5.5`API ainsi qu'un profil de clé API compatible avec Codex | Utilisez `auth.order.openai` pour placer la sauvegarde après l'authentification par abonnement. |
| Facturation directe par clé API via un PI explicite               | `openai/gpt-5.5` plus le runtime fournisseur/modèle `pi`                | Sélectionnez un profil de clé API `openai`API normal.                                           |
| Dernier alias de l'API ChatGPT Instant                            | `openai/chat-latest`                                                    | Uniquement clé API directe. Alias mouvant pour les expériences, pas la valeur par défaut.       |
| Authentification par abonnement ChatGPT/Codex via un PI explicite | `openai/gpt-5.5` plus provider/model runtime `pi`                       | Select an `openai-codex` auth profile for the compatibility route.                              |
| Image generation or editing                                       | `openai/gpt-image-2`                                                    | Works with either `OPENAI_API_KEY` or OpenAI Codex OAuth.                                       |
| Transparent-background images                                     | `openai/gpt-image-1.5`                                                  | Use `outputFormat=png` or `webp` and `openai.background=transparent`.                           |

## Naming map

The names are similar but not interchangeable:

| Name you see                            | Layer                         | Meaning                                                                                                                                             |
| --------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`                                | Provider prefix               | Canonical OpenAI model route; agent turns use the Codex runtime.                                                                                    |
| `openai-codex`                          | Legacy auth/profile prefix    | Ancien espace de noms de profil OAuth/abonnement OpenAI Codex. Les profils existants et OpenAIOAuth`auth.order.openai-codex` fonctionnent toujours. |
| Plugin `codex`                          | Plugin                        | Plugin OpenClaw intégré qui fournit le runtime natif de l'application serveur Codex et les contrôles de chat OpenClaw`/codex`.                      |
| provider/model `agentRuntime.id: codex` | Runtime de l'agent            | Forcer le harnais de l'application serveur Codex natif pour les tours intégrés correspondants.                                                      |
| `/codex ...`                            | Ensemble de commandes de chat | Lier/contrôler les fils de discussion de l'application serveur Codex depuis une conversation.                                                       |
| `runtime: "acp", agentId: "codex"`      | Route de session ACP          | Chemin de repli explicite qui exécute Codex via ACP/acpx.                                                                                           |

Cela signifie qu'une configuration peut contenir intentionnellement des références de modèle `openai/*` tandis que les profils d'authentification pointent toujours vers des informations d'identification compatibles avec Codex. Privilégiez `auth.order.openai` pour les nouvelles configurations ; les profils `openai-codex:*` existants et `auth.order.openai-codex` restent pris en charge. `openclaw doctor --fix` réécrit les références de modèle `openai-codex/*` héritées vers la route de modèle OpenAI canonique.

<Note>
  GPT-5.5 est disponible via un accès direct par clé d'OpenAI de la plateforme API et via les itinéraires d'abonnement/OAuth. Pour un abonnement ChatGPT/Codex plus une exécution Codex native, utilisez `openai/gpt-5.5` ; la configuration d'exécution non définie sélectionne désormais le harnais Codex pour les tours d'agent OpenAI. Utilisez les profils de clé d'OpenAI API uniquement lorsque vous
  souhaitez une authentification par clé d'API directe pour un modèle d'agent OpenAI.
</Note>

<Note>
  Les transitions du modèle d'agent OpenAI nécessitent le plugin d'application serveur Codex inclus. La configuration explicite du runtime PI reste disponible en tant qu'option de compatibilité. Lorsque le PI est explicitement sélectionné avec un profil d'authentification `openai-codex`, OpenClaw conserve la référence publique du modèle sous `openai/*` et achemine le PI en interne via le transport
  d'authentification Codex hérité. Exécutez `openclaw doctor --fix` pour réparer les `openai-codex/*`, les `codex-cli/*` obsolètes, ou les épingles de session PI anciennes qui ne proviennent pas d'une configuration explicite du runtime.
</Note>

## Couverture des fonctionnalités OpenClaw

| Capacité OpenAI                        | Surface OpenClaw                                                              | Statut                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Chat / Réponses                        | Fournisseur de modèle `openai/<model>`                                        | Oui                                                                 |
| Modèles d'abonnement Codex             | `openai/<model>` avec `openai-codex` OAuth                                    | Oui                                                                 |
| Références de model Codex héritées     | `openai-codex/<model>` ou `codex-cli/<model>`                                 | Réparé par le docteur vers `openai/<model>`                         |
| Harnais de serveur d'application Codex | `openai/<model>` avec runtime omis ou provider/model `agentRuntime.id: codex` | Oui                                                                 |
| Recherche Web côté serveur             | Tool Réponses natif OpenAI                                                    | Oui, lorsque la recherche Web est activée et aucun provider épinglé |
| Images                                 | `image_generate`                                                              | Oui                                                                 |
| Vidéos                                 | `video_generate`                                                              | Oui                                                                 |
| Synthèse vocale                        | `messages.tts.provider: "openai"` / `tts`                                     | Oui                                                                 |
| Reconnaissance vocale par lots         | `tools.media.audio` / compréhension des médias                                | Oui                                                                 |
| Reconnaissance vocale en continu       | Appel vocal `streaming.provider: "openai"`                                    | Oui                                                                 |
| Voix en temps réel                     | Appel vocal `realtime.provider: "openai"` / Contrôle UI Talk                  | Oui                                                                 |
| Intégrations                           | provider d'intégration de mémoire                                             | Oui                                                                 |

## Intégrations de mémoire

OpenClaw peut utiliser OpenAI, ou un point de terminaison d'intégration compatible OpenAI, pour
l'indexation OpenClawOpenAIOpenAI`memory_search` et les requêtes d'intégrations :

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

Pour les points de termination compatibles OpenAI qui nécessitent des étiquettes d'intégration asymétriques, définissez
`queryInputType` et `documentInputType` sous `memorySearch`. OpenClaw transmet
ceux-ci en tant que champs de requête `input_type` spécifiques au fournisseur : les intégrations de requête utilisent
`queryInputType` ; les blocs de mémoire indexés et l'indexation par lots utilisent
`documentInputType`. Consultez la [référence de configuration de la mémoire](/fr/reference/memory-config#provider-specific-config) pour l'exemple complet.

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="APIOpenAIClé API (Plateforme OpenAI)"API>
    **Idéal pour :** accès direct à l'API et facturation à l'utilisation.

    <Steps>
      <Step title="APIObtenir votre clé API"APIOpenAI>
        Créez ou copiez une clé API depuis le [tableau de bord de la plateforme OpenAI](https://platform.openai.com/api-keys).
      </Step>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        Ou passez directement la clé :

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

    ### Résumé des routes

    | Réf. Modèle           | Configuration d'exécution  | Route                       | Auth             |
    | --------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omis / provider/model `agentRuntime.id: "codex"`OpenAI | Harnais Codex app-server | Profil OpenAI compatible Codex |
    | `openai/gpt-5.4-mini` | omis / provider/model `agentRuntime.id: "codex"`OpenAI | Harnais Codex app-server | Profil OpenAI compatible Codex |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "pi"`              | Runtime PI intégré      | Profil `openai` ou profil `openai-codex` sélectionné |

    <Note>
    Les modèles agent `openai/*`APIAPI utilisent le harnais Codex app-server. Pour utiliser l'auth par clé API pour un modèle agent, créez un profil de clé API compatible Codex et commandez-le avec `auth.order.openai` ; `OPENAI_API_KEY`OpenAIAPI reste le repli direct pour les surfaces API OpenAI non-agent. Les anciennes entrées `auth.order.openai-codex` fonctionnent toujours.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```OpenAIAPI

    Pour essayer le modèle Instant actuel de ChatGPT depuis l'API OpenAI, définissez le modèle sur `openai/chat-latest` :

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest`OpenAI est un alias évolutif. OpenAI le documente comme le dernier modèle Instant utilisé dans ChatGPT et recommande `gpt-5.5`API pour une utilisation en production de l'API, donc gardez `openai/gpt-5.5` comme défaut stable à moins que vous ne vouliez explicitement ce comportement d'alias. L'alias accepte actuellement uniquement la verbosité de texte `medium`OpenClawOpenAIOpenClaw, donc OpenClaw normalise les redéfinitions incompatibles de verbosité de texte OpenAI pour ce modèle.

    <Warning>
    OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark`OpenAIAPI. Les requêtes directes à l'API OpenAI rejettent ce modèle, et le catalogue Codex actuel ne l'expose pas non plus.
    </Warning>

  </Tab>

  <Tab title="Abonnement Codex"API>
    **Idéal pour :** utiliser votre abonnement ChatGPT/Codex avec l'exécution native de l'application serveur Codex au lieu d'une clé API séparée. Le cloud Codex nécessite une connexion ChatGPT.

    <Steps>
      <Step title="OAuthExécuter Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```OAuth

        Ou exécuter OAuth directement :

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Pour les configurations sans interface ou hostiles aux rappels (callback), ajoutez `--device-code` pour vous connecter avec un flux de code d'appareil ChatGPT au lieu du rappel du navigateur localhost :

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="OpenAIUtiliser la route canonique du modèle OpenAI">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```OpenAIOpenClaw

        Aucune configuration d'exécution n'est requise pour le chemin par défaut. Les tours d'agent
        OpenAI sélectionnent automatiquement l'environnement d'exécution de l'application serveur Codex native, et OpenClaw
        installe ou répare le plugin Codex fourni lorsque cette route est choisie.
      </Step>
      <Step title="Vérifier que l'auth Codex est disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```

        Une fois la passerelle démarrée, envoyez `/codex status` ou `/codex models`
        dans le chat pour vérifier l'environnement d'exécution de l'application serveur native.
      </Step>
    </Steps>

    ### Résumé des routes

    | Réf de modèle | Config d'exécution | Route | Auth |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omis / provider/model `agentRuntime.id: "codex"` | Harnais de l'application serveur Codex native | Connexion Codex ou profil d'auth `openai` ordonné |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "pi"` | Environnement intégré PI avec transport d'auth Codex interne | Profil `openai-codex` sélectionné |
    | `openai-codex/gpt-5.5` | réparé par doctor | Ancienne route réécrite vers `openai/gpt-5.5` | Profil `openai-codex` existant |
    | `codex-cli/gpt-5.5`CLI | réparé par doctor | Ancienne route CLI réécrite vers `openai/gpt-5.5` | Auth application serveur Codex |

    <Warning>
    Préférez `openai/gpt-5.5` pour les nouvelles configurations d'agent basées sur un abonnement. Les anciennes
    références `openai-codex/gpt-*` sont d'anciennes routes PI, et non le chemin d'exécution
    Codex natif ; exécutez `openclaw doctor --fix` lorsque vous souhaitez les migrer vers les références canoniques
    `openai/*`.
    </Warning>

    <Note>
    Le préfixe de modèle `openai-codex/*` est une ancienne configuration réparée par doctor. Pour
    la configuration courante d'abonnement plus environnement d'exécution natif, connectez-vous avec l'auth Codex
    mais gardez la référence de modèle comme `openai/gpt-5.5`OpenAI. Les nouvelles configurations doivent placer l'ordre d'auth de l'agent
    OpenAI sous `auth.order.openai` ; les anciennes entrées `auth.order.openai-codex`
    restent valides.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
    }
    ```API

    Avec une clé API de secours, gardez le modèle sur `openai/gpt-5.5` et placez l'ordre
    d'auth sous `openai`OpenClawAPI. OpenClaw essaiera d'abord l'abonnement, puis
    la clé API, tout en restant sur le harnais Codex :

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
      auth: {
        order: {
          openai: [
            "openai-codex:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```OAuth

    <Note>
    L'intégration (Onboarding) n'importe plus les éléments OAuth depuis `~/.codex`OAuthOpenClawOAuth. Connectez-vous avec OAuth navigateur (par défaut) ou le flux de code d'appareil ci-dessus — OpenClaw gère les informations d'identification résultantes dans son propre stock d'auth d'agent.
    </Note>

    ### Vérifier et récupérer le routage OAuth Codex

    Utilisez ces commandes pour voir quel modèle, environnement d'exécution et route d'auth votre agent par défaut
    utilise :

    ```bash
    openclaw models status
    openclaw models auth list --provider openai-codex
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    Pour un agent spécifique, ajoutez `--agent <id>` :

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai-codex
    ```

    Si une ancienne configuration possède encore `openai-codex/gpt-*`OpenAI ou un épingle de session OpenAI PI
    obsolète sans configuration d'exécution explicite, réparez-la :

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    Si `models auth list --provider openai-codex` n'affiche aucun profil utilisable, connectez-vous
    à nouveau :

    ```bash
    openclaw models auth login --provider openai-codex
    openclaw models status --probe --probe-provider openai-codex
    ```

    `openai/*`OpenAI est la route de modèle pour les tours d'agent OpenAI via Codex. L'ID de fournisseur
    d'auth/profil `openai-codex`CLI reste accepté pour les profils existants et le listage CLI.

    ### Indicateur de statut

    Le chat `/status` montre quel environnement d'exécution de modèle est actif pour la session actuelle.
    Le harnais de l'application serveur Codex fourni apparaît comme `Runtime: OpenAI Codex`OpenAI pour
    les tours de modèle d'agent OpenAI. Les épingles de session PI obsolètes sont réparées vers Codex à moins que
    la configuration n'épingle explicitement PI.

    ### Avertissement du docteur

    Si les routes `openai-codex/*`OpenAI ou les épingles OpenAI PI obsolètes restent dans la configuration ou
    l'état de la session, `openclaw doctor --fix` les réécrit vers `openai/*`OpenClaw avec l'environnement
    d'exécution Codex, sauf si PI est explicitement configuré.

    ### Plafond de fenêtre de contexte

    OpenClaw traite les métadonnées du modèle et le plafond de contexte d'exécution comme des valeurs distinctes.

    Pour `openai/gpt-5.5`OAuth via le catalogue OAuth Codex :

    - `contextWindow` native : `1000000`
    - Plafond d'exécution `contextTokens` par défaut : `272000`

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
    Utilisez `contextWindow` pour déclarer les métadonnées natives du modèle. Utilisez `contextTokens`OpenClaw pour limiter le budget de contexte d'exécution.
    </Note>

    ### Récupération du catalogue

    OpenClaw utilise les métadonnées du catalogue Codex en amont pour `gpt-5.5` lorsqu'elles sont
    présentes. Si la découverte Codex en direct omet la ligne `gpt-5.5`OpenClawOAuth alors
    que le compte est authentifié, OpenClaw synthétise cette ligne de modèle OAuth afin que
    cron, le sous-agent et les exécutions du modèle par défaut configuré ne échouent pas avec
    `Unknown model`.

  </Tab>
</Tabs>

## Authentification native du serveur d'application Codex

Le harnais natif du serveur d'application Codex utilise des références de modèle `openai/*` ainsi qu'une configuration d'exécution omise ou un fournisseur/modèle `agentRuntime.id: "codex"`, mais son authentification reste basée sur le compte. OpenClaw sélectionne l'authentification dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous `auth.order.openai`. Les profils `openai-codex:*` existants et `auth.order.openai-codex` restent valides pour les installations plus anciennes.
2. Le compte existant du serveur d'application, tel qu'une connexion locale ChatGPT via Codex CLI.
3. Uniquement pour les lancements locaux du serveur d'application stdio, `CODEX_API_KEY`, puis `OPENAI_API_KEY`, lorsque le serveur d'application signale aucun compte et nécessite toujours une authentification OpenAI.

Cela signifie qu'une connexion locale par abonnement ChatGPT/Codex n'est pas remplacée simplement parce que le processus de passerelle dispose également de `OPENAI_API_KEY` pour les modèles OpenAI directs ou les embeddings. Le repli sur la clé d'API de l'environnement n'est que le chemin local stdio sans compte ; il n'est pas envoyé aux connexions WebSocket du serveur d'application. Lorsqu'un profil Codex de type abonnement est sélectionné, OpenClaw garde également `CODEX_API_KEY` et `OPENAI_API_KEY` hors de l'enfant stdio du serveur d'application généré et envoie les identifiants sélectionnés via la RPC de connexion du serveur d'application. Lorsque ce profil d'abonnement est bloqué par une limite d'utilisation de Codex, OpenClaw`openai:*` peut passer au profil de clé d'API suivant dans l'ordre sans changer le modèle sélectionné ni quitter le harnais Codex. Une fois le temps de réinitialisation de l'abonnement écoulé, le profil d'abonnement est à nouveau éligible.

## Génération d'images

Le plugin intégré `openai` enregistre la génération d'images via l'outil `image_generate`.
Il prend en charge à la fois la génération d'images avec la clé OpenAI API et la génération d'images Codex OAuth via la même référence de `openai/gpt-image-2` model.

| Capacité                      | Clé OpenAI API                              | Codex OAuth                                          |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Réf. de model                 | `openai/gpt-image-2`                        | `openai/gpt-image-2`                                 |
| Auth                          | `OPENAI_API_KEY`                            | Connexion Codex OpenAI OAuth                         |
| Transport                     | Images OpenAI API                           | Backend Codex Responses                              |
| Max images par requête        | 4                                           | 4                                                    |
| Mode édition                  | Activé (jusqu'à 5 images de référence)      | Activé (jusqu'à 5 images de référence)               |
| Remplacements de taille       | Pris en charge, y compris les tailles 2K/4K | Pris en charge, y compris les tailles 2K/4K          |
| Rapport d'aspect / résolution | Non transmis à l'API Images OpenAIAPI       | Mappé à une taille prise en charge lorsque c'est sûr |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres de tool partagés, la sélection du provider et le comportement de basculement.</Note>

`gpt-image-2` est la valeur par défaut pour la génération d'images texte vers image OpenAI ainsi que pour l'édition d'images. `gpt-image-1.5`, `gpt-image-1` et `gpt-image-1-mini` restent utilisables en tant que substitutions explicites de model. Utilisez `openai/gpt-image-1.5` pour une sortie PNG/WebP avec un arrière-plan transparent ; l'API `gpt-image-2` actuel rejette `background: "transparent"`.

Pour une demande d'arrière-plan transparent, les agents doivent appeler `image_generate` avec
`model: "openai/gpt-image-1.5"`, `outputFormat: "png"` ou `"webp"`, et
`background: "transparent"`; l'ancienne option de fournisseur `openai.background` est
toujours acceptée. OpenClaw protège également les routes OpenAI publiques OpenAI et
Codex OAuth en réécrivant les demandes transparentes par défaut `openai/gpt-image-2`
en `gpt-image-1.5`; les points de terminaison Azure et personnalisés compatibles OpenAI conservent
leurs noms de déploiement/modèle configurés.

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
`--openai-background` reste disponible en tant qu'alias spécifique à OpenAI.

Pour les installations Codex OAuth, conservez la même référence `openai/gpt-image-2`. Lorsqu'un profil OAuth `openai-codex` est configuré, OpenClaw résout ce jeton d'accès OAuth stocké et envoie les requêtes d'image via le backend Codex Responses. Il n'essaie pas d'abord `OPENAI_API_KEY` ni ne retombe silencieusement sur une clé API pour cette requête. Configurez `models.providers.openai` explicitement avec une clé API, une URL de base personnalisée ou un point de terminaison Azure lorsque vous souhaitez la route directe de l'API Images OpenAIAPI à la place.
Si ce point de terminaison d'image personnalisé se trouve sur une adresse LAN privée/de confiance, définissez également `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` ; OpenClaw maintient les points de terminaison d'image compatibles OpenAI privés/internes bloqués, sauf si ce opt-in est présent.

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

Le plugin intégré `openai` enregistre la génération vidéo via l'outil `video_generate`.

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

OpenClaw ajoute une contribution de prompt GPT-5 partagée pour les exécutions de la famille GPT-5 sur plusieurs fournisseurs. Elle s'applique par ID de modèle, donc OpenClaw`openai/gpt-5.5`, les références héritées pré-réparation telles que `openai-codex/gpt-5.5`, `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` et d'autres références GPT-5 compatibles reçoivent la même superposition. Les modèles GPT-4.x plus anciens ne le font pas.

Le harnais natif Codex groupé utilise le même comportement GPT-5 et la même superposition de battement de cœur via les instructions développeur du serveur d'application Codex, donc les sessions `openai/gpt-5.x` acheminées via Codex conservent le même suivi continu et les conseils de battement de cœur proactifs, même si Codex possède le reste du prompt du harnais.

La contribution GPT-5 ajoute un contrat de comportement balisé pour la persistance de la personnalité, la sécurité de l'exécution, la discipline des outils, la forme de la sortie, les vérifications d'achèvement et la vérification. Le comportement de réponse spécifique au canal et de message silencieux reste dans l'invite système partagée OpenClaw et la politique de livraison sortante. Les instructions GPT-5 sont toujours activées pour les modèles correspondants. La couche de style d'interaction conviviale est distincte et configurable.

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
  <Tab title="CLICLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>Les valeurs ne sont pas sensibles à la casse lors de l'exécution, donc `"Off"` et `"off"` désactivent tous deux la couche de style conviviale.</Tip>

<Note>L'ancien `plugins.entries.openai.config.personality` est toujours lu en guise de repli de compatibilité lorsque le paramètre partagé `agents.defaults.promptOverlays.gpt5.personality` n'est pas défini.</Note>

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
    | Corps supplémentaire | `messages.tts.providers.openai.extraBody` / `extra_body` | (non défini) |

    Modèles disponibles : `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voix disponibles : `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    `extraBody` est fusionné dans le JSON de requête `/audio/speech` après les champs générés par OpenClaw, utilisez-le donc pour les points de terminaison compatibles OpenAI qui nécessitent des clés supplémentaires telles que `lang`. Les clés de prototype sont ignorées.

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
    Définissez `OPENAI_TTS_BASE_URL` pour remplacer l'URL de base TTS sans affecter le point de terminaison de l'API de chat. Le TTS OpenAI est toujours configuré via une clé API ; pour un talk-back en direct uniquement via OAuth, utilisez le chemin vocal Realtime au lieu de la parole STT -> TTS en mode agent.
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    Le plugin `openai` inclus enregistre le traitement par lots de la parole vers texte via
    la surface de transcription de compréhension média d'OpenClaw.

    - Modèle par défaut : `gpt-4o-transcribe`
    - Point de terminaison : OpenAI REST `/v1/audio/transcriptions`
    - Chemin d'entrée : téléchargement de fichier audio multipart
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
      `tools.media.audio`, y compris les segments de canal vocal Discord et les
      pièces jointes audio de canal

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

  <Accordion title="Transcription en temps réel">
    Le plugin intégré `openai` enregistre la transcription en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Langue | `...openai.language` | (non défini) |
    | Invite | `...openai.prompt` | (non défini) |
    | Durée de silence | `...openai.silenceDurationMs` | `800` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY` ou `openai-codex` OAuth | Les clés API se connectent directement ; OAuth génère un secret client de transcription en temps réel |

    <Note>
    Utilise une connexion WebSocket vers `wss://api.openai.com/v1/realtime` avec audio G.711 mu-law (`g711_ulaw` / `audio/pcmu`). Lorsque seul `openai-codex` OAuth est configuré, le Gateway génère un secret client éphémère de transcription en temps réel avant d'ouvrir le WebSocket. Ce fournisseur de flux est destiné au chemin de transcription en temps réel de Voice Call ; la voix Discord enregistre actuellement de courts segments et utilise à la place le chemin de transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="Voix en temps réel">
    Le plugin intégré `openai` enregistre la voix en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de config | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voix | `...openai.voice` | `alloy` |
    | Température (pont de déploiement Azure) | `...openai.temperature` | `0.8` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Durée de silence | `...openai.silenceDurationMs` | `500` |
    | Remplissage de préfixe | `...openai.prefixPaddingMs` | `300` |
    | Effort de raisonnement | `...openai.reasoningEffort` | (non défini) |
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY`, ou `openai-codex` OAuth | Browser Talk et les ponts principaux non Azure peuvent utiliser Codex OAuth |

    Voix Realtime intégrées disponibles pour `gpt-realtime-2` : `alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.
    OpenAI recommande `marin` et `cedar` pour la meilleure qualité Realtime. Il s'agit
    d'un ensemble distinct des voix synthèse vocale ci-dessus ; ne supposez pas qu'une voix
    TTS telle que `fable`, `nova`, ou `onyx` est valide pour les sessions Realtime.

    <Note>
    Les ponts principaux OpenAI Realtime utilisent la forme de session WebSocket Realtime GA, qui n'accepte pas `session.temperature`. Les déploiements Azure OpenAI restent disponibles via `azureEndpoint` et `azureDeployment` et conservent la forme de session compatible avec le déploiement. Prend en charge l'appel d'outil bidirectionnel et l'audio G.711 u-law.
    </Note>

    <Note>
    La voix Realtime est sélectionnée lors de la création de la session. OpenAI permet à la plupart
    des champs de session de changer ultérieurement, mais la voix ne peut pas être modifiée après que
    le modèle a émis de l'audio dans cette session. OpenClaw expose actuellement les
    identifiants de voix Realtime intégrés sous forme de chaînes.
    </Note>

    <Note>
    Control UI Talk utilise les sessions de navigateur OpenAI Realtime avec un secret client éphémère généré par Gateway
    et un échange SDP WebRTC direct de navigateur vers l'OpenAI Realtime API. Lorsqu'aucune clé OpenAI API directe n'est configurée, le Gateway
    peut générer ce secret client avec le profil OAuth `openai-codex`
    sélectionné. Le relais Gateway et les ponts WebSocket Realtime principaux Voice Call utilisent
    le même repli OAuth pour les points de terminaison natifs OpenAI. La vérification
    en direct par le responsable est disponible avec
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` ;
    les connexions OpenAI vérifient à la fois le pont WebSocket principal et l'échange
    SDP WebRTC du navigateur sans enregistrer de secrets.
    </Note>

  </Accordion>
</AccordionGroup>

## Points de terminaison Azure OpenAI

Le fournisseur `openai` inclus peut cibler une ressource Azure OpenAI pour la
génération d'images en remplaçant l'URL de base. Sur le chemin de génération d'images, OpenClaw
détecte les noms d'hôte Azure sur `models.providers.openai.baseUrl` et passe automatiquement à
la forme de requête d'Azure.

<Note>La voix en temps réel utilise un chemin de configuration séparé (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) et n'est pas affectée par `models.providers.openai.baseUrl`. Consultez l'accordéon **Voix en temps réel** sous [Voix et synthèse vocale](#voice-and-speech) pour ses paramètres Azure.</Note>

Utilisez Azure OpenAI lorsque :

- Vous disposez déjà d'un abonnement Azure OpenAI, d'un quota ou d'un contrat entreprise
- Vous avez besoin de résidence régionale des données ou de contrôles de conformité fournis par Azure
- Vous souhaitez garder le trafic au sein d'un locataire Azure existant

### Configuration

Pour la génération d'images Azure via le provider `openai` inclus, pointez
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

OpenClaw reconnaît ces suffixes d'hôte Azure pour la route de génération
d'images Azure :

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Pour les demandes de génération d'images sur un hôte Azure reconnu, OpenClaw :

- Envoie l'en-tête `api-key` au lieu de `Authorization: Bearer`
- Utilise des chemins délimités par déploiement (`/openai/deployments/{deployment}/...`)
- Ajoute `?api-version=...` à chaque requête
- Utilise un délai d'expiration de requête par défaut de 600 s pour les appels de génération d'images Azure.
  Les valeurs `timeoutMs` par appel remplacent toujours cette valeur par défaut.

Les autres URL de base (OpenAI public, proxys compatibles OpenAI) conservent la forme standard
de la requête d'image OpenAI.

<Note>Le routage Azure pour le chemin de génération d'images du fournisseur `openai` nécessite OpenClaw 2026.4.22 ou version ultérieure. Les versions antérieures traitent tout `openai.baseUrl` personnalisé comme le point de terminaison public OpenAI et échoueront avec les déploiements d'images Azure.</Note>

### Version de API

Définissez `AZURE_OPENAI_API_VERSION` pour figer une version Azure de prévisualisation ou GA spécifique
pour le chemin de génération d'images Azure :

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

La valeur par défaut est `2024-12-01-preview` lorsque la variable n'est pas définie.

### Les noms de modèles sont des noms de déploiement

Azure OpenAI lie les modèles à des déploiements. Pour les demandes de génération d'images Azure routées via le fournisseur `openai` inclus, le champ `model` dans OpenClaw doit être le **nom de déploiement Azure** que vous avez configuré dans le portail Azure, et non l'identifiant du modèle OpenAI public.

Si vous créez un déploiement nommé `gpt-image-2-prod` qui sert `gpt-image-2` :

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La même règle de nom de déploiement s'applique aux appels de génération d'images routés via le fournisseur `openai` inclus.

### Disponibilité régionale

La génération d'images Azure est actuellement disponible uniquement dans un sous-ensemble de régions
(par exemple `eastus2`, `swedencentral`, `polandcentral`, `westus3`,
`uaenorth`). Consultez la liste actuelle des régions de Microsoft avant de créer un
déploiement et confirmez que le modèle spécifique est proposé dans votre région.

### Différences de paramètres

Azure OpenAI et le OpenAI public n'acceptent pas toujours les mêmes paramètres d'image.
Azure peut rejeter des options que le OpenAI public autorise (par exemple, certaines
valeurs `background` sur `gpt-image-2`) ou ne les exposer que sur des versions de modèle spécifiques.
Ces différences proviennent d'Azure et du modèle sous-jacent, et non d'OpenClaw. Si une requête Azure échoue avec une erreur de validation, vérifiez
l'ensemble de paramètres pris en charge par votre déploiement spécifique et la version de l'API dans le portail Azure.

<Note>
Azure OpenAI utilise un transport natif et un comportement de compatibilité mais ne reçoit pas
les en-têtes d'attribution masqués de OpenClawOpenAI — voir l'accordéon **Native vs OpenAI-compatible
routes** sous [Advanced configuration](#advanced-configuration).

Pour le trafic de chat ou de Réponses sur Azure (au-delà de la génération d'images), utilisez le
flux d'onboarding ou une configuration de fournisseur Azure dédiée — `openai.baseUrl`API seul
ne prend pas en charge la forme API/auth Azure. Un fournisseur
`azure-openai-responses/*` distinct existe ; voir
l'accordéon Server-side compaction ci-dessous.

</Note>

## Advanced configuration

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw privilégie WebSocket avec repli sur SSE (`"auto"`) pour `openai/*`.

    En mode `"auto"`, OpenClaw :
    - Réessaie une défaillance précoce de WebSocket avant de basculer sur SSE
    - Après une défaillance, marque WebSocket comme dégradé pendant ~60 secondes et utilise SSE pendant le refroidissement
    - Attache des en-têtes d'identité de session et de tour stables pour les nouvelles tentatives et reconnexions
    - Normalise les compteurs d'utilisation (`input_tokens` / `prompt_tokens`) selon les variantes de transport

    | Valeur | Comportement |
    |-------|----------|
    | `"auto"` (par défaut) | WebSocket d'abord, repli sur SSE |
    | `"sse"` | Forcer uniquement SSE |
    | `"websocket"` | Forcer uniquement WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
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

  <Accordion title="Fast mode"OpenClaw>
    OpenClaw expose un bouton bascule de mode rapide partagé pour `openai/*` :

    - **Chat/UI :** `/fast status|on|off`
    - **Config :** `agents.defaults.models["<provider>/<model>"].params.fastMode`OpenClawOpenAI

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
    Les overrides de session prévalent sur la configuration. Effacer l'override de session dans l'interface Sessions ramène la session à la valeur par défaut configurée.
    </Note>

  </Accordion>

  <Accordion title="Traitement prioritaire (service_tier)">
    L'OpenAI d'API expose un traitement prioritaire via `service_tier`. Définissez-le par model dans OpenClaw :

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
    `serviceTier` est transmis uniquement aux points de terminaison natifs d'OpenAI (`api.openai.com`) et aux points de terminaison natifs de Codex (`chatgpt.com/backend-api`). Si vous acheminez l'un ou l'autre provider via un proxy, OpenClaw laisse `service_tier` intact.
    </Warning>

  </Accordion>

  <Accordion title="Compactage côté serveur (Responses API)">
    Pour les modèles OpenAI Responses directs (`openai/*` sur `api.openai.com`), le wrapper de flux Pi-harness du plugin OpenAI active automatiquement le compactage côté serveur :

    - Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
    - Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` par défaut : 70 % de `contextWindow` (ou `80000` si indisponible)

    Cela s'applique au chemin du harnais Pi intégré et aux hooks du fournisseur OpenAI utilisés par les exécutions intégrées. Le harnais natif de l'application serveur Codex gère son propre contexte via Codex et est configuré par la route d'agent par défaut d'OpenAI ou par la stratégie d'exécution du fournisseur/modèle.

    <Tabs>
      <Tab title="Activer explicitement">
        Utile pour les points de terminaison compatibles tels qu'Azure OpenAI Responses :

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
    `responsesServerCompaction` contrôle uniquement l'injection de `context_management`. Les modèles OpenAI Responses directs forcent toujours `store: true` sauf si la compatibilité définit `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Mode agentic strict de GPT">
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
    - Active automatiquement `update_plan` pour un travail important
    - Affiche un état de blocage explicite si le modèle continue de planifier sans agir

    <Note>
    Limité aux exécutions de la famille GPT-5 OpenAI et Codex uniquement. Les autres fournisseurs et les familles de modèles plus anciennes conservent le comportement par défaut.
    </Note>

  </Accordion>

  <Accordion title="OpenAIRoutes natives vs compatibles OpenAI"OpenClawOpenAIOpenAIOpenAI>
    OpenClaw traite différemment les points de terminaison directs OpenAI, Codex et Azure OpenAI par rapport aux proxies génériques compatibles OpenAI `/v1` :

    **Routes natives** (`openai/*`OpenAI, Azure OpenAI) :
    - Conserver `reasoning: { effort: "none" }`OpenAI uniquement pour les modèles qui prennent en charge l'effort `none` d'OpenAI
    - Omettre le raisonnement désactivé pour les modèles ou proxies qui rejettent `reasoning.effort: "none"`OpenAI
    - Par défaut, les schémas d'outils en mode strict
    - Attacher des en-têtes d'attribution masqués uniquement sur les hôtes natifs vérifiés
    - Conserver le façonnage des requêtes exclusif à OpenAI (`service_tier`, `store`, reasoning-compat, indices de cache de prompt)

    **Routes proxy/compatibles :**
    - Utiliser un comportement de compatibilité plus souple
    - Supprimer les `store` de Completions des payloads `openai-completions` non natifs
    - Accepter le JSON de passage avancé `params.extra_body`/`params.extraBody`OpenAI pour les proxies de Completions compatibles OpenAI
    - Accepter `params.chat_template_kwargs`OpenAIOpenAI pour les proxies de Completions compatibles OpenAI tels que vLLM
    - Ne pas forcer les schémas d'outils stricts ni les en-tères natifs uniquement

    Azure OpenAI utilise un transport natif et un comportement de compatibilité mais ne reçoit pas les en-têtes d'attribution masqués.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres de l'outil d'image partagé et sélection du fournisseur.
  </Card>
  <Card title="Génération de vidéos" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagé et sélection du fournisseur.
  </Card>
  <Card title="OAuthOAuth and auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
