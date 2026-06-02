---
summary: "Utiliser OpenAI via des clés API ou un abonnement Codex dans OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI fournit des API de développeur pour les modèles GPT, et Codex est également disponible en tant qu'agent de codage ChatGPT-plan via les clients Codex d'OpenAI. OpenClaw utilise un id de fournisseur, `openai`, pour les deux formes d'authentification.

OpenClaw utilise `openai/*` comme la route canonique du modèle OpenAI. L'agent intégré active les modèles OpenAI exécutés via le runtime natif de l'application serveur Codex par défaut ; l'authentification directe par clé OpenAI API reste disponible pour les surfaces OpenAI non agents telles que les images, les embeddings, la parole et la temps réel.

- **Modèles d'agent** - modèles `openai/*` via le runtime Codex ; connectez-vous avec
  l'authentification Codex pour une utilisation d'abonnement ChatGPT/Codex, ou configurez une clé OpenAI API compatible Codex de secours lorsque vous voulez intentionnellement une authentification par clé API.
- **API OpenAI non agents** - accès direct à la plateforme OpenAI avec une facturation à l'usage via `OPENAI_API_KEY` ou une intégration par clé OpenAI API.
- **Configuration héritée** - les références de modèle Codex héritées sont réparées par
  `openclaw doctor --fix` vers `openai/*` plus le runtime Codex.

OpenAI prend explicitement en charge l'utilisation de l'abonnement OAuth dans les outils et workflows externes tels que OpenClaw.

Le fournisseur, le modèle, le runtime et le canal sont des couches distinctes. Si ces étiquettes sont mélangées, lisez [Runtimes d'agent](/fr/concepts/agent-runtimes) avant de modifier la configuration.

## Choix rapide

| Objectif                                                   | Utilisation                                                         | Notes                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec runtime natif Codex          | `openai/gpt-5.5`                                                    | Configuration par défaut de l'agent OpenAI. Connectez-vous avec l'authentification Codex.       |
| Facturation directe par clé API pour les modèles d'agent   | `openai/gpt-5.5`API plus un profil de clé API compatible avec Codex | Utilisez `auth.order.openai` pour placer la sauvegarde après l'authentification par abonnement. |
| Facturation directe par clé API via OpenClaw explicite     | `openai/gpt-5.5` plus runtime provider/modèle `openclaw`            | Sélectionnez un profil de clé `openai` API normal.                                              |
| Dernier alias instantané API de ChatGPT                    | `openai/chat-latest`                                                | Clé API directe uniquement. Alias en mouvement pour les expériences, pas celui par défaut.      |
| Authentification par abonnement ChatGPT/Codex via OpenClaw | `openai/gpt-5.5` plus runtime provider/modèle `openclaw`            | Sélectionnez un profil OAuth `openai` pour la route de compatibilité.                           |
| Génération ou modification d'images                        | `openai/gpt-image-2`                                                | Fonctionne avec `OPENAI_API_KEY` ou OpenAI Codex OAuth.                                         |
| Images à fond transparent                                  | `openai/gpt-image-1.5`                                              | Utilisez `outputFormat=png` ou `webp` et `openai.background=transparent`.                       |

## Table de correspondance des noms

Les noms sont similaires mais pas interchangeables :

| Nom que vous voyez                      | Couche                        | Signification                                                                                                               |
| --------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `openai`                                | Préfixe du fournisseur        | Route canonique du modèle OpenAI ; les tours d'agent utilisent le runtime Codex.                                            |
| préfixe Codex OpenAI hérité             | Préfixe hérité                | Espace de noms de modèle/profil plus ancien. `openclaw doctor --fix` le migre vers `openai`.                                |
| Plugin `codex`                          | Plugin                        | Plugin OpenClaw intégré qui fournit le runtime d'application serveur Codex natif et les contrôles de chat OpenClaw`/codex`. |
| provider/model `agentRuntime.id: codex` | Runtime de l'agent            | Forcer le harnais d'application native Codex pour les tours intégrés correspondants.                                        |
| `/codex ...`                            | Ensemble de commandes de chat | Lier/contrôler les fils de discussion du serveur d'application Codex depuis une conversation.                               |
| `runtime: "acp", agentId: "codex"`      | Itinéraire de session ACP     | Chemin de repli explicite qui exécute Codex via ACP/acpx.                                                                   |

Cela signifie qu'une config peut contenir intentionnellement des références de modèle `openai/*` tandis que les profils d'auth pointent vers des identifiants API-key ou ChatGPT/Codex OAuth. Utilisez `auth.order.openai` pour la config ; `openclaw doctor --fix` réécrit les anciennes références de modèle Codex, les anciens IDs de profil d'auth Codex et l'ancien ordre d'auth Codex vers la route canonique OpenAI.

<Note>
  GPT-5.5 est disponible via l'accès direct par OpenAI-key de la plateforme API et les routes d'abonnement/OAuth. Pour un abonnement ChatGPT/Codex plus l'exécution native Codex, utilisez `openai/gpt-5.5` ; la configuration d'exécution non définie sélectionne désormais le harnais Codex pour les tours d'agent OpenAI. Utilisez les profils OpenAI-key API uniquement lorsque vous souhaitez une auth
  directe par API-key pour un modèle d'agent OpenAI.
</Note>

<Note>
  Les tours de modèle d'agent OpenAI nécessitent le plugin app-server Codex groupé. La configuration d'exécution explicite OpenClaw reste disponible en tant que route de compatibilité optionnelle. Lorsque OpenClaw est explicitement sélectionné avec un profil OAuth `openai`, OpenClaw conserve la référence de modèle publique comme `openai/*` et route en interne via le transport Codex-auth. Exécutez
  `openclaw doctor --fix` pour réparer les anciennes références de modèle Codex obsolètes, `codex-cli/*`, ou les anciens épinglages de session d'exécution qui ne proviennent pas de la configuration d'exécution explicite.
</Note>

## OpenClaw couverture des fonctionnalités

| capacité OpenAI                           | surface OpenClaw                                                                                       | Statut                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Chat / Réponses                           | Fournisseur de modèle `openai/<model>`                                                                 | Oui                                                                                     |
| Modèles d'abonnement Codex                | `openai/<model>` avec OpenAI OAuth                                                                     | Oui                                                                                     |
| Références aux modèles Codex hérités      | anciennes références de modèle Codex ou `codex-cli/<model>`                                            | Réparé par le médecin en `openai/<model>`                                               |
| Harnais de serveur d'application Codex    | `openai/<model>` avec runtime omis ou fournisseur/modèle `agentRuntime.id: codex`                      | Oui                                                                                     |
| Recherche Web côté serveur                | Outil de réponses natif OpenAI                                                                         | Oui, lorsque la recherche Web est activée et aucun fournisseur épinglé                  |
| Images                                    | `image_generate`                                                                                       | Oui                                                                                     |
| Vidéos                                    | `video_generate`                                                                                       | Oui                                                                                     |
| Synthèse vocale                           | `messages.tts.provider: "openai"` / `tts`                                                              | Oui                                                                                     |
| Traitement de la parole en texte par lots | `tools.media.audio` / compréhension des médias                                                         | Oui                                                                                     |
| Flux de la parole en texte                | Appel vocal `streaming.provider: "openai"`                                                             | Oui                                                                                     |
| Voix en temps réel                        | Appel vocal `realtime.provider: "openai"` / Contrôle Interface Talk `talk.realtime.provider: "openai"` | Oui (nécessite des crédits de la plateforme OpenAI, et non un abonnement Codex/ChatGPT) |
| Plongements (Embeddings)                  | fournisseur d'incorporation de mémoire                                                                 | Oui                                                                                     |

<Note>
  La voix Realtime d'OpenAI (utilisée par le `realtime.provider: "openai"` de l'appel vocal et
  le Contrôle Interface Talk avec `talk.realtime.provider: "openai"`) passe par l'
  **OpenAI Realtime de la plateforme API** publique, qui est facturée sur les crédits
  de la plateforme OpenAI plutôt que sur le quota d'abonnement Codex/ChatGPT. Un compte
  avec un OpenAI OAuth sain qui exécute des modèles de chat pris en charge par Codex sans
  problème peut toujours rencontrer `insufficient_quota` / "Vous avez dépassé votre quota
  actuel" au premier tour Realtime si la même organisation OpenAI n'a pas
  configuré la facturation de la plateforme.

