---
summary: "OpenClawExécuter les tours d'agent intégré OpenClaw via le harnais d'application serveur Codex inclus"
title: "Harnais Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

Le plugin `codex`OpenClawOpenAI inclus permet à OpenClaw d'exécuter des tours d'agent OpenAI intégrés via l'application serveur Codex au lieu du harnais PI intégré.

Utilisez le harnais Codex lorsque vous souhaitez que Codex possède la session d'agent de bas niveau :
reprise de thread native, continuation d'outil native, compactage natif et
exécution app-server. OpenClaw possède toujours les canaux de discussion, les fichiers de session, la sélection de modèle,
les outils dynamiques OpenClaw, les approbations, la livraison des médias et le miroir
de transcription visible.

La configuration normale utilise des références de modèle OpenAI canoniques telles que OpenAI`openai/gpt-5.5`. Ne configurez pas les références de modèle `openai-codex/gpt-*`OpenAI. Placez l'ordre d'authentification de l'agent OpenAI sous `auth.order.openai` ; les anciens profils `openai-codex:*` et les entrées `auth.order.openai-codex` restent pris en charge pour les installations existantes.

OpenClaw démarre les threads du serveur d'application Codex avec le mode de code natif Codex activé
tout en laissant le mode code uniquement désactivé par défaut. Cela permet de garder l'espace de travail natif
et les capacités de code de Codex disponibles tandis que les outils dynamiques OpenClaw continuent de passer
par le pont `item/tool/call` du serveur d'application. Les stratégies d'outil restreintes désactivent toujours
entièrement le mode de code natif.

