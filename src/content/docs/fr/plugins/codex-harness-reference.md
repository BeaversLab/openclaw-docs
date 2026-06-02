---
summary: "Configuration, auth, discovery, and app-server reference for the Codex harness"
title: "Codex harness reference"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

Cette référence couvre la configuration détaillée du plugin `codex` fourni. Pour la configuration et les décisions de routage, commencez par [Codex harness](/fr/plugins/codex-harness).

## Surface de configuration du plugin

Tous les paramètres du Codex harness se trouvent sous `plugins.entries.codex.config`.

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
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

Champs de niveau supérieur pris en charge :

| Champ                      | Par défaut                       | Signification                                                                                                                                                                      |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled                          | Paramètres de découverte de modèles pour le Codex app-server `model/list`.                                                                                                         |
| `appServer`                | serveur d'application stdio géré | Paramètres de transport, de commande, d'auth, d'approbation, de sandbox et de délai d'attente.                                                                                     |
| `codexDynamicToolsLoading` | `"searchable"`                   | Utilisez `"direct"` pour placer les outils dynamiques OpenClaw directement dans le contexte initial des outils Codex.                                                              |
| `codexDynamicToolsExclude` | `[]`                             | Noms supplémentaires de tools dynamiques OpenClaw à omettre des tours du serveur d'application Codex.                                                                              |
| `codexPlugins`             | disabled                         | Prise en charge native du plugin/application Codex pour les plugins hébergés migrés installés à partir des sources. Voir [Native Codex plugins](/fr/plugins/codex-native-plugins). |
| `computerUse`              | disabled                         | Configuration de Codex Computer Use. Voir [Codex Computer Use](/fr/plugins/codex-computer-use).                                                                                    |

## Transport du serveur d'application

Par défaut, OpenClaw démarre le binaire Codex géré livré avec le plugin
bundlé :

```bash
codex app-server --listen stdio://
```

Cela permet de lier la version de l'app-server au plugin fourni `codex` au lieu de CLI Codex distinct installé localement. Ne définissez `appServer.command` que si vous souhaitez intentionnellement exécuter un exécutable différent.

Pour un serveur d'application déjà en cours d'exécution, utilisez le transport WebSocket :

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
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

Champs `appServer` pris en charge :

| Champ                                         | Par défaut                                                          | Signification                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                           | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                                                                                                                                        |
| `command`                                     | binaire Codex géré                                                  | Exécutable pour le transport stdio. Laisser non défini pour utiliser le binaire géré.                                                                                                                                                                                                                                                                                                             |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                            | Arguments pour le transport stdio.                                                                                                                                                                                                                                                                                                                                                                |
| `url`                                         | non défini                                                          | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                                                                                                                                           |
| `authToken`                                   | non défini                                                          | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                                                                                                                                         |
| `headers`                                     | `{}`                                                                | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                                                                                                                               |
| `clearEnv`                                    | `[]`                                                                | Noms de variables d'environnement supplémentaires supprimés du processus de serveur d'application stdio généré après qu'OpenClaw a construit son environnement hérité.                                                                                                                                                                                                                            |
| `requestTimeoutMs`                            | `60000`                                                             | Délai d'attente pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                                                                                                                                     |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                             | Fenêtre de silence après que Codex accepte un tour ou après une requête app-server limitée à un tour, tandis que OpenClaw attend OpenClaw`turn/completed`.                                                                                                                                                                                                                                        |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                                            | Garde d'inactivité et de progression utilisé après un transfert d'outil, la fin d'un outil natif, ou la progression brute de l'assistant après l'outil pendant que OpenClaw attend `turn/completed`. Utilisez ceci pour les charges de travail fiables ou lourdes où la synthèse post-outil peut légitimement rester silencieuse plus longtemps que le budget de libération final de l'assistant. |
| `mode`                                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO       | Préréglage pour l'exécution YOLO ou examinée par un gardien.                                                                                                                                                                                                                                                                                                                                      |
| `approvalPolicy`                              | `"never"` ou une stratégie d'approbation gardienne autorisée        | Stratégie d'approbation native Codex envoyée au démarrage, à la reprise et au tour du fil de discussion.                                                                                                                                                                                                                                                                                          |
| `sandbox`                                     | `"danger-full-access"` ou un bac à sable (sandbox) gardien autorisé | Mode de bac à sable (sandbox) natif Codex envoyé au démarrage et à la reprise du fil. Les bacs à sable actifs OpenClaw restreignent les tours `danger-full-access` à Codex `workspace-write` ; l'indicateur réseau du tour suit la sortie du bac à sable OpenClaw.                                                                                                                                |
| `approvalsReviewer`                           | `"user"` ou un réviseur gardien autorisé                            | Utilisez `"auto_review"` pour permettre à Codex de réviser les invites d'approbation natives lorsque cela est autorisé.                                                                                                                                                                                                                                                                           |
| `defaultWorkspaceDir`                         | répertoire du processus actuel                                      | Espace de travail utilisé par `/codex bind` lorsque `--cwd` est omis.                                                                                                                                                                                                                                                                                                                             |
| `serviceTier`                                 | non défini                                                          | Niveau de service optionnel du serveur d'application Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, et `null` efface la substitution. L'ancien `"fast"` est accepté comme `"priority"`.                                                                                                                                                           |
| `experimental.sandboxExecServer`              | `false`                                                             | Aperçu optionnel qui enregistre un environnement Codex pris en charge par le bac à sable OpenClaw avec Codex app-server 0.132.0 ou plus récent, afin que l'exécution native de Codex puisse s'exécuter à l'intérieur du bac à sable OpenClaw actif.                                                                                                                                               |

