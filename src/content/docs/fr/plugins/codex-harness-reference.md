---
summary: "Configuration, auth, discovery, and app-server reference for the Codex harness"
title: "Codex harness reference"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

Cette référence couvre la configuration détaillée du plugin fourni `codex`. Pour la configuration et les décisions de routage, commencez par [Codex harness](/fr/plugins/codex-harness).

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

| Champ                      | Par défaut                       | Signification                                                                                                                                                                 |
| -------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled                          | Paramètres de découverte de modèles pour le Codex app-server `model/list`.                                                                                                    |
| `appServer`                | serveur d'application stdio géré | Paramètres de transport, de commande, d'auth, d'approbation, de sandbox et de délai d'attente.                                                                                |
| `codexDynamicToolsLoading` | `"searchable"`                   | Utilisez `"direct"` pour placer les outils dynamiques OpenClaw directement dans le contexte initial des outils Codex.                                                         |
| `codexDynamicToolsExclude` | `[]`                             | Noms supplémentaires de tools dynamiques OpenClaw à omettre des tours du serveur d'application Codex.                                                                         |
| `codexPlugins`             | disabled                         | Prise en charge native des plugins/apps Codex pour les plugins curés installés à partir des sources et migrés. Voir [Native Codex plugins](/fr/plugins/codex-native-plugins). |
| `computerUse`              | disabled                         | Configuration de Codex Computer Use. Voir [Codex Computer Use](/fr/plugins/codex-computer-use).                                                                               |

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

| Champ                                         | Par défaut                                                    | Signification                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                                     | `"stdio"` lance Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `command`                                     | binaire Codex géré                                            | Exécutable pour le transport stdio. Laisser non défini pour utiliser le binaire géré.                                                                                                                                                                                                                                                                                                                                                                                     |
| `args`                                        | `["app-server", "--listen", "stdio://"]`                      | Arguments pour le transport stdio.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `url`                                         | non défini                                                    | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `authToken`                                   | non défini                                                    | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `headers`                                     | `{}`                                                          | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `clearEnv`                                    | `[]`                                                          | Noms de variables d'environnement supplémentaires supprimés du processus de serveur d'application stdio généré après qu'OpenClaw a construit son environnement hérité.                                                                                                                                                                                                                                                                                                    |
| `requestTimeoutMs`                            | `60000`                                                       | Délai d'attente pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                                                                                                                                                                                                             |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                       | Fenêtre de silence après que Codex accepte un tour ou après une requête app-server limitée à un tour, tandis que OpenClaw attend OpenClaw`turn/completed`.                                                                                                                                                                                                                                                                                                                |
| `postToolRawAssistantCompletionIdleTimeoutMs` | non défini                                                    | Garde d'inactivité de complétion utilisé après un transfert de tool lorsque Codex émet une complétion brute ou une progression de l'assistant mais n'envoie pas `turn/completed`. Par défaut, correspond au délai d'inactivité de la complétion de l'assistant si non défini. À utiliser pour les charges de travail approuvées ou lourdes où la synthèse post-tool peut légitimement rester silencieuse plus longtemps que le budget de libération final de l'assistant. |
| `mode`                                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO | Préréglage pour l'exécution YOLO ou examinée par un gardien.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `approvalPolicy`                              | `"never"` ou une stratégie d'approbation de gardien autorisée | Stratégie d'approbation native Codex envoyée au démarrage, à la reprise et au tour du fil de discussion.                                                                                                                                                                                                                                                                                                                                                                  |
| `sandbox`                                     | `"danger-full-access"` ou un bac à sable de gardien autorisé  | Mode de bac à sable natif Codex envoyé au démarrage et à la reprise du fil de discussion. Les bacs à sable actifs OpenClaw limitent les tours OpenClaw`danger-full-access` à Codex `workspace-write`OpenClaw; l'indicateur réseau du tour suit la sortie du bac à sable OpenClaw.                                                                                                                                                                                         |
| `approvalsReviewer`                           | `"user"` ou un examinateur de gardien autorisé                | Utilisez `"auto_review"` pour permettre à Codex de examiner les invites d'approbation natives lorsque cela est autorisé.                                                                                                                                                                                                                                                                                                                                                  |
| `defaultWorkspaceDir`                         | répertoire du processus actuel                                | Espace de travail utilisé par `/codex bind` lorsque `--cwd` est omis.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `serviceTier`                                 | non défini                                                    | Niveau de service optionnel de l'app-server Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, et `null` efface la substitution. L'ancien `"fast"` est accepté comme `"priority"`.                                                                                                                                                                                                                                            |
| `experimental.sandboxExecServer`              | `false`                                                       | Aperçu optionnel qui enregistre un environnement Codex pris en charge par le bac à sable OpenClaw avec Codex app-server 0.132.0 ou plus récent, afin que l'exécution native de Codex puisse s'exécuter à l'intérieur du bac à sable OpenClaw actif.                                                                                                                                                                                                                       |