Pour la séparation modèle/fournisseur/runtime plus générale, commencez par
[Runtimes d'agent](/fr/concepts/agent-runtimes). La version courte est :
`openai/gpt-5.5` est la référence du modèle, `codex` est le runtime, et Telegram,
Discord, Slack, ou un autre channel reste la surface de communication.

## Configuration requise

- OpenClaw avec le plugin `codex` inclus disponible.
- Si votre configuration utilise `plugins.allow`, incluez `codex`.
- Serveur d'application Codex `0.125.0` ou plus récent. Le plugin inclus gère par défaut un binaire
  du serveur d'application Codex compatible, les commandes locales `codex` sur `PATH` n'affectent donc pas
  le démarrage normal du harnais.
- Auth Codex disponible via `openclaw models auth login --provider openai-codex`,
  un compte de serveur d'application dans le domicile Codex de l'agent, ou un profil d'authentification
  explicite par clé API Codex.

Pour la priorité d'authentification, l'isolement de l'environnement, les commandes personnalisées de l'app-server, la découverte de modèle
et tous les champs de configuration, voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Démarrage rapide

La plupart des utilisateurs qui souhaitent Codex dans OpenClaw veulent cette solution : se connecter avec un
abonnement ChatGPT/Codex, activer le plugin `codex` inclus, et utiliser une
référence de modèle canonique `openai/gpt-*`.

Connectez-vous avec Codex OAuth :

```bash
openclaw models auth login --provider openai-codex
```

Activez le plugin `codex` inclus et sélectionnez un modèle d'agent OpenAI :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

Si votre configuration utilise `plugins.allow`, ajoutez `codex` là aussi :

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Redémarrez la passerelle après avoir modifié la configuration du plugin. Si une discussion existante possède déjà une session, utilisez `/new` ou `/reset` avant de tester les modifications d'exécution pour que le prochain tour résolve le harnais à partir de la configuration actuelle.

## Configuration

La configuration de démarrage rapide est la configuration minimale viable du harnais Codex. Définissez les options
du harnais Codex dans la configuration OpenClaw, et utilisez le CLI uniquement pour l'authentification Codex :

| Besoin                                                      | Définir                                                                                                  | Où                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Activer le harnais                                          | `plugins.entries.codex.enabled: true`                                                                    | Configuration OpenClaw                                 |
| Conserver une installation de plugin autorisée              | Incluez `codex` dans `plugins.allow`                                                                     | Configuration OpenClaw                                 |
| Acheminer les tours d'agent OpenAI via Codex                | `agents.defaults.model` ou `agents.list[].model` comme `openai/gpt-*`                                    | Configuration d'agent OpenClaw                         |
| Se connecter avec Codex OAuth                               | `openclaw models auth login --provider openai-codex`                                                     | Profil d'authentification CLI                          |
| Ajouter une sauvegarde de clé API pour les exécutions Codex | Profil de clé API `openai:*` répertorié après l'authentification par abonnement dans `auth.order.openai` | Profil d'authentification CLI + Configuration OpenClaw |
| Échec fermé (fail closed) lorsque Codex est indisponible    | Fournisseur ou model `agentRuntime.id: "codex"`                                                          | Configuration de modèle/provider OpenClaw              |
| Utiliser le trafic direct de l'OpenAI API                   | Fournisseur ou model `agentRuntime.id: "pi"` avec authentification OpenAI normale                        | Configuration model/provider OpenClaw                  |
| Régler le comportement de l'application serveur             | `plugins.entries.codex.config.appServer.*`                                                               | Configuration du plugin Codex                          |
| Activer les applications natives du plugin Codex            | `plugins.entries.codex.config.codexPlugins.*`                                                            | Configuration du plugin Codex                          |
| Activer l'Utilisation de l'ordinateur Codex                 | `plugins.entries.codex.config.computerUse.*`                                                             | Configuration du plugin Codex                          |

Utilisez les références de model `openai/gpt-*` pour les tours d'agent OpenAI pris en charge par Codex. Privilégiez `auth.order.openai` pour l'ordre abonnement en premier/sauvegarde par clé API. Les profils d'authentification `openai-codex:*` existants et `auth.order.openai-codex` restent valides, mais n'écrivez pas de nouvelles références de model `openai-codex/gpt-*`.

Ne définissez pas `compaction.model` ou `compaction.provider` sur les agents pris en charge par Codex, sauf si un moteur de contexte sélectionné possède la compactage. Sans moteur de contexte propriétaire, Codex compacte via son état de thread natif du serveur d'application, donc OpenClaw ignore ces substitutions de résumé local lors de l'exécution et `openclaw doctor --fix` les supprime lorsque l'agent utilise Codex.

Lossless reste pris en charge en tant que moteur de contexte. Configurez-le via `plugins.slots.contextEngine: "lossless-claw"` et `plugins.entries.lossless-claw.config.summaryModel`, et non via `agents.defaults.compaction.provider`. `openclaw doctor --fix` migre l'ancienne forme `compaction.provider: "lossless-claw"` vers l'emplacement du moteur de contexte Lossless lorsque Codex est l'exécution active.

Lorsque le moteur de contexte actif signale `ownsCompaction: true`, `/compact` exécute le cycle de vie de compactage de ce moteur et invalide le thread de l'application serveur Codex lié. Le prochain tour Codex démarre un thread backend frais et le réhydrate à partir du moteur de contexte au lieu de superposer le compactage natif Codex au résumé sémantique appartenant au moteur.

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Dans cette configuration, les deux profils passent toujours par Codex pour les tours d'agent `openai/gpt-*`. La clé API n'est qu'un repli d'authentification, et non une demande de basculer vers PI ou les réponses OpenAI simples.

Le reste de cette page couvre les variantes courantes entre lesquelles les utilisateurs doivent choisir :
la forme du déploiement, le routage fail-closed, la politique d'approbation du gardien, les plugins natifs Codex
et l'ordinateur (Computer Use). Pour les listes complètes d'options, les valeurs par défaut, les énumérations, la découverte,
l'isolement de l'environnement, les délais d'attente et les champs de transport de l'app-server, voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Vérifier le runtime Codex

Utilisez `/status` dans le chat où vous vous attendez à Codex. Un tour d'agent OpenAI pris en charge par Codex affiche :

```text
Runtime: OpenAI Codex
```

Vérifiez ensuite l'état du Codex app-server :

```text
/codex status
/codex models
```

`/codex status` signale la connectivité de l'app-server, le compte, les limites de débit, les serveurs MCP
et les compétences. `/codex models` répertorie le catalogue en direct de l'app-server Codex pour
le harnais et le compte. Si `/status` est surprenant, consultez
[Dépannage](#troubleshooting).

## Routage et sélection de model

Gardez les références de provider et la stratégie d'exécution séparées :

- Utilisez `openai/gpt-*` pour les tours d'agent OpenAI via Codex.
- N'utilisez pas `openai-codex/gpt-*` dans la configuration. Exécutez `openclaw doctor --fix` pour réparer les références obsolètes et les épingles de route de session stagnantes.
- `agentRuntime.id: "codex"` est facultatif pour le mode automatique OpenAI normal, mais utile lorsqu'un déploiement doit échouer en mode fermé si Codex n'est pas disponible.
- `agentRuntime.id: "pi"` active un fournisseur ou un modèle dans le comportement PI direct lorsque cela est intentionnel.
- `/codex ...` contrôle les conversations natives de l'application serveur Codex à partir du chat.
- ACP/acpx est un chemin de harnais externe distinct. Ne l'utilisez que lorsque l'utilisateur demande ACP/acpx ou un adaptateur de harnais externe.

Routage des commandes courantes :

| Intention de l'utilisateur                                   | Utiliser                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Attacher le chat actuel                                      | `/codex bind [--cwd <path>]`                                                                          |
| Reprendre un fil Codex existant                              | `/codex resume <thread-id>`                                                                           |
| Lister ou filtrer les fils Codex                             | `/codex threads [filter]`                                                                             |
| Lister les plugins natifs Codex                              | `/codex plugins list`                                                                                 |
| Activer ou désactiver un plugin natif Codex configuré        | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| Attacher une session Codex CLI existante sur un nœud appairé | `/codex sessions --host <node> [filter]`, puis `/codex resume <session-id> --host <node> --bind here` |
| Envoyer uniquement des commentaires Codex                    | `/codex diagnostics [note]`                                                                           |
| Démarrer une tâche ACP/acpx                                  | Commandes de session ACP/acpx, pas `/codex`                                                           |

| Cas d'usage                                         | Configurer                                                       | Vérifier                                  | Remarques                                       |
| --------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Abonnement ChatGPT/Codex avec runtime natif Codex   | `openai/gpt-*` plus le plugin `codex` activé                     | `/status` affiche `Runtime: OpenAI Codex` | Chemin recommandé                               |
| Échec fermé (Fail closed) si Codex est indisponible | Fournisseur ou model `agentRuntime.id: "codex"`                  | Le tour échoue au lieu du repli PI        | Utiliser pour les déploiements Codex uniquement |
| Direct OpenAI API-key traffic through PI            | Provider or model `agentRuntime.id: "pi"` and normal OpenAI auth | `/status` shows PI runtime                | Use only when PI is intentional                 |
| Legacy config                                       | `openai-codex/gpt-*`                                             | `openclaw doctor --fix` rewrites it       | Do not write new config this way                |
| ACP/acpx Codex adapter                              | ACP `sessions_spawn({ runtime: "acp" })`                         | ACP task/session status                   | Separate from native Codex harness              |

`agents.defaults.imageModel` follows the same prefix split. Use `openai/gpt-*`
for the normal OpenAI route and `codex/gpt-*` only when image understanding
should run through a bounded Codex app-server turn. Do not use
`openai-codex/gpt-*`; doctor rewrites that legacy prefix to `openai/gpt-*`.

## Deployment patterns

### Basic Codex deployment

Use the quickstart config when all OpenAI agent turns should use Codex by
default.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

### Mixed provider deployment

This shape keeps Claude as the default agent and adds a named Codex agent:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-6",
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "openai/gpt-5.5",
      },
    ],
  },
}
```

With this config, the `main` agent uses its normal provider path and the
`codex` agent uses Codex app-server.

### Fail-closed Codex deployment

For OpenAI agent turns, `openai/gpt-*` already resolves to Codex when the
bundled plugin is available. Add explicit runtime policy when you want a written
fail-closed rule:

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

With Codex forced, OpenClaw fails early if the Codex plugin is disabled, the
app-server is too old, or the app-server cannot start.

## App-server policy

By default, the plugin starts OpenClaw's managed Codex binary locally with stdio
transport. Set `appServer.command` only when you intentionally want to run a
different executable. Use WebSocket transport only when an app-server is already
running elsewhere:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
          },
        },
      },
    },
  },
}
```

