---
summary: "OpenAIAPIOpenClawUtiliser OpenAI via des clés d'API ou l'abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAIOpenAI"
---

OpenAI fournit des API développeur pour les modèles GPT, et Codex est également disponible en tant qu'agent de codage avec plan ChatGPT via les clients Codex d'OpenAI. OpenClaw maintient ces surfaces séparées afin que la configuration reste prévisible.

OpenClaw utilise OpenClaw`openai/*`OpenAIOpenAIOpenAIAPIOpenAI comme la route canonique du modèle OpenAI. L'agent intégré active les modèles OpenAI exécutés via le runtime natif de l'application serveur Codex par défaut ; l'authentification directe par clé d'API OpenAI reste disponible pour les surfaces OpenAI sans agent telles que les images, les embeddings, la voix et le temps réel.

- **Modèles d'agent** - modèles `openai/*`OpenAIAPIAPI via le runtime Codex ; connectez-vous avec l'authentification Codex pour une utilisation d'abonnement ChatGPT/Codex, ou configurez une sauvegarde de clé d'API OpenAI compatible avec Codex lorsque vous souhaitez intentionnellement une authentification par clé d'API.
- **API OpenAI non-agent** - accès direct à la plateforme OpenAI avec une facturation à l'utilisation via OpenAIOpenAI`OPENAI_API_KEY`OpenAIAPI ou l'intégration de clé d'API OpenAI.
- **Configuration héritée** - les références de modèle `openai-codex/*` sont réparées par `openclaw doctor --fix` vers `openai/*` plus le runtime Codex.

OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans les outils et workflows externes tels que OpenClaw.

