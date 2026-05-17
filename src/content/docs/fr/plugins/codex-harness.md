---
summary: "OpenClawExécuter les tours d'agent intégré OpenClaw via le harnais de serveur d'application Codex inclus"
title: "Harnais Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

Le plugin `codex`OpenClawOpenAI inclus permet à OpenClaw d'exécuter des tours d'agent OpenAI intégrés
via le serveur d'application Codex au lieu du harnais PI intégré.

Utilisez le harnais Codex lorsque vous souhaitez que Codex possède la session d'agent de bas niveau :
reprise de thread native, continuation d'outil native, compactage natif et
exécution app-server. OpenClaw possède toujours les canaux de discussion, les fichiers de session, la sélection de modèle,
les outils dynamiques OpenClaw, les approbations, la livraison des médias et le miroir
de transcription visible.

La configuration normale utilise des références de modèle OpenAI canoniques telles que OpenAI`openai/gpt-5.5`.
Ne configurez pas les références de modèle `openai-codex/gpt-*`OpenAI. Placez l'ordre d'authentification de l'agent OpenAI
sous `auth.order.openai` ; les anciens profils `openai-codex:*` et
les entrées `auth.order.openai-codex` restent pris en charge pour les installations existantes.

OpenClaw démarre les threads du serveur d'application Codex avec le mode de code natif Codex et
l'option code-mode-only activée. Cela permet de garder les outils dynamiques différés/recherchables d'OpenClaw
à l'intérieur de la surface d'exécution de code et de recherche d'outils de Codex elle-même, au lieu d'ajouter un
enveloppe de recherche d'outils de style PI par-dessus Codex.