Les sessions stdio app-server locales sont par défaut en posture d'opérateur local de confiance :
`approvalPolicy: "never"`, `approvalsReviewer: "user"` et
`sandbox: "danger-full-access"`. Si les exigences Codex locales n'autorisent pas cette
posture YOLO implicite, OpenClaw sélectionne les autorisations de gardien autorisées à la place.
Lorsqu'un sandbox OpenClaw est actif pour la session, OpenClaw restreint le `danger-full-access` Codex à `workspace-write` Codex afin que les tours natifs en mode code Codex
restent à l'intérieur de l'espace de travail sandboxé. L'indicateur réseau du tour Codex suit la
politique de sortie du sandbox OpenClaw : le `network: "none"` Docker reste hors ligne, tandis que
`network: "bridge"` ou un réseau Docker personnalisé permet un accès sortant.
Les tours explicites `workspace-write` Codex utilisent le même indicateur réseau dérivé de la sortie.

Utilisez le mode gardien lorsque vous souhaitez une auto-révision native Codex avant les échappements de sandbox
ou des autorisations supplémentaires :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

Le mode gardien s'étend aux approbations app-server Codex, généralement
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et
`sandbox: "workspace-write"` lorsque les exigences locales autorisent ces valeurs.

Pour chaque champ app-server, l'ordre d'authentification, l'isolement de l'environnement, la découverte et
le comportement de délai d'expiration, consultez la [référence Codex harness](/fr/plugins/codex-harness-reference).

