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

Lorsqu'aucun bac à sable OpenClaw n'est actif, OpenClaw démarre les threads de l'application serveur Codex
avec le mode de code natif Codex activé tout en laissant le mode code uniquement désactivé par défaut.
Cela permet de garder disponibles les capacités de code et d'espace de travail natif de Codex
pendant que les outils dynamiques OpenClaw continuent de passer par le pont de l'application serveur OpenClawOpenClawOpenClaw`item/tool/call`OpenClaw.
Le bac à sable actif d'OpenClaw et les stratégies d'outils restreints désactivent entièrement le mode de code natif
sauf si vous optez pour le chemin expérimental du serveur d'exécution du bac à sable.

Cette fonctionnalité native de Codex est distincte de
[OpenClaw code mode](OpenClaw/en/reference/code-modeOpenClaw), qui est un environnement d'exécution QuickJS-WASI
optionnel pour les exécutions génériques d'OpenClaw avec une forme d'entrée `exec` différente.

Pour la séparation plus large entre modèle/fournisseur/environnement d'exécution, commencez par
[Agent runtimes](/fr/concepts/agent-runtimes). En résumé :
`openai/gpt-5.5` est la référence du modèle, `codex`TelegramDiscordSlack est l'environnement d'exécution, et Telegram,
Discord, Slack, ou un autre canal reste la surface de communication.

## Prérequis

- OpenClaw avec le plugin OpenClaw`codex` inclus disponible.
- Si votre configuration utilise `plugins.allow`, incluez `codex`.
- Application serveur Codex `0.125.0` ou plus récente. Le plugin inclus gère un binaire
  compatible de l'application serveur Codex par défaut, donc les commandes locales `codex` sur `PATH` n'affectent
  pas le démarrage normal du harnais.
- Authentification Codex disponible via `openclaw models auth login --provider openai-codex`API,
  un compte de l'application serveur dans le domicile Codex de l'agent, ou un profil
  d'authentification explicite avec une clé API Codex.

Pour la priorité de l'authentification, l'isolement de l'environnement, les commandes personnalisées de l'application serveur, la découverte de modèles
et tous les champs de configuration, consultez
[Codex harness reference](/fr/plugins/codex-harness-reference).

## Démarrage rapide

La plupart des utilisateurs qui souhaitent Codex dans OpenClaw veulent ce chemin : se connecter avec un
abonnement ChatGPT/Codex, activer le plugin `codex` intégré, et utiliser une
référence de `openai/gpt-*` canonique.

Connectez-vous avec Codex OAuth :

```bash
openclaw models auth login --provider openai-codex
```

Activez le plugin `codex` intégré et sélectionnez un modèle d'agent OpenAI :

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

Si votre configuration utilise `plugins.allow`, ajoutez-y `codex` aussi :

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

Redémarrez la passerelle après avoir modifié la configuration du plugin. Si une conversation existante possède déjà
une session, utilisez `/new` ou `/reset` avant de tester les modifications d'exécution afin que le prochain
tour résolve le harnais à partir de la configuration actuelle.

## Configuration

La configuration de démarrage rapide est la configuration minimale viable du harnais Codex. Définissez les options
du harnais Codex dans la configuration OpenClaw, et utilisez la CLI uniquement pour l'authentification Codex :

| Besoin                                                      | Définir                                                                                             | Où                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Activer le harnais                                          | `plugins.entries.codex.enabled: true`                                                               | Configuration OpenClaw                                 |
| Conserver une installation de plugin autorisée              | Inclure `codex` dans `plugins.allow`                                                                | Configuration OpenClaw                                 |
| Acheminer les tours d'agent OpenAI via Codex                | `agents.defaults.model` ou `agents.list[].model` comme `openai/gpt-*`                               | Configuration d'agent OpenClaw                         |
| Se connecter avec Codex OAuth                               | `openclaw models auth login --provider openai-codex`                                                | Profil d'authentification CLI                          |
| Ajouter une sauvegarde de clé API pour les exécutions Codex | Profil de clé API `openai:*` listé après l'authentification par abonnement dans `auth.order.openai` | Profil d'authentification CLI + configuration OpenClaw |
| Échec fermé lorsque Codex n'est pas disponible              | Provider ou modèle `agentRuntime.id: "codex"`                                                       | Configuration modèle/provider OpenClaw                 |
| Utiliser le trafic direct de l'OpenAI API                   | Provider ou modèle `agentRuntime.id: "pi"` avec l'authentification OpenAI normale                   | Configuration modèle/fournisseur OpenClaw              |
| Régler le comportement du serveur d'application             | `plugins.entries.codex.config.appServer.*`                                                          | Configuration du plugin Codex                          |
| Activer les applications natives du plugin Codex            | `plugins.entries.codex.config.codexPlugins.*`                                                       | Configuration du plugin Codex                          |
| Activer l'usage ordinateur de Codex                         | `plugins.entries.codex.config.computerUse.*`                                                        | Configuration du plugin Codex                          |

