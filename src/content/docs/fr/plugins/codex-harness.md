---
summary: "Exécuter les tours d'agent embarqué OpenClaw via le harnais Codex app-server inclus"
title: "Harnais Codex"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

Le plugin `codex` inclus permet à OpenClaw d'exécuter des tours d'agent embarqués via le
Codex app-server au lieu du harnais PI intégré.

Utilisez ceci lorsque vous voulez que Codex possède la session agent de bas niveau : découverte de modèle,
reprise de thread natif, compactage natif et exécution app-server.
OpenClaw possède toujours les canaux de chat, les fichiers de session, la sélection de modèle, les outils,
les approbations, la livraison des médias et le miroir de transcription visible.

Si vous essayez de vous orienter, commencez par
[Runtimes d'agent](/fr/concepts/agent-runtimes). La version courte est :
`openai/gpt-5.5` est la référence du modèle, `codex` est le runtime, et Telegram,
Discord, Slack ou un autre channel reste la surface de communication.

## Ce que ce plugin modifie

Le plugin `codex` inclus apporte plusieurs capacités distinctes :

| Capacité                               | Comment l'utiliser                                  | Ce qu'il fait                                                                                         |
| -------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Runtime natif embarqué                 | `agentRuntime.id: "codex"`                          | Exécute les tours d'agent embarqué OpenClaw via Codex app-server.                                     |
| Commandes natives de contrôle de chat  | `/codex bind`, `/codex resume`, `/codex steer`, ... | Lie et contrôle les threads Codex app-server depuis une conversation de messagerie.                   |
| Fournisseur/Catalogue Codex app-server | Internes `codex`, exposés via le harnais            | Permet au runtime de découvrir et valider les modèles app-server.                                     |
| Chemin de compréhension média Codex    | Chemins de compatibilité image-modèle `codex/*`     | Exécute des tours Codex app-server bornés pour les modèles de compréhension d'image pris en charge.   |
| Relais de hook natif                   | Hooks de plugin autour des événements natifs Codex  | Permet à OpenClaw d'observer/bloquer les événements natifs Codex pris en charge (outil/finalisation). |

L'activation du plugin rend ces capacités disponibles. Cela ne fait **pas** :

- commencer à utiliser Codex pour chaque modèle OpenAI
- convertir les références de modèle `openai-codex/*` en runtime natif
- rendre ACP/acpx le chemin Codex par défaut
- changer à chaud les sessions existantes qui ont déjà enregistré un runtime PI
- remplacer la diffusion par le canal OpenClaw, les fichiers de session, le stockage du profil d'authentification ou
  le routage des messages

Le même plugin possède également la surface de commande native `/codex` chat-control. Si
le plugin est activé et que l'utilisateur demande de lier, reprendre, diriger, arrêter ou inspecter
les fils Codex à partir du chat, les agents devraient préférer `/codex ...` à ACP. ACP reste
le repli explicite lorsque l'utilisateur demande ACP/acpx ou teste l'adaptateur
Codex ACP.

Les tours Codex natifs conservent les crochets (hooks) de plugin OpenClaw comme couche de compatibilité publique.
Ce sont des crochets OpenClaw en processus, pas des crochets de commande Codex `hooks.json` :

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `before_tool_call`, `after_tool_call`
- `before_message_write` pour les enregistrements de transcript miroirs
- `before_agent_finalize` via le relais `Stop` Codex
- `agent_end`

Les plugins peuvent également enregistrer un middleware de résultats d'outils neutre par rapport à l'exécution pour réécrire
les résultats d'outils dynamiques OpenClaw après l'exécution de l'outil par OpenClaw et avant que
le résultat ne soit renvoyé à Codex. Ceci est distinct du crochet de plugin public
`tool_result_persist`, qui transforme les écritures de résultats d'outils dans le transcript
appartenant à OpenClaw.

Pour la sémantique des crochets de plugin eux-mêmes, consultez [Plugin hooks](/fr/plugins/hooks)
et [Plugin guard behavior](/fr/tools/plugin).

Le harnais est désactivé par défaut. Les nouvelles configurations doivent garder les références de modèle OpenAI
canoniques en tant que `openai/gpt-*` et forcer explicitement
`agentRuntime.id: "codex"` ou `OPENCLAW_AGENT_RUNTIME=codex` lorsqu'elles
souhaitent une exécution native sur le serveur d'application. Les références de modèle héritées `codex/*` sélectionnent toujours
automatiquement le harnais pour la compatibilité, mais les préfixes de fournisseur hérités basés sur l'exécution
ne sont pas affichés comme des choix normaux de modèle/fournisseur.

Si le plugin `codex` est activé mais que le modèle principal est toujours
`openai-codex/*`, `openclaw doctor` avertit au lieu de modifier la route. C'est
intentionnel : `openai-codex/*` reste le chemin OAuth/abonnement PI Codex, et
l'exécution native de l'application serveur reste un choix explicite d'exécution.

## Tableau de routage

Utilisez ce tableau avant de modifier la configuration :

| Comportement souhaité                                | Réf modèle                            | Configuration d'exécution              | Prérequis du plugin            | Label d'état attendu           |
| ---------------------------------------------------- | ------------------------------------- | -------------------------------------- | ------------------------------ | ------------------------------ |
| OpenAI OpenAI via le lanceur normal OpenClaw         | `openai/gpt-*`                        | omis ou `runtime: "pi"`                | Fournisseur OpenAI             | `Runtime: OpenClaw Pi Default` |
| Codex OAuth/abonnement via PI                        | `openai-codex/gpt-*`                  | omis ou `runtime: "pi"`                | Fournisseur OAuth Codex OpenAI | `Runtime: OpenClaw Pi Default` |
| Tours intégrés natifs de l'application serveur Codex | `openai/gpt-*`                        | `agentRuntime.id: "codex"`             | plugin `codex`                 | `Runtime: OpenAI Codex`        |
| Fournisseurs mixtes en mode automatique conservateur | références spécifiques au fournisseur | `agentRuntime.id: "auto"`              | Runtimes de plugin optionnels  | Dépend du runtime sélectionné  |
| Session d'adaptateur ACP Codex explicite             | Dépendant du prompt/modèle ACP        | `sessions_spawn` avec `runtime: "acp"` | backend `acpx` sain            | Statut de tâche/session ACP    |

La distinction importante concerne le fournisseur par rapport au runtime :

- `openai-codex/*` répond « quelle route fournisseur/auth PI doit-il utiliser ? »
- `agentRuntime.id: "codex"` répond « quelle boucle doit exécuter ce
  tour intégré ? »
- `/codex ...` répond « à quelle conversation Codex native ce chat doit-il se lier
  ou contrôler ? »
- ACP répond « quel processus de harnais externe acpx doit-il lancer ? »

## Choisir le bon préfixe de modèle

Les routes de la famille OpenAI sont spécifiques au préfixe. Utilisez `openai-codex/*` lorsque vous souhaitez
OAuth Codex via PI ; utilisez `openai/*` lorsque vous souhaitez un accès direct à l'OpenAI OpenAI ou
lorsque vous forcez le harnais natif de l'application serveur Codex :

| Réf modèle                                    | Chemin d'exécution                              | Utiliser quand                                                                                 |
| --------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `openai/gpt-5.4`                              | Fournisseur OpenAI via la plomberie OpenClaw/PI | Vous souhaitez un accès direct actuel à l'API de la plateforme OpenAI avec `OPENAI_API_KEY`.   |
| `openai-codex/gpt-5.5`                        | OAuth Codex OpenAI via OAuth/PI                 | Vous souhaitez une authentification par abonnement ChatGPT/Codex avec le runner PI par défaut. |
| `openai/gpt-5.5` + `agentRuntime.id: "codex"` | Harnais de Codex app-server                     | Vous souhaitez une exécution native du Codex app-server pour le tour de l'agent intégré.       |

GPT-5.5 est actuellement uniquement disponible par abonnement/OAuth sur OpenClaw. Utilisez
`openai-codex/gpt-5.5` pour l'OAuth PI, ou `openai/gpt-5.5` avec le harnais
Codex app-server. L'accès direct par clé OAuth pour `openai/gpt-5.5` est pris en charge
une fois que API aura activé GPT-5.5 sur l'API publique OpenAI.

Les références obsolètes `codex/gpt-*` restent acceptées en tant qu'alias de compatibilité. La migration de compatibilité du Doctor réécrit les références de runtime principal obsolètes en références de modèle canoniques et enregistre la stratégie de runtime séparément, tandis que les références obsolètes de secours uniquement sont laissées inchangées car le runtime est configuré pour l'ensemble du conteneur de l'agent.
Les nouvelles configurations OAuth Codex PI doivent utiliser `openai-codex/gpt-*` ; les nouvelles configurations
de harnais d'app-server natif doivent utiliser `openai/gpt-*` plus
`agentRuntime.id: "codex"`.

`agents.defaults.imageModel` suit la même répartition de préfixes. Utilisez
`openai-codex/gpt-*` lorsque la compréhension d'image doit s'exécuter via le chemin du fournisseur
OAuth Codex OpenAI. Utilisez `codex/gpt-*` lorsque la compréhension d'image doit s'exécuter
via un tour d'app-server Codex délimité. Le modèle de l'app-server Codex doit
annoncer la prise en charge des entrées d'image ; les modèles Codex texte uniquement échouent avant le début du tour média.

Utilisez `/status` pour confirmer le harnais effectif pour la session actuelle. Si la
sélection est surprenante, activez le journal de débogage pour le sous-système `agents/harness`
et inspectez l'enregistrement structuré `agent harness selected` de la passerelle. Il
inclut l'identifiant du harnais sélectionné, la raison de la sélection, la stratégie de runtime/secours, et,
en mode `auto`, le résultat de prise en charge de chaque candidat plugin.

### Signification des avertissements du doctor

`openclaw doctor` avertit lorsque toutes ces conditions sont vraies :

- le plugin `codex` inclus est activé ou autorisé
- le modèle principal d'un agent est `openai-codex/*`
- le runtime effectif de cet agent n'est pas `codex`

Cet avertissement existe car les utilisateurs s'attendent souvent à ce que « plugin Codex activé » implique
« runtime natif de l'application serveur Codex ». OpenClaw ne fait pas ce saut. L'avertissement
signifie :

- **Aucune modification n'est requise** si vous aviez prévu l'OAuth ChatGPT/Codex via PI.
- Changez le modèle pour `openai/<model>` et définissez
  `agentRuntime.id: "codex"` si vous aviez prévu l'exécution
  native de l'application serveur.
- Les sessions existantes nécessitent toujours `/new` ou `/reset` après un changement de runtime,
  car les épingles de runtime de session sont persistantes.

La sélection du harnais n'est pas un contrôle de session en direct. Lorsqu'un tour intégré s'exécute,
OpenClaw enregistre l'ID du harnais sélectionné sur cette session et continue de l'utiliser pour
les tours ultérieurs dans le même ID de session. Modifiez la configuration `agentRuntime` ou
`OPENCLAW_AGENT_RUNTIME` lorsque vous souhaitez que les futures sessions utilisent un autre harnais ;
utilisez `/new` ou `/reset` pour démarrer une nouvelle session avant de basculer une conversation
existante entre PI et Codex. Cela évite de rejouer une transcription via
deux systèmes de session natifs incompatibles.

Les sessions héritées créées avant les épingles de harnais sont traitées comme épinglées à PI dès qu'elles
ont un historique de transcription. Utilisez `/new` ou `/reset` pour activer cette conversation
pour Codex après avoir modifié la configuration.

`/status` affiche le runtime effectif du modèle. Le harnais PI par défaut apparaît comme
`Runtime: OpenClaw Pi Default`, et le harnais de l'application serveur Codex apparaît comme
`Runtime: OpenAI Codex`.

## Conditions requises

- OpenClaw avec le plugin `codex` inclus disponible.
- Application serveur Codex `0.125.0` ou plus récente. Le plugin inclus gère un binaire
  compatible de l'application serveur Codex par défaut, donc les commandes locales `codex` sur `PATH` n'affectent
  pas le démarrage normal du harnais.
- Authentification Codex disponible pour le processus de l'application serveur.

Le plugin bloque les négociations (handshakes) plus anciennes ou sans version de l'application serveur. Cela permet de maintenir
OpenClaw sur la surface de protocole contre laquelle il a été testé.

Pour les tests de fumée en direct et Docker, l'authentification provient généralement de `OPENAI_API_KEY`, ainsi que
fichiers optionnels de la CLI Codex tels que `~/.codex/auth.json` et
`~/.codex/config.toml`. Utilisez le même matériel d'authentification que votre serveur d'application Codex local
utilise.

## Configuration minimale

Utilisez `openai/gpt-5.5`, activez le plugin fourni, et forcez le harnais `codex` :

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
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

Si votre configuration utilise `plugins.allow`, incluez `codex` également :

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

Les configurations héritées qui définissent `agents.defaults.model` ou un modèle d'agent sur
`codex/<model>` activent toujours automatiquement le plugin fourni `codex`. Les nouvelles configurations doivent
préférer `openai/<model>` plus l'entrée explicite `agentRuntime` ci-dessus.

## Ajouter Codex aux côtés d'autres modèles

Ne définissez pas `agentRuntime.id: "codex"` globalement si le même agent doit passer librement
entre les modèles de fournisseur Codex et non-Codex. Un runtime forcé s'applique à chaque
tour intégré pour cet agent ou session. Si vous sélectionnez un modèle Anthropic alors
que ce runtime est forcé, OpenClaw essaie toujours le harnais Codex et échoue fermement
au lieu de router silencieusement ce tour via PI.

Utilisez plutôt l'une de ces formes :

- Placez Codex sur un agent dédié avec `agentRuntime.id: "codex"`.
- Gardez l'agent par défaut sur `agentRuntime.id: "auto"` et le repli PI pour une utilisation mixte
  normale de fournisseurs.
- Utilisez les refs `codex/*` héritées uniquement pour compatibilité. Les nouvelles configurations devraient préférer
  `openai/*` plus une stratégie de runtime Codex explicite.

Par exemple, cela garde l'agent par défaut sur la sélection automatique normale et
ajoute un agent Codex séparé :

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
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
        },
      },
    ],
  },
}
```

Avec cette forme :

- L'agent `main` par défaut utilise le chemin de fournisseur normal et le repli de compatibilité PI.
- L'agent `codex` utilise le harnais d'application Codex.
- Si Codex est manquant ou non pris en charge pour l'agent `codex`, le tour échoue
  au lieu d'utiliser silencieusement PI.

## Routage des commandes d'agent

Les agents doivent acheminer les demandes des utilisateurs par intention, et non par le seul mot « Codex » :

| L'utilisateur demande...                                       | L'agent doit utiliser...                                |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| « Lier cette discussion à Codex »                              | `/codex bind`                                           |
| « Reprendre le fil Codex `<id>` ici »                          | `/codex resume <id>`                                    |
| « Afficher les fils Codex »                                    | `/codex threads`                                        |
| « Utiliser Codex comme runtime pour cet agent »                | modification de la configuration vers `agentRuntime.id` |
| « Utiliser mon abonnement ChatGPT/Codex avec OpenClaw normal » | références de model `openai-codex/*`                    |
| « Exécuter Codex via ACP/acpx »                                | ACP `sessions_spawn({ runtime: "acp", ... })`           |
| "Démarrer Claude Code/Gemini/OpenCode/Cursor dans un fil"      | ACP/acpx, pas `/codex` et pas les sous-agents natifs    |

OpenClaw n'annonce les directives de génération ACP aux agents que lorsqu'ACP est activé,
distribuable et pris en charge par un backend d'exécution chargé. Si ACP n'est pas disponible,
le prompt système et les compétences du plugin ne devraient pas enseigner à l'agent le routage
ACP.

## Déploiements Codex uniquement

Forcez le harnais Codex lorsque vous devez prouver que chaque tour d'agent intégré
utilise Codex. Les runtimes de plugin explicites n'ont pas de repli PI par défaut, donc
`fallback: "none"` est optionnel mais souvent utile comme documentation :

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
    },
  },
}
```

Substitution par l'environnement :

```bash
OPENCLAW_AGENT_RUNTIME=codex openclaw gateway run
```

Avec Codex forcé, OpenClaw échoue tôt si le plugin Codex est désactivé, si
l'application serveur est trop ancienne ou si l'application serveur ne peut pas démarrer. Définissez
`OPENCLAW_AGENT_HARNESS_FALLBACK=pi` uniquement si vous voulez intentionnellement que PI gère
la sélection de harnais manquante.

## Codex par agent

Vous pouvez rendre un agent Codex uniquement tandis que l'agent par défaut conserve la
sélection automatique normale :

```json5
{
  agents: {
    defaults: {
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

Utilisez les commandes de session normales pour changer d'agents et de modèles. `/new` crée une
nouvelle session OpenClaw et le harnais Codex crée ou reprend son thread app-server
sidecar selon les besoins. `/reset` efface la liaison de session OpenClaw pour ce thread
et permet au tour suivant de résoudre le harnais à partir de la configuration actuelle.

## Découverte de modèle

Par défaut, le plugin Codex demande à l'app-server les modèles disponibles. Si la
découverte échoue ou expire, il utilise un catalogue de secours intégré pour :

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

Vous pouvez régler la découverte sous `plugins.entries.codex.config.discovery` :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

Désactivez la découverte lorsque vous voulez que le démarrage évite de sonder Codex et s'en tienne au
catalogue de secours :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## Connexion et stratégie de l'app-server

Par défaut, le plugin démarre le binaire Codex géré par OpenClaw localement avec :

```bash
codex app-server --listen stdio://
```

Le binaire géré est déclaré en tant que dépendance d'exécution du plugin groupé et déployé
avec le reste des dépendances du plugin `codex`. Cela permet de lier la version de l'application serveur
au plugin groupé plutôt qu'à la ligne de commande Codex séparée qui
se trouve être installée localement. Ne définissez `appServer.command` que lorsque vous
souhaitez intentionnellement exécuter un autre exécutable.

Par défaut, OpenClaw démarre les sessions de harnais Codex locales en mode YOLO :
`approvalPolicy: "never"`, `approvalsReviewer: "user"` et
`sandbox: "danger-full-access"`. Il s'agit de la posture de l'opérateur local de confiance utilisée
pour les battements de cœur autonomes : Codex peut utiliser des outils shell et réseau sans
s'arrêter sur les invites d'approbation natives auxquelles personne n'est là pour répondre.

Pour accepter les approbations révisées par le gardien Codex, définissez `appServer.mode:
"guardian"` :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "fast",
          },
        },
      },
    },
  },
}
```

Le mode Gardien utilise le chemin d'approbation de révision automatique natif de Codex. Lorsque Codex demande à sortir du bac à sable, à écrire en dehors de l'espace de travail ou à ajouter des autorisations comme l'accès réseau, Codex achemine cette demande d'approbation vers le réviseur natif au lieu d'une invite humaine. Le réviseur applique le cadre de risque de Codex et approuve ou refuse la demande spécifique. Utilisez Gardien lorsque vous souhaitez plus de garde-fous qu'en mode YOLO mais que vous avez toujours besoin que des agents non assistés progressent.

Le préréglage `guardian` s'étend à `approvalPolicy: "on-request"`, `approvalsReviewer: "auto_review"` et `sandbox: "workspace-write"`. Les champs de stratégie individuels remplacent toujours `mode`, donc les déploiements avancés peuvent mélanger le préréglage avec des choix explicites. L'ancienne valeur de réviseur `guardian_subagent` est toujours acceptée comme alias de compatibilité, mais les nouvelles configurations devraient utiliser `auto_review`.

Pour un app-server déjà en cours d'exécution, utilisez le transport WebSocket :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

Champs `appServer` pris en charge :

| Champ               | Par défaut                               | Signification                                                                                                                              |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`         | `"stdio"`                                | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                 |
| `command`           | binaire Codex géré                       | Exécutable pour le transport stdio. Laissez vide pour utiliser le binaire géré ; définissez-le uniquement pour une substitution explicite. |
| `args`              | `["app-server", "--listen", "stdio://"]` | Arguments pour le transport stdio.                                                                                                         |
| `url`               | non défini                               | URL de l'app-server WebSocket.                                                                                                             |
| `authToken`         | non défini                               | Jeton Bearer pour le transport WebSocket.                                                                                                  |
| `headers`           | `{}`                                     | En-têtes WebSocket supplémentaires.                                                                                                        |
| `requestTimeoutMs`  | `60000`                                  | Délai d'attente pour les appels au plan de contrôle de l'app-server.                                                                       |
| `mode`              | `"yolo"`                                 | Préréglage pour l'exécution YOLO ou révisée par un gardien.                                                                                |
| `approvalPolicy`    | `"never"`                                | Stratégie d'approbation native Codex envoyée au démarrage/reprise/tour du fil.                                                             |
| `sandbox`           | `"danger-full-access"`                   | Mode de bac à sable (sandbox) natif Codex envoyé au démarrage/reprise du fil.                                                              |
| `approvalsReviewer` | `"user"`                                 | Utilisez `"auto_review"` pour permettre à Codex de réviser les invites d'approbation natives. `guardian_subagent` reste un alias hérité.   |
| `serviceTier`       | non défini                               | Niveau de service optionnel de l'app-server Codex : `"fast"`, `"flex"`, ou `null`. Les valeurs héritées non valides sont ignorées.         |

Les substitutions de variable d'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque
`appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez plutôt
`plugins.entries.codex.config.appServer.mode: "guardian"`, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests locaux ponctuels. La configuration est
préférée pour les déploiements reproductibles car elle conserve le comportement du plugin dans le
même fichier révisé que le reste de la configuration du harnais Codex.

## Utilisation de l'ordinateur

Computer Use est un plugin MCP natif de Codex. OpenClaw n'intègre pas l'application de contrôle de bureau ni n'exécute les actions de bureau lui-même ; il active les plugins de l'application serveur Codex, installe le plugin configuré du marché Codex lorsqu'il est demandé, vérifie que le serveur `computer-use` MCP est disponible, puis laisse Codex gérer les appels d'outil MCP natifs lors des tours en mode Codex.

Définissez `plugins.entries.codex.config.computerUse` lorsque vous souhaitez que les tours en mode Codex nécessitent Computer Use :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

Sans champs de marketplace, OpenClaw demande à l'application serveur Codex d'utiliser ses marketplaces découvertes. Sur un domicile Codex vierge, l'application serveur sème la marketplace officielle organisée et OpenClaw suit la même forme de chargement que Codex : il interroge `plugin/list` pendant l'installation avant de considérer Computer Use comme indisponible. L'attente de découverte par défaut est de 60 secondes et peut être ajustée avec `marketplaceDiscoveryTimeoutMs`. Si plusieurs marketplaces Codex connues contiennent Computer Use, OpenClaw utilise l'ordre de préférence de la marketplace Codex avant d'échouer fermement pour les correspondances ambiguës inconnues.

Utilisez `marketplaceSource` pour une source de marketplace Codex non par défaut que l'application serveur peut ajouter, ou `marketplacePath` pour un fichier de marketplace local qui existe déjà sur la machine. Si la marketplace est déjà enregistrée auprès de l'application serveur Codex, utilisez `marketplaceName` à la place. Les valeurs par défaut sont `pluginName: "computer-use"` et `mcpServerName: "computer-use"`.
Par sécurité, l'installation automatique en début de tour n'utilise que les marketplaces que l'application serveur a déjà découvertes. Utilisez `/codex computer-use install` pour les installations explicites à partir d'un `marketplaceSource` configuré ou d'un `marketplacePath`.

Le même paramétrage peut être vérifié ou installé à partir de la surface de commande :

- `/codex computer-use status`
- `/codex computer-use install`
- `/codex computer-use install --source <marketplace-source>`
- `/codex computer-use install --marketplace-path <path>`

Computer Use est spécifique à macOS et peut nécessiter des autorisations OS locales avant que le serveur MCP Codex ne puisse contrôler les applications. Si `computerUse.enabled` est vrai et que le serveur MCP est indisponible, les tours en mode Codex échouent avant le début du thread au lieu de s'exécuter silencieusement sans les outils Computer Use natifs.

## Recettes courantes

Codex local avec le transport stdio par défaut :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Validation du harnais Codex uniquement :

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
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

Approbations Codex examinées par Guardian :

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            approvalPolicy: "on-request",
            approvalsReviewer: "auto_review",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

App-server distant avec en-têtes explicites :

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
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

Le changement de modèle reste contrôlé par OpenClaw. Lorsqu'une session OpenClaw est attachée à un fil Codex existant, le tour suivant envoie le modèle OpenAI actuellement sélectionné, le fournisseur, la politique d'approbation, le bac à sable et le niveau de service à l'app-server. Passer de `openai/gpt-5.5` à `openai/gpt-5.2` conserve la liaison du fil mais demande à Codex de continuer avec le modèle nouvellement sélectionné.

## Commande Codex

Le plugin inclus enregistre `/codex` en tant que commande slash autorisée. Il est générique et fonctionne sur n'importe quel canal qui prend en charge les commandes texte OpenClaw.

Formes courantes :

- `/codex status` affiche la connectivité en direct de l'app-server, les modèles, le compte, les limites de débit, les serveurs MCP et les compétences.
- `/codex models` liste les modèles en direct de l'app-server Codex.
- `/codex threads [filter]` liste les fils Codex récents.
- `/codex resume <thread-id>` attache la session OpenClaw actuelle à un fil Codex existant.
- `/codex compact` demande à l'app-server Codex de compacter le fil attaché.
- `/codex review` lance la révision native Codex pour le fil attaché.
- `/codex computer-use status` vérifie le plugin Computer Use configuré et le serveur MCP.
- `/codex computer-use install` installe le plugin Computer Use configuré et recharge les serveurs MCP.
- `/codex account` affiche l'état du compte et des limites de débit.
- `/codex mcp` liste l'état du serveur MCP de l'app-server Codex.
- `/codex skills` liste les compétences de l'app-server Codex.

`/codex resume` écrit le même fichier de liaison sidecar que celui utilisé par le harnais pour les tours normaux. Au prochain message, OpenClaw reprend ce fil Codex, transmet le modèle OpenClaw actuellement sélectionné à l'app-server et conserve l'historique étendu activé.

L'interface de commande nécessite l'app-server Codex `0.125.0` ou plus récent. Les méthodes de contrôle individuelles sont signalées comme `unsupported by this Codex app-server` si un app-server futur ou personnalisé n'expose pas cette méthode JSON-RPC.

## Limites des crochets

Le harnais Codex possède trois couches de crochets :

| Couche                                       | Propriétaire              | Objectif                                                                                           |
| -------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| Crochets de plugin OpenClaw                  | OpenClaw                  | Compatibilité des produits/plugins entre les harnais PI et Codex.                                  |
| Middleware d'extension de l'app-server Codex | Plugins intégrés OpenClaw | Comportement de l'adaptateur par tour autour des outils dynamiques OpenClaw.                       |
| Hooks natifs Codex                           | Codex                     | Cycle de vie de bas niveau de Codex et stratégie d'outil natif à partir de la configuration Codex. |

OpenClaw n'utilise pas les fichiers de configuration Codex `hooks.json` de projet ou globaux pour acheminer le comportement du plugin OpenClaw. Pour le pont d'outils natif et de permissions pris en charge, OpenClaw injecte une configuration Codex par thread pour `PreToolUse`, `PostToolUse`, `PermissionRequest` et `Stop`. D'autres hooks Codex tels que `SessionStart` et `UserPromptSubmit` restent des contrôles au niveau Codex ; ils ne sont pas exposés en tant que hooks de plugin OpenClaw dans le contrat v1.

Pour les outils dynamiques OpenClaw, OpenClaw exécute l'outil après que Codex a demandé l'appel, donc OpenClaw déclenche le comportement du plugin et du middleware qu'il possède dans l'adaptateur de harnais. Pour les outils natifs Codex, Codex possède l'enregistrement canonique de l'outil. OpenClaw peut mettre en miroir les événements sélectionnés, mais il ne peut pas réécrire le fil natif Codex à moins que Codex n'expose cette opération via l'application serveur ou des rappels de hook natifs.

Les projections de compactage et de cycle de vie LLM proviennent des notifications du serveur d'application Codex et de l'état de l'adaptateur OpenClaw, et non des commandes de hook natif Codex. Les événements `before_compaction`, `after_compaction`, `llm_input` et `llm_output` de OpenClaw sont des observations au niveau de l'adaptateur, et non des captures octet pour octet des charges utiles de requête interne ou de compactage de Codex.

Les notifications `hook/started` et `hook/completed` natives de Codex app-server sont
projetées en tant qu'événements d'agent `codex_app_server.hook` pour la trajectoire et le débogage.
Elles n'invoquent pas les hooks de plugin OpenClaw.

## Contrat de support V1

Le mode Codex n'est pas PI avec un appel de modèle différent en dessous. Codex possède une plus grande partie
de la boucle de modèle native, et OpenClaw adapte ses surfaces de plugin et de session
autour de cette limite.

Pris en charge dans Codex runtime v1 :

| Surface                                          | Support                                             | Pourquoi                                                                                                                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boucle de modèle OpenAI via Codex                | Pris en charge                                      | Codex app-server possède le tour OpenAI, la reprise du thread natif et la continuation de l'outil natif.                                                                                                                                            |
| Routage et livraison des canaux OpenClaw         | Pris en charge                                      | Telegram, Discord, Slack, WhatsApp, iMessage et d'autres canaux restent en dehors de l'exécution du modèle.                                                                                                                                         |
| Outils dynamiques OpenClaw                       | Pris en charge                                      | Codex demande à OpenClaw d'exécuter ces outils, donc OpenClaw reste dans le chemin d'exécution.                                                                                                                                                     |
| Plug-ins de prompt et de contexte                | Pris en charge                                      | OpenClaw construit des superpositions de prompt et projette le contexte dans le tour Codex avant de démarrer ou de reprendre le fil.                                                                                                                |
| Cycle de vie du moteur de contexte               | Pris en charge                                      | L'assemblage, l'ingestion ou la maintenance après tour, ainsi que la coordination de la compression du moteur de contexte s'exécutent pour les tours Codex.                                                                                         |
| Crochets dynamiques d'outil                      | Pris en charge                                      | `before_tool_call`, `after_tool_call` et le middleware de résultat d'outil s'exécutent autour des outils dynamiques possédés par OpenClaw.                                                                                                          |
| Crochets de cycle de vie                         | Pris en charge en tant qu'observations d'adaptateur | `llm_input`, `llm_output`, `agent_end`, `before_compaction` et `after_compaction` se déclenchent avec des payloads honnêtes en mode Codex.                                                                                                          |
| Porte de révision de la réponse finale           | Pris en charge via le relais de crochets natif      | Codex `Stop` est relayé vers `before_agent_finalize` ; `revise` demande à Codex une passe de modèle supplémentaire avant la finalisation.                                                                                                           |
| Shell natif, patch et blocage ou observation MCP | Pris en charge via le relais du hook natif          | Codex `PreToolUse` et `PostToolUse` sont relayés pour les surfaces d'outils natifs engagés, y compris les charges utiles MCP sur Codex app-server `0.125.0` ou plus récent. Le blocage est pris en charge ; la réécriture d'arguments ne l'est pas. |
| Stratégie d'autorisation native                  | Pris en charge via le relais du hook natif          | Codex `PermissionRequest` peut être acheminé via la stratégie OpenClaw lorsque le runtime l'expose. Si OpenClaw ne retourne aucune décision, Codex continue via son chemin normal de gardien ou d'approbation utilisateur.                          |
| Capture de trajectoire de l'app-server           | Pris en charge                                      | OpenClaw enregistre la demande qu'il a envoyée à app-server et les notifications app-server qu'il reçoit.                                                                                                                                           |

Non pris en charge dans Codex runtime v1 :

| Surface                                                             | Limite V1                                                                                                                                                                                   | Future voie                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Mutation native des arguments de tool                               | Les hooks natifs pre-tool de Codex peuvent bloquer, mais OpenClaw ne réécrit pas les arguments de tool natifs de Codex.                                                                     | Nécessite la prise en charge des hooks/schémas Codex pour l'entrée de tool de remplacement.                             |
| Historique des transcripts natifs Codex modifiable                  | Codex possède l'historique canonique des threads natifs. OpenClaw possède un miroir et peut projeter un contexte futur, mais ne doit pas modifier les éléments internes non pris en charge. | Ajoutez des API explicites pour Codex app-server si une chirurgie de thread native est nécessaire.                      |
| `tool_result_persist` pour les enregistrements de tool natifs Codex | Ce hook transforme les écritures de transcript appartenant à OpenClaw, et non les enregistrements de tool natifs Codex.                                                                     | Pourrait refléter les enregistrements transformés, mais la réécriture canonique nécessite la prise en charge de Codex.  |
| Métadonnées natives de compactage riches                            | OpenClaw observe le début et la fin de la compactage, mais ne reçoit pas de liste stable des éléments conservés/supprimés, de delta de jetons ou de payload de résumé.                      | Nécessite des événements de compactage Codex plus riches.                                                               |
| Intervention lors de la compactage                                  | Les hooks de compactage actuels de OpenClaw sont de niveau notification en mode Codex.                                                                                                      | Ajoutez des hooks de compactage Codex pré/post si les plugins doivent opposer un veto ou réécrire la compactage native. |
| Capture des requêtes de l'API octet par octet                       | OpenClaw peut capturer les requêtes et notifications du serveur d'application, mais le cœur de Codex construit en interne la requête finale de l'OpenAI API.                                | Nécessite un événement de traçage de requête de API Codex ou une API de débogage.                                       |

## Outils, médias et compactage

Le harnais Codex ne modifie que l'exécuteur d'agent embarqué de bas niveau.

OpenClaw construit toujours la liste d'outils et reçoit les résultats dynamiques des outils de la part du harnais. Le texte, les images, la vidéo, la musique, le TTS, les approbations et la sortie de l'outil de messagerie continuent de passer par le chemin de livraison normal de OpenClaw.

Le relais de hook natif est intentionnellement générique, mais le contrat de support v1 est limité aux chemins d'outils et de permissions natifs de Codex qu'OpenClaw teste. Dans le runtime Codex, cela inclut shell, patch, et les payloads MCP `PreToolUse`, `PostToolUse` et `PermissionRequest`. Ne supposez pas que chaque futur événement de hook Codex est une surface de plugin OpenClaw tant que le contrat runtime ne le nomme pas.

Pour `PermissionRequest`, OpenClaw ne retourne des décisions explicites d'autorisation ou de refus que lorsque la stratégie décide. Un résultat sans décision n'est pas une autorisation. Codex le traite comme l'absence de décision de hook et passe à son propre chemin de gardien ou d'approbation utilisateur.

Les sollicitations d'approbation de l'outil Codex MCP sont acheminées via le flux d'approbation des plugins d'OpenClaw lorsque Codex marque `_meta.codex_approval_kind` comme `"mcp_tool_call"`. Les invites `request_user_input` de Codex sont renvoyées au chat d'origine, et le prochain message de suivi mis en file d'attente répond à cette requête de serveur natif au lieu d'être orienté comme contexte supplémentaire. Les autres requêtes de sollicitation MCP échouent toujours de manière fermée.

Lorsque le modèle sélectionné utilise le harnais Codex, la compactage du thread natif est délégué au serveur d'application Codex. OpenClaw conserve un miroir de transcription pour l'historique du canal, la recherche, `/new`, `/reset`, et le futur changement de modèle ou de harnais. Le miroir inclut l'invite de l'utilisateur, le texte final de l'assistant, et les enregistrements de raisonnement ou de plan légers de Codex lorsque le serveur d'application les émet. Aujourd'hui, OpenClaw n'enregistre que les signaux de début et de fin de compactage natif. Il n'expose pas encore un résumé de compactage lisible par l'homme ou une liste vérifiable des entrées que Codex a conservées après compactage.

Parce que Codex possède le thread natif canonique, `tool_result_persist` ne réécrit actuellement pas les enregistrements de résultats d'outil natifs de Codex. Cela ne s'applique que lorsque OpenClaw écrit un résultat d'outil de transcription de session appartenant à OpenClaw.

La génération de médias ne nécessite pas PI. L'image, la vidéo, la musique, le PDF, le TTS et la compréhension des médias continuent d'utiliser les paramètres de fournisseur/modèle correspondants tels que `agents.defaults.imageGenerationModel`, `videoGenerationModel`, `pdfModel` et `messages.tts`.

## Dépannage

**Codex n'apparaît pas comme un fournisseur `/model` normal :** c'est prévu pour les nouvelles configurations. Sélectionnez un modèle `openai/gpt-*` avec `agentRuntime.id: "codex"` (ou une référence `codex/*` héritée), activez `plugins.entries.codex.enabled`, et vérifiez si `plugins.allow` exclut `codex`.

**OpenClaw utilise PI au lieu de Codex :** `agentRuntime.id: "auto"` peut toujours utiliser PI comme
backend de compatibilité lorsqu'aucun harnais Codex ne réclame l'exécution. Définissez
`agentRuntime.id: "codex"` pour forcer la sélection de Codex lors des tests. Un
runtime Codex forcé échoue désormais au lieu de revenir à PI, sauf si vous
définissez explicitement `agentRuntime.fallback: "pi"`. Une fois l'application Codex
sélectionnée, ses échecs apparaissent directement sans configuration de repli supplémentaire.

**L'application est rejetée :** mettez à niveau Codex pour que la négociation de l'application
signale la version `0.125.0` ou plus récente. Les préversions de même version ou les versions
avec suffixe de build telles que `0.125.0-alpha.2` ou `0.125.0+custom` sont rejetées car le
plancher de protocole stable `0.125.0` est ce que OpenClaw teste.

**La découverte de modèles est lente :** réduisez `plugins.entries.codex.config.discovery.timeoutMs`
ou désactivez la découverte.

**Le transport WebSocket échoue immédiatement :** vérifiez `appServer.url`, `authToken`,
et que l'application distante parle la même version du protocole d'application Codex.

**Un modèle non-Codex utilise PI :** c'est normal sauf si vous avez forcé
`agentRuntime.id: "codex"` pour cet agent ou sélectionné une référence
`codex/*` héritée. Les références `openai/gpt-*` simples et autres références de fournisseur restent sur leur
chemin de fournisseur normal en mode `auto`. Si vous forcez `agentRuntime.id: "codex"`, chaque tour
incorporé pour cet agent doit être un modèle OpenAI pris en charge par Codex.

## Connexes

- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
- [Runtimes d'agent](/fr/concepts/agent-runtimes)
- [Fournisseurs de modèles](/fr/concepts/model-providers)
- [Fournisseur OpenAI](/fr/providers/openai)
- [Statut](/fr/cli/status)
- [Crochets de plugin](/fr/plugins/hooks)
- [Référence de configuration](/fr/gateway/configuration-reference)
- [Tests](/fr/help/testing-live#live-codex-app-server-harness-smoke)