## Commandes et diagnostics

Le plugin inclus enregistre `/codex` en tant que commande slash sur n'importe quel canal prenant
en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` vérifie la connectivité app-server, les modèles, le compte, les limites de débit,
  les serveurs MCP et les compétences.
- `/codex models` liste les modèles app-server Codex en direct.
- `/codex threads [filter]` liste les fils app-server Codex récents.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un
  fil Codex existant.
- `/codex compact` demande au Codex app-server de compacter le fil attaché.
- `/codex review` lance la révision native Codex pour le fil attaché.
- `/codex diagnostics [note]` demande avant d'envoyer des commentaires Codex pour le
  fil attaché.
- `/codex account` affiche le statut du compte et de la limite de taux.
- `/codex mcp` liste le statut du serveur MCP de l'app-server Codex.
- `/codex skills` liste les compétences de l'app-server Codex.

Pour la plupart des rapports de support, commencez par `/diagnostics [note]` dans la conversation
où le bug s'est produit. Il crée un rapport de diagnostics Gateway et, pour les sessions
Codex harness, demande une approbation pour envoyer le bundle de commentaires Codex pertinent.
Voir [Export de diagnostics](/fr/gateway/diagnostics) pour le modèle de confidentialité et le
comportement des discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous souhaitez spécifiquement le téléchargement des commentaires Codex
pour le fil actuellement attaché sans le bundle de diagnostics complet Gateway.

### Inspecter les fils Codex localement

Le moyen le plus rapide d'inspecter une mauvaise exécution Codex est souvent d'ouvrir le fil Codex
natif directement :

```bash
codex resume <thread-id>
```

Obtenez l'identifiant du fil à partir de la réponse `/diagnostics` terminée, `/codex binding`, ou
`/codex threads [filter]`.

Pour les mécanismes de téléchargement et les limites de diagnostics au niveau de l'exécution, voir
[Codex harness runtime](/fr/plugins/codex-harness-runtime#codex-feedback-upload).

L'auth est sélectionnée dans cet ordre :

1. Profils d'auth OpenAI ordonnés pour l'agent, de préférence sous
   `auth.order.openai`. Les identifiants de profil `openai-codex:*` existants restent valides.
2. Le compte existant de l'app-server dans le domicile Codex de cet agent.
3. Pour les lancements locaux d'app-server stdio uniquement, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte app-server n'est présent et que l'auth OpenAI est
   toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela
garantit que les clés Gateway de niveau API restent disponibles pour les embeddings ou les modèles OpenAI directs
sans que les tours natifs du serveur d'application Codex ne soient facturés par inadvertance via l'API.
Les profils explicites de clés API de Codex et la repli de clé d'environnement stdio locale utilisent la connexion
au serveur d'application au lieu de l'environnement de processus enfant hérité. Les connexions WebSocket au serveur d'application
ne reçoivent pas le repli de clé Gateway de l'environnement API ; utilisez un profil d'authentification explicite ou le
compte propre du serveur d'application distant.

Si un profil d'abonnement atteint une limite d'utilisation de Codex, OpenClaw enregistre l'heure de
réinitialisation lorsque Codex en signale une et tente le prochain profil d'authentification ordonné pour la même
exécution Codex. Lorsque l'heure de réinitialisation est passée, le profil d'abonnement redevient éligible
sans modifier le model `openai/gpt-*` sélectionné ou le runtime Codex.

Pour les lancements de serveur d'application stdio locaux, OpenClaw définit `CODEX_HOME` sur un répertoire
par agent afin que la configuration Codex, les fichiers d'authentification/compte, le cache/données des plugins et l'état
natif du thread ne lisent ou n'écrivent pas le `~/.codex` personnel de l'opérateur par
défaut. OpenClaw préserve le `HOME` de processus normal ; les sous-processus
exécutés par Codex peuvent toujours trouver la configuration et les jetons du répertoire utilisateur, et Codex peut découvrir les entrées
`$HOME/.agents/skills` et `$HOME/.agents/plugins/marketplace.json` partagées.

Si un déploiement a besoin d'un isolement d'environnement supplémentaire, ajoutez ces variables à
`appServer.clearEnv` :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` n'affecte que le processus enfant du serveur d'application Codex généré.
OpenClaw supprime `CODEX_HOME` et `HOME` de cette liste lors de la normalisation du
lancement local : `CODEX_HOME` reste par agent, et `HOME` reste hérité afin que
les sous-processus puissent utiliser l'état normal du répertoire utilisateur.

