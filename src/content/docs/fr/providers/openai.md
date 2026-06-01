---
summary: "Utiliser OpenAI via des clés API ou un abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI fournit des API de développement pour les modèles GPT, et Codex est également disponible en tant qu'agent de codage dans le cadre du plan ChatGPT via les clients Codex de OpenAI. OpenClaw maintient ces surfaces distinctes afin que la configuration reste prévisible.

OpenClaw utilise `openai/*` comme la route modèle OpenAI canonique. L'agent intégré active les modèles OpenAI exécutés via le runtime natif de l'application serveur Codex par défaut ; l'authentification directe par clé OpenAI API reste disponible pour les surfaces OpenAI sans agent telles que les images, les embeddings, la parole et le temps réel.

- **Modèles d'agent** - modèles `openai/*` via le runtime Codex ; connectez-vous avec
  l'auth Codex pour une utilisation par abonnement ChatGPT/Codex, ou configurez une clé OpenAI API compatible Codex
  en sauvegarde lorsque vous voulez intentionnellement une auth par clé API.
- **API OpenAI non-agent** - accès direct à la plateforme OpenAI avec une facturation à l'utilisation via OpenAIOpenAI`OPENAI_API_KEY`OpenAIAPI ou l'intégration de clé API OpenAI.
- **Configuration héritée** - les références de modèle `openai-codex/*` sont réparées par `openclaw doctor --fix` en `openai/*` ainsi que le runtime Codex.

OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans les outils et workflows externes tels que OpenClaw.

Le provider, le modèle, le runtime et le canal sont des couches distinctes. Si ces étiquettes sont mélangées, lisez [Agent runtimes](/fr/concepts/agent-runtimes) avant de modifier la configuration.

## Choix rapide

| Objectif                                                   | Utilisation                                                         | Notes                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec runtime natif Codex          | `openai/gpt-5.5`                                                    | Configuration par défaut de l'agent OpenAI. Connectez-vous avec l'authentification Codex.       |
| Facturation directe par clé API pour les modèles d'agent   | `openai/gpt-5.5`API plus un profil de clé API compatible avec Codex | Utilisez `auth.order.openai` pour placer la sauvegarde après l'authentification par abonnement. |
| Facturation directe par clé API via OpenClaw explicite     | `openai/gpt-5.5` plus runtime provider/modèle `openclaw`            | Sélectionnez un profil de clé `openai` API normal.                                              |
| Dernier alias instantané API de ChatGPT                    | `openai/chat-latest`                                                | Clé API directe uniquement. Alias en mouvement pour les expériences, pas celui par défaut.      |
| Authentification par abonnement ChatGPT/Codex via OpenClaw | `openai/gpt-5.5` plus runtime provider/modèle `openclaw`            | Sélectionnez un profil d'authentification `openai-codex` pour l'itinéraire de compatibilité.    |
| Génération ou modification d'images                        | `openai/gpt-image-2`                                                | Fonctionne avec `OPENAI_API_KEY` ou OpenAI Codex OAuth.                                         |
| Images à fond transparent                                  | `openai/gpt-image-1.5`                                              | Utilisez `outputFormat=png` ou `webp` et `openai.background=transparent`.                       |

## Table de correspondance des noms

Les noms sont similaires mais pas interchangeables :