Utilisez les références de modèle `openai/gpt-*` pour les tours d'agent OpenAI pris en charge par Codex. Privilégiez
`auth.order.openai` pour l'ordre abonnement prioritaire/sauvegarde par clé API. Les profils
d'authentification `openai-codex:*` existants et `auth.order.openai-codex` restent valides, mais
n'écrivez pas de nouvelles références de modèle `openai-codex/gpt-*`.

Ne définissez pas `compaction.model` ou `compaction.provider` sur les agents pris en charge par Codex
sauf si un moteur de contexte sélectionné possède la compaction. Sans moteur de contexte propriétaire,
Codex compacter via son état de thread natif du serveur d'application, donc OpenClaw
ignore ces remplacements de résumé local lors de l'exécution et `openclaw doctor --fix`
les supprime lorsque l'agent utilise Codex.

Lossless reste pris en charge en tant que moteur de contexte. Configurez-le via
`plugins.slots.contextEngine: "lossless-claw"` et
`plugins.entries.lossless-claw.config.summaryModel`, et non via
`agents.defaults.compaction.provider`. `openclaw doctor --fix` migre l'ancienne
forme `compaction.provider: "lossless-claw"` vers l'emplacement du moteur de contexte Lossless
lorsque Codex est le runtime actif.

Le harnais natif du serveur d'application Codex prend en charge les moteurs de contexte qui nécessitent
un assemblage de pré-prompt. Les backends génériques CLI, y compris `codex-cli`, ne fournissent pas
cette capacité d'hébergement.

Lorsque le moteur de contexte actif signale `ownsCompaction: true`, `/compact` exécute
le cycle de vie de compaction de ce moteur et invalide le thread du serveur d'application Codex
lié. Le prochain tour Codex démarre un thread backend frais et le réhydrate à partir
du moteur de contexte au lieu de superposer la compaction native Codex par-dessus le
résumé sémantique détenu par le moteur.

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Dans cette configuration, les deux profils passent toujours par Codex pour les tours d'agent `openai/gpt-*`. La clé d'API n'est qu'un repli d'authentification, et non une demande de basculement vers PI ou les réponses OpenAI classiques.

Le reste de cette page couvre les variantes courantes entre lesquelles les utilisateurs doivent choisir : la forme du déploiement, le routage en échec fermé, la politique d'approbation du gardien, les plugins natifs Codex et l'Utilisation de l'ordinateur. Pour les listes complètes d'options, les valeurs par défaut, les énumérations, la découverte, l'isolement de l'environnement, les délais d'attente et les champs de transport de l'app-server, consultez la [référence de Codex harness](/fr/plugins/codex-harness-reference).

## Vérifier l'exécution Codex

Utilisez `/status` dans le chat où vous vous attendez à Codex. Un tour d'agent OpenAI pris en charge par Codex affiche :

```text
Runtime: OpenAI Codex
```

Ensuite, vérifiez l'état de l'app-server Codex :

```text
/codex status
/codex models
```