Pour la division plus large modèle/fournisseur/runtime, commencez par
[Runtimes d'agent](/fr/concepts/agent-runtimes). La version courte est :
`openai/gpt-5.5` est la référence du modèle, `codex`TelegramDiscordSlack est le runtime, et Telegram,
Discord, Slack, ou un autre canal reste la surface de communication.

## Configuration requise

- OpenClaw avec le plugin OpenClaw`codex` inclus disponible.
- Si votre configuration utilise `plugins.allow`, incluez `codex`.
- Codex app-server `0.125.0` ou plus récent. Le plugin inclus gère un binaire
  du serveur d'application Codex compatible par défaut, donc les commandes locales `codex` sur `PATH` n'affectent
  pas le démarrage normal du harnais.
- Authentification Codex disponible via `openclaw models auth login --provider openai-codex`API,
  un compte de serveur d'application dans le domicile Codex de l'agent, ou un profil
  d'authentification avec clé API Codex explicite.

Pour la priorité de l'authentification, l'isolement de l'environnement, les commandes personnalisées de l'application serveur, la découverte de modèles et tous les champs de configuration, voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Démarrage rapide

La plupart des utilisateurs qui souhaitent Codex dans OpenClaw préfèrent cette méthode : se connecter avec un
abonnement ChatGPT/Codex, activer le plugin intégré `codex`, et utiliser une
référence canonique de `openai/gpt-*` model.

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

Si votre configuration utilise `plugins.allow`, ajoutez `codex` également :

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
du harnais Codex dans la configuration OpenClaw, et utilisez le CLI uniquement pour l'authentification Codex :

| Besoin                                                      | Définir                                                                                             | Où                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Activer le harnais                                          | `plugins.entries.codex.enabled: true`                                                               | Configuration OpenClaw                                 |
| Conserver une installation de plugin autorisée              | Inclure `codex` dans `plugins.allow`                                                                | Configuration OpenClaw                                 |
| Acheminer les tours d'agent OpenAI via Codex                | `agents.defaults.model` ou `agents.list[].model` comme `openai/gpt-*`                               | Configuration d'agent OpenClaw                         |
| Se connecter avec Codex OAuth                               | `openclaw models auth login --provider openai-codex`                                                | Profil d'authentification CLI                          |
| Ajouter une sauvegarde de clé API pour les exécutions Codex | Profil de clé API `openai:*` listé après l'authentification par abonnement dans `auth.order.openai` | Profil d'authentification CLI + Configuration OpenClaw |
| Échec fermé (fail closed) lorsque Codex est indisponible    | Provider ou modèle `agentRuntime.id: "codex"`                                                       | Configuration de modèle/provider OpenClaw              |
| Utiliser le trafic direct de l'OpenAI API                   | Provider ou model `agentRuntime.id: "pi"` avec une authentification OpenAI normale                  | Configuration model/provider OpenClaw                  |
| Régler le comportement de l'application serveur             | `plugins.entries.codex.config.appServer.*`                                                          | Configuration du plugin Codex                          |
| Activer les applications natives du plugin Codex            | `plugins.entries.codex.config.codexPlugins.*`                                                       | Configuration du plugin Codex                          |
| Activer l'Utilisation de l'ordinateur Codex                 | `plugins.entries.codex.config.computerUse.*`                                                        | Configuration du plugin Codex                          |

Utiliser les références de model `openai/gpt-*` pour les tours d'agent OpenAI pris en charge par Codex. Privilégiez
`auth.order.openai` pour l'ordre abonnement prioritaire/sauvegarde par clé API. Les profils
d'authentification `openai-codex:*` et les `auth.order.openai-codex` existants restent valides, mais
n'écrivez pas de nouvelles références de model `openai-codex/gpt-*`.

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Dans cette configuration, les deux profils passent toujours par Codex pour les tours d'agent
`openai/gpt-*`. La clé API n'est qu'un repli d'authentification, et non une demande de basculer vers PI ou
les réponses OpenAI classiques.

Le reste de cette page couvre les variantes courantes entre lesquelles les utilisateurs doivent choisir :
la forme du déploiement, le routage fermé par défaut (fail-closed), la stratégie d'approbation du gardien, les plugins Codex
natifs et l'Utilisation de l'ordinateur. Pour les listes complètes d'options, les valeurs par défaut, les énumérations, la découverte,
l'isolation de l'environnement, les délais d'expiration et les champs de transport de l'application serveur, consultez
[Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Vérifier l'exécution Codex

Utilisez `/status` dans le chat où vous attendez Codex. Un tour d'agent OpenAI
pris en charge par Codex affiche :

```text
Runtime: OpenAI Codex
```

Vérifiez ensuite l'état de l'application serveur Codex :

```text
/codex status
/codex models
```

`/codex status` signale la connectivité de l'application serveur, le compte, les limites de débit, les serveurs
MCP et les compétences. `/codex models` répertorie le catalogue en direct de l'application serveur Codex pour
le harnais et le compte. Si `/status` est surprenant, consultez
[Dépannage](#troubleshooting).

## Routage et sélection du modèle

Gardez les références de provider et la stratégie d'exécution séparées :

- Utilisez `openai/gpt-*` pour les tours d'agent OpenAI via Codex.
- N'utilisez pas `openai-codex/gpt-*` dans la configuration. Exécutez `openclaw doctor --fix` pour réparer les références héritées et les épingles de route de session obsolètes.
- `agentRuntime.id: "codex"`OpenAI est optionnel pour le mode automatique normal OpenAI, mais utile lorsqu'un déploiement doit échouer fermement si Codex est indisponible.
- `agentRuntime.id: "pi"` active un comportement PI direct pour un provider ou un modèle lorsque cela est intentionnel.
- `/codex ...` contrôle les conversations natives du serveur d'application Codex depuis le chat.
- ACP/acpx est un chemin de harnais externe séparé. Ne l'utilisez que lorsque l'utilisateur demande ACP/acpx ou un adaptateur de harnais externe.

Routage de commandes courant :

| Intention de l'utilisateur                | Utiliser                                    |
| ----------------------------------------- | ------------------------------------------- |
| Attacher le chat actuel                   | `/codex bind [--cwd <path>]`                |
| Reprendre un fil Codex existant           | `/codex resume <thread-id>`                 |
| Lister ou filtrer les fils Codex          | `/codex threads [filter]`                   |
| Envoyer uniquement des commentaires Codex | `/codex diagnostics [note]`                 |
| Démarrer une tâche ACP/acpx               | Commandes de session ACP/acpx, pas `/codex` |

| Cas d'usage                                       | Configurer                                                                          | Vérifier                                  | Notes                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec runtime natif Codex | `openai/gpt-*` plus le plugin `codex` activé                                        | `/status` affiche `Runtime: OpenAI Codex` | Chemin recommandé                                        |
| Échec fermé si Codex est indisponible             | Provider ou modèle `agentRuntime.id: "codex"`                                       | Le tour échoue au lieu de revenir à PI    | Utiliser pour les déploiements Codex uniquement          |
| Trafic direct de clé API OpenAI via PI            | Provider ou modèle `agentRuntime.id: "pi"`OpenAI et authentification OpenAI normale | `/status` affiche le runtime PI           | Utiliser uniquement lorsque PI est intentionnel          |
| Configuration héritée                             | `openai-codex/gpt-*`                                                                | `openclaw doctor --fix` le réécrit        | N'écrivez pas de nouvelle configuration de cette manière |
| Adaptateur Codex ACP/acpx                         | ACP `sessions_spawn({ runtime: "acp" })`                                            | Statut de tâche/session ACP               | Séparé du harnais natif Codex                            |

`agents.defaults.imageModel` suit le même partage de préfixe. Utilisez `openai/gpt-*`
pour la route OpenAI normale et `codex/gpt-*` uniquement lorsque la compréhension d'images
doit passer par un tour d'app-server Codex borné. N'utilisez pas
`openai-codex/gpt-*`; le médecin réécrit ce préfixe hérité en `openai/gpt-*`.

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

### Déploiement avec provider mixte

Cette configuration conserve Claude comme agent par défaut et ajoute un agent Codex nommé :

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

Avec cette configuration, l'agent `main` utilise son chemin provider normal et l'
agent `codex` utilise l'app-server Codex.

### Déploiement Codex en échec fermé

Pour les tours d'agent OpenAI, `openai/gpt-*` résout déjà vers Codex lorsque le
plugin inclus est disponible. Ajoutez une stratégie d'exécution explicite lorsque vous souhaitez une règle
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
app-server est trop ancien, ou si l'app-server ne peut pas démarrer.

## Stratégie d'app-server

Par défaut, le plugin démarre le binaire Codex géré par OpenClaw localement avec un transport
stdio. Définissez `appServer.command` uniquement lorsque vous souhaitez intentionnellement exécuter un
exécutable différent. Utilisez le transport WebSocket uniquement lorsqu'un app-server est déjà
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

Les sessions d'app-server stdio locales sont par défaut dans la posture d'opérateur local de confiance :
`approvalPolicy: "never"`, `approvalsReviewer: "user"`, et
`sandbox: "danger-full-access"`. Si les exigences Codex locales interdisent cette
posture YOLO implicite, OpenClaw sélectionne à la place les autorisations du gardien autorisées.
Lorsqu'un bac à sable OpenClaw est actif pour la session, OpenClaw restreint Codex
`danger-full-access` à Codex `workspace-write` afin que les tours natifs en mode code de Codex
restent à l'intérieur de l'espace de travail sandboxed.

Utilisez le mode gardien lorsque vous souhaitez une auto-révision native de Codex avant les échappements de bac à sable
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

Le mode Guardian s'étend aux approbations du serveur d'application Codex, généralement
`approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et
`sandbox: "workspace-write"` lorsque les exigences locales autorisent ces valeurs.

Pour chaque champ du serveur d'application, l'ordre d'authentification, l'isolation de l'environnement, la découverte et
le comportement de délai d'attente, consultez la [référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Commandes et diagnostics

Le plugin inclus enregistre `/codex` en tant que commande slash sur tout channel
qui prend en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` vérifie la connectivité du serveur d'application, les models, le compte, les limites de débit,
  les serveurs MCP et les compétences.
- `/codex models` liste les models actifs du serveur d'application Codex.
- `/codex threads [filter]` liste les threads récents du serveur d'application Codex.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un
  thread Codex existant.
- `/codex compact` demande au serveur d'application Codex de compacter le thread attaché.
- `/codex review` lance la révision native Codex pour le thread attaché.
- `/codex diagnostics [note]` demande avant d'envoyer les commentaires Codex pour le
  thread attaché.
- `/codex account` affiche l'état du compte et des limites de débit.
- `/codex mcp` liste l'état du serveur MCP du serveur d'application Codex.
- `/codex skills` liste les compétences du serveur d'application Codex.

Pour la plupart des rapports de support, commencez par `/diagnostics [note]` dans la conversation
où le bogue s'est produit. Il crée un rapport de diagnostics Gateway et, pour les sessions
de harnais Codex, demande une approbation pour envoyer le bundle de commentaires Codex pertinent.
Consultez [Exportation des diagnostics](/fr/gateway/diagnostics) pour le modèle de confidentialité et le comportement
des discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous souhaitez spécifiquement le téléchargement de commentaires Codex
pour le thread actuellement attaché sans le bundle de diagnostics complet Gateway.

### Inspecter les threads Codex localement

Le moyen le plus rapide d'inspecter une exécution Codex défectueuse consiste souvent à ouvrir directement le
thread natif Codex :

```bash
codex resume <thread-id>
```

Récupérez l'id du thread à partir de la réponse `/diagnostics` terminée, `/codex binding`, ou
`/codex threads [filter]`.

Pour les mécanismes de téléchargement et les limites de diagnostics au niveau de l'exécution, consultez
[Codex harness runtime](/fr/plugins/codex-harness-runtime#codex-feedback-upload).

L'authentification est sélectionnée dans cet ordre :

1. Profils d'authentification OpenAI ordonnés pour l'agent, de préférence sous
   `auth.order.openai`. Les ids de profils `openai-codex:*` existants restent valides.
2. Le compte existant du app-server dans le domicile Codex de cet agent.
3. Pour les lancements de app-server stdio locaux uniquement, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte app-server n'est présent et que l'authentification OpenAI est
   toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela
maintient les clés Gateway de niveau API disponibles pour les embeddings ou les modèles OpenAI directs
sans faire facturer par inadvertance les tours natifs du app-server Codex via l'API.
Les profils explicites de clé API Codex et la solution de repli de clé d'environnement stdio locale utilisent la connexion
app-server au lieu de l'environnement de processus enfant hérité. Les connexions app-server WebSocket
ne reçoivent pas la solution de repli de clé Gateway-API de l'environnement API ; utilisez un profil d'authentification explicite ou le
compte propre du app-server distant.

Si un profil d'abonnement atteint une limite d'utilisation Codex, OpenClaw enregistre l'heure de
réinitialisation lorsque Codex en signale une et essaie le prochain profil d'authentification ordonné pour la même
exécution Codex. Une fois l'heure de réinitialisation passée, le profil d'abonnement redevient éligible
sans changer le modèle `openai/gpt-*` sélectionné ou l'exécution Codex.

Si un déploiement nécessite un isolement d'environnement supplémentaire, ajoutez ces variables à
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

`appServer.clearEnv` n'affecte que le processus enfant du app-server Codex généré.

Les outils dynamiques Codex sont chargés par défaut via `searchable`OpenClaw. OpenClaw n'expose pas les outils dynamiques qui dupliquent les opérations natives de l'espace de travail Codex : `read`, `write`, `edit`, `apply_patch`, `exec`, `process` et `update_plan`OpenClaw. Les outils d'intégration OpenClaw restants, tels que la messagerie, les sessions, les médias, le cron, le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search`, sont disponibles via la recherche d'outils Codex sous l'espace de noms `openclaw`, ce qui permet de garder le contexte initial du modèle plus petit. `sessions_yield` et les réponses source utilisant uniquement l'outil de message restent directes car il s'agit de contrats de contrôle de tour. Les instructions de collaboration Heartbeat indiquent à Codex de rechercher `heartbeat_respond` avant de terminer un tour Heartbeat lorsque l'outil n'est pas déjà chargé.

Définissez `codexDynamicToolsLoading: "direct"` uniquement lors de la connexion à un serveur d'application Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

Champs de plug-in Codex de premier niveau pris en charge :

| Champ                      | Par défaut     | Signification                                                                                                                 |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | Utilisez `"direct"`OpenClaw pour placer les outils dynamiques OpenClaw directement dans le contexte initial des outils Codex. |
| `codexDynamicToolsExclude` | `[]`           | Noms d'outils dynamiques OpenClaw supplémentaires à omettre des tours du serveur d'application Codex.                         |
| `codexPlugins`             | désactivé      | Prise en charge native des plug-ins/applications Codex pour les plug-ins curatoriels installés à la source et migrés.         |

Champs `appServer` pris en charge :

| Champ                         | Par défaut                                                    | Signification                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                     | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                              |
| `command`                     | binaire Codex géré                                            | Exécutable pour le transport stdio. Laissez non défini pour utiliser le binaire géré ; ne le définissez que pour un remplacement explicite.                                                                                                                                             |
| `args`                        | `["app-server", "--listen", "stdio://"]`                      | Arguments pour le transport stdio.                                                                                                                                                                                                                                                      |
| `url`                         | unset                                                         | URL de l'application serveur WebSocket.                                                                                                                                                                                                                                                 |
| `authToken`                   | unset                                                         | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                               |
| `headers`                     | `{}`                                                          | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                     |
| `clearEnv`                    | `[]`                                                          | Noms de variables d'environnement supplémentaires supprimés du processus d'application serveur stdio généré après qu'OpenClaw a construit son environnement hérité. `CODEX_HOME` et `HOME` sont réservés pour l'isolation Codex par agent de OpenClaw lors des lancements locaux.       |
| `requestTimeoutMs`            | `60000`                                                       | Délai d'attente pour les appels au plan de contrôle de l'application serveur.                                                                                                                                                                                                           |
| `turnCompletionIdleTimeoutMs` | `60000`                                                       | Fenêtre de silence après une requête d'application serveur Codex limitée à un tour pendant que OpenClaw attend `turn/completed`. Augmentez cette valeur pour les phases de synthèse lentes après l'utilisation d'un outil ou les phases de synthèse de statut uniquement.               |
| `mode`                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO | Préréglage pour l'exécution YOLO ou examinée par un gardien. Les exigences stdio locales qui omettent `danger-full-access`, l'approbation `never`, ou le réviseur `user` définissent le gardien par défaut implicite.                                                                   |
| `approvalPolicy`              | `"never"` ou une stratégie d'approbation de gardien autorisée | Stratégie d'approbation Codex native envoyée au démarrage/reprise/tour du fil. Les valeurs par défaut du gardien préfèrent `"on-request"` lorsque cela est autorisé.                                                                                                                    |
| `sandbox`                     | `"danger-full-access"` ou un bac à sable de gardien autorisé  | Mode de bac à sable Codex natif envoyé au démarrage/reprise du fil. Les valeurs par défaut du gardien préfèrent `"workspace-write"` lorsque cela est autorisé, sinon `"read-only"`. Lorsqu'un bac à sable OpenClaw est actif, `danger-full-access` est restreint à `"workspace-write"`. |
| `approvalsReviewer`           | `"user"` ou un examinateur gardien autorisé                   | Utilisez `"auto_review"` pour permettre à Codex de réviser les invites d'approbation natives lorsque cela est autorisé, sinon `guardian_subagent` ou `user`. `guardian_subagent` reste un alias hérité.                                                                                 |
| `serviceTier`                 | unset                                                         | Niveau de service optionnel de l'application serveur Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, `null` efface le remplacement, et l'hérité `"fast"` est accepté comme `"priority"`.                                                 |

Les appels d'outil dynamiques détenus par OpenClaw sont délimités indépendamment de
`appServer.requestTimeoutMs` : les requêtes Codex `item/tool/call` utilisent par défaut un chien de garde OpenClaw de 30 secondes. Un argument `timeoutMs` positif par appel étend ou raccourcit ce budget d'outil spécifique. L'outil `image_generate` utilise également `agents.defaults.imageGenerationModel.timeoutMs` lorsque l'appel d'outil ne fournit pas son propre délai d'attente, et l'outil `image` de compréhension des médias utilise `tools.media.image.timeoutSeconds` ou son défaut média de 60 secondes. Les budgets d'outil dynamiques sont plafonnés à 600000 ms. En cas de dépassement de délai, OpenClaw abandonne le signal de l'outil lorsque cela est pris en charge et renvoie une réponse d'outil dynamique échouée à Codex afin que le tour puisse continuer au lieu de laisser la session en `processing`.

Après qu'OpenClaw a répondu à une demande app-server limitée à un tour Codex, le harnais attend également que Codex termine le tour natif avec OpenClaw`turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClaw après cette réponse, OpenClaw interrompt le tour Codex de son mieux, enregistre un délai de diagnostic et libère le volet de session OpenClaw afin que les messages de chat de suivi ne soient pas mis en file d'attente derrière un tour natif périmé. Toute notification non terminale pour le même tour, y compris `rawResponseItem/completed`, désarme ce chien de garde court car Codex a prouvé que le tour est toujours actif ; le chien de garde terminal plus long continue de protéger les tours véritablement bloqués. Les notifications globales de l'app-server, telles que les mises à jour de limite de débit, ne réinitialisent pas la progression d'inactivité du tour. Lorsque Codex émet un élément `agentMessage` terminé puis devient silencieux sans `turn/completed`OpenClaw, OpenClaw considère la sortie de l'assistant comme effectivement terminée, interrompt le tour natif Codex de son mieux et libère le volet de session. Les diagnostics de délai incluent la dernière méthode de notification de l'app-server et, pour les éléments de réponse bruts de l'assistant, le type d'élément, le rôle, l'ID et un aperçu borné du texte de l'assistant.

Les remplacements d'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque
`appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez plutôt
`plugins.entries.codex.config.appServer.mode: "guardian"`, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests locaux ponctuels. La configuration est préférée pour les déploiements reproductibles car elle conserve le comportement du plugin dans le même fichier examiné que le reste de la configuration du harnais Codex.

## Plugins natifs Codex

La prise en charge native des plugins Codex utilise les propres capacités d'application et de plugin du serveur d'application Codex dans le même thread Codex que le tour du harnais OpenClaw. OpenClaw ne traduit pas les plugins Codex en outils dynamiques synthétiques `codex_plugin_*` OpenClaw.

`codexPlugins` affecte uniquement les sessions qui sélectionnent le harnais Codex natif. Il n'a aucun effet sur les exécutions PI, les exécutions normales du provider OpenAI, les liaisons de conversation ACP ou autres harnais.

Configuration minimale migrée :

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

La configuration de l'application de thread est calculée lorsque OpenClaw établit une session de harnais Codex ou remplace une liaison de thread Codex obsolète. Elle n'est pas recalculée à chaque tour. Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset`, ou redémarrez la passerelle afin que les futures sessions de harnais Codex commencent avec le jeu d'applications mis à jour.

Pour l'éligibilité à la migration, l'inventaire des applications, la politique d'action destructive, les sollicitations et les diagnostics de plugins natifs, consultez [Plugins Codex natifs](/fr/plugins/codex-native-plugins).

## Computer Use

Computer Use est couvert dans son propre guide de configuration : [Codex Computer Use](/fr/plugins/codex-computer-use).

La version courte : OpenClaw ne fournit pas l'application de contrôle du bureau ni n'exécute les actions du bureau lui-même. Il prépare le serveur d'application Codex, vérifie que le serveur MCP `computer-use` est disponible, puis laisse Codex posséder les appels d'outils MCP natifs lors des tours en mode Codex.

## Limites d'exécution

Le harnais Codex modifie uniquement l'exécuteur de l'agent intégré de bas niveau.

- Les outils dynamiques OpenClaw sont pris en charge. Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.
- Les outils natifs Codex shell, patch, MCP et d'application native sont possédés par Codex. OpenClaw peut observer ou bloquer des événements natifs sélectionnés via le relais pris en charge, mais il ne réécrit pas les arguments des outils natifs.
- Codex possède la compaction native. OpenClaw conserve une copie miroir de la transcription pour l'historique du channel, la recherche, OpenClaw`/new`, `/reset`, et les futurs changements de model ou de harness.
- La génération de média, la compréhension de média, le TTS, les approbations et la sortie de l'outil de messagerie continuent via les paramètres de provider/model OpenClaw correspondants.
- `tool_result_persist`OpenClaw s'applique aux résultats de l'outil de transcription détenus par OpenClaw, et non aux enregistrements de résultats d'outil natifs Codex.

Pour les couches de hook, les surfaces V1 prises en charge, la gestion native des permissions, la direction de la file d'attente, les mécanismes de téléchargement de commentaires Codex et les détails de compaction, consultez [Codex harness runtime](/fr/plugins/codex-harness-runtime).

## Dépannage

**Codex n'apparaît pas comme un provider `/model` normal :** c'est attendu pour les nouvelles configurations. Sélectionnez un model `openai/gpt-*`, activez `plugins.entries.codex.enabled`, et vérifiez si `plugins.allow` exclut `codex`.

**OpenClaw utilise PI au lieu de Codex :** assurez-vous que la référence du model est OpenClaw`openai/gpt-*`OpenAI sur le provider OpenAI officiel et que le plugin Codex est installé et activé. Si vous avez besoin d'une preuve stricte lors des tests, définissez le provider ou le model `agentRuntime.id: "codex"`. Un runtime Codex forcé échoue au lieu de revenir à PI.

**La configuration `openai-codex/*` héritée demeure :** exécutez `openclaw doctor --fix`. Doctor réécrit les références de model héritées en `openai/*`, supprime les épinglages de session obsolètes et de runtime d'agent global, et préserve les remplacements de profil d'authentification existants.

**L'app-server est rejeté :** utilisez l'`0.125.0` de l'app-server Codex ou plus récent. Les préversions de même version ou les versions suffixées par build telles que `0.125.0-alpha.2` ou `0.125.0+custom`OpenClaw sont rejetées car OpenClaw teste le plancher de protocole stable `0.125.0`.

**`/codex status` ne peut pas se connecter :** vérifiez que le plugin intégré `codex` est
activé, que `plugins.allow` l'inclut lorsqu'une liste d'autorisation est configurée, et
que tous les éléments `appServer.command`, `url`, `authToken` ou en-têtes personnalisés sont valides.

**La découverte de modèle est lente :** diminuez
`plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte. Voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference#model-discovery).

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
les en-têtes, et que le serveur d'application distant parle la même version de
protocole du serveur d'application Codex.

**Un modèle non-Codex utilise PI :** c'est normal sauf si la stratégie d'exécution du fournisseur ou du modèle
l'achemine vers un autre harnais. Les références de fournisseur non-OpenAI simples restent sur
leur chemin de fournisseur normal en mode `auto`.

**L'ordinateur est installé mais les outils ne s'exécutent pas :** vérifiez
`/codex computer-use status` à partir d'une nouvelle session. Si un outil signale
`Native hook relay unavailable`, utilisez `/new` ou `/reset` ; si le problème persiste, redémarrez
la passerelle pour effacer les enregistrements de hooks natifs obsolètes. Voir
[Ordinateur Codex](/fr/plugins/codex-computer-use#troubleshooting).

## Connexes

- [Référence du harnais Codex](/fr/plugins/codex-harness-reference)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Plugins natifs Codex](/fr/plugins/codex-native-plugins)
- [Ordinateur Codex](/fr/plugins/codex-computer-use)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Fournisseurs de modèle](/fr/concepts/model-providers)
- [Fournisseur OpenAI](/fr/providers/openai)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Hooks de plugin](/fr/plugins/hooks)
- [Export des diagnostics](/fr/gateway/diagnostics)
- [Statut](/fr/cli/status)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