Les outils dynamiques Codex sont chargés par défaut via `searchable`OpenClaw. OpenClaw n'expose pas d'outils dynamiques qui dupliquent les opérations de l'espace de travail natives de Codex : `read`, `write`, `edit`, `apply_patch`, `exec`, `process` et `update_plan`OpenClaw. La plupart des autres outils d'intégration OpenClaw, tels que la messagerie, les médias, cron, le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search`, sont disponibles via la recherche d'outils Codex sous l'espace de noms `openclaw`, ce permet de garder le contexte du modèle initial plus petit.
Les réponses source `sessions_yield` et celles utilisant uniquement l'outil de message restent directes car il s'agit de contrats de contrôle de tour. `sessions_spawn` reste searchable pour que le `spawn_agent`OpenClaw natif de Codex reste la surface principale du sous-agent Codex, tandis que la délégation explicite à OpenClaw ou ACP reste disponible via l'espace de noms de l'outil dynamique `openclaw`. Les instructions de collaboration Heartbeat indiquent à Codex de rechercher `heartbeat_respond` avant de terminer un tour heartbeat lorsque l'outil n'est pas déjà chargé.

Ne définissez `codexDynamicToolsLoading: "direct"` que lors de la connexion à un serveur d'application Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

Champs de plugin Codex de niveau supérieur pris en charge :

| Champ                      | Par défaut     | Signification                                                                                                                 |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Utilisez `"direct"`OpenClaw pour placer les outils dynamiques OpenClaw directement dans le contexte initial de l'outil Codex. |
| `codexDynamicToolsExclude` | `[]`           | Noms d'outils dynamiques OpenClaw supplémentaires à omettre des tours du serveur d'application Codex.                         |
| `codexPlugins`             | désactivé      | Prise en charge native de plugin/application Codex pour les plugins hébergés migrés installés à partir de la source.          |

Champs `appServer` pris en charge :

| Champ                         | Par défaut                                                    | Signification                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                   | `"stdio"`                                                     | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                                                                                                                     |
| `command`                     | binaire Codex géré                                            | Exécutable pour le transport stdio. Laissez non défini pour utiliser le binaire géré ; ne le définissez que pour un remplacement explicite.                                                                                                                                                                                                                                    |
| `args`                        | `["app-server", "--listen", "stdio://"]`                      | Arguments pour le transport stdio.                                                                                                                                                                                                                                                                                                                                             |
| `url`                         | non défini                                                    | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                                                                                                                        |
| `authToken`                   | non défini                                                    | Jeton porteur pour le transport WebSocket.                                                                                                                                                                                                                                                                                                                                     |
| `headers`                     | `{}`                                                          | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                                                                                                            |
| `clearEnv`                    | `[]`                                                          | Noms de variables d'environnement supplémentaires supprimés du processus de serveur d'application stdio généré après qu'OpenClaw a construit son environnement hérité. OpenClaw conserve les `CODEX_HOME` par agent et les `HOME` héritées pour les lancements locaux.                                                                                                         |
| `codeModeOnly`                | `false`                                                       | Activez l'interface tool en mode code uniquement de Codex. Les outils dynamiques OpenClaw restent enregistrés auprès de Codex afin que les appels imbriqués `tools.*` retournent via le pont `item/tool/call` du serveur d'application.                                                                                                                                        |
| `requestTimeoutMs`            | `60000`                                                       | Délai d'attente pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                                                                                                                  |
| `turnCompletionIdleTimeoutMs` | `60000`                                                       | Fenêtre de silence après que Codex accepte un tour ou après une demande de serveur d'application délimitée par un tour pendant que OpenClaw attend `turn/completed`. Augmentez ceci pour les phases de synthèse lentes post-outil ou statut uniquement.                                                                                                                        |
| `mode`                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO | Préréglage pour l'exécution YOLO ou examinée par un gardien. Les exigences stdio locales qui omettent `danger-full-access`, l'approbation `never`, ou le réviseur `user` font du gardien par défaut implicite.                                                                                                                                                                 |
| `approvalPolicy`              | `"never"` ou une politique d'approbation de gardien autorisée | Stratégie d'approbation native Codex envoyée au démarrage/reprise/tour du fil. Les valeurs par défaut du Guardian préfèrent `"on-request"` lorsque cela est autorisé.                                                                                                                                                                                                          |
| `sandbox`                     | `"danger-full-access"` ou un bac à sable gardien autorisé     | Mode de bac à sable natif Codex envoyé au démarrage/reprise du fil. Les valeurs par défaut du Guardian préfèrent `"workspace-write"` lorsque cela est autorisé, sinon `"read-only"`. Lorsqu'un bac à sable OpenClaw est actif, les tours `danger-full-access` utilisent le `workspace-write` Codex avec un accès réseau dérivé du paramètre de sortie du bac à sable OpenClaw. |
| `approvalsReviewer`           | `"user"` ou un réviseur gardien autorisé                      | Utilisez `"auto_review"` pour permettre à Codex de réviser les invites d'approbation natives lorsque cela est autorisé, sinon `guardian_subagent` ou `user`. `guardian_subagent` reste un alias hérité.                                                                                                                                                                        |
| `serviceTier`                 | unset                                                         | Niveau de service optionnel de l'application serveur Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, `null` efface la substitution, et l'ancien `"fast"` est accepté comme `"priority"`.                                                                                                                                        |

Les appels d'outil dynamiques détenus par OpenClaw sont délimités indépendamment de
`appServer.requestTimeoutMs` : les requêtes Codex `item/tool/call` utilisent par défaut
un chien de garde OpenClaw de 30 secondes. Un argument `timeoutMs` positif par appel étend
ou réduit ce budget d'outil spécifique. L'outil `image_generate` utilise
`agents.defaults.imageGenerationModel.timeoutMs` lorsque l'appel d'outil ne fournit
pas son propre délai d'expiration, ou un défaut de 120 secondes pour la génération d'images sinon.
L'outil `image` de compréhension de média utilise
`tools.media.image.timeoutSeconds` ou son défaut média de 60 secondes. Les budgets d'outil dynamiques
sont plafonnés à 600000 ms. En cas de dépassement de délai, OpenClaw abandonne le signal d'outil
lorsque cela est pris en charge et renvoie une réponse d'outil dynamique échouée à Codex afin que le tour
puisse continuer au lieu de laisser la session dans `processing`.

Une fois que Codex a accepté un tour, et après qu'OpenClaw a répondu à une demande app-server limitée au tour, le harnais s'attend à ce que Codex progresse dans le tour actuel et finisse éventuellement le tour natif avec `turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`, OpenClaw tente d'interrompre le tour Codex de son mieux, enregistre un délai de diagnostic et libère la voie de session OpenClaw afin que les messages de chat de suivi ne soient pas mis en file d'attente derrière un tour natif périmé. La plupart des notifications non terminales pour le même tour désarment ce chien de garde court, car Codex a prouvé que le tour est toujours en cours d'exécution ; les complétions brutes `custom_tool_call_output` maintiennent le chien de garde post-tool court armé car elles constituent le transfert du résultat de l'outil limité au tour. Les notifications globales de l'app-server, telles que les mises à jour de limite de débit, ne réinitialisent pas la progression d'inactivité du tour. Les éléments `agentMessage` terminés et les éléments bruts d'assistant pré-tool `rawResponseItem/completed` arment la libération de la sortie de l'assistant : si Codex devient alors silencieux sans `turn/completed`, OpenClaw tente d'interrompre de son mieux le tour natif et libère la voie de session. La progression brute de l'assistant post-tool continue d'attendre `turn/completed` ou le chien de garde terminal. Les diagnostics de délai d'attente incluent la dernière méthode de notification de l'app-server et, pour les éléments de réponse brute de l'assistant, le type d'élément, le rôle, l'identifiant et un aperçu borné du texte de l'assistant.

Les redéfinitions d'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque
`appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez
`plugins.entries.codex.config.appServer.mode: "guardian"` à la place, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests locaux ponctuels. La configuration est
préférée pour les déploiements reproductibles car elle maintient le comportement du plugin dans le
même fichier examiné que le reste de la configuration du harnais Codex.