Solution : rechargez les crédits de la plateforme sur
[platform.openai.com/account/billing](https://platform.openai.com/account/billing)
pour l'organisation prenant en charge vos identifiants realtime. Realtime accepte
soit une clé de `OPENAI_API_KEY` de plateforme (configurée via `talk.realtime.providers.openai.apiKey`
pour le Contrôle Interface Talk, ou `plugins.entries.voice-call.config.realtime.providers.openai.apiKey`
pour l'appel vocal) soit un profil OAuth `openai` dont l'organisation
sous-jacente dispose d'une facturation de plateforme — les deux routes génèrent des secrets client Realtime
via l'API de la plateforme, donc dans tous les cas l'organisation a besoin de crédits de plateforme financés.
Pour les tours de chat, vous pouvez toujours utiliser des modèles `openai/*` pris en charge par Codex sur la même
installation OpenClaw ; Realtime est la seule route qui nécessite une facturation de plateforme.

</Note>

## Memory embeddings

OpenClaw peut utiliser OpenAI, ou un point de terminaison d'intégration compatible avec OpenAI, pour
l'indexation `memory_search` et les intégrations de requête :

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

Pour les points de terminaison compatibles avec OpenAI qui nécessitent des étiquettes d'intégration asymétriques, définissez
`queryInputType` et `documentInputType` sous `memorySearch`. OpenClaw transmet
ceux-ci en tant que champs de requête `input_type` spécifiques au provider : les intégrations de requête utilisent
`queryInputType` ; les blocs de mémoire indexés et l'indexation par lot utilisent
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
      <Step title="Exécuter l'intégration">
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

    | Réf. de modèle         | Config. d'exécution         | Route                       | Auth             |
    | ---------------------- | --------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omis / provider/model `agentRuntime.id: "codex"` | Harnais app-server Codex | Profil OpenAI compatible Codex |
    | `openai/gpt-5.4-mini` | omis / provider/model `agentRuntime.id: "codex"` | Harnais app-server Codex | Profil OpenAI compatible Codex |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "openclaw"`              | Runtime intégré OpenClaw      | Profil `openai` sélectionné |

    <Note>
    Les modèles agent `openai/*` utilisent le harnais app-server Codex. Pour utiliser l'auth par clé API pour un modèle agent, créez un profil de clé API compatible Codex et ordonnez-le avec `auth.order.openai` ; `OPENAI_API_KEY`OpenAIAPI reste le repli direct pour les surfaces OpenAI non-agent. Exécutez `openclaw doctor --fix` pour migrer les anciennes entrées d'ordre d'auth Codex obsolètes.
    </Note>

    ### Exemple de configuration

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    Pour essayer le modèle Instant actuel de ChatGPT depuis l'API OpenAI, définissez le modèle
    sur `openai/chat-latest` :

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` est un alias évolutif. API le documente comme étant le dernier modèle Instant utilisé dans ChatGPT et recommande `gpt-5.5` pour une utilisation en production de l'OpenClaw, gardez donc `openai/gpt-5.5` comme défaut stable, sauf si vous souhaitez explicitement ce comportement d'alias. L'alias accepte actuellement uniquement la verbosité de texte `medium`, donc OpenAI normalise les redéfinitions incompatibles de verbosité de texte OpenClaw pour ce modèle.

    <Warning>
    OpenAI n'expose **pas** `gpt-5.3-codex-spark` sur la route directe par clé API API. Il n'est disponible que via les entrées du catalogue d'abonnement Codex lorsque votre compte connecté l'expose.
    </Warning>

  </Tab>

  <Tab title="Abonnement Codex">
    **Idéal pour :** utiliser votre abonnement ChatGPT/Codex avec l'exécution native de l'application serveur Codex au lieu d'une clé API distincte. Le cloud Codex nécessite une connexion ChatGPT.

    <Steps>
      <Step title="Exécuter Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai
        ```

        Ou exécutez OAuth directement :

        ```bash
        openclaw models auth login --provider openai
        ```

        Pour les configurations sans interface graphique ou hostiles aux rappels (callback), ajoutez `--device-code` pour vous connecter avec un flux de code d'appareil ChatGPT au lieu du rappel du navigateur localhost :

        ```bash
        openclaw models auth login --provider openai --device-code
        ```
      </Step>
      <Step title="Utiliser la route canonique du modèle OpenAI">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        Aucune configuration d'exécution n'est requise pour le chemin par défaut. Les tours de l'agent OpenAI
        sélectionnent automatiquement le runtime d'application serveur Codex natif, et OpenClaw
        installe ou répare le plugin Codex inclus lorsque cette route est choisie.
      </Step>
      <Step title="Vérifier que l'auth Codex est disponible">
        ```bash
        openclaw models list --provider openai
        ```

        Une fois la passerelle en cours d'exécution, envoyez `/codex status` ou `/codex models`
        dans le chat pour vérifier le runtime de l'application serveur native.
      </Step>
    </Steps>

    ### Résumé de la route

    | Réf de modèle | Config du runtime | Route | Auth |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omis / provider/model `agentRuntime.id: "codex"` | Harnais d'application serveur Codex natif | Connexion Codex ou profil d'auth `openai` ordonné |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "openclaw"` | Runtime embarqué OpenClaw avec transport d'auth Codex interne | Profil OAuth `openai` sélectionné |
    | réf legacy Codex GPT-5.5 | réparé par doctor | Route legacy réécrite en `openai/gpt-5.5` | Profil OpenAI OAuth migré |
    | `codex-cli/gpt-5.5` | réparé par doctor | Route CLI legacy réécrite en `openai/gpt-5.5` | Auth application serveur Codex |

    <Warning>
    Privilégiez `openai/gpt-5.5` pour la nouvelle configuration d'agent basée sur un abonnement. Les anciennes
    références GPT Codex legacy sont des routes legacy OpenClaw, et non le chemin d'exécution Codex natif ;
    exécutez `openclaw doctor --fix` lorsque vous souhaitez les migrer vers les références canoniques
    `openai/*`. `gpt-5.3-codex-spark` reste limité aux comptes dont le
    catalogue d'abonnement Codex annonce ce modèle ; les références directes OpenAI et API
    pour celui-ci restent supprimées.
    </Warning>

    <Note>
    Le préfixe de modèle Codex legacy est une configuration legacy réparée par doctor. Pour
    la configuration commune d'abonnement plus runtime natif, connectez-vous avec l'auth Codex
    mais gardez la référence de modèle comme `openai/gpt-5.5`. La nouvelle configuration doit placer l'ordre d'auth de l'agent OpenAI
    sous `auth.order.openai` ; le doctor migre les anciennes
    entrées d'ordre d'auth Codex legacy.
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

    Avec une sauvegarde par clé API, gardez le modèle sur `openai/gpt-5.5` et placez
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
            "openai:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```

    <Note>
    L'intégration n'importe plus le matériel OAuth depuis `~/.codex`. Connectez-vous via OAuth navigateur (par défaut) ou le flux de code d'appareil ci-dessus — OpenClaw gère les informations d'identification résultantes dans son propre magasin d'auth d'agent.
    </Note>

    ### Vérifier et récupérer le routage OAuth Codex

    Utilisez ces commandes pour voir quel modèle, runtime et route d'auth votre agent par défaut
    utilise :

    ```bash
    openclaw models status
    openclaw models auth list --provider openai
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    Pour un agent spécifique, ajoutez `--agent <id>` :

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai
    ```

    Si une ancienne configuration contient encore des références GPT Codex legacy ou une épingle de session de runtime OpenAI
    obsolète sans configuration de runtime explicite, réparez-la :

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    Si `models auth list --provider openai` n'affiche aucun profil utilisable, connectez-vous
    à nouveau :

    ```bash
    openclaw models auth login --provider openai
    openclaw models status --probe --probe-provider openai
    ```

    Utilisez `--profile-id` lorsque vous souhaitez plusieurs connexions OAuth Codex dans le même
    agent et que vous souhaitez les contrôler ultérieurement via l'ordre d'auth ou `/model ...@<profileId>` :

    ```bash
    openclaw models auth login --provider openai --profile-id openai:ritsuko
    openclaw models auth login --provider openai --profile-id openai:lain
    ```

    `openai/*` est la route de modèle pour les tours d'agent OpenAI via Codex. Exécutez
    `openclaw doctor --fix` pour migrer les anciens identifiants de profil de préfixe Codex OpenAI legacy
    et les entrées d'ordre avant de vous fier à l'ordre des profils.

    ### Indicateur de statut

    Le chat `/status` montre quel runtime de modèle est actif pour la session actuelle.
    Le harnais d'application serveur Codex inclus apparaît comme `Runtime: OpenAI Codex` pour
    les tours de modèle d'agent OpenAI. Les épingles de session de runtime OpenAI obsolètes sont réparées vers Codex à moins que
    la configuration n'épingle explicitement OpenClaw.

    ### Avertissement du doctor

    Si les références de modèle Codex legacy ou les épingles de runtime OpenAI obsolètes restent dans la configuration ou
    l'état de la session, `openclaw doctor --fix` les réécrit en `openai/*` avec le
    runtime Codex à moins que OpenClaw ne soit explicitement configuré.

    ### Plafond de la fenêtre de contexte

    OpenClaw traite les métadonnées du modèle et le plafond de contexte du runtime comme des valeurs distinctes.

    Pour `openai/gpt-5.5` via le catalogue OAuth Codex :

    - `contextWindow` native : `1000000`
    - Plafond par défaut du runtime `contextTokens` : `272000`

    Le plafond par défaut plus petit offre de meilleures caractéristiques de latence et de qualité en pratique. Remplacez-le par `contextTokens` :

    ```json5
    {
      models: {
        providers: {
          openai: {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Utilisez `contextWindow` pour déclarer les métadonnées natives du modèle. Utilisez `contextTokens` pour limiter le budget de contexte du runtime.
    </Note>

    ### Récupération du catalogue

    OpenClaw utilise les métadonnées du catalogue Codex en amont pour `gpt-5.5` lorsqu'elles sont
    présentes. Si la découverte en direct de Codex omet la ligne `gpt-5.5` alors que
    le compte est authentifié, OpenClaw synthétise cette ligne de modèle OAuth afin que
    les tâches cron, sous-agent et de modèle par défaut configuré n'échouent pas avec
    `Unknown model`.

  </Tab>
</Tabs>

## Authentification native du serveur d'application Codex

Le harnais d'application serveur Codex natif utilise des références de modèle `openai/*` ainsi qu'une configuration d'exécution omise ou un `agentRuntime.id: "codex"` fournisseur/modèle, mais son authentification est toujours basée sur le compte. OpenClaw sélectionne l'authentification dans cet ordre :

1. Profils d'authentification OpenAI commandés pour l'agent, de préférence sous
   `auth.order.openai`. Exécutez `openclaw doctor --fix` pour migrer les anciens
   identifiants de profil d'authentification Codex hérités et l'ordre d'authentification Codex hérité.
2. Le compte existant du serveur d'application, tel qu'une connexion ChatGPT locale Codex CLI.
3. Pour les lancements locaux d'application serveur stdio uniquement, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsque l'application serveur ne signale aucun compte et exige toujours
   une authentification OpenAI.

Cela signifie qu'une connexion locale par abonnement ChatGPT/Codex n'est pas remplacée simplement
parce que le processus de passerelle dispose également de `OPENAI_API_KEY` pour les modèles OpenAI directs
ou les incorporations. Le repli sur la clé d'API de l'environnement n'est que le chemin local stdio sans compte ; elle
n'est pas envoyée aux connexions WebSocket de l'application serveur. Lorsqu'un profil Codex de type abonnement
est sélectionné, OpenClaw conserve également `CODEX_API_KEY` et `OPENAI_API_KEY`
hors de l'enfant d'application serveur stdio généré et envoie les identifiants sélectionnés
via la connexion RPC de l'application serveur. Lorsque ce profil d'abonnement est bloqué par une
limite d'utilisation Codex, OpenClaw peut passer au profil de clé d'API `openai:*` suivant
dans l'ordre sans changer le modèle sélectionné ni quitter le harnais
Codex. Une fois l'heure de réinitialisation de l'abonnement passée, le profil d'abonnement est
à nouveau éligible.

## Génération d'images

Le plugin `openai` inclus enregistre la génération d'images via l'outil `image_generate`.
Il prend en charge à la fois la génération d'images par clé d'OpenAI API et la génération d'images OAuth Codex
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

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du provider et le comportement de basculement.</Note>

`gpt-image-2` est la valeur par défaut pour la génération de texte vers image et l'édition d'images OpenAI. `gpt-image-1.5`, `gpt-image-1` et `gpt-image-1-mini` restent utilisables en tant que substitutions explicites de model. Utilisez `openai/gpt-image-1.5` pour une sortie PNG/WebP avec un fond transparent ; l'API `gpt-image-2` actuel rejette `background: "transparent"`.

Pour une demande avec fond transparent, les agents doivent appeler `image_generate` avec `model: "openai/gpt-image-1.5"`, `outputFormat: "png"` ou `"webp"`, et `background: "transparent"` ; l'option de provider `openai.background` plus ancienne est toujours acceptée. OpenClaw protège également les routes OAuth publiques OpenAI et OpenAIOAuth Codex en réécrivant les requêtes transparentes `openai/gpt-image-2` par défaut vers `gpt-image-1.5` ; les points de terminaison Azure personnalisés compatibles OpenAI conservent leurs noms de déploiement/model configurés.

Le même paramètre est exposé pour les exécutions CLI sans interface :

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

Utilisez les mêmes indicateurs `--output-format` et `--background` avec `openclaw infer image edit` lorsque vous partez d'un fichier d'entrée.
`--openai-background` reste disponible en tant qu'alias spécifique à OpenAI.

Pour les installations ChatGPT/Codex OAuth, conservez la même référence `openai/gpt-image-2`. Lorsqu'un profil OAuth `openai` est configuré, OpenClaw résout ce jeton d'accès OAuth stocké et envoie les demandes d'images via le backend Codex Responses. Il n'essaie pas d'abord `OPENAI_API_KEY` ni ne retourne silencieusement à une clé API pour cette demande. Configurez `models.providers.openai` explicitement avec une clé API, une URL de base personnalisée ou un point de terminaison Azure lorsque vous souhaitez utiliser l'itinéraire direct de l'OpenAI Images API à la place.
Si ce point de terminaison d'image personnalisé se trouve sur une adresse LAN/privée de confiance, définissez également `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` ; OpenClaw maintient les points de terminaison d'image compatibles OpenAI privés/internal bloqués, sauf si cette option d'adhésion est présente.

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
| Remplacements de taille | Pris en charge pour le texte vers vidéo et l'image vers vidéo                                   |
| Autres remplacements    | `aspectRatio`, `resolution`, `audio`, `watermark` sont ignorés avec un avertissement de l'outil |

Les demandes image vers vidéo OpenAI utilisent `POST /v1/videos` avec une image `input_reference`. Les modifications vidéo uniques utilisent `POST /v1/videos/edits` avec la vidéo téléchargée dans le champ `video`.

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du provider et le comportement de basculement.</Note>

## Contribution de prompt GPT-5

OpenClaw ajoute une contribution de prompt GPT-5 partagée pour les exécutions de la famille GPT-5 sur les surfaces de prompt assemblées par OpenClaw. Elle s'applique par ID de modèle, donc les itinéraires OpenClaw/provider tels que les références legacy pré-réparation (référence legacy Codex GPT-5.5), `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` et d'autres références GPT-5 compatibles reçoivent la même superposition. Les modèles plus anciens GPT-4.x ne le font pas.

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

<Tip>Les valeurs ne sont pas sensibles à la casse lors de l'exécution, donc `"Off"` et `"off"` désactivent tous les deux la couche de style convivial.</Tip>

<Note>L'ancien `plugins.entries.openai.config.personality` est toujours lu comme solution de repli de compatibilité lorsque le paramètre partagé `agents.defaults.promptOverlays.gpt5.personality` n'est pas défini.</Note>

## Voix et synthèse vocale

<AccordionGroup>
  <Accordion title="Synthèse vocale (TTS)">
    Le plugin `openai` inclus enregistre la synthèse vocale pour la surface `messages.tts`.

    | Paramètre | Chemin de config | Par défaut |
    |---------|------------|---------|
    | Modèle | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voix | `messages.tts.providers.openai.speakerVoice` | `coral` |
    | Vitesse | `messages.tts.providers.openai.speed` | (non défini) |
    | Instructions | `messages.tts.providers.openai.instructions` | (non défini, `gpt-4o-mini-tts` uniquement) |
    | Format | `messages.tts.providers.openai.responseFormat` | `opus` pour les notes vocales, `mp3` pour les fichiers |
    | Clé API | `messages.tts.providers.openai.apiKey` | Revient à `OPENAI_API_KEY` |
    | URL de base | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | Corps supplémentaire | `messages.tts.providers.openai.extraBody` / `extra_body` | (non défini) |

    Modèles disponibles : `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voix disponibles : `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    `extraBody` est fusionné dans le JSON de requête `/audio/speech` après les champs générés par OpenClaw, utilisez-le donc pour les points de terminaison compatibles avec OpenAI qui nécessitent des clés supplémentaires telles que `lang`. Les clés de prototype sont ignorées.

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
    Définissez `OPENAI_TTS_BASE_URL` pour remplacer l'URL de base TTS sans affecter le point de terminaison de l'API de chat. Le TTS OpenAI est toujours configuré via une clé API ; pour un retour vocal en direct uniquement via OAuth, utilisez le chemin vocal Realtime au lieu de la parole STT -> TTS en mode agent.
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    Le plugin `openai` inclus enregistre la conversion parole vers texte par lots via
    la surface de transcription de compréhension des médias d'OpenClaw.

    - Modèle par défaut : `gpt-4o-transcribe`
    - Point de terminaison : OpenAI REST `/v1/audio/transcriptions`
    - Chemin d'entrée : téléchargement de fichier audio multiparts
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
    configuration multimédia audio partagée ou la demande de transcription par appel.

  </Accordion>

  <Accordion title="Reconnaissance vocale en temps réel">
    Le plugin `openai` inclus enregistre la reconnaissance vocale en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de configuration | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Langue | `...openai.language` | (non défini) |
    | Invite | `...openai.prompt` | (non défini) |
    | Durée de silence | `...openai.silenceDurationMs` | `800` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY`, ou `openai` OAuth | Les clés API se connectent directement ; OAuth génère un secret client de reconnaissance vocale en temps réel |

    <Note>
    Utilise une connexion WebSocket vers `wss://api.openai.com/v1/realtime` avec de l'audio G.711 mu-law (`g711_ulaw` / `audio/pcmu`). Lorsque seul `openai` OAuth est configuré, le Gateway génère un secret client éphémère de reconnaissance vocale en temps réel avant d'ouvrir la WebSocket. Ce fournisseur de streaming est destiné au chemin de reconnaissance vocale en temps réel de Voice Call ; la voix Discord enregistre actuellement de courts segments et utilise à la place le chemin de transcription par lot `tools.media.audio`.
    </Note>

  </Accordion>

  <Accordion title="Voix en temps réel">
    Le plugin `openai` inclus enregistre la voix en temps réel pour le plugin Voice Call.

    | Paramètre | Chemin de config | Par défaut |
    |---------|------------|---------|
    | Modèle | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voix | `...openai.voice` | `alloy` |
    | Température (pont de déploiement Azure) | `...openai.temperature` | `0.8` |
    | Seuil VAD | `...openai.vadThreshold` | `0.5` |
    | Durée de silence | `...openai.silenceDurationMs` | `500` |
    | Remplissage du préfixe | `...openai.prefixPaddingMs` | `300` |
    | Effort de raisonnement | `...openai.reasoningEffort` | (non défini) |
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY`, ou `openai` OAuth | Browser Talk et les ponts backend non-Azure peuvent utiliser OpenAI OAuth |

    Voix en temps réel intégrées disponibles pour `gpt-realtime-2` : `alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.
    OpenAI recommande `marin` et `cedar` pour la meilleure qualité en temps réel. Il s'agit
    d'un ensemble distinct des voix synthèse vocale ci-dessus ; ne supposez pas qu'une voix TTS
    telle que `fable`, `nova`, ou `onyx` est valide pour les sessions en temps réel.

    <Note>
    Les ponts backend temps réel OpenAI utilisent la forme de session WebSocket temps réel GA, qui n'accepte pas `session.temperature`. Les déploiements Azure OpenAI restent disponibles via `azureEndpoint` et `azureDeployment` et conservent la forme de session compatible avec le déploiement. Prend en charge l'appel d'outil bidirectionnel et l'audio G.711 u-law.
    </Note>

    <Note>
    La voix en temps réel est sélectionnée lors de la création de la session. OpenAI permet à la plupart
    des champs de session de changer ultérieurement, mais la voix ne peut pas être modifiée une fois que
    le model a émis de l'audio dans cette session. OpenClaw expose actuellement les
    identifiants de voix en temps réel intégrés sous forme de chaînes.
    </Note>

    <Note>
    Control UI Talk utilise les sessions navigateur temps réel OpenAI avec un secret client
    éphémère frappé par Gateway et un échange SDP WebRTC navigateur direct contre
    l'OpenAI temps réel API. Lorsqu'aucune clé OpenAI API directe n'est configurée, le
    Gateway peut frapper ce secret client avec le profil OAuth `openai`
    sélectionné. Le relais Gateway et les ponts WebSocket backend temps réel Voice Call utilisent
    le même repli OAuth pour les points de terminaison natifs OpenAI. La vérification
    en direct par le mainteneur est disponible avec
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` ;
    les branches OpenAI vérifient à la fois le pont WebSocket backend et l'échange
    SDP WebRTC navigateur sans enregistrer de secrets.
    </Note>

  </Accordion>
</AccordionGroup>

## Points de terminaison Azure OpenAI

Le fournisseur groupé `openai`OpenAIOpenClaw peut cibler une ressource Azure OpenAI pour la génération d'images en remplaçant l'URL de base. Sur le chemin de génération d'images, OpenClaw détecte les noms d'hôte Azure sur `models.providers.openai.baseUrl` et bascule automatiquement vers le format de requête d'Azure.

<Note>La voix en temps réel utilise un chemin de configuration distinct (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) et n'est pas affectée par `models.providers.openai.baseUrl`. Consultez l'accordéon **Voix en temps réel** sous [Voix et parole](#voice-and-speech) pour ses paramètres Azure.</Note>

Utilisez Azure OpenAI lorsque :

- Vous possédez déjà un abonnement Azure OpenAI, un quota ou un contrat entreprise
- Vous avez besoin d'une résidence régionale des données ou de contrôles de conformité fournis par Azure
- Vous souhaitez garder le trafic à l'intérieur d'un locataire Azure existant

### Configuration

Pour la génération d'images Azure via le fournisseur groupé `openai`, pointez
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

OpenClaw reconnaît ces suffixes d'hôte Azure pour la route de génération d'images Azure :

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Pour les demandes de génération d'images sur un hôte Azure reconnu, OpenClaw :

- Envoie l'en-tête `api-key` au lieu de `Authorization: Bearer`
- Utilise des chemins délimités par le déploiement (`/openai/deployments/{deployment}/...`)
- Ajoute `?api-version=...` à chaque requête
- Utilise un délai d'expiration de requête par défaut de 600 s pour les appels de génération d'images Azure.
  Les valeurs `timeoutMs` par appel remplacent toujours cette valeur par défaut.

D'autres URL de base (OpenAI public, proxies compatibles avec OpenAI) conservent le format de demande d'image OpenAI standard.

<Note>Le routage Azure pour le chemin de génération d'images du fournisseur `openai`OpenClaw nécessite OpenClaw 2026.4.22 ou version ultérieure. Les versions précédentes traitent tout `openai.baseUrl`OpenAI personnalisé comme le point de terminaison public OpenAI et échoueront avec les déploiements d'images Azure.</Note>

### Version de API

Définissez `AZURE_OPENAI_API_VERSION` pour épingler une version Azure spécifique (preview ou GA)
pour le chemin de génération d'images Azure :

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

La valeur par défaut est `2024-12-01-preview` lorsque la variable n'est pas définie.

### Les noms de modèle sont des noms de déploiement

Azure OpenAI lie les modèles aux déploiements. Pour les demandes de génération d'images Azure routées via le provider OpenAI`openai` fourni, le champ `model`OpenClawOpenAI dans OpenClaw doit correspondre au **nom du déploiement Azure** que vous avez configuré dans le portail Azure, et non à l'identifiant du modèle public OpenAI.

Si vous créez un déploiement appelé `gpt-image-2-prod` qui sert `gpt-image-2` :

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La même règle de nom de déploiement s'applique aux appels de génération d'images routés via le provider `openai` fourni.

### Disponibilité régionale

La génération d'images Azure est actuellement disponible uniquement dans un sous-ensemble de régions (par exemple `eastus2`, `swedencentral`, `polandcentral`, `westus3`, `uaenorth`). Consultez la liste actuelle des régions de Microsoft avant de créer un déploiement et confirmez que le modèle spécifique est proposé dans votre région.

### Différences de paramètres

Azure OpenAI et OpenAI public n'acceptent pas toujours les mêmes paramètres d'image. Azure peut rejeter des options qu'OpenAI public autorise (par exemple certaines valeurs OpenAIOpenAIOpenAI`background` sur `gpt-image-2`OpenClawAPI) ou ne les exposer que sur des versions de modèle spécifiques. Ces différences proviennent d'Azure et du modèle sous-jacent, et non d'OpenClaw. Si une requête Azure échoue avec une erreur de validation, vérifiez l'ensemble de paramètres pris en charge par votre déploiement spécifique et votre version d'API dans le portail Azure.

<Note>
Azure OpenAI utilise le transport natif et un comportement de compatibilité mais ne reçoit pas
les en-têtes d'attribution cachés de OpenClaw — voir l'accordéon **Native vs routes compatibles OpenAI**
sous [Configuration avancée](#advanced-configuration).

Pour le trafic de chat ou Responses sur Azure (au-delà de la génération d'images), utilisez le
flux d'onboarding ou une configuration de fournisseur Azure dédiée — `openai.baseUrl`API seul
ne récupère pas la forme d'API/auth Azure. Un fournisseur
`azure-openai-responses/*` distinct existe ; voir
l'accordéon Compactage côté serveur ci-dessous.

</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Transport (WebSocket vs SSE)">
    OpenClaw utilise WebSocket en priorité avec repli SSE (`"auto"`) pour `openai/*`.

    En mode `"auto"`, OpenClaw :
    - Réessaie un échec précoce de WebSocket avant de basculer vers SSE
    - Après un échec, marque WebSocket comme dégradé pendant ~60 secondes et utilise SSE pendant le refroidissement
    - Attache des en-tètres stables de session et d'identité de tour pour les nouvelles tentatives et reconnexions
    - Normalise les compteurs d'utilisation (`input_tokens` / `prompt_tokens`) selon les variantes de transport

    | Value | Behavior |
    |-------|----------|
    | `"auto"` (default) | WebSocket first, SSE fallback |
    | `"sse"` | Force SSE only |
    | `"websocket"` | Force WebSocket only |

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
    OpenClaw expose un interrupteur de mode rapide partagé pour `openai/*` :

    - **Chat/UI :** `/fast status|on|off`
    - **Config :** `agents.defaults.models["<provider>/<model>"].params.fastMode`OpenClawOpenAI

    Lorsqu'il est activé, OpenClaw mappe le mode rapide au traitement prioritaire d'OpenAI (`service_tier = "priority"`). Les valeurs existantes de `service_tier` sont préservées, et le mode rapide ne réécrit pas `reasoning` ou `text.verbosity`.

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

  <Accordion title="Priority processing (service_tier)"OpenAIAPI>
    L'API d'OpenAI expose le traitement prioritaire via `service_tier`OpenClaw. Définissez-le par modèle dans OpenClaw :

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
    `serviceTier`OpenAI est uniquement transmis aux points de terminaison natifs d'OpenAI (`api.openai.com`) et aux points de terminaison natifs de Codex (`chatgpt.com/backend-api`OpenClaw). Si vous acheminez l'un ou l'autre fournisseur via un proxy, OpenClaw laisse `service_tier` intact.
    </Warning>

  </Accordion>

  <Accordion title="APICompactage côté serveur (Responses API)"OpenAI>
    Pour les modèles Responses OpenAI directs (`openai/*` sur `api.openai.com`OpenAIOpenClaw), le wrapper de flux OpenClaw du plug-in OpenAI active automatiquement le compactage côté serveur :

    - Force `store: true` (sauf si la compatibilité du modèle définit `supportsStore: false`)
    - Injecte `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` par défaut : 70 `contextWindow` (ou `80000`OpenClawOpenAIOpenAI si indisponible)

    Cela s'applique au chemin d'exécution OpenClaw intégré et aux hooks du fournisseur OpenAI utilisés par les exécutions intégrées. Le harnais du serveur d'application natif Codex gère son propre contexte via Codex et est configuré par l'itinéraire d'agent par défaut d'OpenAI ou la stratégie d'exécution du fournisseur/modèle.

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
    `responsesServerCompaction` contrôle uniquement l'injection de `context_management`OpenAI. Les modèles Responses OpenAI directs forcent toujours `store: true` sauf si la compatibilité définit `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Mode agentic GPT strict">
    Pour les exécutions de la famille GPT-5 sur `openai/*`OpenClaw, OpenClaw peut utiliser un contrat d'exécution intégré plus strict :

    ```json5
    {
      agents: {
        defaults: {
          embeddedAgent: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    Avec `strict-agentic`OpenClaw, OpenClaw :
    - Ne considère plus un tour de planification uniquement comme une progression réussie lorsqu'une action d'outil est disponible
    - Réessaie le tour avec une directive d'agir maintenant
    - Active automatiquement `update_plan`OpenAI pour un travail substantiel
    - Affiche un état bloqué explicite si le modèle continue à planifier sans agir

    <Note>
    Limité aux exécutions de la famille GPT-5 d'OpenAI et Codex uniquement. Les autres fournisseurs et les familles de modèles plus anciens conservent le comportement par défaut.
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw treats direct OpenAI, Codex, and Azure OpenAI endpoints differently from generic OpenAI-compatible `/v1` proxies:

    **Native routes** (`openai/*`, Azure OpenAI):
    - Keep `reasoning: { effort: "none" }` only for models that support the OpenAI `none` effort
    - Omit disabled reasoning for models or proxies that reject `reasoning.effort: "none"`
    - Default tool schemas to strict mode
    - Attach hidden attribution headers on verified native hosts only
    - Keep OpenAI-only request shaping (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **Proxy/compatible routes:**
    - Use looser compat behavior
    - Strip Completions `store` from non-native `openai-completions` payloads
    - Accept advanced `params.extra_body`/`params.extraBody` pass-through JSON for OpenAI-compatible Completions proxies
    - Accept `params.chat_template_kwargs` for OpenAI-compatible Completions proxies such as vLLM
    - Do not force strict tool schemas or native-only headers

    Azure OpenAI uses native transport and compat behavior but does not receive the hidden attribution headers.

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