| Nom que vous voyez                      | Couche                        | Signification                                                                                                                                       |
| --------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`                                | Préfixe du fournisseur        | Route canonique du modèle OpenAI ; les tours d'agent utilisent le runtime Codex.                                                                    |
| `openai-codex`                          | Préfixe d'auth/profil hérité  | Ancien espace de noms de profil OAuth/abonnement OpenAI Codex. Les profils existants et OpenAIOAuth`auth.order.openai-codex` fonctionnent toujours. |
| Plugin `codex`                          | Plugin                        | Plugin OpenClaw intégré qui fournit le runtime d'application serveur Codex natif et les contrôles de chat OpenClaw`/codex`.                         |
| provider/model `agentRuntime.id: codex` | Runtime de l'agent            | Forcer le harnais d'application native Codex pour les tours intégrés correspondants.                                                                |
| `/codex ...`                            | Ensemble de commandes de chat | Lier/contrôler les fils de discussion du serveur d'application Codex depuis une conversation.                                                       |
| `runtime: "acp", agentId: "codex"`      | Itinéraire de session ACP     | Chemin de repli explicite qui exécute Codex via ACP/acpx.                                                                                           |

Cela signifie qu'une config peut contenir intentionnellement des références de `openai/*` modèle tandis que les profils d'auth pointent toujours vers des informations d'identification compatibles Codex. Préférez `auth.order.openai` pour les nouvelles config ; les profils `openai-codex:*` existants et `auth.order.openai-codex` restent pris en charge. `openclaw doctor --fix` réécrit les références de modèle `openai-codex/*`OpenAI héritées vers la route de modèle OpenAI canonique.

<Note>
  GPT-5.5 est disponible via l'accès direct par clé API de la plateforme OpenAIAPI et les routes d'abonnement/OAuth. Pour un abonnement ChatGPT/Codex plus l'exécution Codex native, utilisez `openai/gpt-5.5` ; la configuration d'exécution non définie sélectionne désormais le harnais Codex pour les tours d'agent OpenAI. Utilisez les profils de clé OpenAI API uniquement lorsque vous souhaitez une
  authentification directe par clé API pour un modèle d'agent OpenAI.
</Note>

<Note>
  Les tours de modèle agent OpenAI nécessitent le plugin inclus Codex app-server. La configuration de runtime explicite OpenClaw reste disponible en tant que voie de compatibilité optionnelle. Lorsque OpenClaw est explicitement sélectionné avec un profil d'auth `openai-codex`, OpenClaw conserve la référence publique du modèle sous la forme `openai/*` et route en interne via le transport
  Codex-auth. Exécutez `openclaw doctor --fix` pour réparer les `openai-codex/*`, `codex-cli/*` périmés ou les épingles de session runtime obsolètes qui ne proviennent pas d'une configuration de runtime explicite.
</Note>

## OpenClaw couverture des fonctionnalités

| capacité OpenAI                           | surface OpenClaw                                                                              | Statut                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Chat / Réponses                           | `openai/<model>` model provider                                                               | Oui                                                                                     |
| Modèles d'abonnement Codex                | `openai/<model>` avec `openai-codex` OAuth                                                    | Oui                                                                                     |
| Références aux modèles Codex hérités      | `openai-codex/<model>` ou `codex-cli/<model>`                                                 | Réparé par le médecin pour `openai/<model>`                                             |
| Harnais de serveur d'application Codex    | `openai/<model>` avec runtime omis ou provider/model `agentRuntime.id: codex`                 | Oui                                                                                     |
| Recherche Web côté serveur                | Outil de réponses natif OpenAI                                                                | Oui, lorsque la recherche Web est activée et aucun fournisseur épinglé                  |
| Images                                    | `image_generate`                                                                              | Oui                                                                                     |
| Vidéos                                    | `video_generate`                                                                              | Oui                                                                                     |
| Synthèse vocale                           | `messages.tts.provider: "openai"` / `tts`                                                     | Oui                                                                                     |
| Traitement de la parole en texte par lots | `tools.media.audio` / compréhension des médias                                                | Oui                                                                                     |
| Flux de la parole en texte                | Appel vocal `streaming.provider: "openai"`                                                    | Oui                                                                                     |
| Voix en temps réel                        | Voice Call `realtime.provider: "openai"` / Control UI Talk `talk.realtime.provider: "openai"` | Oui (nécessite des crédits de la plateforme OpenAI, et non un abonnement Codex/ChatGPT) |
| Plongements (Embeddings)                  | fournisseur d'incorporation de mémoire                                                        | Oui                                                                                     |

<Note>
  OpenAI Realtime voice (utilisé par le OpenAI`realtime.provider: "openai"` de Voice Call et
  Control UI Talk avec `talk.realtime.provider: "openai"`OpenAIAPIOpenAIOAuth) passe par la
  **API Realtime de la plateforme OpenAI** publique, qui est facturée sur les crédits
  de la plateforme OpenAI plutôt que sur le quota d'abonnement Codex/ChatGPT.
  Un compte avec un OAuth Codex fonctionnel qui exécute des modèles de chat
  `openai-codex/*` sans problème peut toujours rencontrer l'erreur `insufficient_quota`OpenAI /
  « You exceeded your current quota » au premier tour Realtime si la même
  organisation OpenAI n'a pas configuré la facturation de la plateforme.

Solution : rechargez les crédits de la plateforme sur
[platform.openai.com/account/billing](https://platform.openai.com/account/billing)
pour l'organisation qui soutient vos identifiants realtime. Realtime accepte
soit une `OPENAI_API_KEY` de plateforme (configurée via `talk.realtime.providers.openai.apiKey`
pour Control UI Talk, ou `plugins.entries.voice-call.config.realtime.providers.openai.apiKey`
pour Voice Call) soit un profil OAuth `openai-codex`OAuthAPI dont l'organisation
sous-jacente dispose de la facturation de la plateforme — les deux voies génèrent
des secrets client Realtime via l'API de la plateforme, donc dans les deux cas
l'organisation a besoin de crédits de plateforme financés. Pour les tours de
chat, vous pouvez toujours utiliser `openai-codex/*`OpenClaw sur la même installation
OpenClaw ; Realtime est le seul itinéraire nécessitant la facturation de la
plateforme.

</Note>

## Memory embeddings

OpenClaw peut utiliser OpenAI, ou un point de terminaison d'embeddings compatible OpenAI,
pour les embeddings d'indexation et de requête OpenClawOpenAIOpenAI`memory_search` :

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

Pour les points de terminaison compatibles OpenAI qui nécessitent des étiquettes d'intégration asymétriques, définissez
`queryInputType` et `documentInputType` sous `memorySearch`. OpenClaw transmet
ceux-ci en tant que champs de requête `input_type` spécifiques au provider : les intégrations de requête utilisent
`queryInputType` ; les segments de mémoire indexés et l'indexation par lots utilisent
`documentInputType`. Consultez la [référence de configuration de la mémoire](/fr/reference/memory-config#provider-specific-config) pour l'exemple complet.

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="APIClé API (Plateforme OpenAI)">
    **Idéal pour :** accès direct à l'API et facturation à l'utilisation.

    <Steps>
      <Step title="Obtenir votre clé API">
        Créez ou copiez une clé API depuis le [tableau de bord de la Plateforme OpenAI](https://platform.openai.com/api-keys).
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

    | Modèle réf.          | Configuration d'exécution      | Route                       | Auth             |
    | --------------------- | ------------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omis / provider/model `agentRuntime.id: "codex"` | harnais d'appli Codex | profil OpenAI compatible Codex |
    | `openai/gpt-5.4-mini` | omis / provider/model `agentRuntime.id: "codex"` | harnais d'appli Codex | profil OpenAI compatible Codex |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "openclaw"`              | runtime embarqué OpenClaw      | profil `openai` ou profil `openai-codex` sélectionné |

    <Note>
    Les modèles agents `openai/*` utilisent le harnais d'appli Codex. Pour utiliser l'auth par clé API pour un modèle agent, créez un profil de clé API compatible Codex et ordonnez-le avec `auth.order.openai` ; `OPENAI_API_KEY` reste le repli direct pour les surfaces de l'OpenAI API non-agent. Les entrées `auth.order.openai-codex` plus anciennes fonctionnent toujours.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    Pour essayer le modèle Instant actuel de ChatGPT depuis l'OpenAI API, définissez le modèle
    sur `openai/chat-latest` :

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` est un alias évolutif. OpenAI le documente comme le dernier modèle Instant utilisé dans ChatGPT et recommande `gpt-5.5` pour une utilisation en production de l'API, donc gardez `openai/gpt-5.5` comme défaut stable sauf si vous voulez explicitement ce comportement d'alias. L'alias accepte actuellement uniquement la verbosité texte `medium`, donc OpenClaw normalise les redéfinitions incompatibles de verbosité texte OpenAI pour ce modèle.

    <Warning>
    OpenClaw n'expose **pas** `openai/gpt-5.3-codex-spark`. Les requêtes en direct à l'OpenAI API rejettent cette route directe de fournisseur. Utilisez `openai-codex/gpt-5.3-codex-spark` uniquement lorsque le catalogue Codex l'expose pour votre compte connecté.
    </Warning>

  </Tab>

  <Tab title="Abonnement Codex">
    **Idéal pour :** utiliser votre abonnement ChatGPT/Codex avec l'exécution native de l'application serveur Codex au lieu d'une clé API distincte. Le cloud Codex nécessite une connexion ChatGPT.

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
      <Step title="Utiliser la route canonique de modèle OpenAI">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        Aucune configuration d'exécution n'est requise pour le chemin par défaut. Les tours d'agent OpenAI
        sélectionnent automatiquement le runtime d'application serveur Codex natif, et OpenClaw
        installe ou répare le plugin Codex inclus lorsque cette route est choisie.
      </Step>
      <Step title="Vérifier que l'auth Codex est disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```

        Une fois la passerelle en cours d'exécution, envoyez `/codex status` ou `/codex models`
        dans le chat pour vérifier le runtime de l'application serveur native.
      </Step>
    </Steps>

    ### Résumé de la route

    | Réf. de modèle | Configuration du runtime | Route | Auth |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omis / provider/model `agentRuntime.id: "codex"` | Harnais d'application serveur Codex natif | Connexion Codex ou profil d'auth `openai` ordonné |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "openclaw"` | Runtime intégré OpenClaw avec transport d'auth Codex interne | Profil `openai-codex` sélectionné |
    | `openai-codex/gpt-5.5` | réparé par doctor | Ancienne route réécrite vers `openai/gpt-5.5` | Profil `openai-codex` existant |
    | `codex-cli/gpt-5.5` | réparé par doctor | Ancienne route CLI réécrite vers `openai/gpt-5.5` | Auth application serveur Codex |

    <Warning>
    Préférez `openai/gpt-5.5` pour la nouvelle configuration d'agent basée sur un abonnement. Les anciennes
    références `openai-codex/gpt-*` sont d'anciennes routes OpenClaw et non le chemin d'exécution Codex natif ;
    exécutez `openclaw doctor --fix` lorsque vous souhaitez les migrer vers des références canoniques
    `openai/*`. `openai-codex/gpt-5.3-codex-spark` est l'exception pour
    les comptes dont le catalogue Codex annonce ce modèle ; les références directes `openai/*` et
    Azure pour celui-ci restent supprimées.
    </Warning>

    <Note>
    Le préfixe de modèle `openai-codex/*` est une ancienne configuration réparée par doctor. Pour
    la configuration commune d'abonnement plus runtime natif, connectez-vous avec l'auth Codex
    mais gardez la référence de modèle comme `openai/gpt-5.5`. La nouvelle configuration doit placer l'ordre d'auth d'agent OpenAI
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

    Avec une sauvegarde de clé API, gardez le modèle sur `openai/gpt-5.5` et placez
    l'ordre d'auth sous `openai`. OpenClaw essaiera d'abord l'abonnement, puis
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
    ```

    <Note>
    L'intégration n'importe plus le matériel OAuth depuis `~/.codex`. Connectez-vous via OAuth du navigateur (par défaut) ou le flux de code d'appareil ci-dessus — OpenClaw gère les informations d'identification résultantes dans son propre magasin d'auth d'agent.
    </Note>

    ### Vérifier et récupérer le routage Codex OAuth

    Utilisez ces commandes pour voir quel modèle, runtime et route d'auth votre agent
    par défaut utilise :

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

    Si une ancienne configuration possède encore `openai-codex/gpt-*` ou un épingle de session de runtime OpenAI obsolète
    sans configuration de runtime explicite, réparez-la :

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    Si `models auth list --provider openai-codex` n'affiche aucun profil utilisable, reconnectez-vous :

    ```bash
    openclaw models auth login --provider openai-codex
    openclaw models status --probe --probe-provider openai-codex
    ```

    Utilisez `--profile-id` lorsque vous souhaitez plusieurs connexions Codex OAuth dans le même
    agent et souhaitez les contrôler ultérieurement via l'ordre d'auth ou `/model ...@<profileId>` :

    ```bash
    openclaw models auth login --provider openai-codex --profile-id openai-codex:ritsuko
    openclaw models auth login --provider openai-codex --profile-id openai-codex:lain
    ```

    `openai/*` est la route de modèle pour les tours d'agent OpenAI via Codex. L'ID de fournisseur
    de profil/auth `openai-codex` reste accepté pour les profils existants
    et le liste CLI.

    ### Indicateur de statut

    Le chat `/status` montre quel runtime de modèle est actif pour la session actuelle.
    Le harnais d'application serveur Codex inclus apparaît comme `Runtime: OpenAI Codex` pour
    les tours de modèle d'agent OpenAI. Les épingles de session de runtime OpenAI obsolètes sont réparées vers Codex sauf si
    la configuration épingle explicitement OpenClaw.

    ### Avertissement du docteur

    Si les routes `openai-codex/*` ou les épingles de runtime OpenAI obsolètes restent dans la configuration ou
    l'état de la session, `openclaw doctor --fix` les réécrit vers `openai/*` avec le
    runtime Codex sauf si OpenClaw est explicitement configuré.

    ### Plafond de fenêtre contextuelle

    OpenClaw traite les métadonnées du modèle et le plafond de contexte d'exécution comme des valeurs distinctes.

    Pour `openai/gpt-5.5` via le catalogue Codex OAuth :

    - `contextWindow` natif : `1000000`
    - Plafond de runtime `contextTokens` par défaut : `272000`

    Le plafond par défaut plus petit offre de meilleures caractéristiques de latence et de qualité en pratique. Remplacez-le par `contextTokens` :

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
    Utilisez `contextWindow` pour déclarer les métadonnées de modèle natives. Utilisez `contextTokens` pour limiter le budget de contexte d'exécution.
    </Note>

    ### Récupération du catalogue

    OpenClaw utilise les métadonnées du catalogue Codex en amont pour `gpt-5.5` lorsqu'elles sont
    présentes. Si la découverte en direct de Codex omet la ligne `gpt-5.5` alors que
    le compte est authentifié, OpenClaw synthétise cette ligne de modèle OAuth pour que
    les exécutions cron, sous-agent et de modèle par défaut configuré n'échouent pas avec
    `Unknown model`.

  </Tab>
</Tabs>

## Authentification native du serveur d'application Codex

Le harnais natif du serveur d'application Codex utilise des références de modèle `openai/*` ainsi qu'une configuration d'exécution omise ou un fournisseur/modèle `agentRuntime.id: "codex"`, mais son authentification reste basée sur le compte. OpenClaw sélectionne l'authentification dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous
   `auth.order.openai`. Les profils `openai-codex:*` existants et
   `auth.order.openai-codex` restent valides pour les installations plus anciennes.
2. Le compte existant du serveur d'application, tel qu'une connexion ChatGPT locale Codex CLI.
3. Uniquement pour les lancements locaux du serveur d'application stdio, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsque le serveur d'application signale aucun compte et exige toujours
   une authentification OpenAI.

Cela signifie qu'une connexion d'abonnement local ChatGPT/Codex n'est pas remplacée simplement
parce que le processus de passerelle possède également `OPENAI_API_KEY` pour les modèles OpenAI directs
ou les embeddings. Le repli sur la clé d'API Env API est uniquement le chemin local stdio sans compte ; il
n'est pas envoyé aux connexions du serveur d'application WebSocket. Lorsqu'un profil Codex de type abonnement
est sélectionné, OpenClaw conserve également `CODEX_API_KEY` et `OPENAI_API_KEY`
hors du processus enfant stdio du serveur d'application généré et envoie les informations d'identification sélectionnées
via la RPC de connexion du serveur d'application RPC. Lorsque ce profil d'abonnement est bloqué par une
limite d'utilisation Codex, OpenClaw peut basculer vers le profil suivant ordonné de clé d'API `openai:*` API
sans changer le modèle sélectionné ni abandonner le harnais Codex.
Une fois l'heure de réinitialisation de l'abonnement passée, le profil d'abonnement est
de nouveau éligible.

## Génération d'images

Le plugin intégré `openai` enregistre la génération d'images via l'outil `image_generate`.
Il prend en charge à la fois la génération d'images par clé d'API OpenAI API et la génération d'images OAuth Codex OAuth
via la même référence de modèle `openai/gpt-image-2`.

| Capacité                  | Clé API OpenAI                              | Codex OAuth                          |
| ------------------------- | ------------------------------------------- | ------------------------------------ |
| Référence de modèle       | `openai/gpt-image-2`                        | `openai/gpt-image-2`                 |
| Auth                      | `OPENAI_API_KEY`                            | Connexion Codex OAuth OpenAI         |
| Transport                 | API Images OpenAI                           | Backend Codex Responses              |
| Max images per request    | 4                                           | 4                                    |
| Edit mode                 | Activé (jusqu'à 5 images de référence)      | Enabled (up to 5 reference images)   |
| Size overrides            | Pris en charge, y compris les tailles 2K/4K | Supported, including 2K/4K sizes     |
| Aspect ratio / resolution | Not forwarded to OpenAI Images API          | Mapped to a supported size when safe |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Voir [Image Generation](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

`gpt-image-2`OpenAI est la valeur par défaut pour la génération d'images texte-vers-image OpenAI et le montage d'images. `gpt-image-1.5`, `gpt-image-1` et `gpt-image-1-mini` restent utilisables en tant que substitutions explicites de modèle. Utilisez `openai/gpt-image-1.5` pour la sortie PNG/WebP avec fond transparent ; l'API `gpt-image-2`API actuelle rejette `background: "transparent"`.

Pour une demande de fond transparent, les agents doivent appeler `image_generate` avec `model: "openai/gpt-image-1.5"`, `outputFormat: "png"` ou `"webp"`, et `background: "transparent"` ; l'ancienne option de fournisseur `openai.background`OpenClawOpenAIOpenAIOAuth est toujours acceptée. OpenClaw protège également les routes publiques OpenAI et OpenAI Codex OAuth en réécrivant les demandes transparentes par défaut `openai/gpt-image-2` vers `gpt-image-1.5`OpenAI ; les points de terminaison Azure et personnalisés compatibles OpenAI conservent leurs noms de déploiement/modèle configurés.

Le même paramètre est exposé pour les exécutions CLI sans interface :

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

Pour les installations Codex OAuth, conservez la même référence `openai/gpt-image-2`. Lorsqu'un profil OAuth `openai-codex` est configuré, OpenClaw résout ce jeton d'accès OAuth stocké et envoie les demandes d'images via le backend Codex Responses. Il n'essaie pas d'abord `OPENAI_API_KEY` ni ne retombe silencieusement sur une clé API pour cette demande. Configurez `models.providers.openai` explicitement avec une clé API, une URL de base personnalisée ou un point de terminaison Azure lorsque vous souhaitez plutôt l'itinéraire direct de l'API Images OpenAIAPI.
Si ce point de terminaison d'image personnalisé se trouve sur une adresse LAN/privée de confiance, définissez également `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` ; OpenClaw maintient les points de terminaison d'image privés/internes compatibles OpenAI bloqués, sauf si cette option d'adhésion est présente.

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

Le plugin inclus `openai` enregistre la génération vidéo via l'outil `video_generate`.

| Capacité                | Valeur                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Modèle par défaut       | `openai/sora-2`                                                                                 |
| Modes                   | Texte vers vidéo, image vers vidéo, modification vidéo unique                                   |
| Entrées de référence    | 1 image ou 1 vidéo                                                                              |
| Remplacements de taille | Pris en charge pour le texte vers vidéo et l'image vers vidéo                                   |
| Autres remplacements    | `aspectRatio`, `resolution`, `audio`, `watermark` sont ignorés avec un avertissement de l'outil |

Les demandes OpenAI d'image vers vidéo utilisent `POST /v1/videos` avec une image
`input_reference`. Les modifications vidéo uniques utilisent `POST /v1/videos/edits` avec la
vidéo téléchargée dans le champ `video`.

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Voir [Video Generation](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Contribution de prompt GPT-5

OpenClaw ajoute une contribution de prompt GPT-5 partagée pour les exécutions de la famille GPT-5 sur les surfaces de prompt assemblées par OpenClaw. Elle s'applique par ID de modèle, donc les routes OpenClaw/fournisseur telles que les références legacy pré-réparation (OpenClawOpenClawOpenClaw`openai-codex/gpt-5.5`), `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5`, et d'autres références GPT-5 compatibles reçoivent la même superposition. Les modèles plus anciens GPT-4.x ne le font pas.

Le harnais natif Codex groupé ne reçoit pas cette superposition GPT-5 OpenClaw via les instructions développeur du serveur d'application Codex. Codex natif conserve le comportement de base, de modèle et de doc de projet appartenant à Codex, tandis qu'OpenClaw désactive la personnalité intégrée de Codex pour les fils natifs afin que les fichiers de personnalité de l'espace de travail de l'agent restent faisant autorité. OpenClaw contribue uniquement au contexte d'exécution tel que la livraison par canal, les outils dynamiques OpenClaw, la délégation ACP, le contexte de l'espace de travail et les compétences OpenClaw.

La contribution GPT-5 ajoute un contrat de comportement étiqueté pour la persistance de la personnalité, la sécurité d'exécution, la discipline des outils, la forme de la sortie, les vérifications d'achèvement et la vérification sur les prompts correspondants assemblés par OpenClaw. Le comportement de réponse spécifique au canal et de message silencieux reste dans le prompt système OpenClaw partagé et la politique de livraison sortante. La couche de style d'interaction convivial est séparée et configurable.

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

<Tip>Les valeurs ne respectent pas la casse lors de l'exécution, donc `"Off"` et `"off"` désactivent tous deux le layer de style convivial.</Tip>

<Note>L'ancien `plugins.entries.openai.config.personality` est toujours lu comme solution de repli de compatibilité lorsque le paramètre partagé `agents.defaults.promptOverlays.gpt5.personality` n'est pas défini.</Note>

## Voix et synthèse vocale

<AccordionGroup>
  <Accordion title="Synthèse vocale (TTS)">
    Le plugin `openai` fourni enregistre la synthèse vocale pour la surface `messages.tts`.

    | Paramètre | Chemin de configuration | Par défaut |
    |-----------|------------------------|-----------|
    | Modèle | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voix | `messages.tts.providers.openai.speakerVoice` | `coral` |
    | Vitesse | `messages.tts.providers.openai.speed` | (non défini) |
    | Instructions | `messages.tts.providers.openai.instructions` | (non défini, `gpt-4o-mini-tts` uniquement) |
    | Format | `messages.tts.providers.openai.responseFormat` | `opus` pour les notes vocales, `mp3` pour les fichiers |
    | Clé API | `messages.tts.providers.openai.apiKey` | Revient à `OPENAI_API_KEY` |
    | URL de base | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | Corps supplémentaire | `messages.tts.providers.openai.extraBody` / `extra_body` | (non défini) |

    Modèles disponibles : `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voix disponibles : `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    `extraBody` est fusionné dans le JSON de la requête `/audio/speech` après les champs générés par OpenClaw, utilisez-le donc pour les points de terminaison compatibles avec OpenAI qui nécessitent des clés supplémentaires telles que `lang`. Les clés de prototype sont ignorées.

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", speakerVoice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    Définissez `OPENAI_TTS_BASE_URL` pour remplacer l'URL de base TTS sans affecter le point de terminaison de l'API de chat. Le TTS OpenAI est toujours configuré via une clé API ; pour une discussion en direct uniquement OAuth, utilisez le chemin vocal Realtime au lieu de la parole STT -> TTS en mode agent.
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    Le plugin `openai` inclus enregistre la conversion par lot de la parole en texte via
    la surface de transcription de compréhension des médias d'OpenClaw.

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
    configuration partagée des médias audio ou la demande de transcription par appel.

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
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY`, ou `openai-codex` OAuth | Les clés API se connectent directement ; OAuth génère un secret client de transcription en temps réel |

    <Note>
    Utilise une connexion WebSocket vers `wss://api.openai.com/v1/realtime` avec de l'audio G.711 u-law (`g711_ulaw` / `audio/pcmu`). Lorsque seul `openai-codex` OAuth est configuré, la Gateway génère un secret client éphémère de transcription en temps réel avant d'ouvrir la WebSocket. Ce fournisseur de flux est destiné au chemin de transcription en temps réel de Voice Call ; la voix Discord enregistre actuellement de courts segments et utilise à la place le chemin de transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="Voix en temps réel">
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
    | Authentification | `...openai.apiKey`, `OPENAI_API_KEY`, ou `openai-codex` OAuth | Browser Talk et les ponts backend non-Azure peuvent utiliser Codex OAuth |

    Voix en temps réel intégrées disponibles pour `gpt-realtime-2` : `alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.
    OpenAI recommande `marin` et `cedar` pour la meilleure qualité en temps réel. Il
    s'agit d'un ensemble distinct des voix de synthèse vocale ci-dessus ; ne supposez pas qu'une voix TTS
    telle que `fable`, `nova`, ou `onyx` est valide pour les sessions en temps réel.

    <Note>
    Les ponts backend temps réel OpenAI utilisent la forme de session WebSocket Realtime GA, qui n'accepte pas `session.temperature`. Les déploiements Azure OpenAI restent disponibles via `azureEndpoint` et `azureDeployment` et conservent la forme de session compatible avec le déploiement. Prend en charge l'appel d'outil bidirectionnel et l'audio G.711 u-law.
    </Note>

    <Note>
    La voix en temps réel est sélectionnée lors de la création de la session. OpenAI permet à la plupart
    des champs de session de changer ultérieurement, mais la voix ne peut pas être modifiée une fois que
    le modèle a émis de l'audio dans cette session. OpenClaw expose actuellement les
    identifiants de voix en temps réel intégrés sous forme de chaînes.
    </Note>

    <Note>
    Control UI Talk utilise les sessions navigateur en temps réel OpenAI avec un secret client éphémère
    frappé par Gateway et un échange SDP WebRTC navigateur direct contre
    l'OpenAI Realtime API. Lorsqu'aucune clé OpenAI API directe n'est configurée, le
    Gateway peut frapper ce secret client avec le profil `openai-codex` OAuth
    sélectionné. Le relais Gateway et les ponts WebSocket backend temps réel Voice Call utilisent
    le même repli OAuth pour les points de terminaison natifs OpenAI. La vérification en direct par le responsable
    est disponible avec
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` ;
    les branches OpenAI vérifient à la fois le pont WebSocket backend et l'échange
    SDP WebRTC navigateur sans enregistrer de secrets.
    </Note>

  </Accordion>
</AccordionGroup>

## Points de terminaison Azure OpenAI

Le fournisseur intégré `openai` peut cibler une ressource Azure OpenAI pour la génération d'images en remplaçant l'URL de base. Sur le chemin de génération d'images, OpenClaw détecte les noms d'hôte Azure sur `models.providers.openai.baseUrl` et passe automatiquement au format de requête d'Azure.

<Note>La voix en temps réel utilise un chemin de configuration séparé (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) et n'est pas affectée par `models.providers.openai.baseUrl`. Consultez l'accordéon **Voix en temps réel** sous [Voix et parole](#voice-and-speech) pour ses paramètres Azure.</Note>

Utilisez Azure OpenAI lorsque :

- Vous possédez déjà un abonnement Azure OpenAI, un quota ou un contrat entreprise
- Vous avez besoin d'une résidence régionale des données ou de contrôles de conformité fournis par Azure
- Vous souhaitez garder le trafic à l'intérieur d'un locataire Azure existant

### Configuration

Pour la génération d'images Azure via le fournisseur intégré `openai`, pointez `models.providers.openai.baseUrl` vers votre ressource Azure et définissez `apiKey` sur la clé Azure OpenAI (et non une clé de plateforme OpenAI) :

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

OpenClaw reconnaît ces suffixes d'hôte Azure pour la route de génération d'images Azure :

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Pour les demandes de génération d'images sur un hôte Azure reconnu, OpenClaw :

- Envoie l'en-tête `api-key` au lieu de `Authorization: Bearer`
- Utilise des chemins avec portée de déploiement (`/openai/deployments/{deployment}/...`)
- Ajoute `?api-version=...` à chaque demande
- Utilise un délai d'expiration de demande par défaut de 600s pour les appels de génération d'images Azure.
  Les valeurs `timeoutMs` par appel remplacent toujours cette valeur par défaut.

D'autres URL de base (OpenAI public, proxies compatibles avec OpenAI) conservent le format de demande d'image OpenAI standard.

<Note>Le routage Azure pour le chemin de génération d'images du fournisseur `openai` nécessite OpenClaw 2026.4.22 ou une version ultérieure. Les versions antérieures traitent tout `openai.baseUrl` personnalisé comme le point de terminaison public OpenAI et échoueront avec les déploiements d'images Azure.</Note>

### Version de API

Définissez `AZURE_OPENAI_API_VERSION` pour figer une version de prévisualisation ou de disponibilité générale Azure spécifique
pour le chemin de génération d'images Azure :

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

La valeur par défaut est `2024-12-01-preview` lorsque la variable n'est pas définie.

### Les noms de modèle sont des noms de déploiement

Azure OpenAI lie les modèles aux déploiements. Pour les demandes de génération d'images Azure
routées via le fournisseur `openai` inclus, le champ `model` dans OpenClaw
doit être le **nom de déploiement Azure** que vous avez configuré dans le portail Azure, et non
l'identifiant du modèle public OpenAI.

Si vous créez un déploiement appelé `gpt-image-2-prod` qui sert `gpt-image-2` :

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La même règle de nom de déploiement s'applique aux appels de génération d'images routés via
le fournisseur `openai` inclus.

### Disponibilité régionale

La génération d'images Azure est actuellement disponible uniquement dans un sous-ensemble de régions
(par exemple `eastus2`, `swedencentral`, `polandcentral`, `westus3`,
`uaenorth`). Vérifiez la liste actuelle des régions de Microsoft avant de créer un
déploiement, et confirmez que le modèle spécifique est proposé dans votre région.

### Différences de paramètres

Azure OpenAI et le OpenAI public n'acceptent pas toujours les mêmes paramètres d'image.
Azure peut rejeter des options que le OpenAI public autorise (par exemple certaines
valeurs `background` sur `gpt-image-2`) ou ne les exposer que sur des versions de modèle
spécifiques. Ces différences proviennent d'Azure et du modèle sous-jacent, et non
de OpenClaw. Si une demande Azure échoue avec une erreur de validation, vérifiez
l'ensemble de paramètres pris en charge par votre déploiement spécifique et la version de l'API dans le
portail Azure.

<Note>
Azure OpenAI utilise le transport natif et le comportement de compatibilité, mais ne reçoit pas
les en-têtes d'attribution masqués de OpenClaw — voir l'accordéon **Native vs routes compatibles OpenAI
sous [Configuration avancée](#advanced-configuration).

Pour le trafic de chat ou de Réponses sur Azure (au-delà de la génération d'images), utilisez le
flux d'intégration (onboarding) ou une configuration de fournisseur Azure dédiée — `openai.baseUrl` seul
ne prend pas en charge la forme de l'API/auth Azure. Un fournisseur
`azure-openai-responses/*` séparé existe ; voir
l'accordéon Compactage côté serveur ci-dessous.

</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)"OpenClaw>
    OpenClaw utilise WebSocket en priorité avec SSE en repli (`"auto"`) pour `openai/*`.

    En mode `"auto"`OpenClaw, OpenClaw :
    - Réessaie une défaillance précoce de WebSocket avant de basculer vers SSE
    - Après une défaillance, marque WebSocket comme dégradé pendant ~60 secondes et utilise SSE pendant le refroidissement
    - Attache des en-têtes stables de session et de tour d'identité pour les tentatives et reconnexions
    - Normalise les compteurs d'utilisation (`input_tokens` / `prompt_tokens`) sur les variantes de transport

    | Valeur | Comportement |
    |-------|----------|
    | `"auto"` (par défaut) | WebSocket en priorité, repli SSE |
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
    ```OpenAIAPI

    Documentation OpenAI connexe :
    - [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocketAPI)
    - [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Fast mode"OpenClaw>
    OpenClaw expose un commutateur de mode rapide partagé pour `openai/*` :

    - **Chat/UI :** `/fast status|on|off`
    - **Config :** `agents.defaults.models["<provider>/<model>"].params.fastMode`OpenClawOpenAI

    Lorsqu'il est activé, OpenClaw mappe le mode rapide au traitement prioritaire OpenAI (`service_tier = "priority"`). Les valeurs existantes de `service_tier` sont conservées, et le mode rapide ne réécrit pas `reasoning` ou `text.verbosity`.

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
    Les substitutions de session l'emportent sur la configuration. Effacer la substitution de session dans l'interface Sessions ramène la session à la valeur par défaut configurée.
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
    `serviceTier` est uniquement transmis aux points de terminaison natifs d'OpenAI (`api.openai.com`) et aux points de terminaison natifs de Codex (`chatgpt.com/backend-api`). Si vous acheminez l'un ou l'autre provider via un proxy, OpenClaw laisse `service_tier` intact.
    </Warning>

  </Accordion>

  <Accordion title="APICompactage côté serveur (API Responses)"OpenAI>
    Pour les modèles OpenAI Responses directs (`openai/*` sur `api.openai.com`OpenAIOpenClaw), le wrapper de flux OpenClaw du plugin OpenAI active automatiquement le compactage côté serveur :

    - Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
    - Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` par défaut : 70 % de `contextWindow` (ou `80000`OpenClawOpenAIOpenAI si indisponible)

    Cela s'applique au chemin d'exécution intégré d'OpenClaw et aux hooks de fournisseur OpenAI utilisés par les exécutions intégrées. le harnais app-server natif de Codex gère son propre contexte via Codex et est configuré par la route d'agent par défaut d'OpenAI ou la stratégie d'exécution du fournisseur/modèle.

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

  <Accordion title="Mode agentique strict GPT">
    Pour les exécutions de la famille GPT-5 sur `openai/*`, OpenClaw peut utiliser un contrat d'exécution intégré plus strict :

    ```json5
    {
      agents: {
        defaults: {
          embeddedAgent: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    Avec `strict-agentic`, OpenClaw :
    - Ne traite plus un tour de planification uniquement comme une progression réussie lorsqu'une action d'outil est disponible
    - Réessaie le tour avec une incitation d'action immédiate
    - Active automatiquement `update_plan` pour un travail substantiel
    - Affiche un état bloqué explicite si le modèle continue de planifier sans agir

    <Note>
    Limité uniquement aux exécutions de la famille GPT-5 OpenAI et Codex. Les autres fournisseurs et les familles de modèles plus anciens conservent le comportement par défaut.
    </Note>

  </Accordion>

  <Accordion title="OpenAIRoutes natives vs compatibles OpenAI"OpenClawOpenAIOpenAIOpenAI>
    OpenClaw traite différemment les points de terminaison directs OpenAI, Codex et Azure OpenAI par rapport aux proxys génériques compatibles OpenAI `/v1` :

    **Routes natives** (`openai/*`OpenAI, Azure OpenAI) :
    - Conserve `reasoning: { effort: "none" }`OpenAI uniquement pour les modèles qui prennent en charge l'effort OpenAI `none`
    - Omet le raisonnement désactivé pour les modèles ou proxys qui rejettent `reasoning.effort: "none"`OpenAI
    - Définit les schémas d'outils en mode strict par défaut
    - Attache des en-têtes d'attribution cachés uniquement sur les hôtes natifs vérifiés
    - Conserve le façonnage des requêtes exclusif à OpenAI (`service_tier`, `store`, reasoning-compat, indices de prompt-cache)

    **Routes de proxy/compatibles :**
    - Utilise un comportement de compatibilité plus souple
    - Supprime les `store` de Completions des payloads non natifs `openai-completions`
    - Accepte le JSON de passage avancé `params.extra_body`/`params.extraBody`OpenAI pour les proxys de Completions compatibles OpenAI
    - Accepte `params.chat_template_kwargs`OpenAIOpenAI pour les proxys de Completions compatibles OpenAI tels que vLLM
    - N'impose pas de schémas d'outils stricts ou d'en-tères natifs uniquement

    Azure OpenAI utilise un transport natif et un comportement de compatibilité mais ne reçoit pas les en-têtes d'attribution cachés.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres d'outil d'image partagés et sélection du fournisseur.
  </Card>
  <Card title="Génération de vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres partagés de l'outil vidéo et sélection du provider.
  </Card>
  <Card title="OAuthOAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
</CardGroup>