Le plugin bloque les poignées de main (handshakes) app-server plus anciennes ou sans version. Codex app-server
doit signaler la version stable `0.125.0` ou plus récente.

## Modes d'approbation et de bac à sable

Les sessions app-server stdio locales sont par défaut en mode YOLO :
`approvalPolicy: "never"`, `approvalsReviewer: "user"` et
`sandbox: "danger-full-access"`. Cette posture d'opérateur local de confiance permet
aux tours et battements de cœur OpenClaw sans surveillance de progresser sans invites
d'approbation natives auxquelles personne n'est là pour répondre.

Si le fichier des exigences système locales de Codex interdit les valeurs d'approbation,
de révisionnaire ou de bac à sable YOLO implicites, OpenClaw traite la valeur par défaut implicite comme un tuteur
(« guardian ») à la place et sélectionne les autorisations de tuteur autorisées. Les entrées
`[[remote_sandbox_config]]` correspondant au nom d'hôte dans le même fichier d'exigences sont respectées
pour la décision par défaut du bac à sable.

Définissez `appServer.mode: "guardian"` pour les approbations Codex révisées par un tuteur :

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
valeurs sont autorisées. Les champs de stratégie individuels remplacent `mode`. L'ancienne
valeur de révisionnaire `guardian_subagent` est toujours acceptée comme alias de compatibilité,
mais les nouvelles configurations doivent utiliser `auto_review`.

Lorsqu'un bac à sable OpenClaw est actif, le processus local Codex app-server s'exécute toujours
sur l'hôte Gateway. OpenClaw désactive donc le mode Code natif de Codex,
les serveurs MCP utilisateur et l'exécution des plugins pris en charge par l'application pour ce tour, au lieu de
traiter le sandboxing côté hôte de Codex comme équivalent au backend de
bac à sable OpenClaw. L'accès au shell est exposé via des outils dynamiques pris en charge par le bac à sable OpenClaw
tels que `sandbox_exec` et `sandbox_process` lorsque les outils exec/process normaux
sont disponibles.

Sur les hôtes Ubuntu/AppArmor, Codex bwrap peut échouer sous `workspace-write` avant
le démarrage de la commande shell lorsque vous exécutez intentionnellement du OpenClaw natif Codex
`workspace-write` sans sandboxing OpenClaw actif. Si vous voyez
`bwrap: setting up uid map: Permission denied` ou
`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`, exécutez
`openclaw doctor` et corrigez la stratégie de namespace d'hôte signalée pour l'utilisateur du service Docker
plutôt que d'accorder des privilèges de conteneur Docker plus larges. Préférez
un profil AppArmor délimité pour le processus de service ; la
solution de repli `kernel.apparmor_restrict_unprivileged_userns=0` s'applique à l'ensemble de l'hôte et présente
des compromis en matière de sécurité.

## Exécution native sandboxée