Le plugin bloque les négociations de connexion (handshakes) de serveur d'application plus anciennes ou sans version. Le serveur d'application Codex doit indiquer une version stable `0.125.0` ou plus récente.

## Modes d'approbation et de bac à sable

Les sessions de serveur d'application stdio locales sont par défaut en mode YOLO :
`approvalPolicy: "never"`, `approvalsReviewer: "user"`, et
`sandbox: "danger-full-access"`OpenClaw. Cette posture d'opérateur local de confiance permet aux tours et battements de cœur (heartbeats) OpenClaw non surveillés de progresser sans invites d'approbation native auxquelles personne ne peut répondre.

Si le fichier des exigences système local de Codex interdit les valeurs implicites d'approbation YOLO, de réviseur ou de sandbox, OpenClaw traite la valeur par défaut implicite comme guardian à la place et sélectionne les autorisations guardian autorisées. OpenClaw`tools.exec.mode: "auto"`
force également les approbations Codex examinées par un guardian et ne préserve pas les substitutions `approvalPolicy: "never"` ou `sandbox: "danger-full-access"` héritées non sécurisées ;
définissez `tools.exec.mode: "full"` pour une posture délibérée sans approbation.
Correspondance du nom d'hôte
Les entrées `[[remote_sandbox_config]]` correspondantes dans le même fichier d'exigences sont respectées pour la décision de sandbox par défaut.

Définissez `appServer.mode: "guardian"` pour les approbations Codex examinées par un guardian :

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

Le préréglage `guardian` s'étend à `approvalPolicy: "on-request"`,
`approvalsReviewer: "auto_review"` et `sandbox: "workspace-write"` lorsque ces
valeurs sont autorisées. Les champs de stratégie individuels priment sur `mode`. L'ancienne valeur de réviseur `guardian_subagent` est toujours acceptée comme un alias de compatibilité,
mais les nouvelles configurations doivent utiliser `auto_review`.

Lorsqu'une sandbox OpenClaw est active, le processus local du serveur d'application Codex s'exécute toujours sur l'hôte Gateway. Par conséquent, OpenClaw désactive le Code Mode natif Codex, les serveurs MCP utilisateur et l'exécution de plugins supported par l'application pour ce tour, au lieu de traiter le sandboxing côté hôte Codex comme équivalent au backend de sandbox OpenClaw. L'accès au shell est exposé via des outils dynamiques supported par la sandbox OpenClaw
tels que OpenClawGatewayOpenClawOpenClawOpenClaw`sandbox_exec` et `sandbox_process` lorsque les outils exec/process normaux sont disponibles.

Sur les hôtes Ubuntu/AppArmor, Codex bwrap peut échouer sous `workspace-write` avant
le démarrage de la commande shell lorsque vous exécutez intentionnellement le Codex natif
`workspace-write`OpenClaw sans sandboxing OpenClaw actif. Si vous voyez
`bwrap: setting up uid map: Permission denied` ou
`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`, exécutez
`openclaw doctor`OpenClawDocker et corrigez la stratégie de namespace d'hôte signalée pour l'utilisateur du service
OpenClaw plutôt que d'accorder des privilèges plus étendus au conteneur Docker. Préférez
un profil AppArmor délimité pour le processus de service ; le
`kernel.apparmor_restrict_unprivileged_userns=0` de repli s'applique à l'hôte entier et présente
des compromis de sécurité.