Le fournisseur, le modèle, le runtime et le canal sont des couches distinctes. Si ces étiquettes sont mélangées, lisez [Runtimes d'agent](/fr/concepts/agent-runtimes) avant de modifier la configuration.

## Choix rapide

| Objectif                                                       | Utiliser                                                              | Remarques                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec le runtime natif Codex           | `openai/gpt-5.5`                                                      | Configuration par défaut de l'agent OpenAI. Connectez-vous avec l'authentification Codex.       |
| Facturation directe par clé API pour les modèles d'agent       | `openai/gpt-5.5`API plus un profil de clé d'API compatible avec Codex | Utilisez `auth.order.openai` pour placer la sauvegarde après l'authentification par abonnement. |
| Facturation directe par clé API via IP explicite               | `openai/gpt-5.5` plus le runtime fournisseur/modèle `pi`              | Sélectionnez un profil normal de clé d'API `openai`API.                                         |
| Dernier alias de API ChatGPT Instant                           | `openai/chat-latest`                                                  | Clé API directe uniquement. Alias en mouvement pour les expériences, pas la valeur par défaut.  |
| Authentification par abonnement ChatGPT/Codex via PI explicite | `openai/gpt-5.5` plus provider/model runtime `pi`                     | Sélectionnez un profil d'auth `openai-codex` pour la route de compatibilité.                    |
| Génération ou édition d'images                                 | `openai/gpt-image-2`                                                  | Fonctionne avec `OPENAI_API_KEY` ou OpenAI Codex OAuth.                                         |
| Images à fond transparent                                      | `openai/gpt-image-1.5`                                                | Utilisez `outputFormat=png` ou `webp` et `openai.background=transparent`.                       |

## Table des noms

Les noms sont similaires mais non interchangeables :

| Nom que vous voyez                      | Couche                        | Signification                                                                                                                                                    |
| --------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`                                | Préfixe du provider           | Route de model OpenAI canonique ; les tours d'agent utilisent le runtime Codex.                                                                                  |
| `openai-codex`                          | Préfixe d'auth/profil hérité  | Espace de noms de profil d'authentification/abonnement OpenAI Codex OAuth plus ancien. Les profils existants et `auth.order.openai-codex` fonctionnent toujours. |
| Plugin `codex`                          | Plugin                        | Plugin OpenClaw inclus qui fournit le runtime natif de l'application serveur Codex et les contrôles de chat `/codex`.                                            |
| provider/model `agentRuntime.id: codex` | Runtime de l'agent            | Forcer le harnais natif de l'app-server Codex pour les tours embarqués correspondants.                                                                           |
| `/codex ...`                            | Ensemble de commandes de chat | Lier/contrôler les threads de l'app-server Codex depuis une conversation.                                                                                        |
| `runtime: "acp", agentId: "codex"`      | Route de session ACP          | Chemin de repli explicite qui exécute Codex via ACP/acpx.                                                                                                        |

Cela signifie qu'une configuration peut contenir intentionnellement des références de modèle `openai/*` tandis que les profils d'auth pointent toujours vers des informations d'identification compatibles Codex. Préférez `auth.order.openai` pour les nouvelles configurations ; les profils `openai-codex:*` existants et `auth.order.openai-codex` restent pris en charge. `openclaw doctor --fix` réécrit les références de modèle héritées `openai-codex/*` vers la route de modèle OpenAI canonique.

<Note>
  GPT-5.5 est disponible via l'accès direct par clé d'API OpenAIAPI Platform ainsi que par les routes d'abonnement/OAuth. Pour un abonnement ChatGPT/Codex avec une exécution Codex native, utilisez `openai/gpt-5.5` ; une configuration d'exécution non définie sélectionne désormais le harnais Codex pour les tours d'agent OpenAI. Utilisez les profils de clé d'API OpenAIAPIAPI uniquement lorsque vous
  souhaitez une authentification par clé d'API directe pour un modèle d'agent OpenAI.
</Note>

<Note>
  Les tours de modèle d'agent OpenAI nécessitent le plugin groupé Codex app-server. La configuration d'exécution PI explicite reste disponible en tant que route de compatibilité opt-in. Lorsque PI est explicitement sélectionné avec un profil d'authentification `openai-codex`, OpenClaw conserve la référence de modèle publique comme `openai/*` et achemine PI en interne via l'ancien transport
  Codex-auth. Exécutez `openclaw doctor --fix` pour réparer les références de modèle `openai-codex/*` obsolètes ou les anciens épinglages de session PI qui ne proviennent pas d'une configuration d'exécution explicite.
</Note>

## Couverture des fonctionnalités OpenClaw

| Capacité OpenAI                      | Surface OpenClaw                                                                  | Statut                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Chat / Réponses                      | Fournisseur de modèle `openai/<model>`                                            | Oui                                                                    |
| Modèles d'abonnement Codex           | `openai/<model>` avec `openai-codex` OAuth                                        | Oui                                                                    |
| Anciennes références de modèle Codex | `openai-codex/<model>`                                                            | Réparé par doctor vers `openai/<model>`                                |
| Harnais Codex app-server             | `openai/<model>` avec runtime omis ou fournisseur/modèle `agentRuntime.id: codex` | Oui                                                                    |
| Recherche web côté serveur           | Outil Responses natif OpenAI                                                      | Oui, lorsque la recherche web est activée et aucun fournisseur épinglé |
| Images                               | `image_generate`                                                                  | Oui                                                                    |
| Vidéos                               | `video_generate`                                                                  | Oui                                                                    |
| Synthèse vocale                      | `messages.tts.provider: "openai"` / `tts`                                         | Oui                                                                    |
| Reconnaissance vocale en lot         | `tools.media.audio` / compréhension des médias                                    | Oui                                                                    |
| Reconnaissance vocale en continu     | Appel vocal `streaming.provider: "openai"`                                        | Oui                                                                    |
| Voix en temps réel                   | Appel vocal `realtime.provider: "openai"` / Contrôle de l'interface de discussion | Oui                                                                    |
| Embeddings                           | provider d'embeddings mémoire                                                     | Oui                                                                    |

## Embeddings mémoire

OpenClaw peut utiliser OpenAI, ou un point de terminaison d'embeddings compatible OpenAI, pour
l'indexation OpenClawOpenAIOpenAI`memory_search` et les embeddings de requête :

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

Pour les points de terminaison compatibles avec OpenAI qui nécessitent des étiquettes d'intégration asymétriques, définissez `queryInputType` et `documentInputType` sous `memorySearch`. OpenClaw les transmet en tant que champs de requête `input_type` spécifiques au fournisseur : les intégrations de requête utilisent `queryInputType` ; les chunks de mémoire indexés et l'indexation par lot utilisent `documentInputType`. Consultez la [référence de configuration de la mémoire](/fr/reference/memory-config#provider-specific-config) pour l'exemple complet.

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

    ### Résumé des routes

    | Réf. modèle           | Configuration d'exécution   | Route                       | Auth             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omis / provider/model `agentRuntime.id: "codex"`OpenAI | harnais app-server Codex | profil OpenAI compatible Codex |
    | `openai/gpt-5.4-mini` | omis / provider/model `agentRuntime.id: "codex"`OpenAI | harnais app-server Codex | profil OpenAI compatible Codex |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "pi"`              | runtime embarqué PI      | profil `openai` ou profil `openai-codex` sélectionné |

    <Note>
    Les modèles agent `openai/*`APIAPI utilisent le harnais app-server Codex. Pour utiliser l'auth par clé API
    pour un modèle agent, créez un profil de clé API compatible Codex et ordonnez-le
    avec `auth.order.openai`; `OPENAI_API_KEY`OpenAIAPI reste le repli direct pour
    les surfaces API OpenAI non-agent. Les entrées `auth.order.openai-codex` plus anciennes fonctionnent
    toujours.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```OpenAIAPI

    Pour essayer le modèle Instant actuel de ChatGPT depuis l'API OpenAI, définissez le modèle
    sur `openai/chat-latest` :

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest`OpenAI est un alias évolutif. OpenAI le documente comme le dernier modèle Instant
    utilisé dans ChatGPT et recommande `gpt-5.5`API pour l'usage de l'API en production, donc
    gardez `openai/gpt-5.5` comme défaut stable à moins que vous ne vouliez explicitement ce
    comportement d'alias. L'alias accepte actuellement uniquement la verbosité de texte `medium`OpenClawOpenAIOpenClaw, donc
    OpenClaw normalise les substitutions de verbosité de texte OpenAI incompatibles pour ce
    modèle.

    <Warning>
    OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark`OpenAIAPI. Les requêtes API OpenAI en direct rejettent ce modèle, et le catalogue Codex actuel ne l'expose pas non plus.
    </Warning>

  </Tab>

  <Tab title="Abonnement Codex">
    **Idéal pour :** utiliser votre abonnement ChatGPT/Codex avec l'exécution native de l'application serveur Codex au lieu d'une clé d'API distincte. Le cloud Codex nécessite une connexion ChatGPT.

    <Steps>
      <Step title="Exécuter Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        Ou exécutez OAuth directement :

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Pour les configurations sans interface graphique ou hostiles aux rappels, ajoutez `--device-code` pour vous connecter avec un flux de code d'appareil ChatGPT au lieu du rappel du navigateur localhost :

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Utiliser la route canonique du modèle OpenAI">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        Aucune configuration d'exécution n'est requise pour le chemin par défaut. Les tours de l'agent OpenAI
        sélectionnent automatiquement l'exécution native de l'application serveur Codex, et OpenClaw
        installe ou répare le plugin Codex inclus lorsque cette route est choisie.
      </Step>
      <Step title="Vérifier que l'auth Codex est disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```

        Une fois la passerelle démarrée, envoyez `/codex status` ou `/codex models`
        dans le chat pour vérifier l'exécution native de l'application serveur.
      </Step>
    </Steps>

    ### Résumé de la route

    | Réf de modèle | Config d'exécution | Route | Auth |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omis / provider/model `agentRuntime.id: "codex"` | Harnais de l'app serveur natif Codex | Connexion Codex ou profil d'auth `openai` ordonné |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "pi"` | Exécution intégrée PI avec transport d'auth Codex interne | Profil `openai-codex` sélectionné |
    | `openai-codex/gpt-5.5` | réparé par doctor | Ancienne route réécrite en `openai/gpt-5.5` | Profil `openai-codex` existant |

    <Warning>
    Ne configurez pas les anciennes références de modèle `openai-codex/gpt-5.1*`, `openai-codex/gpt-5.2*` ou
    `openai-codex/gpt-5.3*`. Les comptes ChatGPT/Codex OAuth rejettent désormais
    ces modèles. Utilisez `openai/gpt-5.5` ; les tours de l'agent OpenAI sélectionnent désormais
    l'exécution Codex par défaut.
    </Warning>

    <Note>
    Le préfixe de modèle `openai-codex/*` est une ancienne configuration réparée par doctor. Pour
    la configuration courante d'abonnement plus exécution native, connectez-vous avec l'auth Codex
    mais gardez la référence de modèle comme `openai/gpt-5.5`. La nouvelle configuration doit placer l'ordre d'auth de l'agent OpenAI
    sous `auth.order.openai` ; les anciennes entrées `auth.order.openai-codex`
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
    ```

    Avec une sauvegarde par clé d'API, gardez le modèle sur `openai/gpt-5.5` et placez
    l'ordre d'auth sous `openai`. OpenClaw essaiera d'abord l'abonnement, puis
    la clé d'API, tout en restant sur le harnais Codex :

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
    ```

    <Note>
    L'intégration n'importe plus les données OAuth depuis `~/.codex`. Connectez-vous via le navigateur OAuth (par défaut) ou le flux de code d'appareil ci-dessus — OpenClaw gère les identifiants résultants dans son propre magasin d'auth d'agent.
    </Note>

    ### Vérifier et récupérer le routage Codex OAuth

    Utilisez ces commandes pour voir quel modèle, quelle exécution et quelle route d'auth votre agent par défaut
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

    Si une ancienne configuration possède encore `openai-codex/gpt-*` ou une épingle de session PI OpenAI
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

    `openai/*` est la route de modèle pour les tours de l'agent OpenAI via Codex. L'identifiant
    du fournisseur d'auth/profil `openai-codex` reste accepté pour les profils existants et le listage CLI.

    ### Indicateur de statut

    Le chat `/status` montre quelle exécution de modèle est active pour la session actuelle.
    Le harnais de l'app serveur Codex inclus apparaît comme `Runtime: OpenAI Codex` pour
    les tours de modèle de l'agent OpenAI. Les épingles de session PI obsolètes sont réparées vers Codex, sauf si
    la configuration épingle explicitement PI.

    ### Avertissement du doctor

    Si les routes `openai-codex/*` ou les épingles PI OpenAI obsolètes demeurent dans la configuration ou
    l'état de la session, `openclaw doctor --fix` les réécrit en `openai/*` avec l'exécution
    Codex, sauf si PI est explicitement configuré.

    ### Plafond de la fenêtre de contexte

    OpenClaw traite les métadonnées du modèle et le plafond de contexte d'exécution comme des valeurs distinctes.

    Pour `openai/gpt-5.5` via le catalogue OAuth Codex :

    - `contextWindow` native : `1000000`
    - Plafond d'exécution `contextTokens` par défaut : `272000`

    Le plus petit plafond par défaut offre de meilleures caractéristiques de latence et de qualité en pratique. Remplacez-le par `contextTokens` :

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
    présentes. Si la découverte en direct Codex omet la ligne `gpt-5.5` alors
    que le compte est authentifié, OpenClaw synthétise cette ligne de modèle OAuth afin que
    les tâches cron, sous-agent et de modèle par défaut configuré n'échouent pas avec
    `Unknown model`.

  </Tab>
</Tabs>

## Authentification native Codex app-server

Le harnais d'application natif Codex utilise des références de modèle `openai/*` ainsi qu'une configuration d'exécution omise ou un fournisseur/modèle `agentRuntime.id: "codex"`, mais son authentification reste basée sur le compte. OpenClaw sélectionne l'authentification dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous `auth.order.openai`. Les profils `openai-codex:*` existants et `auth.order.openai-codex` restent valides pour les installations plus anciennes.
2. Le compte existant de l'app-server, tel qu'une connexion locale ChatGPT Codex CLI.
3. Uniquement pour les lancements locaux de serveur d'application stdio, `CODEX_API_KEY`, puis `OPENAI_API_KEY`, lorsque le serveur d'application signale l'absence de compte et nécessite toujours une authentification OpenAI.

Cela signifie qu'une connexion locale par abonnement ChatGPT/Codex n'est pas remplacée simplement parce que le processus de passerelle possède également `OPENAI_API_KEY` pour les modèles directs OpenAI ou les intégrations. Le repli sur la clé d'API de l'environnement est uniquement le chemin local stdio sans compte ; il n'est pas envoyé aux connexions WebSocket du serveur d'application. Lorsqu'un profil Codex de type abonnement est sélectionné, OpenClaw garde également `CODEX_API_KEY` et `OPENAI_API_KEY` hors de l'enfant stdio du serveur d'application généré et envoie les informations d'identification sélectionnées via la connexion RPC RPC du serveur d'application. Lorsque ce profil d'abonnement est bloqué par une limite d'utilisation Codex, OpenClaw peut passer au profil de clé d'API `openai:*` suivant sans changer le modèle sélectionné ni quitter le harnais Codex. Une fois le temps de réinitialisation de l'abonnement écoulé, le profil d'abonnement est à nouveau éligible.

## Génération d'images

Le plugin `openai` inclus enregistre la génération d'images via l'outil `image_generate`. Il prend en charge à la fois la génération d'images par clé d'OpenAIAPI OAuth et la génération d'images OAuth Codex via la même référence de modèle `openai/gpt-image-2`.

| Capacité                    | Clé OpenAI API                              | Codex OAuth                                          |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Référence de modèle         | `openai/gpt-image-2`                        | `openai/gpt-image-2`                                 |
| Auth                        | `OPENAI_API_KEY`                            | Connexion OpenAI Codex OAuth                         |
| Transport                   | Images OpenAI API                           | Backend Codex Responses                              |
| Max images par requête      | 4                                           | 4                                                    |
| Mode édition                | Activé (jusqu'à 5 images de référence)      | Activé (jusqu'à 5 images de référence)               |
| Remplacements de taille     | Pris en charge, y compris les tailles 2K/4K | Pris en charge, y compris les tailles 2K/4K          |
| Format d'image / résolution | Non transmis à l'API OpenAI Images API      | Mappé à une taille prise en charge lorsque c'est sûr |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du provider et le comportement de basculement.</Note>

`gpt-image-2` est la valeur par défaut pour la génération d'images texte vers image et l'édition d'images OpenAI. `gpt-image-1.5`, `gpt-image-1` et `gpt-image-1-mini` restent utilisables comme substitutions explicites de model. Utilisez `openai/gpt-image-1.5` pour une sortie PNG/WebP avec un fond transparent ; l'API `gpt-image-2` actuelle rejette `background: "transparent"`.

Pour une demande avec fond transparent, les agents doivent appeler `image_generate` avec `model: "openai/gpt-image-1.5"`, `outputFormat: "png"` ou `"webp"`, et `background: "transparent"` ; l'option de provider `openai.background` plus ancienne est toujours acceptée. OpenClaw protège également les routes OAuth publiques OpenAI et OpenAIOAuth Codex en réécrivant les demandes transparentes par défaut `openai/gpt-image-2` en `gpt-image-1.5` ; les points de terminaison Azure personnalisés et compatibles OpenAI conservent leurs noms de déploiement/model configurés.

Le même paramètre est exposé pour les exécutions CLI sans interface :

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

Utilisez les mêmes indicateurs `--output-format` et `--background` avec `openclaw infer image edit` lors du démarrage à partir d'un fichier d'entrée.
`--openai-background` reste disponible comme un alias spécifique à OpenAI.

Pour les installations Codex OAuth, conservez la même référence OAuth`openai/gpt-image-2`. Lorsqu'un profil OAuth `openai-codex`OAuth est configuré, OpenClawOAuth résout ce jeton d'accès OAuth stocké et envoie les demandes d'images via le backend Codex Responses. Il n'essaie pas d'abord `OPENAI_API_KEY`API ni ne revient silencieusement à une clé API pour cette demande. Configurez `models.providers.openai`API explicitement avec une clé API, une URL de base personnalisée ou un point de terminaison Azure lorsque vous souhaitez utiliser l'itinéraire direct de l'API Images OpenAIAPI.
Si ce point de terminaison d'image personnalisé se trouve sur une adresse LAN/privée de confiance, définissez également `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` ; OpenClaw bloque les points de terminaison d'image privés/internes compatibles OpenAI à moins que cette option d'adhésion ne soit présente.

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

## Génération de vidéo

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

OpenClaw ajoute une contribution de prompt GPT-5 partagée pour les exécutions de la famille GPT-5 sur plusieurs fournisseurs. Elle s'applique par ID de modèle, donc `openai/gpt-5.5`, les références héritées pré-réparation telles que `openai-codex/gpt-5.5`, `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` et d'autres références GPT-5 compatibles reçoivent la même superposition. Les modèles plus anciens de GPT-4.x ne la reçoivent pas.

Le harnais natif Codex inclus utilise le même comportement GPT-5 et la même superposition de heartbeat via les instructions développeur du serveur d'application Codex, de sorte que les sessions `openai/gpt-5.x` acheminées via Codex conservent le même suivi et les mêmes directives proactives de heartbeat même si Codex possède le reste du prompt du harnais.

La contribution GPT-5 ajoute un contrat de comportement balisé pour la persistance de la persona, la sécurité d'exécution, la discipline des OpenClaw, la forme de sortie, les vérifications d'achèvement et la vérification. Le comportement de réponse spécifique au canal et de message silencieux reste dans le prompt système partagé OpenClaw et la politique de livraison sortante. Le guidage GPT-5 est toujours activé pour les modèles correspondants. La couche de style d'interaction convivial est séparée et configurable.

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
  <Tab title="CLICLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>Les valeurs ne sont pas sensibles à la casse lors de l'exécution, donc `"Off"` et `"off"` désactivent tous deux la couche de style conviviale.</Tip>

<Note>L'ancien `plugins.entries.openai.config.personality` est toujours lu en tant que solution de repli de compatibilité lorsque le paramètre partagé `agents.defaults.promptOverlays.gpt5.personality` n'est pas défini.</Note>

## Voix et parole

<AccordionGroup>
  <Accordion title="Synthèse vocale (TTS)">
    Le plugin `openai` fourni enregistre la synthèse vocale pour la surface `messages.tts`.

    | Paramètre | Chemin de config | Par défaut |
    |-----------|------------------|-----------|
    | Modèle | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voix | `messages.tts.providers.openai.voice` | `coral` |
    | Vitesse | `messages.tts.providers.openai.speed` | (non défini) |
    | Instructions | `messages.tts.providers.openai.instructions` | (non défini, `gpt-4o-mini-tts` uniquement) |
    | Format | `messages.tts.providers.openai.responseFormat` | `opus` pour les notes vocales, `mp3` pour les fichiers |
    | Clé API | `messages.tts.providers.openai.apiKey` | Revient à `OPENAI_API_KEY` |
    | URL de base | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | Corps supplémentaire | `messages.tts.providers.openai.extraBody` / `extra_body` | (non défini) |

    Modèles disponibles : `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voix disponibles : `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    `extraBody` est fusionné dans le JSON de la requête `/audio/speech` après les champs générés par OpenClaw, utilisez-le donc pour les points de terminaison compatibles avec OpenAI qui nécessitent des clés supplémentaires comme `lang`. Les clés de prototype sont ignorées.

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
    Définissez `OPENAI_TTS_BASE_URL` pour remplacer l'URL de base TTS sans affecter le point de terminaison de l'API de chat. Le TTS OpenAI est toujours configuré via une clé API ; pour une discussion en direct uniquement via OAuth, utilisez le chemin vocal Realtime au lieu de la parole STT -> TTS en mode agent.
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    Le plugin `openai` inclus enregistre la transcription de la parole en texte par lots via
    la surface de transcription de compréhension des médias d'OpenClaw.

    - Modèle par défaut : `gpt-4o-transcribe`
    - Point de terminaison : OpenAI REST `/v1/audio/transcriptions`
    - Chemin d'entrée : téléchargement de fichier audio multipart
    - Pris en charge par OpenClaw partout où la transcription audio entrante utilise
    `tools.media.audio`, y compris les segments de canal vocal Discord et les pièces jointes audio de canal

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

    Les indices de langue et de prompt sont transmis à OpenAI lorsqu'ils sont fournis par la
    configuration multimédia audio partagée ou la demande de transcription par appel.

  </Accordion>

  <Accordion title="Transcription en temps réel">
    Le plugin `openai` intégré enregistre la transcription en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Langue | `...openai.language` | (non défini) |
    | Invite | `...openai.prompt` | (non défini) |
    | Durée de silence | `...openai.silenceDurationMs` | `800` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY`, ou `openai-codex` OAuth | Les clés API se connectent directement ; OAuth génère un secret client de transcription en temps réel |

    <Note>
    Utilise une connexion WebSocket vers `wss://api.openai.com/v1/realtime` avec de l'audio G.711 mu-law (`g711_ulaw` / `audio/pcmu`). Lorsque seul `openai-codex` OAuth est configuré, la Gateway génère un secret client éphémère de transcription en temps réel avant d'ouvrir le WebSocket. Ce fournisseur de flux est pour le chemin de transcription en temps réel de Voice Call ; la voix Discord enregistre actuellement de courts segments et utilise à la place le chemin de transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    Le plugin `openai` intégré enregistre la voix en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voix | `...openai.voice` | `alloy` |
    | Température (pont de déploiement Azure) | `...openai.temperature` | `0.8` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Durée de silence | `...openai.silenceDurationMs` | `500` |
    | Remplissage du préfixe | `...openai.prefixPaddingMs` | `300` |
    | Effort de raisonnement | `...openai.reasoningEffort` | (non défini) |
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY`, ou `openai-codex` OAuth | Browser Talk et les ponts backend non-Azure peuvent utiliser Codex OAuth |

    Voix Realtime intégrées disponibles pour `gpt-realtime-2` : `alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.
    OpenAI recommande `marin` et `cedar` pour la meilleure qualité Realtime. Il
    s'agit d'un ensemble distinct des voix de synthèse vocale ci-dessus ; ne supposez pas qu'une voix
    TTS telle que `fable`, `nova` ou `onyx` est valide pour les sessions Realtime.

    <Note>
    Les ponts backend Realtime OpenAI utilisent la forme de session WebSocket Realtime GA, qui n'accepte pas `session.temperature`. Les déploiements Azure OpenAI restent disponibles via `azureEndpoint` et `azureDeployment` et conservent la forme de session compatible avec le déploiement. Prend en charge l'appel d'outil bidirectionnel et l'audio G.711 u-law.
    </Note>

    <Note>
    La voix Realtime est sélectionnée lors de la création de la session. OpenAI permet à la plupart
    des champs de session de changer ultérieurement, mais la voix ne peut pas être modifiée une fois que
    le modèle a émis de l'audio dans cette session. OpenClaw expose actuellement les
    identifiants de voix Realtime intégrés sous forme de chaînes de caractères.
    </Note>

    <Note>
    Control UI Talk utilise les sessions de navigateur Realtime OpenAI avec un secret client éphémère
    généré par Gateway et un échange SDP WebRTC direct de navigateur avec l'OpenAI Realtime API. Lorsqu'aucune clé OpenAI API directe n'est configurée, le
    Gateway peut générer ce secret client avec le profil OAuth `openai-codex`
    sélectionné. Les relais Gateway et les ponts WebSocket backend Realtime Voice Call utilisent
    le même repli OAuth pour les points de terminaison natifs OpenAI. Une vérification en direct par le mainteneur est disponible avec
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` ;
    les branches OpenAI vérifient à la fois le pont WebSocket backend et l'échange
    SDP WebRTC du navigateur sans enregistrer les secrets.
    </Note>

  </Accordion>
</AccordionGroup>

## Points de terminaison Azure OpenAI

Le fournisseur `openai`OpenAIOpenClaw fourni peut cibler une ressource Azure OpenAI pour la génération d'images en remplaçant l'URL de base. Sur le chemin de génération d'images, OpenClaw détecte les noms d'hôte Azure sur `models.providers.openai.baseUrl` et passe automatiquement au format de requête d'Azure.

<Note>La voix en temps réel utilise un chemin de configuration distinct (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) et n'est pas affectée par `models.providers.openai.baseUrl`. Voir l'accordéon **Voix en temps réel** sous [Voix et parole](#voice-and-speech) pour ses paramètres Azure.</Note>

Utilisez Azure OpenAI lorsque :

- Vous disposez déjà d'un abonnement Azure OpenAI, d'un quota ou d'un contrat entreprise
- Vous avez besoin de contrôles de résidence régionale des données ou de conformité qu'Azure fournit
- Vous souhaitez garder le trafic à l'intérieur d'un locataire Azure existant

### Configuration

Pour la génération d'images Azure via le fournisseur `openai` fourni, pointez
`models.providers.openai.baseUrl` vers votre ressource Azure et définissez `apiKey`OpenAIOpenAI sur
la clé Azure OpenAI (et non une clé de la plateforme OpenAI) :

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

OpenClaw reconnaît ces suffixes d'hôte Azure pour le route de génération d'images
Azure :

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Pour les demandes de génération d'images sur un hôte Azure reconnu, OpenClaw :

- Envoie l'en-tête `api-key` au lieu de `Authorization: Bearer`
- Utilise des chemins délimités par le déploiement (`/openai/deployments/{deployment}/...`)
- Ajoute `?api-version=...` à chaque requête
- Utilise un délai d'expiration de requête par défaut de 600 s pour les appels de génération d'images Azure.
  Les valeurs `timeoutMs` par appel remplacent toujours cette valeur par défaut.

Les autres URL de base (OpenAI publiques, proxies compatibles avec OpenAI) conservent le format de demande d'image
standard de OpenAI.

<Note>Le routage Azure pour le chemin de génération d'images du fournisseur `openai`OpenClaw nécessite OpenClaw 2026.4.22 ou ultérieur. Les versions antérieures traitent tout `openai.baseUrl`OpenAI personnalisé comme le point de terminaison public OpenAI et échoueront avec les déploiements d'images Azure.</Note>

### Version de l'API

Définissez `AZURE_OPENAI_API_VERSION` pour épingler une version de prévisualisation ou GA Azure spécifique
pour le chemin de génération d'images Azure :

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

La valeur par défaut est `2024-12-01-preview` lorsque la variable n'est pas définie.

### Les noms de modèle sont des noms de déploiement

Azure OpenAI lie les modèles aux déploiements. Pour les demandes de génération d'images Azure routées via le fournisseur intégré `openai`, le champ `model` dans OpenClaw doit être le **nom de déploiement Azure** que vous avez configuré dans le portail Azure, et non l'identifiant du modèle OpenAI public.

Si vous créez un déploiement nommé `gpt-image-2-prod` qui sert `gpt-image-2` :

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La même règle de nom de déploiement s'applique aux appels de génération d'images routés via le fournisseur intégré `openai`.

### Disponibilité régionale

La génération d'images Azure est actuellement disponible uniquement dans un sous-ensemble de régions (par exemple `eastus2`, `swedencentral`, `polandcentral`, `westus3`, `uaenorth`). Consultez la liste actuelle des régions de Microsoft avant de créer un déploiement et confirmez que le modèle spécifique est proposé dans votre région.

### Différences de paramètres

Azure OpenAI et OpenAI public n'acceptent pas toujours les mêmes paramètres d'image. Azure peut rejeter des options que OpenAI public permet (par exemple certaines valeurs `background` sur `gpt-image-2`) ou ne les exposer que sur des versions spécifiques du modèle. Ces différences proviennent d'Azure et du modèle sous-jacent, et non de OpenClaw. Si une demande Azure échoue avec une erreur de validation, vérifiez l'ensemble de paramètres pris en charge par votre déploiement spécifique et la version de l'API dans le portail Azure.

<Note>
Azure OpenAI utilise un transport natif et un comportement de compatibilité mais ne reçoit pas
les en-têtes d'attribution masqués de OpenClawOpenAI — voir l'accordéon **Native vs OpenAI-compatible
routes** (Routes natives vs compatibles OpenAI) sous [Advanced configuration](#advanced-configuration).

Pour le trafic de chat ou de réponses sur Azure (au-delà de la génération d'images), utilisez le
flux d'intégration ou une configuration de fournisseur Azure dédiée — `openai.baseUrl`API seul
ne détecte pas la forme de l'API/auth Azure. Un fournisseur
`azure-openai-responses/*` séparé existe ; voir
l'accordéon Server-side compaction (Compactage côté serveur) ci-dessous.

</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw utilise WebSocket en priorité avec repli SSE (`"auto"`) pour `openai/*`.

    En mode `"auto"`, OpenClaw :
    - Réessaie un échec précoce de WebSocket avant de revenir au SSE
    - Après un échec, marque WebSocket comme dégradé pendant ~60 secondes et utilise le SSE pendant le refroidissement
    - Attache des en-têtes stables de session et d'identité de tour pour les nouvelles tentatives et reconnexions
    - Normalise les compteurs d'utilisation (`input_tokens` / `prompt_tokens`) selon les variantes de transport

    | Value | Behavior |
    |-------|----------|
    | `"auto"` (default) | WebSocket en priorité, repli SSE |
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
    OpenClaw exposes un commutateur de mode rapide partagé pour `openai/*` :

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
    Les substitutions de session prévalent sur la configuration. Effacer la substitution de session dans l'interface Sessions ramène la session à la valeur par défaut configurée.
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)"OpenAIAPI>
    L'API OpenAI expose le traitement prioritaire via `service_tier`OpenClaw. Définissez-le par modèle dans OpenClaw :

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
    `serviceTier`OpenAI est uniquement transmis aux points de terminaison natifs OpenAI (`api.openai.com`) et aux points de terminaison natifs Codex (`chatgpt.com/backend-api`OpenClaw). Si vous routez l'un ou l'autre fournisseur via un proxy, OpenClaw laisse `service_tier` intact.
    </Warning>

  </Accordion>

  <Accordion title="APICompactage côté serveur (API Responses)"OpenAI>
    Pour les modèles OpenAI Responses directs (`openai/*` sur `api.openai.com`OpenAI), le wrapper de flux Pi-harness du plugin OpenAI active automatiquement le compactage côté serveur :

    - Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
    - Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` par défaut : 70 % de `contextWindow` (ou `80000`OpenAIOpenAI si indisponible)

    Cela s'applique au chemin de harnais Pi intégré et aux hooks du fournisseur OpenAI utilisés par les exécutions intégrées. Le harnais native Codex app-server gère son propre contexte via Codex et est configuré par la route de l'agent par défaut d'OpenAI ou par la politique d'exécution du fournisseur/modèle.

    <Tabs>
      <Tab title="Activer explicitement"OpenAI>
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
    `responsesServerCompaction` contrôle uniquement l'injection de `context_management`OpenAI. Les modèles OpenAI Responses directs forcent toujours `store: true` sauf si la compatibilité définit `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    Pour les exécutions de la famille GPT-5 sur `openai/*`OpenClaw, OpenClaw peut utiliser un contrat d'exécution intégré plus strict :

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    Avec `strict-agentic`OpenClaw, OpenClaw :
    - Ne considère plus un tour de planification uniquement comme une progression réussie lorsqu'une action d'outil est disponible
    - Réessaie le tour avec une orientation d'agir maintenant
    - Active automatiquement `update_plan`OpenAI pour un travail substantiel
    - Affiche un état bloqué explicite si le modèle continue à planifier sans agir

    <Note>
    Limité aux exécutions de la famille GPT-5 d'OpenAI et Codex uniquement. Les autres fournisseurs et les anciennes familles de modèles conservent le comportement par défaut.
    </Note>

  </Accordion>

  <Accordion title="OpenAIRoutes natives vs compatibles OpenAI"OpenClawOpenAIOpenAIOpenAI>
    OpenClaw traite différemment les points de terminaison directs OpenAI, Codex et Azure OpenAI par rapport aux proxies génériques compatibles OpenAI `/v1` :

    **Routes natives** (`openai/*`OpenAI, Azure OpenAI) :
    - Conserve `reasoning: { effort: "none" }`OpenAI uniquement pour les models qui prennent en charge l'effort OpenAI `none`
    - Omet le raisonnement désactivé pour les models ou proxies qui rejettent `reasoning.effort: "none"`OpenAI
    - Définit par défaut les schémas de tools en mode strict
    - Attache des en-têtes d'attribution cachés uniquement sur les hôtes natifs vérifiés
    - Conserve le façonnage des requêtes réservé à OpenAI (`service_tier`, `store`, reasoning-compat, indices de prompt-cache)

    **Proxy/routes compatibles :**
    - Utilise un comportement de compatibilité plus souple
    - Supprime `store` des Completions des payloads non natifs `openai-completions`
    - Accepte le JSON de passage avancé `params.extra_body`/`params.extraBody`OpenAI pour les proxies Completions compatibles OpenAI
    - Accepte `params.chat_template_kwargs`OpenAIOpenAI pour les proxies Completions compatibles OpenAI tels que vLLM
    - N'impose pas de schémas de tools stricts ni d'en-tères natifs uniquement

    Azure OpenAI utilise un transport natif et un comportement de compatibilité mais ne reçoit pas les en-têtes d'attribution cachés.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du model" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, références de models et comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres de tool d'image partagés et sélection du provider.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="OAuthOAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