Le défaut stable est fail-closed : le sandboxing OpenClaw actif désactive les surfaces
d'exécution native Codex qui s'exécuteraient autrement depuis l'hôte du Codex app-server.
Utilisez `appServer.experimental.sandboxExecServer: true` uniquement lorsque vous souhaitez
essayer la prise en charge de l'environnement distant de Codex avec le backend de sandbox de OpenClaw. Ce
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
3. Uniquement pour les lancements d'app-server stdio locaux, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte app-server n'est présent et que l'auth OpenAI est
   toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime `CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela permet de garder les clés Gateway de niveau API disponibles pour les embeddings ou les modèles OpenAI directs, sans faire facturer par inadvertance les tours natifs du serveur d'application Codex via la API.

Les profils explicites de clé API Codex et le repli de clé d'environnement stdio local utilisent la connexion au serveur d'application au lieu de l'environnement de processus enfant hérité. Les connexions WebSocket au serveur d'application ne reçoivent pas le repli de clé Gateway d'environnement API ; utilisez un profil d'authentification explicite ou le propre compte du serveur d'application distant.

Les lancements du serveur d'application Stdio héritent par défaut de l'environnement de processus de OpenClaw. OpenClaw possède le pont de compte du serveur d'application Codex et définit `CODEX_HOME` sur un répertoire par agent sous l'état OpenClaw de cet agent. Cela permet de maintenir la configuration Codex, les comptes, le cache/données des plugins et l'état des threads dans le périmètre de l'agent OpenClaw au lieu de fuir depuis le répertoire personnel `~/.codex` de l'opérateur.

OpenClaw ne réécrit pas `HOME` pour les lancements normaux de serveur d'application local. Les sous-processus exécutés par Codex tels que `openclaw`, `gh`, `git`, les CLI cloud et les commandes shell voient le répertoire personnel du processus normal et peuvent trouver la configuration et les jetons du répertoire utilisateur personnel. Codex peut également découvrir `$HOME/.agents/skills` et `$HOME/.agents/plugins/marketplace.json` ; cette découverte `.agents` est intentionnellement partagée avec le répertoire personnel de l'opérateur et est distincte de l'état isolé `~/.codex`.

Les plugins OpenClaw et les instantanés de compétences OpenClaw passent toujours par le propre
registre de plugins et le chargeur de compétences d'OpenClaw. Ce n'est pas le cas des actifs Codex OpenClawOpenClawOpenClaw`~/.codex` personnels. Si
vous disposez de compétences Codex CLI ou de plugins utiles à partir d'un domicile Codex qui devraient devenir
partie d'un agent OpenClaw, inventoriez-les explicitement :

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

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
OpenClaw supprime `CODEX_HOME` et `HOME` de cette liste lors de la normalisation
du lancement local : `CODEX_HOME` reste par agent, et `HOME` reste hérité pour
que les sous-processus puissent utiliser l'état normal du dossier utilisateur.

## Outils dynamiques

Les outils dynamiques Codex sont chargés par défaut via `searchable`. OpenClaw n'expose pas
les outils dynamiques qui dupliquent les opérations de l'espace de travail natives de Codex :

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

La plupart des autres outils d'intégration OpenClaw, tels que la messagerie, les médias, cron,
le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search`, sont disponibles
via la recherche d'outils Codex sous l'espace de noms `openclaw`. Cela permet de garder le contexte initial du
model plus petit. `sessions_yield` et les réponses source exclusivement à l'outil de messagerie
restent directes car ce sont des contrats de contrôle de tour. `sessions_spawn` reste
recherchable pour que le `spawn_agent` natif de Codex reste la surface principale du sous-agent Codex,
tandis que la délégation explicite à OpenClaw ou à l'ACP est toujours disponible via
l'espace de noms de l'outil dynamique `openclaw`.

Définissez `codexDynamicToolsLoading: "direct"` uniquement lors de la connexion à un
app-server Codex personnalisé qui ne peut pas rechercher les outils dynamiques différés ou lors du débogage de la charge utile complète de l'outil.

## Délais d'expiration

Les appels d'outils dynamiques détenus par OpenClaw sont limités indépendamment de `appServer.requestTimeoutMs`. Chaque requête Codex `item/tool/call` utilise le premier délai d'expiration disponible dans cet ordre :

- Un argument positif `timeoutMs` par appel.
- Pour `image_generate`, `agents.defaults.imageGenerationModel.timeoutMs`.
- Pour `image_generate` sans délai d'expiration configuré, la valeur par défaut de 120 secondes pour la génération d'images.
- Pour l'outil `image` de compréhension multimédia, `tools.media.image.timeoutSeconds`
  converti en millisecondes, ou la valeur par défaut de 60 secondes pour les médias.
- La valeur par défaut de 30 secondes pour les outils dynamiques.

Les budgets d'outils dynamiques sont plafonnés à 600 000 ms. En cas de délai d'expiration, OpenClaw abandonne le signal de l'outil lorsque cela est pris en charge et renvoie une réponse d'outil dynamique ayant échoué à Codex afin que le tour puisse continuer au lieu de laisser la session en `processing`.