## Exécution native sandboxée

Le défaut stable est fail-closed : le sandboxing OpenClaw actif désactive les surfaces
d'exécution natives Codex qui s'exécuteraient autrement depuis l'hôte du
Codex app-server. Utilisez OpenClaw`appServer.experimental.sandboxExecServer: true`OpenClaw uniquement lorsque vous souhaitez
essayer la prise en charge de l'environnement distant de Codex avec le backend de sandbox d'OpenClaw. Ce
chemin d'aperçu nécessite Codex app-server 0.132.0 ou plus récent.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            experimental: {
              sandboxExecServer: true,
            },
          },
        },
      },
    },
  },
}
```

Lorsque l'indicateur est activé et que la session OpenClaw actuelle est sandboxée, OpenClaw
démarre un exec-server local loopback soutenu par le sandbox actif, l'enregistre auprès de Codex app-server,
et démarre le thread et le tour Codex avec cet environnement détenu par OpenClaw. Si l'app-server ne peut pas enregistrer l'environnement,
l'exécution échoue de manière fermée au lieu de retomber silencieusement sur l'exécution hôte.

Ce chemin d'aperçu est purement local. Un app-server WebSocket distant ne peut pas atteindre le
exec-server local loopback à moins qu'il ne s'exécute sur le même hôte, donc OpenClaw rejette
cette combinaison.

## Authentification et isolation de l'environnement

L'auth est sélectionnée dans cet ordre :

1. Un profil d'auth Codex OpenClaw explicite pour l'agent.
2. Le compte existant de l'app-server dans le Codex home de cet agent.
3. Pour les lancements d'app-server stdio locaux uniquement, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`OpenAI, lorsqu aucun compte app-server n'est présent et que l'authentification
   OpenAI est toujours requise.

Lorsqu'OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
OpenClaw`CODEX_API_KEY` et `OPENAI_API_KEY`GatewayAPIOpenAIAPI du processus fils Codex généré. Cela
garde les clés API de niveau Gateway disponibles pour les embeddings ou les modèles
OpenAI directs sans faire facturer par erreur les tours natifs du Codex app-server via l'API.

Les profils explicites de clé API Codex et le repli de clé d'environnement stdio local utilisent la connexion au serveur d'application au lieu de l'environnement de processus enfant hérité. Les connexions WebSocket au serveur d'application ne reçoivent pas le repli de clé Gateway d'environnement API ; utilisez un profil d'authentification explicite ou le propre compte du serveur d'application distant.

Les lancements d'app-server stdio héritent de l'environnement de processus d'OpenClaw par défaut.
OpenClaw possède le pont de compte du Codex app-server et définit OpenClawOpenClaw`CODEX_HOME`OpenClawOpenClaw sur un
répertoire par agent sous l'état OpenClaw de cet agent. Cela maintient la configuration Codex,
les comptes, le cache/les données des plugins et l'état des threads délimités à l'agent
OpenClaw au lieu de fuir depuis le personnel `~/.codex` home de l'opérateur.

OpenClaw ne réécrit pas OpenClaw`HOME` pour les lancements normaux de serveur d'application local. Les sous-processus exécutés par Codex tels que `openclaw`, `gh`, `git`, les CLI cloud et les commandes shell voient le répertoire personnel du processus normal et peuvent trouver la configuration et les jetons du répertoire personnel de l'utilisateur. Codex peut également découvrir `$HOME/.agents/skills` et `$HOME/.agents/plugins/marketplace.json` ; cette découverte `.agents` est intentionnellement partagée avec le répertoire personnel de l'opérateur et est distincte de l'état `~/.codex` isolé.

Les plugins OpenClaw et les instantanés de compétences OpenClaw passent toujours par le propre registre de plugins et le chargeur de compétences d'OpenClaw. Les actifs OpenClawOpenClawOpenClaw`~/.codex`CLIOpenClaw personnels de Codex non. Si vous avez des compétences ou des plugins CLI Codex utiles provenant d'un répertoire personnel Codex qui doivent faire partie d'un agent OpenClaw, inventoriez-les explicitement :

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

Si un déploiement a besoin d'un isolement d'environnement supplémentaire, ajoutez ces variables à `appServer.clearEnv` :

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

## Outils dynamiques

