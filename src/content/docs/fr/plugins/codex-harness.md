---
summary: "Exécuter les tours d'agent intégrés OpenClaw via le harnais d'app-server Codex intégré"
title: "Harnais Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

Le plugin intégré `codex` permet à OpenClaw d'exécuter des tours d'agent OpenAI intégrés
via l'app-server Codex au lieu du harnais PI intégré.

Utilisez le harnais Codex lorsque vous souhaitez que Codex possède la session d'agent de bas niveau :
reprise de thread native, continuation d'outil native, compactage natif et
exécution app-server. OpenClaw possède toujours les canaux de discussion, les fichiers de session, la sélection de modèle,
les outils dynamiques OpenClaw, les approbations, la livraison des médias et le miroir
de transcription visible.

La configuration normale utilise des références de modèle canoniques OpenAI telles que `openai/gpt-5.5`.
Ne configurez pas les références de modèle `openai-codex/gpt-*`. `openai-codex` est le fournisseur
de profil d'authentification pour les profils Codex OAuth ou les profils de clé API Codex, et non le préfixe
de fournisseur de modèle pour la nouvelle configuration d'agent.

Pour la séparation modèle/fournisseur/runtime plus large, commencez par
[Runtimes d'agent](/fr/concepts/agent-runtimes). La version courte est :
`openai/gpt-5.5` est la référence du modèle, `codex` est le runtime, et Telegram,
Discord, Slack ou un autre canal reste la surface de communication.

## Exigences

- OpenClaw avec le plugin intégré `codex` disponible.
- Si votre configuration utilise `plugins.allow`, incluez `codex`.
- Codex app-server `0.125.0` ou plus récent. Le plugin intégré gère un binaire
  compatible de l'app-server Codex par défaut, les commandes locales `codex` sur `PATH` n'affectent donc pas
  le démarrage normal du harnais.
- Authentification Codex disponible via `openclaw models auth login --provider openai-codex`,
  un compte app-server dans le domicile Codex de l'agent, ou un profil d'authentification
  explicite par clé API Codex.

Pour la priorité d'authentification, l'isolement de l'environnement, les commandes personnalisées de l'application serveur, la découverte de modèles et tous les champs de configuration, consultez la [référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Démarrage rapide

La plupart des utilisateurs qui souhaitent Codex dans OpenClaw préfèrent cette méthode : se connecter avec un abonnement ChatGPT/Codex, activer le plugin inclus `codex`, et utiliser une référence de modèle canonique `openai/gpt-*`.

Connectez-vous avec Codex OAuth :

```bash
openclaw models auth login --provider openai-codex
```

Activez le plugin inclus `codex` et sélectionnez un modèle d'agent OpenAI :

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

Redémarrez la passerelle après avoir modifié la configuration du plugin. Si une discussion existante possède déjà une session, utilisez `/new` ou `/reset` avant de tester les modifications d'exécution afin que le prochain tour résolve le harnais à partir de la configuration actuelle.

## Configuration

La configuration du démarrage rapide est la configuration minimale viable du harnais Codex. Définissez les options du harnais Codex dans la configuration OpenClaw, et utilisez le CLI uniquement pour l'authentification Codex :

| Besoin                                                   | Définir                                                                            | Où                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Activer le harnais                                       | `plugins.entries.codex.enabled: true`                                              | Configuration OpenClaw                    |
| Conserver une installation de plugin sur liste autorisée | Inclure `codex` dans `plugins.allow`                                               | Configuration OpenClaw                    |
| Acheminer les tours d'agent OpenAI via Codex             | `agents.defaults.model` ou `agents.list[].model` en tant que `openai/gpt-*`        | Configuration de l'agent OpenClaw         |
| Se connecter avec Codex OAuth                            | `openclaw models auth login --provider openai-codex`                               | Profil d'authentification CLI             |
| Échec fermé lorsque Codex est indisponible               | Fournisseur ou modèle `agentRuntime.id: "codex"`                                   | Configuration modèle/fournisseur OpenClaw |
| Utiliser le trafic direct de l'OpenAI API                | Fournisseur ou modèle `agentRuntime.id: "pi"` avec authentification OpenAI normale | Configuration modèle/fournisseur OpenClaw |
| Ajuster le comportement de l'application serveur         | `plugins.entries.codex.config.appServer.*`                                         | Configuration du plugin Codex             |
| Activer les applications de plug-in Codex natives        | `plugins.entries.codex.config.codexPlugins.*`                                      | Configuration du plug-in Codex            |
| Activer l'ordinateur Codex (Computer Use)                | `plugins.entries.codex.config.computerUse.*`                                       | Configuration du plug-in Codex            |

Utilisez des références de modèle `openai/gpt-*` pour les tours d'agent OpenAI pris en charge par Codex.
`openai-codex` est uniquement le nom du fournisseur de profil d'authentification pour les profils Codex OAuth et
Codex clé-API. N'écrivez pas de nouvelles références de modèle `openai-codex/gpt-*`.

Le reste de cette page couvre les variantes courantes entre lesquelles les utilisateurs doivent choisir :
la forme du déploiement, le routage en échec fermé, la stratégie d'approbation du gardien, les plug-ins Codex
natifs, et l'ordinateur (Computer Use). Pour les listes complètes d'options, les valeurs par défaut, les énumérations, la découverte,
l'isolement de l'environnement, les délais d'attente et les champs de transport de l'application serveur, voir
[Référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Vérifier le runtime Codex

Utilisez `/status` dans le chat où vous vous attendez à Codex. Un tour d'agent OpenAI
pris en charge par Codex affiche :

```text
Runtime: OpenAI Codex
```

Ensuite, vérifiez l'état de l'application serveur Codex :

```text
/codex status
/codex models
```

`/codex status` signale la connectivité de l'application serveur, le compte, les limites de taux, les serveurs
MCP et les compétences. `/codex models` répertorie le catalogue en direct de l'application serveur Codex pour
le harnais et le compte. Si `/status` est surprenant, voir
[Dépannage](#troubleshooting).

## Routage et sélection de modèle

Gardez les références de fournisseur et la stratégie d'exécution séparées :

- Utilisez `openai/gpt-*` pour les tours d'agent OpenAI via Codex.
- N'utilisez pas `openai-codex/gpt-*` dans la configuration. Exécutez `openclaw doctor --fix` pour
  réparer les références héritées et les épingles de route de session obsolètes.
- `agentRuntime.id: "codex"` est facultatif pour le mode automatique OpenAI normal, mais utile
  lorsqu'un déploiement doit échouer en mode fermé si Codex n'est pas disponible.
- `agentRuntime.id: "pi"` active un fournisseur ou un modèle dans le comportement PI direct lorsque
  cela est intentionnel.
- `/codex ...` contrôle les conversations de l'application serveur Codex natives à partir du chat.
- ACP/acpx est un chemin de harnais externe distinct. Utilisez-le uniquement lorsque l'utilisateur demande
  ACP/acpx ou un adaptateur de harnais externe.

Routage des commandes courantes :

| Intention de l'utilisateur                | Utiliser                                    |
| ----------------------------------------- | ------------------------------------------- |
| Joindre le chat actuel                    | `/codex bind [--cwd <path>]`                |
| Reprendre un fil Codex existant           | `/codex resume <thread-id>`                 |
| Lister ou filtrer les fils Codex          | `/codex threads [filter]`                   |
| Envoyer uniquement des commentaires Codex | `/codex diagnostics [note]`                 |
| Démarrer une tâche ACP/acpx               | Commandes de session ACP/acpx, pas `/codex` |

| Cas d'usage                                       | Configurer                                                                   | Vérifier                                 | Notes                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Abonnement ChatGPT/Codex avec runtime Codex natif | `openai/gpt-*` plus le plugin `codex` activé                                 | `/status` montre `Runtime: OpenAI Codex` | Chemin recommandé                                        |
| Échec fermé si Codex n'est pas disponible         | Provider ou model `agentRuntime.id: "codex"`                                 | Le tour échoue au lieu du repli PI       | Utiliser pour les déploiements Codex uniquement          |
| Trafic de clé OpenAI API direct via PI            | Provider ou model `agentRuntime.id: "pi"` et authentification OpenAI normale | `/status` montre le runtime PI           | À utiliser uniquement lorsque PI est intentionnel        |
| Configuration héritée                             | `openai-codex/gpt-*`                                                         | `openclaw doctor --fix` le réécrit       | N'écrivez pas de nouvelle configuration de cette manière |
| Adaptateur Codex ACP/acpx                         | ACP `sessions_spawn({ runtime: "acp" })`                                     | État de tâche/session ACP                | Séparé du harnais Codex natif                            |

`agents.defaults.imageModel` suit le même partage de préfixe. Utilisez `openai/gpt-*`
pour la route OpenAI normale et `codex/gpt-*` uniquement lorsque la compréhension d'images
doit passer par un tour d'application serveur Codex délimité. N'utilisez pas
`openai-codex/gpt-*` ; doctor réécrit ce préfixe hérité en `openai/gpt-*`.

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

Cette forme conserve Claude comme agent par défaut et ajoute un agent Codex nommé :

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

Avec cette configuration, l'agent `main` utilise son chemin de provider normal et l'agent
`codex` utilise l'application serveur Codex.

### Déploiement Codex à échec fermé

Pour les tours d'agent OpenAI, OpenAI`openai/gpt-*` résout déjà vers Codex lorsque le plugin inclus est disponible. Ajoutez une stratégie d'exécution explicite lorsque vous souhaitez une règle de fermeture en cas d'échec écrite :

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

## Stratégie du serveur d'application

Par défaut, le plugin démarre le binaire Codex géré par OpenClaw localement avec un transport stdio. Définissez OpenClaw`appServer.command` uniquement lorsque vous souhaitez intentionnellement exécuter un exécutable différent. Utilisez le transport WebSocket uniquement lorsqu'un serveur d'application est déjà en cours d'exécution ailleurs :

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

Les sessions de serveur d'application stdio locales sont par défaut en posture d'opérateur local de confiance : `approvalPolicy: "never"`, `approvalsReviewer: "user"` et `sandbox: "danger-full-access"`OpenClaw. Si les exigences Codex locales interdisent cette posture YOLO implicite, OpenClaw sélectionne les autorisations de garde autorisées à la place.

Utilisez le mode garde lorsque vous souhaitez une auto-révision native Codex avant les échappements de bac à sable ou les autorisations supplémentaires :

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

Le mode garde s'étend aux approbations du serveur d'application Codex, généralement `approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et `sandbox: "workspace-write"` lorsque les exigences locales autorisent ces valeurs.

Pour chaque champ de serveur d'application, l'ordre d'authentification, l'isolement de l'environnement, la découverte et le comportement de délai d'attente, consultez la [référence du harnais Codex](/fr/plugins/codex-harness-reference).

## Commandes et diagnostics

Le plugin inclus enregistre `/codex`OpenClaw en tant que commande slash sur n'importe quel canal qui prend en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` vérifie la connectivité du serveur d'application, les modèles, le compte, les limites de débit, les serveurs MCP et les compétences.
- `/codex models` liste les modèles en direct du serveur d'application Codex.
- `/codex threads [filter]` liste les fils récents du serveur d'application Codex.
- `/codex resume <thread-id>`OpenClaw attache la session OpenClaw actuelle à un fil Codex existant.
- `/codex compact` demande au serveur d'application Codex de compacter le fil attaché.
- `/codex review` lance la révision native Codex pour le fil attaché.
- `/codex diagnostics [note]` demande avant d'envoyer des commentaires Codex pour le
  fil de discussion attaché.
- `/codex account` affiche le statut du compte et de la limite de taux.
- `/codex mcp` répertorie le statut du serveur MCP de l'application serveur Codex.
- `/codex skills` répertorie les compétences de l'application serveur Codex.

Pour la plupart des rapports de support, commencez par `/diagnostics [note]` dans la conversation
où le bug s'est produit. Il crée un rapport de diagnostics Gateway et, pour les sessions
du harnais Codex, demande une approbation pour envoyer le bundle de commentaires Codex pertinent.
Voir [Exportation des diagnostics](/fr/gateway/diagnostics) pour le modèle de confidentialité et le comportement
des discussions de groupe.

Utilisez `/codex diagnostics [note]` uniquement lorsque vous voulez spécifiquement le téléversement de
commentaires Codex pour le fil de discussion actuellement attaché sans le bundle de diagnostics
complet du Gateway.

### Inspecter les fils Codex localement

Le moyen le plus rapide d'inspecter une mauvaise exécution Codex est souvent d'ouvrir le fil
natif Codex directement :

```bash
codex resume <thread-id>
```

Obtenez l'identifiant du fil à partir de la réponse `/diagnostics` terminée, `/codex binding`, ou
`/codex threads [filter]`.

Pour les mécanismes de téléversement et les limites de diagnostics au niveau de l'exécution, voir
[Harnais d'exécution Codex](/fr/plugins/codex-harness-runtime#codex-feedback-upload).

L'authentification est sélectionnée dans cet ordre :

1. Un profil d'authentification Codex explicite OpenClaw pour l'agent.
2. Le compte existant de l'application serveur dans la maison Codex de cet agent.
3. Pour les lancements locaux d'application serveur stdio uniquement, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte d'application serveur n'est présent et que l'authentification OpenAI est
   toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus fils Codex généré. Cela
permet de garder les clés API de niveau GatewayAPI disponibles pour les embeddings ou les modèles OpenAI directs
sans faire facturer accidentellement les tours natifs du serveur d'application Codex via l'APIAPI.
Les profils explicites de clé API Codex et le repli de clé d'environnement stdio local utilisent la connexion
au serveur d'application au lieu de l'environnement hérité du processus fils. Les connexions WebSocket au serveur d'application
ne reçoivent pas le repli de clé API d'environnement GatewayAPI ; utilisez un profil d'authentification explicite ou le
compte propre du serveur d'application distant.

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

`appServer.clearEnv` affecte uniquement le processus fils du serveur d'application Codex généré.

Les outils dynamiques Codex sont chargés par défaut via `searchable`. OpenClaw n'expose pas
les outils dynamiques qui dupliquent les opérations de l'espace de travail natives de Codex : `read`, `write`,
`edit`, `apply_patch`, `exec`, `process` et `update_plan`. Les outils d'intégration OpenClaw restants
tels que la messagerie, les sessions, les médias, cron, le navigateur, les nœuds,
la passerelle, `heartbeat_respond` et `web_search` sont disponibles via la recherche d'outils Codex sous l'espace de noms
`openclaw`, ce qui permet de garder le contexte initial du modèle plus petit.
`sessions_yield` et les réponses source avec outil de message uniquement restent directes car celles-ci
sont des contrats de contrôle de tour. Les instructions de collaboration Heartbeat disent à Codex de
rechercher `heartbeat_respond` avant de terminer un tour Heartbeat lorsque l'outil n'est
pas encore chargé.

Définissez `codexDynamicToolsLoading: "direct"` uniquement lors de la connexion à un serveur d'application Codex personnalisé
qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète
de l'outil.

Champs de plugin Codex de premier niveau pris en charge :

| Champ                      | Par défaut     | Signification                                                                                                      |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `codexDynamicToolsLoading` | `"searchable"` | Utilisez `"direct"` pour placer les outils dynamiques OpenClaw directement dans le contexte d'outil Codex initial. |
| `codexDynamicToolsExclude` | `[]`           | Noms d'outils dynamiques supplémentaires OpenClaw à omettre des tours du serveur d'application Codex.              |
| `codexPlugins`             | disabled       | Prise en charge native des plugins/apps Codex pour les plugins gérés installés à partir de la source et migrés.    |

Champs `appServer` pris en charge :

| Champ                         | Par défaut                                                    | Signification                                                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                     | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                            |
| `command`                     | binaire Codex géré                                            | Exécutable pour le transport stdio. Laissez non défini pour utiliser le binaire géré ; définissez-le uniquement pour une substitution explicite.                                                                                                                                      |
| `args`                        | `["app-server", "--listen", "stdio://"]`                      | Arguments pour le transport stdio.                                                                                                                                                                                                                                                    |
| `url`                         | unset                                                         | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                               |
| `authToken`                   | unset                                                         | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                             |
| `headers`                     | `{}`                                                          | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                   |
| `clearEnv`                    | `[]`                                                          | Noms de variables d'environnement supplémentaires supprimés du processus de serveur d'application stdio généré après que OpenClaw a construit son environnement hérité. `CODEX_HOME` et `HOME` sont réservés pour l'isolement Codex par agent de OpenClaw lors des lancements locaux. |
| `requestTimeoutMs`            | `60000`                                                       | Délai d'attente pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                         |
| `turnCompletionIdleTimeoutMs` | `60000`                                                       | Fenêtre de silence après une requête de serveur d'application Codex limitée à un tour, pendant que OpenClaw attend `turn/completed`. Augmentez cette valeur pour les phases de synthèse lentes après outil ou statut uniquement.                                                      |
| `mode`                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO | Préréglage pour l'exécution YOLO ou examinée par un tuteur. Les exigences stdio locales qui omettent l'approbation `danger-full-access`, `never` ou le réviseur `user` rendent le tuteur par défaut implicite.                                                                        |
| `approvalPolicy`              | `"never"` ou une stratégie d'approbation de tuteur autorisée  | Stratégie d'approbation Codex native envoyée au démarrage/à la reprise/au tour de fil. Les valeurs par défaut du tuteur privilégient `"on-request"` si autorisé.                                                                                                                      |
| `sandbox`                     | `"danger-full-access"` ou un bac à sable de tuteur autorisé   | Mode de bac à sable Codex natif envoyé au démarrage/à la reprise du fil. Les valeurs par défaut du tuteur privilégient `"workspace-write"` si autorisé, sinon `"read-only"`.                                                                                                          |
| `approvalsReviewer`           | `"user"` ou un réviseur de tuteur autorisé                    | Utilisez `"auto_review"` pour permettre à Codex de réviser les invites d'approbation natives si autorisé, sinon `guardian_subagent` ou `user`. `guardian_subagent` reste un alias hérité.                                                                                             |
| `serviceTier`                 | non défini                                                    | Niveau de service de l'application serveur Codex facultatif. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, `null` efface le remplacement, et l'ancien `"fast"` est accepté comme `"priority"`.                                              |

Les appels d'outil dynamiques détenus par OpenClaw sont bornés indépendamment de
OpenClaw`appServer.requestTimeoutMs` : les requêtes Codex `item/tool/call`OpenClaw utilisent par défaut
un chien de garde OpenClaw de 30 secondes. Un argument `timeoutMs` positif
par appel étend ou raccourcit ce budget d'outil spécifique. L'outil `image_generate`
utilise également `agents.defaults.imageGenerationModel.timeoutMs` lorsque l'appel d'outil ne fournit
pas son propre délai d'expiration, et l'outil de compréhension des médias `image`
utilise `tools.media.image.timeoutSeconds`OpenClaw ou son défaut média de 60 secondes. Les budgets
d'outils dynamiques sont plafonnés à 600000 ms. En cas de dépassement de délai,
OpenClaw abandonne le signal de l'outil lorsque cela est pris en charge et
renvoie une réponse d'outil dynamique échouée à Codex afin que le tour puisse
continuer au lieu de laisser la session dans `processing`.

Après qu'OpenClaw a répondu à une requête app-server ciblée sur un tour Codex,
le harnais s'attend également à ce que Codex termine le tour natif avec
OpenClaw`turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClaw
après cette réponse, OpenClaw interrompt au mieux le tour Codex, enregistre
un diagnostic de dépassement de délai et libère la voie de session OpenClaw
afin que les messages de chat de suivi ne soient pas mis en file derrière un
tour natif obsolète. Toute notification non terminale pour le même tour,
y compris `rawResponseItem/completed`, désarme ce chien de garde court car Codex
a prouvé que le tour est toujours actif ; le chien de garde terminal plus long
continue à protéger les tours réellement bloqués. Les diagnostics de dépassement
de délai incluent la dernière méthode de notification app-server et, pour les
éléments de réponse d'assistant bruts, le type d'élément, le rôle, l'id et un
aperçu de texte d'assistant borné.

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
même fichier examiné que le reste de la configuration du Codex harness.

## Plugins natifs Codex

La prise en charge des plugins natifs Codex utilise les propres capacités d'application et de plugin
du serveur d'application Codex dans le même thread Codex que le tour du harnais OpenClawOpenClaw. OpenClaw
ne traduit pas les plugins Codex en OpenClaw dynamiques synthétiques `codex_plugin_*`.

`codexPlugins` affecte uniquement les sessions qui sélectionnent le harnais Codex natif. Il
n'a aucun effet sur les exécutions PI, les exécutions normales du provider OpenAI, les liaisons de
conversation ACP ou d'autres harnais.

Config migrée minimale :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
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

La configuration de l'application de thread est calculée lorsque OpenClaw établit une session de harnais Codex
ou remplace une liaison de thread Codex obsolète. Elle n'est pas recalculée à chaque tour.
Après avoir modifié `codexPlugins`, utilisez `/new`, `/reset`, ou redémarrez la passerelle pour
que les futures sessions de harnais Codex commencent avec l'ensemble d'applications mis à jour.

Pour l'éligibilité à la migration, l'inventaire des applications, la politique d'action destructrice,
les sollicitations et les diagnostics de plugins natifs, voir
[Plugins natifs Codex](/fr/plugins/codex-native-plugins).

## Computer Use

Computer Use est traité dans son propre guide de configuration :
[Codex Computer Use](/fr/plugins/codex-computer-use).

La version courte : OpenClaw ne fournit pas l'application de contrôle du bureau ni n'exécute
les actions du bureau lui-même. Il prépare le serveur d'application Codex, vérifie que le
serveur MCP `computer-use` est disponible, puis laisse Codex gérer les appels d'outil MCP
natifs pendant les tours en mode Codex.

## Limites d'exécution

Le harnais Codex ne modifie que l'exécuteur d'agent embarqué de bas niveau.

- Les outils dynamiques OpenClaw sont pris en charge. Codex demande à OpenClaw d'exécuter ces
  outils, donc OpenClaw reste dans le chemin d'exécution.
- Les outils natifs Codex shell, patch, MCP et native app sont détenus par Codex.
  OpenClaw peut observer ou bloquer des événements natifs sélectionnés via le relais
  pris en charge, mais il ne réécrit pas les arguments des outils natifs.
- Codex détient la compactage natif. OpenClaw conserve une miroir de transcription pour l'historique du
  canal, la recherche, `/new`, `/reset`, et les futurs changements de modèle ou de harnais.
- La génération de médias, la compréhension des médias, le TTS, les approbations et la sortie de l'outil de messagerie
  continuent via les paramètres de fournisseur/modèle OpenClaw correspondants.
- `tool_result_persist` s'applique aux résultats des outils de transcription détenus par OpenClaw, et non
  aux enregistrements de résultats des outils natifs Codex.

Pour les couches de hook, les surfaces V1 prises en charge, la gestion des permissions natives, le directionnement de la file d'attente,
les mécanismes de téléchargement des commentaires Codex et les détails de compactage, voir
[Codex harness runtime](/fr/plugins/codex-harness-runtime).

## Dépannage

**Codex n'apparaît pas comme un fournisseur `/model` normal :** c'est attendu pour
les nouvelles configurations. Sélectionnez un modèle `openai/gpt-*`, activez
`plugins.entries.codex.enabled`, et vérifiez si `plugins.allow` exclut
`codex`.

**OpenClaw utilise PI au lieu de Codex :** assurez-vous que la référence du modèle est
`openai/gpt-*` sur le fournisseur officiel OpenAI et que le plugin Codex est
installé et activé. Si vous avez besoin d'une preuve stricte lors des tests, définissez `agentRuntime.id: "codex"` du fournisseur ou
du modèle. Un runtime Codex forcé échoue au lieu de
revenir à PI.

**La configuration héritée `openai-codex/*` persiste :** exécutez `openclaw doctor --fix`.
Doctor réécrit les références de modèle héritées en `openai/*`, supprime les sessions obsolètes et
les épinglages de runtime d'agent complet, et conserve les remplacements de profils d'authentification existants.

**L'application serveur est rejetée :** utilisez l'application serveur Codex `0.125.0` ou une version plus récente.
Les versions préliminaires de même version ou les versions avec un suffixe de build telles que
`0.125.0-alpha.2` ou `0.125.0+custom` sont rejetées car OpenClaw teste le
plancher stable du protocole `0.125.0`.

**`/codex status` ne peut pas se connecter :** vérifiez que le plugin inclus `codex` est
activé, que `plugins.allow` l'inclut lorsqu'une liste d'autorisation est configurée, et
que tous les `appServer.command`, `url`, `authToken` ou en-têtes personnalisés sont valides.

**La découverte de modèle est lente :** dimuez
`plugins.entries.codex.config.discovery.timeoutMs` ou désactivez la découverte. Voir
[Codex harness reference](/fr/plugins/codex-harness-reference#model-discovery).

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
les en-têtes, et que l'application serveur distante parle la même version de protocole d'application serveur Codex.

**Un modèle non-Codex utilise PI :** c'est attendu à moins que la stratégie d'exécution du fournisseur ou du modèle ne l'achemine vers un autre harnais. Les références de fournisseur non-OpenAI brutes restent sur
leur chemin de fournisseur normal en mode `auto`.

**Computer Use est installé mais les outils ne s'exécutent pas :** vérifiez
`/codex computer-use status` depuis une nouvelle session. Si un outil signale
`Native hook relay unavailable`, utilisez `/new` ou `/reset` ; si cela persiste, redémarrez
la passerelle pour effacer les enregistrements de hooks natifs périmés. Voir
[Codex Computer Use](/fr/plugins/codex-computer-use#troubleshooting).

## Connexes

- [Codex harness reference](/fr/plugins/codex-harness-reference)
- [Codex harness runtime](/fr/plugins/codex-harness-runtime)
- [Native Codex plugins](/fr/plugins/codex-native-plugins)
- [Codex Computer Use](/fr/plugins/codex-computer-use)
- [Agent runtimes](/fr/concepts/agent-runtimes)
- [Model providers](/fr/concepts/model-providers)
- [OpenAI provider](/fr/providers/openai)
- [Agent harness plugins](/fr/plugins/sdk-agent-harness)
- [Crochets de plugin](/fr/plugins/hooks)
- [Export de diagnostics](/fr/gateway/diagnostics)
- [Statut](/fr/cli/status)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