Après que Codex a accepté un tour et après que OpenClaw a répondu à une requête app-server limitée au tour, le harnais s'attend à ce que Codex réalise des progrès sur le tour en cours et termine finalement le tour natif avec `turn/completed`. Si l'app-server reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrompt le tour Codex autant que possible, enregistre un délai d'expiration de diagnostic et libère la voie de session OpenClaw afin que les messages de chat de suivi ne soient pas mis en file d'attente derrière un tour natif périmé.

La plupart des notifications non terminales pour le même tour désactivent ce chien de garde court car Codex a prouvé que le tour est toujours actif. Les achèvements `custom_tool_call_output` bruts maintiennent le chien de garde post-tool court armé car ils constituent le transfert de résultat de tool limité au tour. Les éléments `agentMessage` terminés et les éléments `rawResponseItem/completed` bruts d'assistant pre-tool arment la libération de la sortie de l'assistant : si Codex devient alors silencieux sans `turn/completed`, OpenClaw interrompt de manière au mieux le tour natif et libère le volet de session. La progression brute de l'assistant post-tool continue d'attendre `turn/completed` pendant qu'une garde d'inactivité d'achèvement reste armée ; la garde utilise `appServer.postToolRawAssistantCompletionIdleTimeoutMs` lorsque configurée et revient sinon au délai d'inactivité d'achèvement de l'assistant. Les diagnostics de délai d'attente incluent la dernière méthode de notification du serveur d'application et, pour les éléments de réponse brute de l'assistant, le type d'élément, le rôle, l'identifiant et un aperçu de texte de l'assistant limité.

## Découverte de modèles

Par défaut, le plugin Codex demande au serveur d'application les modèles disponibles. La disponibilité des modèles appartient au serveur d'application Codex, donc la liste peut changer lorsque OpenClaw met à niveau la version intégrée `@openai/codex` ou lorsqu'un déploiement pointe `appServer.command` vers un binaire Codex différent. La disponibilité peut également être limitée au compte. Utilisez `/codex models` sur une passerelle en cours d'exécution pour voir le catalogue en direct pour ce harnais et ce compte.

Si la découverte échoue ou expire, OpenClaw utilise un catalogue de repli intégré pour :

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

Le harnais intégré actuel est `@openai/codex` `0.132.0`. Une sonde `model/list` contre ce serveur d'application intégré a renvoyé :

| Identifiant du modèle | Par défaut | Masqué | Modalités d'entrée | Efforts de raisonnement  |
| --------------------- | ---------- | ------ | ------------------ | ------------------------ |
| `gpt-5.5`             | Oui        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.4`             | Non        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.4-mini`        | Non        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.3-codex`       | Non        | Non    | texte, image       | low, medium, high, xhigh |
| `gpt-5.2`             | Non        | Non    | texte, image       | low, medium, high, xhigh |
| `codex-auto-review`   | Non        | Oui    | text, image        | low, medium, high, xhigh |

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

Codex gère `AGENTS.md` lui-même via la découverte native de documents de projet. OpenClaw n'écrit pas de fichiers de documents de projet Codex synthétiques ni ne dépend des noms de fichiers de secours Codex pour les fichiers de persona, car les secours Codex ne s'appliquent que lorsque `AGENTS.md` est manquant.

Pour la parité de l'espace de travail OpenClaw, le harnais Codex résout les autres fichiers
bootstrap. `SOUL.md`, `IDENTITY.md`, `TOOLS.md` et `USER.md` sont transmis en tant que
instructions de développeur Codex OpenClaw car ils définissent l'agent actif,
l'orientation de l'espace de travail disponible et le profil utilisateur. Le contenu de `HEARTBEAT.md` n'est
pas injecté; les tours de heartbeat obtiennent un pointeur en mode collaboration pour lire le fichier lorsqu'il
existe et n'est pas vide. `BOOTSTRAP.md` et `MEMORY.md`, lorsqu'ils sont présents, sont
transmis en tant que contexte de référence d'entrée de tour OpenClaw.

## Remplacements de l'environnement

Les remplacements de l'environnement restent disponibles pour les tests locaux :

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
préférée pour les déploiements répétables car elle conserve le comportement du plugin dans le
même fichier révisé que le reste de la configuration du harnais Codex.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Runtime du harnais Codex](/fr/plugins/codex-harness-runtime)
- [Plugins natifs Codex](/fr/plugins/codex-native-plugins)
- [Codex Computer Use](/fr/plugins/codex-computer-use)
- [Fournisseur OpenAI](/fr/providers/openai)
- [Référence de configuration](/fr/gateway/configuration-reference)