Les outils dynamiques Codex sont chargés par défaut via `searchable`OpenClaw. OpenClaw n'expose pas les outils dynamiques qui dupliquent les opérations de l'espace de travail natives de Codex :

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

La plupart des outils d'intégration OpenClaw restants, tels que la messagerie, les médias, cron, le navigateur, les nœuds, la passerelle, OpenClaw`heartbeat_respond` et `web_search`, sont disponibles via la recherche d'outils Codex sous l'espace de noms `openclaw`. Cela permet de réduire la taille du contexte initial du modèle. `sessions_yield` et les réponses source de l'outil de message uniquement restent directes car il s'agit de contrats de contrôle de tour. `sessions_spawn` reste searchable afin que l'`spawn_agent`OpenClaw native de Codex reste la surface principale du sous-agent Codex, tandis que la délégation explicite OpenClaw ou ACP est toujours disponible via l'espace de noms d'outil dynamique `openclaw`.

Ne définissez `codexDynamicToolsLoading: "direct"` que lors de la connexion à un app-server Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

## Délais d'expiration

Les appels d'outils dynamiques détenus par OpenClaw sont bornés indépendamment de OpenClaw`appServer.requestTimeoutMs`. Chaque requête Codex `item/tool/call` utilise le premier délai d'attente disponible dans cet ordre :

- Un argument `timeoutMs` positif par appel.
- Pour `image_generate`, `agents.defaults.imageGenerationModel.timeoutMs`.
- Pour `image_generate` sans délai d'attente configuré, la valeur par défaut de 120 secondes pour la génération d'images.
- Pour l'outil `image` de compréhension des médias, `tools.media.image.timeoutSeconds` converti en millisecondes, ou la valeur par défaut de 60 secondes pour les médias.
- La valeur par défaut de 90 secondes pour les outils dynamiques.

Les budgets d'outils dynamiques sont plafonnés à 600000 ms. En cas de dépassement du délai d'attente, OpenClaw abandonne le signal de l'outil lorsque cela est pris en charge et renvoie une réponse d'outil dynamique ayant échoué à Codex, afin que le tour puisse continuer au lieu de laisser la session en OpenClaw`processing`.

Une fois que Codex accepte un tour et après qu'OpenClaw a répondu à une requête app-server limitée au tour, le harnais s'attend à ce que Codex progresse sur le tour en cours et termine finalement le tour natif avec OpenClaw`turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`OpenClawOpenClaw, OpenClaw interrompt, au mieux, le tour Codex, enregistre un délai d'expiration de diagnostic et libère la voie de session OpenClaw afin que les messages de chat de suivi ne soient pas mis en file d'attente derrière un tour natif obsolète.

La plupart des notifications non terminales pour le même tour désactivent ce chien de garde court car Codex a prouvé que le tour est toujours actif. Les transferts d'outils utilisent un budget d'inactivité post-outil plus long : après qu'OpenClaw a renvoyé une réponse `item/tool/call`, après la fin des éléments d'outil natifs tels que `commandExecution`, après les achèvements `custom_tool_call_output` bruts, et après la progression brute de l'assistant post-outil. Le garde utilise `appServer.postToolRawAssistantCompletionIdleTimeoutMs` lorsqu'il est configuré et par défaut à cinq minutes sinon. Ce même budget post-outil prolonge également le chien de garde de progression pour la fenêtre de synthèse silencieuse avant que Codex n'émette le prochain événement de tour actuel. Les achèvements de raisonnement, les achèvements de commentaire `agentMessage` et la progression brute de raisonnement ou d'assistant pré-outil peuvent être suivis d'une réponse finale automatique, ils utilisent donc le garde de réponse post-progression au lieu de libérer immédiatement la voie de session. Seuls les éléments `agentMessage` achevés finaux/non commentés et les achèvements bruts d'assistant pré-outil arment la libération de sortie de l'assistant : si Codex se tait ensuite sans `turn/completed`, OpenClaw interrompt au mieux le tour natif et libère la voie de session. Les échecs stdio du serveur d'application reproductibles par relecture, y compris les délais d'inactivité d'achèvement de tour sans assistant, outil, élément actif ou effet secondaire, sont réessayés une fois sur une nouvelle tentative de serveur d'application. Les délais d'attente non sécurisés mettent toujours fin au client du serveur d'application bloqué et libèrent la voie de session OpenClaw. Ils effacent également la liaison de thread native obsolète et affichent un message de délai d'attente récupérable pour le jugement de l'utilisateur ou du mainteneur au lieu d'être rejoués automatiquement. Les diagnostics de délai d'attente incluent la dernière méthode de notification du serveur d'application et, pour les éléments de réponse brute de l'assistant, le type d'élément, le rôle, l'identifiant et un aperçu borné du texte de l'assistant.