## Plugins natifs Codex

La prise en charge native des plugins Codex utilise les propres capacités d'application et de plugin du serveur d'application Codex dans le même thread Codex que le tour de harnais OpenClaw. OpenClaw ne traduit pas les plugins Codex en outils dynamiques OpenClaw synthétiques `codex_plugin_*`.

`codexPlugins` affecte uniquement les sessions qui sélectionnent le harnais Codex natif. Il n'a aucun effet sur les exécutions PI, les exécutions normales du provider OpenAI, les liaisons de conversation ACP ou d'autres harnais.

Configuration migrée minimale :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

La configuration de l'application de thread est calculée lorsque OpenClaw établit une session de harnais Codex ou remplace une liaison de thread Codex obsolète. Elle n'est pas recalculée à chaque tour. Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset` ou redémarrez la passerelle pour que les futures sessions de harnais Codex commencent avec l'ensemble d'applications mis à jour.

Pour l'éligibilité à la migration, l'inventaire des applications, la stratégie d'action destructrice, les sollicitations et les diagnostics de plugins natifs, consultez [Native Codex plugins](/fr/plugins/codex-native-plugins).

## Utilisation de l'ordinateur

L'utilisation de l'ordinateur est traitée dans son propre guide de configuration : [Codex Computer Use](/fr/plugins/codex-computer-use).

En résumé : OpenClaw ne fournit pas l'application de contrôle du bureau ni n'exécute d'actions de bureau lui-même. Il prépare le serveur d'application Codex, vérifie que le serveur MCP `computer-use` est disponible, puis laisse Codex gérer les appels d'outils MCP natifs lors des tours en mode Codex.

## Limites d'exécution

Le harnais Codex modifie uniquement l'exécuteur de l'agent intégré de bas niveau.

- Les outils dynamiques OpenClaw sont pris en charge. Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.
- Les outils natifs Codex de type shell, patch, MCP et application native sont gérés par Codex. OpenClaw peut observer ou bloquer des événements natifs sélectionnés via le relais pris en charge, mais il ne réécrit pas les arguments des outils natifs.
- Codex possède la compactage native, sauf si le moteur de contexte OpenClaw actif déclare `ownsCompaction: true`. OpenClaw conserve une copie miroir de la transcription pour l'historique du canal, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais.
- La génération de médias, la compréhension des médias, la synthèse vocale (TTS), les approbations et la sortie des outils de messagerie continuent via les paramètres de fournisseur/modèle OpenClaw correspondants.
- `tool_result_persist` s'applique aux résultats des outils de transcription appartenant à OpenClaw, et non aux enregistrements de résultats des outils natifs de Codex.

Pour les couches de hooks, les surfaces V1 prises en charge, la gestion native des autorisations, le pilotage de la file d'attente, les mécanismes de téléchargement des commentaires Codex et les détails de compactage, consultez [Codex harness runtime](/fr/plugins/codex-harness-runtime).

## Dépannage

**Codex n'apparaît pas comme un fournisseur `/model` normal :** c'est attendu pour les nouvelles configurations. Sélectionnez un modèle `openai/gpt-*`, activez `plugins.entries.codex.enabled`, et vérifiez si `plugins.allow` exclut `codex`.

**OpenClaw utilise PI au lieu de Codex :** assurez-vous que la référence du modèle est `openai/gpt-*` sur le fournisseur officiel OpenAI et que le plugin Codex est installé et activé. Si vous avez besoin d'une preuve stricte pendant les tests, définissez le fournisseur ou le modèle `agentRuntime.id: "codex"`. Un runtime Codex forcé échoue au lieu de revenir à PI.

**Le runtime OpenAI Codex revient au chemin de clé API :** collectez un extrait de passerelle expurgé qui montre le modèle, le runtime, le fournisseur sélectionné et l'échec. Demandez aux collaborateurs concernés d'exécuter cette commande en lecture seule sur leur hôte OpenClaw :

```bash
(
  pattern='openai/gpt-5\.[45]|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|openai-codex|resolveSelectedOpenAIPiRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

Les extraits utiles incluent généralement `openai/gpt-5.5` ou `openai/gpt-5.4`,
`Runtime: OpenAI Codex`, `agentRuntime.id` ou `harnessRuntime`,
`candidateProvider: "openai"`, et un résultat `401`, `Incorrect API key`, ou
`No API key`. Une exécution corrigée doit afficher le chemin `openai-codex` OAuth
au lieu d'un échec de clé API OpenAI API classique.

**La configuration `openai-codex/*` héritée persiste :** exécutez `openclaw doctor --fix`.
Doctor réécrit les références de modèle héritées en `openai/*`, supprime les épinglages (pins) de session et d'exécution d'agent global obsolètes,
et préserve les remplacements de profil d'authentification existants.

**Le serveur d'application (app-server) est rejeté :** utilisez le `0.125.0` du serveur d'application Codex ou une version plus récente.
Les préversions de même version ou les versions avec suffixe de build telles que
`0.125.0-alpha.2` ou `0.125.0+custom` sont rejetées car OpenClaw teste le
plancher de protocole stable `0.125.0`.

**`/codex status` ne parvient pas à se connecter :** vérifiez que le plugin `codex` fourni est
activé, que `plugins.allow` l'inclut lorsqu'une liste d'autorisation est configurée, et
que tout `appServer.command`, `url`, `authToken`, ou en-têtes personnalisés sont valides.

**La découverte de modèles est lente :** diminuez
`plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte. Voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference#model-discovery).

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
les en-têtes, et que le serveur d'application distant parle la même version de protocole
Codex du serveur d'application.

**Un modèle non-Codex utilise PI :** c'est attendu sauf si la stratégie de fournisseur ou d'exécution de modèle
l'achemine vers un autre harnais. Les références de fournisseur non OpenAI classiques restent sur
leur chemin de fournisseur normal en mode `auto`.

**Computer Use est installé mais les tools ne s'exécutent pas :** vérifiez `/codex computer-use status` depuis une nouvelle session. Si un tool signale `Native hook relay unavailable`, utilisez `/new` ou `/reset` ; si cela persiste, redémarrez la passerelle pour effacer les enregistrements de hooks natifs obsolètes. Voir [Codex Computer Use](/fr/plugins/codex-computer-use#troubleshooting).

## Connexes

- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Plugins natifs Codex](/fr/plugins/codex-native-plugins)
- [Codex Computer Use](/fr/plugins/codex-computer-use)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Providers de modèles](/fr/concepts/model-providers)
- [OpenAI provider](/fr/providers/openai)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Hooks de plugin](/fr/plugins/hooks)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Statut](/fr/cli/status)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
