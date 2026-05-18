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

OpenClaw démarre les threads du serveur d'application Codex avec le mode de code natif Codex et
l'option code-mode-only activée. Cela permet de garder les outils dynamiques différés/recherchables d'OpenClaw
à l'intérieur de la surface d'exécution de code et de recherche d'outils de Codex elle-même, au lieu d'ajouter un
enveloppe de recherche d'outils de style PI par-dessus Codex.

Pour la répartition plus large modèle/fournisseur/runtime, commencez par [Runtimes d'agent](/fr/concepts/agent-runtimes). La version courte est : `openai/gpt-5.5` est la référence du modèle, `codex`TelegramDiscordSlack est le runtime, et Telegram, Discord, Slack ou un autre canal reste la surface de communication.

## Configuration requise

- OpenClaw avec le plugin OpenClaw`codex` inclus disponible.
- Si votre configuration utilise `plugins.allow`, incluez `codex`.
- Application serveur Codex `0.125.0` ou plus récente. Le plugin inclus gère un binaire d'application serveur Codex compatible par défaut, donc les commandes `codex` locales sur `PATH` n'affectent pas le démarrage normal du harnais.
- Authentification Codex disponible via `openclaw models auth login --provider openai-codex`API, un compte d'application serveur dans le domicile Codex de l'agent, ou un profil d'authentification explicite avec clé API Codex.

Pour la priorité d'authentification, l'isolement de l'environnement, les commandes personnalisées de l'application serveur, la découverte de modèles et tous les champs de configuration, consultez la [Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Démarrage rapide

La plupart des utilisateurs qui souhaitent Codex dans OpenClaw veulent cette voie : se connecter avec un
abonnement ChatGPT/Codex, activer le plugin intégré OpenClaw`codex` et utiliser une
référence de modèle `openai/gpt-*` canonique.

Connectez-vous avec Codex OAuth :

```bash
openclaw models auth login --provider openai-codex
```

Activez le plugin intégré `codex` et sélectionnez un modèle d'agent OpenAI :

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

Si votre configuration utilise `plugins.allow`, ajoutez `codex` également à cet endroit :

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

Redémarrez la passerelle après avoir modifié la configuration du plugin. Si une discussion existante possède déjà
une session, utilisez `/new` ou `/reset` avant de tester les modifications d'exécution afin que le prochain
tour résolve le harnais à partir de la configuration actuelle.

## Configuration

La configuration de démarrage rapide est la configuration minimale viable du harnais Codex. Définissez les options
du harnais Codex dans la configuration OpenClaw, et utilisez le CLI uniquement pour l'authentification Codex :

| Besoin                                                      | Définir                                                                                               | Où                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Activer le harnais                                          | `plugins.entries.codex.enabled: true`                                                                 | Configuration OpenClaw                                 |
| Conserver une installation de plugin autorisée              | Incluez `codex` dans `plugins.allow`                                                                  | Configuration OpenClaw                                 |
| Acheminer les tours d'agent OpenAI via Codex                | `agents.defaults.model` ou `agents.list[].model` en tant que `openai/gpt-*`                           | Configuration d'agent OpenClaw                         |
| Se connecter avec Codex OAuth                               | `openclaw models auth login --provider openai-codex`                                                  | Profil d'authentification CLI                          |
| Ajouter une sauvegarde de clé API pour les exécutions Codex | Profil de clé d'API `openai:*` listé après l'authentification par abonnement dans `auth.order.openai` | Profil d'authentification CLI + Configuration OpenClaw |
| Échec fermé (fail closed) lorsque Codex est indisponible    | Fournisseur ou modèle `agentRuntime.id: "codex"`                                                      | Configuration de modèle/provider OpenClaw              |
| Utiliser le trafic direct de l'OpenAI API                   | Fournisseur ou modèle `agentRuntime.id: "pi"` avec l'authentification OpenAI normale                  | Configuration model/provider OpenClaw                  |
| Régler le comportement de l'application serveur             | `plugins.entries.codex.config.appServer.*`                                                            | Configuration du plugin Codex                          |
| Activer les applications natives du plugin Codex            | `plugins.entries.codex.config.codexPlugins.*`                                                         | Configuration du plugin Codex                          |
| Activer l'Utilisation de l'ordinateur Codex                 | `plugins.entries.codex.config.computerUse.*`                                                          | Configuration du plugin Codex                          |

Utilisez des références de modèle `openai/gpt-*` pour les tours d'agent OpenAI pris en charge par Codex. Privilégiez
`auth.order.openai` pour l'ordre d'abord par abonnement/secours par clé d'API. Les profils
d'authentification `openai-codex:*` existants et les `auth.order.openai-codex` restent valides, mais
n'écrivez pas de nouvelles références de modèle `openai-codex/gpt-*`.

Ne définissez pas `compaction.model` ou `compaction.provider` sur les agents pris en charge par Codex
sauf si un moteur de contexte sélectionné possède la compactage. Sans moteur de contexte propriétaire,
Codex compacte via son état de thread natif du serveur d'application, donc OpenClaw
ignore ces substitutions de résumeur local lors de l'exécution et `openclaw doctor --fix`
les supprime lorsque l'agent utilise Codex.

Lossless reste pris en charge en tant que moteur de contexte. Configurez-le via
`plugins.slots.contextEngine: "lossless-claw"` et
`plugins.entries.lossless-claw.config.summaryModel`, et non via
`agents.defaults.compaction.provider`. `openclaw doctor --fix` migre l'ancienne
structure `compaction.provider: "lossless-claw"` vers l'emplacement du moteur de contexte Lossless
lorsque Codex est le runtime actif.

Lorsque le moteur de contexte actif signale `ownsCompaction: true`, `/compact` exécute
le cycle de vie de compactage de ce moteur et invalide le thread
Codex app-server lié. Le prochain tour Codex démarre un thread backend frais
et le réhydrate à partir du moteur de contexte au lieu de superposer le compactage natif
de Codex au résumé sémantique détenu par le moteur.

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Dans cette configuration, les deux profils s'exécutent toujours via Codex pour les tours d'agent
`openai/gpt-*`. La clé API n'est qu'un repli d'authentification, et non une demande
de basculer vers PI ou les réponses OpenAI simples.

Le reste de cette page couvre les variantes courantes entre lesquelles les utilisateurs doivent choisir :
la forme du déploiement, le routage fail-closed, la stratégie d'approbation du gardien,
les plugins natifs Codex et l'ordinateur (Computer Use). Pour les listes complètes d'options,
les valeurs par défaut, les énumérations, la découverte, l'isolement de l'environnement,
les délais d'attente et les champs de transport app-server, voir
[Codex harness reference](/fr/plugins/codex-harness-reference).

## Vérifier le runtime Codex

Utilisez `/status` dans le chat où vous attendez Codex. Un tour d'agent
OpenAI pris en charge par Codex affiche :

```text
Runtime: OpenAI Codex
```

Vérifiez ensuite l'état du Codex app-server :

```text
/codex status
/codex models
```

`/codex status` signale la connectivité app-server, le compte, les limites de débit,
les serveurs MCP et les compétences. `/codex models` répertorie le catalogue en direct du Codex app-server
pour le harnais et le compte. Si `/status` est surprenant, consultez
[Troubleshooting](#troubleshooting).

## Routage et sélection de model

Gardez les références de provider et la stratégie d'exécution séparées :

- Utilisez `openai/gpt-*` pour les tours d'agent OpenAI via Codex.
- N'utilisez pas `openai-codex/gpt-*` dans la configuration. Exécutez `openclaw doctor --fix` pour
  réparer les références héritées et les épingles de route de session obsolètes.
- `agentRuntime.id: "codex"` est facultatif pour le mode automatique normal OpenAI, mais utile lorsqu'un déploiement doit échouer de manière fermée si Codex n'est pas disponible.
- `agentRuntime.id: "pi"` active un fournisseur ou un modèle pour un comportement direct PI lorsque cela est intentionnel.
- `/codex ...` contrôle les conversations natives du serveur d'application Codex à partir du chat.
- ACP/acpx est un chemin de harnais externe distinct. Ne l'utilisez que lorsque l'utilisateur demande ACP/acpx ou un adaptateur de harnais externe.

Routage des commandes courantes :

| Intention de l'utilisateur                                  | Utiliser                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Attacher le chat actuel                                     | `/codex bind [--cwd <path>]`                                                                          |
| Reprendre un fil Codex existant                             | `/codex resume <thread-id>`                                                                           |
| Lister ou filtrer les fils Codex                            | `/codex threads [filter]`                                                                             |
| Attacher une session Codex CLI existante sur un nœud jumelé | `/codex sessions --host <node> [filter]`, puis `/codex resume <session-id> --host <node> --bind here` |
| Envoyer uniquement des commentaires Codex                   | `/codex diagnostics [note]`                                                                           |
| Démarrer une tâche ACP/acpx                                 | Commandes de session ACP/acpx, pas `/codex`                                                           |

| Cas d'usage                                       | Configurer                                                                       | Vérifier                                  | Remarques                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec runtime natif Codex | `openai/gpt-*` plus le plugin `codex` activé                                     | `/status` affiche `Runtime: OpenAI Codex` | Chemin recommandé                                        |
| Échec fermé si Codex n'est pas disponible         | Fournisseur ou modèle `agentRuntime.id: "codex"`                                 | Le tour échoue au lieu du repli PI        | Utiliser pour les déploiements Codex uniquement          |
| Trafic de clé OpenAI API direct via PI            | Fournisseur ou modèle `agentRuntime.id: "pi"` et authentification OpenAI normale | `/status` affiche le runtime PI           | Utiliser uniquement lorsque PI est intentionnel          |
| Configuration héritée                             | `openai-codex/gpt-*`                                                             | `openclaw doctor --fix` le réécrit        | N'écrivez pas de nouvelle configuration de cette manière |
| Adaptateur Codex ACP/acpx                         | ACP `sessions_spawn({ runtime: "acp" })`                                         | État de tâche/session ACP                 | Séparé du harnais natif Codex                            |

`agents.defaults.imageModel` suit la même division de préfixe. Utilisez `openai/gpt-*`
pour la route OpenAI normale et `codex/gpt-*` uniquement lorsque la compréhension d'images
doit passer par un tour d'application Codex délimité. N'utilisez pas
`openai-codex/gpt-*`; le médecin réécrit cet ancien préfixe en `openai/gpt-*`.

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

### Déploiement mixte de fournisseurs

Cette configuration garde Claude comme agent par défaut et ajoute un agent Codex nommé :

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

Avec cette configuration, l'agent `main` utilise son chemin de fournisseur normal et l'
agent `codex` utilise l'application Codex.

### Déploiement Codex en échec fermé (Fail-closed)

Pour les tours d'agent OpenAI, `openai/gpt-*` résout déjà vers Codex lorsque le
plugin groupé est disponible. Ajoutez une stratégie d'exécution explicite lorsque vous souhaitez une règle
d'échec fermé écrite :

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

Avec Codex forcé, OpenClaw échoue tôt si le plugin Codex est désactivé, si l'
application est trop ancienne, ou si l'application ne peut pas démarrer.

## Stratégie de l'application serveur

Par défaut, le plugin démarre localement le binaire Codex géré par OpenClaw avec un transport
stdio. Ne définissez `appServer.command` que lorsque vous voulez intentionnellement exécuter un
exécutable différent. N'utilisez le transport WebSocket que lorsqu'une application est déjà
en cours d'exécution ailleurs :

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

Les sessions d'application stdio locales sont par défaut dans la posture d'opérateur local de confiance :
`approvalPolicy: "never"`, `approvalsReviewer: "user"`, et
`sandbox: "danger-full-access"`. Si les exigences Codex locales n'autorisent pas cette
posture YOLO implicite, OpenClaw sélectionne les autorisations de gardien autorisées à la place.
Lorsqu'un bac à sable OpenClaw est actif pour la session, OpenClaw restreint Codex
`danger-full-access` à Codex `workspace-write` afin que les tours natifs de mode code Codex
restent à l'intérieur de l'espace de travail sécurisé.

Utilisez le mode gardien lorsque vous souhaitez une auto-révision native Codex avant les échappements de bac à sable
ou les autorisations supplémentaires :

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

Le mode Guardian s'étend aux approbations de l'application serveur Codex, généralement
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et
`sandbox: "workspace-write"` lorsque les exigences locales autorisent ces valeurs.

Pour chaque champ de l'application serveur, l'ordre d'authentification, l'isolement de l'environnement, la découverte et
le comportement de délai d'attente, consultez la [référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Commandes et diagnostics

Le plugin intégré enregistre `/codex` en tant que commande slash sur n'importe quel channel prenant
en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` vérifie la connectivité de l'application serveur, les models, le compte, les limites de taux,
  les serveurs MCP et les compétences.
- `/codex models` liste les models de l'application serveur Codex actifs.
- `/codex threads [filter]` liste les threads récents de l'application serveur Codex.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un
  thread Codex existant.
- `/codex compact` demande à l'application serveur Codex de compacter le thread attaché.
- `/codex review` lance la révision native Codex pour le thread attaché.
- `/codex diagnostics [note]` demande avant d'envoyer les commentaires Codex pour le
  thread attaché.
- `/codex account` affiche l'état du compte et des limites de taux.
- `/codex mcp` liste l'état du serveur MCP de l'application serveur Codex.
- `/codex skills` liste les compétences de l'application serveur Codex.

Pour la plupart des rapports de support, commencez par `/diagnostics [note]` dans la conversation
où le bug s'est produit. Il crée un rapport de diagnostics Gateway et, pour les sessions
de harnais Codex, demande une approbation pour envoyer le bundle de commentaires Codex pertinent.
Voir [Exportation des diagnostics](/fr/gateway/diagnostics) pour le modèle de confidentialité et le comportement
de chat de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous souhaitez spécifiquement l'envoi des commentaires Codex
pour le thread actuellement attaché sans le bundle de diagnostics complet Gateway.

### Inspecter les threads Codex localement

Le moyen le plus rapide d'inspecter une mauvaise exécution Codex est souvent d'ouvrir le thread
Codex natif directement :

```bash
codex resume <thread-id>
```

Obtenez l'identifiant du thread à partir de la réponse `/diagnostics` terminée, `/codex binding` ou
`/codex threads [filter]`.

Pour les mécanismes de téléchargement et les limites de diagnostic au niveau de l'exécution, consultez
[Codex harness runtime](/fr/plugins/codex-harness-runtime#codex-feedback-upload).

L'authentification est sélectionnée dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous
   `auth.order.openai`. Les identifiants de profils `openai-codex:*` existants restent valides.
2. Le compte existant du serveur d'application dans le domicile Codex de cet agent.
3. Pour les lancements locaux du serveur d'application stdio uniquement, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte de serveur d'application n'est présent et que l'authentification OpenAI est
   toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela
permet de garder les clés Gateway de niveau API disponibles pour les embeddings ou les modèles OpenAI directs
sans faire facturer par erreur les tours natifs du serveur d'application Codex via l'API.
Les profils explicites de clés API de Codex et la clé d'environnement de secours stdio locale utilisent la connexion
au serveur d'application au lieu de l'environnement hérité du processus enfant. Les connexions WebSocket au serveur d'application
ne reçoivent pas la clé d'Gateway d'environnement de secours du API ; utilisez un profil d'authentification explicite ou le
compte propre du serveur d'application distant.

Si un profil d'abonnement atteint une limite d'utilisation Codex, OpenClaw enregistre l'heure de
réinitialisation lorsque Codex en signale une et essaie le prochain profil d'authentification ordonné pour la même
exécution Codex. Lorsque l'heure de réinitialisation est passée, le profil d'abonnement redevient éligible
sans changer le modèle `openai/gpt-*` sélectionné ou le runtime Codex.

Pour les lancements locaux de serveur d'application stdio, OpenClaw définit OpenClaw`CODEX_HOME` sur un répertoire par agent afin que la configuration Codex, les fichiers d'authentification/de compte, le cache/les données des plugins et l'état du thread natif ne lisent ni n'écrivent le `~/.codex`OpenClaw personnel de l'opérateur par défaut. OpenClaw préserve le `HOME` de processus normal ; les sous-processus exécutés par Codex peuvent toujours trouver la configuration et les jetons du répertoire personnel de l'utilisateur, et Codex peut découvrir des entrées `$HOME/.agents/skills` et `$HOME/.agents/plugins/marketplace.json` partagées.

Si un déploiement nécessite un isolement d'environnement supplémentaire, ajoutez ces variables à `appServer.clearEnv` :

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

`appServer.clearEnv`OpenClaw n'affecte que le processus enfant du serveur d'application Codex généré. OpenClaw supprime `CODEX_HOME` et `HOME` de cette liste lors de la normalisation du lancement local : `CODEX_HOME` reste par agent, et `HOME` reste hérité afin que les sous-processus puissent utiliser l'état normal du répertoire personnel de l'utilisateur.

Les outils dynamiques Codex sont chargés par défaut via `searchable`OpenClaw. OpenClaw n'expose pas les outils dynamiques qui dupliquent les opérations de l'espace de travail natives de Codex : `read`, `write`, `edit`, `apply_patch`, `exec`, `process` et `update_plan`OpenClaw. Les outils d'intégration OpenClaw restants, tels que la messagerie, les sessions, les médias, cron, le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search` sont disponibles via la recherche d'outils Codex sous l'espace de noms `openclaw`, ce qui permet de maintenir le contexte du model initial plus petit. `sessions_yield` et les réponses source issues uniquement d'outils de messagerie restent directes car ce sont des contrats de contrôle de tour. Les instructions de collaboration de battement de cœur indiquent à Codex de rechercher `heartbeat_respond` avant de terminer un tour de battement de cœur lorsque l'outil n'est pas déjà chargé.

Définissez `codexDynamicToolsLoading: "direct"` uniquement lors de la connexion à un app-server Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

Champs de plugin Codex de niveau supérieur pris en charge :

| Champ                      | Par défaut     | Signification                                                                                                              |
| -------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Utilisez `"direct"`OpenClaw pour placer les outils dynamiques OpenClaw directement dans le contexte d'outil Codex initial. |
| `codexDynamicToolsExclude` | `[]`           | Noms d'outils dynamiques OpenClaw supplémentaires à omettre des tours de l'app-server Codex.                               |
| `codexPlugins`             | désactivé      | Prise en charge native des plugins/apps Codex pour les plugins curés installés via la source et migrés.                    |

Champs `appServer` pris en charge :

| Champ                         | Par défaut                                                       | Signification                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                        | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                                      |
| `command`                     | binaire Codex géré                                               | Exécutable pour le transport stdio. Laisser non défini pour utiliser le binaire géré ; ne le définir que pour un remplacement explicite.                                                                                                                                                        |
| `args`                        | `["app-server", "--listen", "stdio://"]`                         | Arguments pour le transport stdio.                                                                                                                                                                                                                                                              |
| `url`                         | non défini                                                       | URL de l'app-server WebSocket.                                                                                                                                                                                                                                                                  |
| `authToken`                   | non défini                                                       | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                                       |
| `headers`                     | `{}`                                                             | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                             |
| `clearEnv`                    | `[]`                                                             | Noms de variables d'environnement supplémentaires supprimés du processus app-server stdio généré après qu'OpenClaw a construit son environnement hérité. OpenClaw conserve les OpenClawOpenClaw`CODEX_HOME` par agent et les `HOME` hérités pour les lancements locaux.                         |
| `requestTimeoutMs`            | `60000`                                                          | Délai d'attente pour les appels au plan de contrôle de l'app-server.                                                                                                                                                                                                                            |
| `turnCompletionIdleTimeoutMs` | `60000`                                                          | Fenêtre de silence après que Codex accepte un tour ou après une requête app-server limitée à un tour pendant qu'OpenClaw attend OpenClaw`turn/completed`. Augmentez ceci pour les phases de synthèse lentes après un tool ou uniquement de statut.                                              |
| `mode`                        | `"yolo"` sauf si les exigences locales de Codex interdisent YOLO | Préréglage pour l'exécution YOLO ou revue par un gardien. Les exigences stdio locales qui omettent `danger-full-access`, l'approbation `never`, ou le réviseur `user` font du gardien implicite celui par défaut.                                                                               |
| `approvalPolicy`              | `"never"` ou une stratégie d'approbation de gardien autorisée    | Stratégie d'approbation native Codex envoyée au démarrage/reprise/tour du fil. Les valeurs par défaut du gardien préfèrent `"on-request"` lorsque cela est autorisé.                                                                                                                            |
| `sandbox`                     | `"danger-full-access"` ou un bac à sable de gardien autorisé     | Mode de bac à sable natif Codex envoyé au démarrage/reprise du fil. Les valeurs par défaut du gardien préfèrent `"workspace-write"` lorsque cela est autorisé, sinon `"read-only"`OpenClaw. Lorsqu'un bac à sable OpenClaw est actif, `danger-full-access` est restreint à `"workspace-write"`. |
| `approvalsReviewer`           | `"user"` ou un réviseur de gardien autorisé                      | Utilisez `"auto_review"` pour laisser Codex réviser les invites d'approbation natives lorsque cela est autorisé, sinon `guardian_subagent` ou `user`. `guardian_subagent` reste un alias historique.                                                                                            |
| `serviceTier`                 | unset                                                            | Niveau de service optionnel de l'app-server Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, `null` efface la substitution, et l'historique `"fast"` est accepté comme `"priority"`.                                                              |

Les appels d'outil dynamiques détenus par OpenClaw sont limités indépendamment de
`appServer.requestTimeoutMs` : les requêtes Codex `item/tool/call` utilisent par défaut un chien de garde
OpenClaw de 30 secondes. Un argument `timeoutMs` positif par appel étend
ou réduit ce budget d'outil spécifique. L'outil `image_generate` utilise également
`agents.defaults.imageGenerationModel.timeoutMs` lorsque l'appel d'outil ne fournit
pas son propre délai d'attente, et l'outil `image` de compréhension des médias utilise
`tools.media.image.timeoutSeconds` ou son média par défaut de 60 secondes. Les budgets d'outil
dynamiques sont plafonnés à 600 000 ms. En cas de dépassement de délai, OpenClaw abandonne le signal de l'outil
lorsque cela est pris en charge et renvoie une réponse d'outil dynamique échouée à Codex afin que le tour
puisse continuer au lieu de laisser la session en `processing`.

Une fois que Codex a accepté un tour, et après qu'OpenClaw a répondu à une requête app-server limitée au tour, le harnais s'attend à ce que Codex réalise des progrès pour le tour en cours et termine éventuellement le tour natif avec `turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`, OpenClaw fait de son mieux pour interrompre le tour Codex, enregistre un diagnostic d'expiration de délai, et libère le OpenClaw session lane afin que les messages de chat suivants ne soient pas mis en file derrière un tour natif périmé. La plupart des notifications non terminales pour le même tour désarment ce chien de garde court car Codex a prouvé que le tour est toujours en vie ; les achèvements `custom_tool_call_output` bruts maintiennent le chien de garde court post-tool armé car ils constituent le transfert du résultat du tool limité au tour. Les notifications globales de l'app-server, telles que les mises à jour de limites de taux, ne réinitialisent pas les progrès d'inactivité du tour. Les éléments `agentMessage` terminés et les éléments bruts d'assistant pré-tool `rawResponseItem/completed` arment la libération de la sortie de l'assistant : si Codex devient ensuite silencieux sans `turn/completed`, OpenClaw fait de son mieux pour interrompre le tour natif et libère le session lane. Les progrès bruts de l'assistant post-tool continuent d'attendre `turn/completed` ou le chien de garde terminal. Les diagnostics d'expiration incluent la dernière méthode de notification de l'app-server et, pour les éléments de réponse brute de l'assistant, le type d'élément, le rôle, l'ID et un aperçu délimité du texte de l'assistant.

Les redéfinitions de variables d'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque
`appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez plutôt
`plugins.entries.codex.config.appServer.mode: "guardian"`, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests ponctuels locaux. La configuration est
préférée pour les déploiements reproductibles car elle conserve le comportement du plugin dans le
même fichier examiné que le reste de la configuration du harnais Codex.

## Plugins Codex natifs

La prise en charge native des plugins Codex utilise les propres capacités d'application et de plugin du serveur d'application Codex dans le même thread Codex que le tour du harnais OpenClaw. OpenClaw ne traduit pas les plugins Codex en outils dynamiques OpenClawOpenClaw`codex_plugin_*`OpenClaw OpenClaw synthétiques.

`codexPlugins`OpenAI affecte uniquement les sessions qui sélectionnent le harnais Codex natif. Il n'a aucun effet sur les exécutions PI, les exécutions normales du fournisseur OpenAI, les liaisons de conversation ACP ou d'autres harnais.

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

La config de l'application de thread est calculée lorsqu'OpenClaw établit une session de harnais Codex ou remplace une liaison de thread Codex obsolète. Elle n'est pas recalculée à chaque tour. Après avoir modifié OpenClaw`codexPlugins`, utilisez `/new`, `/reset`, ou redémarrez la passerelle pour que les futures sessions de harnais Codex commencent avec l'ensemble d'applications mis à jour.

Pour l'éligibilité à la migration, l'inventaire des applications, la politique d'action destructrice, les sollicitations et les diagnostics de plugins natifs, consultez [Plugins Codex natifs](/fr/plugins/codex-native-plugins).

## Utilisation de l'ordinateur

L'Utilisation de l'ordinateur est traitée dans son propre guide de configuration :
[Utilisation de l'ordinateur Codex](/fr/plugins/codex-computer-use).

La version courte : OpenClaw ne fournit pas l'application de contrôle du bureau et n'exécute pas les actions du bureau lui-même. Il prépare le serveur d'application Codex, vérifie que le serveur MCP OpenClaw`computer-use` est disponible, puis laisse Codex gérer les appels d'outil MCP natifs lors des tours en mode Codex.

## Limites d'exécution

Le harnais Codex modifie uniquement l'exécuteur d'agent intégré de bas niveau.

- Les outils dynamiques OpenClaw sont pris en charge. Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.
- Les outils shell, patch, MCP et d'application natifs de Codex sont gérés par Codex.
  OpenClaw peut observer ou bloquer des événements natifs sélectionnés via le relais pris en charge, mais il ne réécrit pas les arguments des outils natifs.
- Codex possède la compaction native, sauf si le moteur de contexte OpenClaw actif déclare OpenClaw`ownsCompaction: true`OpenClaw. OpenClaw conserve une copie du transcript pour l'historique du canal, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais.
- La génération de médias, la compréhension des médias, la synthèse vocale (TTS), les approbations et la sortie de l'outil de messagerie continuent via les paramètres de fournisseur/modèle OpenClaw correspondants.
- `tool_result_persist`OpenClaw s'applique aux résultats des outils de transcript appartenant à OpenClaw, et non aux enregistrements de résultats d'outil natifs Codex.

Pour les couches de hooks, les surfaces V1 prises en charge, la gestion native des autorisations, le pilotage de la file d'attente, les mécanismes de téléchargement des commentaires Codex et les détails de la compaction, voir [Codex harness runtime](/fr/plugins/codex-harness-runtime).

## Dépannage

**Codex n'apparaît pas comme un fournisseur normal `/model` :** c'est attendu pour les nouvelles configurations. Sélectionnez un modèle `openai/gpt-*`, activez `plugins.entries.codex.enabled` et vérifiez si `plugins.allow` exclut `codex`.

**OpenClaw utilise PI au lieu de Codex :** assurez-vous que la référence du modèle est OpenClaw`openai/gpt-*`OpenAI sur le fournisseur officiel OpenAI et que le plugin Codex est installé et activé. Si vous avez besoin d'une preuve stricte pendant les tests, définissez le fournisseur ou le modèle `agentRuntime.id: "codex"`. Un runtime Codex forcé échoue au lieu de revenir à PI.

**Le runtime OpenAI Codex revient au chemin de la clé d'API :** collectez un extrait de passerelle expurgé qui montre le modèle, le runtime, le fournisseur sélectionné et l'échec. Demandez aux collaborateurs concernés d'exécuter cette commande en lecture seule sur leur hôte OpenClaw :

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
au lieu d'un échec simple de clé API OpenAI API.

**La configuration héritée `openai-codex/*` reste :** exécutez `openclaw doctor --fix`.
Doctor réécrit les références de modèle héritées vers `openai/*`, supprime les sessions obsolètes et
les épinglages d'exécution d'agent complet, et préserve les substitutions de profil d'authentification existantes.

**Le app-server est rejeté :** utilisez le `0.125.0` de l'application serveur Codex ou plus récent.
Les versions préliminaires de même version ou les versions suffixées de build telles que
`0.125.0-alpha.2` ou `0.125.0+custom` sont rejetées car OpenClaw teste le
plancher de protocole stable `0.125.0`.

**`/codex status` ne peut pas se connecter :** vérifiez que le plugin `codex` inclus est
activé, que `plugins.allow` l'inclut lorsqu'une liste autorisée est configurée, et
que tout `appServer.command`, `url`, `authToken` ou en-têtes personnalisés sont valides.

**La découverte de modèles est lente :** diminuez
`plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte. Voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference#model-discovery).

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
les en-têtes, et que l'application serveur distante parle la même version de protocole
Codex app-server.

**Un modèle non-Codex utilise PI :** c'est attendu sauf si la stratégie d'exécution du fournisseur ou du modèle
l'achemine vers un autre harnais. Les références de fournisseur non OpenAI brutes restent sur
leur chemin de fournisseur normal en mode `auto`.

**L'outil Computer Use est installé mais les outils ne s'exécutent pas :** vérifiez `/codex computer-use status` depuis une nouvelle session. Si un outil signale `Native hook relay unavailable`, utilisez `/new` ou `/reset` ; si le problème persiste, redémarrez la passerelle pour effacer les enregistrements de hooks natifs obsolètes. Voir [Codex Computer Use](/fr/plugins/codex-computer-use#troubleshooting).

## Connexes

- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Plugins natifs Codex](/fr/plugins/codex-native-plugins)
- [Codex Computer Use](/fr/plugins/codex-computer-use)
- [Runtimes des agents](/fr/concepts/agent-runtimes)
- [Providers de modèles](/fr/concepts/model-providers)
- [Provider OpenAI](/fr/providers/openai)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Hooks de plugin](/fr/plugins/hooks)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Statut](/fr/cli/status)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