## Découverte de modèles

Par défaut, le plugin Codex demande à l'app-server les modèles disponibles. La disponibilité des modèles est gérée par le Codex app-server, la liste peut donc changer lorsque OpenClaw met à jour la version intégrée de `@openai/codex` ou lorsqu'un déploiement pointe `appServer.command` vers un binaire Codex différent. La disponibilité peut également être limitée au compte. Utilisez `/codex models` sur une passerelle en cours d'exécution pour voir le catalogue en direct pour ce harnais et ce compte.

Si la découverte échoue ou expire, OpenClaw utilise un catalogue de repli intégré pour :

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

Le harnais groupé actuel est `@openai/codex` `0.134.0`. Une sonde `model/list` contre cet app-server groupé a renvoyé :

| Identifiant du modèle | Par défaut | Masqué | Modalités d'entrée | Efforts de raisonnement  |
| --------------------- | ---------- | ------ | ------------------ | ------------------------ |
| `gpt-5.5`             | Oui        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.4`             | Non        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.4-mini`        | Non        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.3-codex`       | Non        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.3-codex-spark` | Non        | Non    | texte              | low, medium, high, xhigh |
| `gpt-5.2`             | Non        | Non    | text, image        | low, medium, high, xhigh |

Les modèles masqués peuvent être renvoyés par le catalogue de l'application serveur pour des flux internes ou spécialisés, mais ils ne constituent pas des choix normaux du sélecteur de modèles.

Ajustez la découverte sous `plugins.entries.codex.config.discovery` :

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

Désactivez la découverte lorsque vous souhaitez que le démarrage évite de sonder Codex et utilise uniquement le catalogue de secours :

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

## Fichiers d'amorçage de l'espace de travail

Codex gère `AGENTS.md` lui-même via la découverte native de documents de projet. OpenClaw n'écrit pas de fichiers de documents de projet Codex synthétiques et ne dépend pas des noms de fichiers de repli Codex pour les fichiers de persona, car les replis Codex ne s'appliquent que lorsque `AGENTS.md` est manquant.

Pour la parité de l'espace de travail OpenClaw, le harnais Codex résout les autres fichiers d'amorçage. `SOUL.md`, `IDENTITY.md`, `TOOLS.md` et `USER.md` sont transmis en tant qu'instructions de développeur Codex OpenClaw car ils définissent l'agent actif, les directives de l'espace de travail disponibles et le profil utilisateur. La liste compacte des compétences OpenClaw est transmise en tant qu'instructions de développeur de collaboration limitées au tour. Le contenu de `HEARTBEAT.md` n'est pas injecté ; les tours de heartbeat reçoivent un pointeur en mode de collaboration pour lire le fichier lorsqu'il existe et n'est pas vide. Le contenu de `MEMORY.md` de l'espace de travail de l'agent configuré n'est pas collé dans l'entrée de tour Codex native lorsque les outils de mémoire sont disponibles pour cet espace de travail ; lorsqu'il existe, le harnais ajoute un petit pointeur de mémoire d'espace de travail aux instructions de développeur de collaboration limitées au tour, et Codex doit utiliser `memory_search` ou `memory_get` lorsque la mémoire durable est pertinente. Si les outils sont désactivés, la recherche de mémoire est indisponible, ou que l'espace de travail actif diffère de l'espace de mémoire de l'agent, `MEMORY.md` utilise le chemin normal de contexte de tour borné. `BOOTSTRAP.md`, lorsqu'il est présent, est transmis en tant que contexte de référence d'entrée de tour OpenClaw.

## Remplacements de l'environnement

Les remplacements de l'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque
`appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez plutôt
`plugins.entries.codex.config.appServer.mode: "guardian"`, ou
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests locaux ponctuels. La configuration est préférée pour les déploiements reproductibles car elle maintient le comportement du plugin dans le même fichier examiné que le reste de la configuration du harnais Codex.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness runtime](/fr/plugins/codex-harness-runtime)
- [Native Codex plugins](/fr/plugins/codex-native-plugins)
- [Codex Computer Use](/fr/plugins/codex-computer-use)
- [OpenAI provider](OpenAI/en/providers/openai)
- [Configuration reference](/fr/gateway/configuration-reference)