`/codex status` signale la connectivité de l'app-server, le compte, les limites de débit, les serveurs MCP et les compétences. `/codex models` répertorie le catalogue en direct de l'app-server Codex pour le harness et le compte. Si `/status` est surprenant, consultez la section [Dépannage](#troubleshooting).

## Routage et sélection du modèle

Gardez les références de provider et la politique d'exécution séparées :

- Utilisez `openai/gpt-*` pour les tours d'agent OpenAI via Codex.
- N'utilisez pas `openai-codex/gpt-*` dans la configuration. Exécutez `openclaw doctor --fix` pour réparer les références obsolètes et les épingles de route de session en suspens.
- `agentRuntime.id: "codex"` est facultatif pour le mode automatique OpenAI normal, mais utile lorsqu'un déploiement doit échouer en mode fermé si Codex n'est pas disponible.
- `agentRuntime.id: "pi"` active un provider ou un modèle pour un comportement PI direct lorsque cela est intentionnel.
- `/codex ...` contrôle les conversations natives de l'app-server Codex à partir du chat.
- ACP/acpx est un chemin de harness externe distinct. Ne l'utilisez que lorsque l'utilisateur demande ACP/acpx ou un adaptateur de harness externe.

Routage des commandes courant :

| Intention de l'utilisateur                                   | Utiliser                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Attacher le chat actuel                                      | `/codex bind [--cwd <path>]`                                                                          |
| Reprendre un fil Codex existant                              | `/codex resume <thread-id>`                                                                           |
| Lister ou filtrer les fils Codex                             | `/codex threads [filter]`                                                                             |
| Lister les plugins natifs Codex                              | `/codex plugins list`                                                                                 |
| Activer ou désactiver un plugin natif Codex configuré        | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| Attacher une session CLI Codex existante sur un nœud apparié | `/codex sessions --host <node> [filter]`, puis `/codex resume <session-id> --host <node> --bind here` |
| Envoyer uniquement les commentaires Codex                    | `/codex diagnostics [note]`                                                                           |
| Démarrer une tâche ACP/acpx                                  | Commandes de session ACP/acpx, pas `/codex`                                                           |

| Cas d'usage                                          | Configurer                                                                         | Vérifier                                  | Notes                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec le runtime natif Codex | `openai/gpt-*` plus le plugin `codex` activé                                       | `/status` affiche `Runtime: OpenAI Codex` | Chemin recommandé                                        |
| Échec fermé si Codex n'est pas disponible            | Provider ou model `agentRuntime.id: "codex"`                                       | Le tour échoue au lieu du repli PI        | Utiliser pour les déploiements Codex uniquement          |
| Acheminer le trafic de clé d'API OpenAI via PI       | Provider ou model `agentRuntime.id: "pi"`OpenAI et authentification OpenAI normale | `/status` affiche le runtime PI           | Utiliser uniquement lorsque PI est intentionnel          |
| Configuration héritée                                | `openai-codex/gpt-*`                                                               | `openclaw doctor --fix` le réécrit        | N'écrivez pas de nouvelle configuration de cette manière |
| Adaptateur Codex ACP/acpx                            | ACP `sessions_spawn({ runtime: "acp" })`                                           | Statut de tâche/session ACP               | Séparé du harnais natif Codex                            |

`agents.defaults.imageModel` suit le même découpage de préfixe. Utilisez `openai/gpt-*`OpenAI
pour la route OpenAI normale et `codex/gpt-*` uniquement lorsque la compréhension d'images
doit s'exécuter via un tour d'app-server Codex délimité. N'utilisez pas
`openai-codex/gpt-*` ; le docteur réécrit ce préfixe hérité en `openai/gpt-*`.

## Modèles de déploiement

### Déploiement Codex de base

Utilisez la configuration de démarrage rapide lorsque tous les tours d'agent OpenAI doivent utiliser Codex par
défaut.

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

### Déploiement mixte de providers

Cette forme garde Claude comme agent par défaut et ajoute un agent Codex nommé :

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

Avec cette configuration, l'agent `main` utilise son chemin de provider normal et l'
agent `codex` utilise Codex app-server.

### Déploiement Codex à échec fermé

Pour les tours d'agent OpenAI, `openai/gpt-*` résout déjà à Codex lorsque le plugin inclus est disponible. Ajoutez une stratégie d'exécution explicite lorsque vous souhaitez une règle de fermeture systématique écrite :

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

Avec Codex forcé, OpenClaw échoue tôt si le plugin Codex est désactivé, si le serveur d'application est trop ancien, ou si le serveur d'application ne peut pas démarrer.

## Stratégie de serveur d'application

Par défaut, le plugin démarre localement le binaire Codex géré par OpenClaw avec un transport stdio. Définissez `appServer.command` uniquement lorsque vous souhaitez intentionnellement exécuter un exécutable différent. Utilisez le transport WebSocket uniquement lorsqu'un serveur d'application est déjà en cours d'exécution ailleurs :

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

Les sessions de serveur d'application stdio locales sont par défaut en posture d'opérateur local de confiance : `approvalPolicy: "never"`, `approvalsReviewer: "user"` et `sandbox: "danger-full-access"`. Si les exigences Codex locales interdisent cette posture YOLO implicite, OpenClaw sélectionne les autorisations de gardien autorisées à la place. Lorsqu'un bac à sable OpenClaw est actif pour la session, OpenClaw désactive le Code Mode natif de Codex, les serveurs MCP utilisateur et l'exécution de plugin sauvegardée par l'application pour ce tour, au lieu de s'appuyer sur le sandboxing côté hôte de Codex. L'accès au shell est exposé via les outils dynamiques sauvegardés par le bac à sable OpenClaw tels que `sandbox_exec` et `sandbox_process` lorsque les outils exec/process normaux sont disponibles.

Utilisez le mode gardien lorsque vous souhaitez une auto-révision native de Codex avant les échappements de bac à sable ou les autorisations supplémentaires :

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

Le mode gardien s'étend aux approbations du serveur d'application Codex, généralement `approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et `sandbox: "workspace-write"` lorsque les exigences locales autorisent ces valeurs.

Pour chaque champ de serveur d'application, l'ordre d'authentification, l'isolation de l'environnement, la découverte et le comportement de délai d'attente, voir [Codex harness reference](/fr/plugins/codex-harness-reference).

## Commandes et diagnostics

Le plugin inclus enregistre `/codex` en tant que commande slash sur n'importe quel canal qui prend en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` vérifie la connectivité du serveur d'application, les modèles, le compte, les limites de taux, les serveurs MCP et les compétences.
- `/codex models` liste les modèles actifs de l'application serveur Codex.
- `/codex threads [filter]` liste les discussions récentes de l'application serveur Codex.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à une discussion Codex existante.
- `/codex compact` demande à l'application serveur Codex de compacter la discussion attachée.
- `/codex review` lance la révision native Codex pour la discussion attachée.
- `/codex diagnostics [note]` demande avant d'envoyer les commentaires Codex pour la discussion attachée.
- `/codex account` affiche l'état du compte et de la limite de débit.
- `/codex mcp` liste l'état du serveur MCP de l'application serveur Codex.
- `/codex skills` liste les compétences de l'application serveur Codex.

Pour la plupart des rapports de support, commencez par `/diagnostics [note]` dans la conversation où le bug s'est produit. Il crée un rapport de diagnostics Gateway et, pour les sessions du harnais Codex, demande l'approbation pour envoyer le bundle de commentaires Codex pertinent. Voir [Exportation des diagnostics](/fr/gateway/diagnostics) pour le modèle de confidentialité et le comportement des discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous voulez spécifiquement l'envoi des commentaires Codex pour la discussion actuellement attachée sans le bundle complet de diagnostics Gateway.

### Inspecter les discussions Codex localement

Le moyen le plus rapide d'inspecter une mauvaise exécution Codex est souvent d'ouvrir directement la discussion native Codex :

```bash
codex resume <thread-id>
```

Récupérez l'identifiant de la discussion à partir de la réponse complétée `/diagnostics`, `/codex binding`, ou `/codex threads [filter]`.

Pour les mécanismes de téléchargement et les limites de diagnostics au niveau de l'exécution, consultez [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime#codex-feedback-upload).

L'authentification est sélectionnée dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous `auth.order.openai`. Les identifiants de profils `openai-codex:*` existants restent valides.
2. Le compte existant de l'application serveur dans le domicile Codex de cet agent.
3. Pour les lancements locaux de l'application serveur stdio uniquement, `CODEX_API_KEY`, puis `OPENAI_API_KEY`, lorsqu'aucun compte d'application serveur n'est présent et que l'authentification OpenAI est toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela
permet de garder les clés Gateway de niveau API disponibles pour les incorporations ou les modèles OpenAI directs
sans faire facturer par inadvertance les tours natifs du serveur d'application Codex via l'API.
Les profils explicites de clé API Codex et la secours de clé d'environnement stdio locale utilisent la connexion
au serveur d'application au lieu de l'environnement de processus enfant hérité. Les connexions WebSocket au serveur d'application
ne reçoivent pas la secours de clé Gateway d'environnement API ; utilisez un profil d'authentification explicite ou le
propre compte du serveur d'application distant.

Si un profil d'abonnement atteint une limite d'utilisation Codex, OpenClaw enregistre l'heure de
réinitialisation lorsque Codex en signale une et tente le profil d'authentification ordonné suivant pour la même
exécution Codex. Une fois l'heure de réinitialisation passée, le profil d'abonnement redevient éligible
sans modifier le modèle `openai/gpt-*` sélectionné ou le runtime Codex.

Pour les lancements locaux de serveur d'application stdio, OpenClaw définit `CODEX_HOME` sur un répertoire
par agent, afin que la configuration Codex, les fichiers d'authentification/de compte, le cache/les données des plugins, et l'état
du thread natif ne lisent ni n'écrivent le `~/.codex` personnel de l'opérateur par
défaut. OpenClaw préserve le `HOME` de processus normal ; les sous-processus
exécutés par Codex peuvent toujours trouver la configuration et les jetons du dossier utilisateur personnel, et Codex peut découvrir des entrées
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
les sous-processus puissent utiliser l'état normal du dossier utilisateur personnel.

Les outils dynamiques Codex sont chargés par défaut via `searchable`OpenClaw. OpenClaw n'expose pas les outils dynamiques qui dupliquent les opérations d'espace de travail natives de Codex : `read`, `write`, `edit`, `apply_patch`, `exec`, `process` et `update_plan`OpenClaw. La plupart des autres outils d'intégration OpenClaw tels que la messagerie, les médias, cron, le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search` sont disponibles via la recherche d'outils Codex sous l'espace de noms `openclaw`, ce qui permet de garder le contexte du modèle initial plus petit.
`sessions_yield` et les réponses source de type message-tool-only restent directes car il s'agit de contrats de contrôle de tour. `sessions_spawn` reste searchable afin que le `spawn_agent`OpenClaw natif de Codex reste la surface principale du sous-agent Codex, tandis que la délégation explicite à OpenClaw ou à l'ACP est toujours disponible via l'espace de noms d'outils dynamiques `openclaw`. Les instructions de collaboration Heartbeat demandent à Codex de rechercher `heartbeat_respond` avant de terminer un tour de battement de cœur (heartbeat) lorsque l'outil n'est pas déjà chargé.

Définissez `codexDynamicToolsLoading: "direct"` uniquement lors de la connexion à un serveur d'application Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

Champs de plugin Codex de premier niveau pris en charge :

| Champ                      | Par défaut     | Signification                                                                                                                 |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Utilisez `"direct"`OpenClaw pour placer les outils dynamiques OpenClaw directement dans le contexte initial de l'outil Codex. |
| `codexDynamicToolsExclude` | `[]`           | Noms d'outils dynamiques OpenClaw supplémentaires à omettre des tours du serveur d'application Codex.                         |
| `codexPlugins`             | désactivé      | Prise en charge native des plugins/applications Codex pour les plugins sélectionnés installés par la source et migrés.        |

Champs `appServer` pris en charge :

| Champ                                         | Par défaut                                                         | Signification                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                          | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `command`                                     | binaire Codex géré                                                 | Exécutable pour le transport stdio. Laisser non défini pour utiliser le binaire géré ; ne le définir que pour une substitution explicite.                                                                                                                                                                                                                                                                                                                                   |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                           | Arguments pour le transport stdio.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `url`                                         | non défini                                                         | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `authToken`                                   | non défini                                                         | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `headers`                                     | `{}`                                                               | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `clearEnv`                                    | `[]`                                                               | Noms de variables d'environnement supplémentaires supprimés du processus de serveur d'application stdio généré après qu'OpenClaw a construit son environnement hérité. OpenClaw conserve les `CODEX_HOME` par agent et les `HOME` hérités pour les lancements locaux.                                                                                                                                                                                                       |
| `codeModeOnly`                                | `false`                                                            | Opter pour la surface d'outil en mode code uniquement de Codex. Les outils dynamiques OpenClaw restent enregistrés avec Codex afin que les appels imbriqués `tools.*` passent par le pont `item/tool/call` du serveur d'application.                                                                                                                                                                                                                                        |
| `requestTimeoutMs`                            | `60000`                                                            | Délai d'expiration pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                                                                                                                                                                                                            |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                            | Fenêtre de silence après que Codex accepte un tour ou après une demande de serveur d'application délimitée à un tour pendant que OpenClaw attend `turn/completed`. Augmentez ceci pour les phases de synthèse lentes post-outil ou statut uniquement.                                                                                                                                                                                                                       |
| `postToolRawAssistantCompletionIdleTimeoutMs` | non défini                                                         | Garde d'inactivité de complétion utilisé après un transfert d'outil lorsque Codex émet une complétion brute d'assistant ou une progression mais n'envoie pas `turn/completed`. Par défaut, le délai d'inactivité de complétion de l'assistant lorsqu'il n'est pas défini. Utilisez ceci pour les charges de travail de confiance ou lourdes où la synthèse post-outil peut légitimement rester silencieuse plus longtemps que le budget de libération final de l'assistant. |
| `mode`                                        | `"yolo"` sauf si les exigences Codex locales n'autorisent pas YOLO | Préréglage pour l'exécution en mode YOLO ou révisée par un gardien. Les exigences stdio locales qui omettent `danger-full-access`, l'approbation `never` ou le réviseur `user` font du gardien implicite celui par défaut.                                                                                                                                                                                                                                                  |
| `approvalPolicy`                              | `"never"` ou une stratégie d'approbation de gardien autorisée      | Stratégie d'approbation native Codex envoyée au démarrage/à la reprise/au tour de fil. Les valeurs par défaut du gardien préfèrent `"on-request"` lorsqu'il est autorisé.                                                                                                                                                                                                                                                                                                   |
| `sandbox`                                     | `"danger-full-access"` ou un bac à sable de gardien autorisé       | Mode de bac à sable natif Codex envoyé au démarrage/à la reprise du fil. Les valeurs par défaut du gardien préfèrent `"workspace-write"` lorsqu'il est autorisé, sinon `"read-only"`OpenClaw. Lorsqu'un bac à sable OpenClaw est actif, les tours `danger-full-access` utilisent le `workspace-write`OpenClaw Codex avec un accès réseau dérivé du paramètre de sortie du bac à sable OpenClaw.                                                                             |
| `approvalsReviewer`                           | `"user"` ou un réviseur de gardien autorisé                        | Utilisez `"auto_review"` pour permettre à Codex de réviser les invites d'approbation natives lorsqu'il est autorisé, sinon `guardian_subagent` ou `user`. `guardian_subagent` reste un alias hérité.                                                                                                                                                                                                                                                                        |
| `serviceTier`                                 | non défini                                                         | Niveau de service optionnel du serveur d'application Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, `null` efface la substitution, et l'ancien `"fast"` est accepté comme `"priority"`.                                                                                                                                                                                                                                     |
| `experimental.sandboxExecServer`              | `false`                                                            | Option d'aperçu qui enregistre un environnement Codex pris en charge par un bac à sable OpenClaw avec le serveur d'application Codex 0.132.0 ou plus récent, afin que l'exécution native Codex puisse s'exécuter dans le bac à sable OpenClaw actif.                                                                                                                                                                                                                        |

Les appels d'outil dynamiques détenus par OpenClaw sont limités indépendamment de OpenClaw`appServer.requestTimeoutMs` : les requêtes Codex `item/tool/call`OpenClaw utilisent par défaut un chien de garde OpenClaw de 30 secondes. Un argument `timeoutMs` positif par appel étend ou raccourcit ce budget d'outil spécifique. L'outil `image_generate` utilise `agents.defaults.imageGenerationModel.timeoutMs` lorsque l'appel d'outil ne fournit pas son propre délai d'expiration, ou une valeur par défaut de 120 secondes pour la génération d'images sinon. L'outil `image` de compréhension des médias utilise `tools.media.image.timeoutSeconds`OpenClaw ou sa valeur par défaut de 60 secondes pour les médias. Les budgets d'outils dynamiques sont plafonnés à 600000 ms. En cas d'expiration du délai, OpenClaw abandonne le signal de l'outil lorsque cela est pris en charge et renvoie une réponse d'outil dynamique ayant échoué à Codex afin que le tour puisse continuer au lieu de laisser la session dans `processing`.

Une fois que Codex a accepté un tour, et après qu'OpenClaw a répondu à une requête app-server limitée au tour, le harness attend de Codex qu'il réalise des progrès pour le tour en cours et termine éventuellement le tour natif avec `turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`, OpenClaw tente d'interrompre autant que possible le tour Codex, enregistre un délai de diagnostic, et libère le voie de session OpenClaw afin que les messages de chat suivants ne soient pas mis en file d'attente derrière un tour natif périmé. La plupart des notifications non terminales pour le même tour désarment ce chien de garde court car Codex a prouvé que le tour est toujours actif ; les complétions brutes `custom_tool_call_output` maintiennent le chien de garde court post-tool armé car elles constituent le transfert du résultat du tool limité au tour. Les notifications globales de l'app-server, telles que les mises à jour de la limite de débit, ne réinitialisent pas la progression d'inactivité du tour. Les éléments `agentMessage` terminés et les éléments bruts d'assistant pré-tool `rawResponseItem/completed` arment la libération de la sortie de l'assistant : si Codex devient ensuite silencieux sans `turn/completed`, OpenClaw tente d'interrompre autant que possible le tour natif et libère la voie de session. La progression brute de l'assistant post-tool continue d'attendre `turn/completed` tandis qu'une garde d'inactivité de complétion reste armée ; la garde utilise `appServer.postToolRawAssistantCompletionIdleTimeoutMs` lorsqu'elle est configurée et revient sinon au délai d'inactivité de complétion de l'assistant. Les diagnostics de délai incluent la dernière méthode de notification de l'app-server et, pour les éléments de réponse brute de l'assistant, le type d'élément, le rôle, l'identifiant et un aperçu borné du texte de l'assistant.

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
préférée pour les déploiements reproductibles car elle conserve le comportement du plugin dans le
même fichier révisé que le reste de la configuration du harnais Codex.

## Plugins natifs Codex

La prise en charge des plugins natifs Codex utilise les propres fonctionnalités d'application et de plugin
du serveur d'application Codex dans le même fil Codex que le tour de harnais OpenClaw. OpenClaw
ne traduit pas les plugins Codex en outils dynamiques OpenClaw
synthétiques `codex_plugin_*`.

`codexPlugins` n'affecte que les sessions qui sélectionnent le harnais Codex natif. Il
n'a aucun effet sur les exécutions PI, les exécutions normales du provider OpenAI, les liaisons de conversation
ACP ou d'autres harnais.

Config minimale migrée :

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

La configuration de l'application de fil est calculée lorsque OpenClaw établit une session de harnais Codex
ou remplace une liaison de fil Codex obsolète. Elle n'est pas recalculée à chaque tour.
Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset`, ou redémarrez la passerelle afin que
les futures sessions de harnais Codex commencent avec l'ensemble d'applications mis à jour.

Pour l'éligibilité à la migration, l'inventaire des applications, la politique d'action destructive,
les sollicitations et les diagnostics de plugins natifs, consultez
[Plugins natifs Codex](/fr/plugins/codex-native-plugins).

## Utilisation de l'ordinateur

L'utilisation de l'ordinateur est couverte dans son propre guide de configuration :
[Utilisation de l'ordinateur Codex](/fr/plugins/codex-computer-use).

La version courte : OpenClaw ne fournit pas l'application de contrôle du bureau ni n'exécute
les actions du bureau lui-même. Il prépare le serveur d'application Codex, vérifie que le
serveur MCP `computer-use` est disponible, puis laisse Codex posséder les appels d'outil MCP
natifs pendant les tours en mode Codex.

## Limites d'exécution

Le harnais Codex modifie uniquement l'exécuteur de l'agent intégré de bas niveau.

- Les outils dynamiques OpenClaw sont pris en charge. Codex demande à OpenClaw d'exécuter ces
  outils, donc OpenClaw reste dans le chemin d'exécution.
- Les outils shell, patch, MCP et d'application natifs de Codex sont détenus par Codex.
  OpenClaw peut observer ou bloquer des événements natifs sélectionnés via le relais pris en charge,
  mais il ne réécrit pas les arguments des outils natifs.
- Codex possède la compaction native, sauf si le moteur de contexte OpenClaw actif
  déclare `ownsCompaction: true`. OpenClaw conserve une copie miroir de la transcription pour
  l'historique des canaux, la recherche, `/new`, `/reset`, et le futur changement de modèle ou de harnais.
- La génération de médias, la compréhension des médias, le TTS, les approbations et la sortie de l'outil de messagerie
  continuent via les paramètres de fournisseur/modèle OpenClaw correspondants.
- `tool_result_persist` s'applique aux résultats de l'outil de transcription détenus par OpenClaw, et non
  aux enregistrements de résultats d'outil natifs de Codex.

Pour les couches de hooks, les surfaces V1 prises en charge, la gestion native des autorisations, le pilotage
de la file d'attente, les mécanismes de téléchargement des commentaires Codex et les détails de la compaction, consultez
[Codex harness runtime](/fr/plugins/codex-harness-runtime).

## Dépannage

**Codex n'apparaît pas comme un fournisseur `/model` normal :** c'est attendu pour
les nouvelles configurations. Sélectionnez un modèle `openai/gpt-*`, activez
`plugins.entries.codex.enabled`, et vérifiez si `plugins.allow` exclut
`codex`.

**OpenClaw utilise PI au lieu de Codex :** assurez-vous que la référence du modèle est
`openai/gpt-*` sur le fournisseur officiel OpenAI et que le plugin Codex est
installé et activé. Si vous avez besoin d'une preuve stricte pendant les tests, définissez le fournisseur ou
le modèle `agentRuntime.id: "codex"`. Un runtime Codex forcé échoue au lieu de
revenir à PI.

**Le runtime Codex OpenAI revient au chemin de la clé API :** collectez un extrait de passerelle expurgé
qui montre le modèle, le runtime, le fournisseur sélectionné et l'échec.
Demandez aux collaborateurs concernés d'exécuter cette commande en lecture seule sur leur hôte OpenClaw :

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
`No API key`. Une exécution corrigée doit afficher le chemin `openai-codex`OAuthOpenAIAPI OAuth
au lieu d'un échec de clé API OpenAI classique.

**La configuration `openai-codex/*` héritée reste :** exécutez `openclaw doctor --fix`.
Doctor réécrit les références de modèle héritées vers `openai/*`, supprime les épinglages de session obsolètes et
d'exécution de l'agent complet, et préserve les remplacements de profil d'auth existants.

**L'app-server est rejeté :** utilisez l'app-server Codex `0.125.0` ou plus récent.
Les prépublications de même version ou les versions avec suffixe de build telles que
`0.125.0-alpha.2` ou `0.125.0+custom`OpenClaw sont rejetées car OpenClaw teste le
plancher de protocole stable `0.125.0`.

**`/codex status` ne peut pas se connecter :** vérifiez que le plugin `codex` inclus est
activé, que `plugins.allow` l'inclut lorsqu'une liste d'autorisation est configurée, et
que tout `appServer.command`, `url`, `authToken` ou en-têtes personnalisés sont valides.

**La découverte de modèles est lente :** réduisez
`plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte. Voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference#model-discovery).

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
les en-têtes, et que l'app-server distant parle la même version de protocole de l'app-server Codex.

**Un modèle non-Codex utilise PI :** c'est attendu à moins que la stratégie de runtime du fournisseur ou du modèle
ne l'achemine vers un autre harnais. Les références de fournisseur non-OpenAI classiques restent sur
leur chemin de fournisseur normal en mode OpenAI`auto`.

**Computer Use est installé mais les outils ne s'exécutent pas :** vérifiez `/codex computer-use status` depuis une nouvelle session. Si un outil signale `Native hook relay unavailable`, utilisez `/new` ou `/reset` ; si le problème persiste, redémarrez la passerelle pour effacer les enregistrements de hooks natifs périmés. Consultez [Codex Computer Use](/fr/plugins/codex-computer-use#troubleshooting).

## Connexes

- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Plugins natifs Codex](/fr/plugins/codex-native-plugins)
- [Codex Computer Use](/fr/plugins/codex-computer-use)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Fournisseurs de modèles](/fr/concepts/model-providers)
- [OpenAI provider](/fr/providers/openai)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Hooks de plugin](/fr/plugins/hooks)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Statut](/fr/cli/status)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
