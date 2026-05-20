---
summary: "Configuration, auth, découverte et référence du serveur d'application pour le harnais Codex"
title: "Référence du harnais Codex"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

Cette référence couvre la configuration détaillée pour le plugin `codex`
inclus. Pour la configuration et les décisions de routage, commencez par
[Codex harness](/fr/plugins/codex-harness).

## Surface de configuration du plugin

Tous les paramètres du harnais Codex se trouvent sous `plugins.entries.codex.config`.

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

| Champ                      | Par défaut                       | Signification                                                                                                                                                                             |
| -------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled                          | Paramètres de découverte de modèles pour le serveur d'application Codex `model/list`.                                                                                                     |
| `appServer`                | serveur d'application stdio géré | Paramètres de transport, de commande, d'auth, d'approbation, de sandbox et de délai d'attente.                                                                                            |
| `codexDynamicToolsLoading` | `"searchable"`                   | Utilisez `"direct"` pour placer les tools dynamiques OpenClaw directement dans le contexte initial des tools Codex.                                                                       |
| `codexDynamicToolsExclude` | `[]`                             | Noms supplémentaires de tools dynamiques OpenClaw à omettre des tours du serveur d'application Codex.                                                                                     |
| `codexPlugins`             | disabled                         | Prise en charge native des plugins/applications Codex pour les plugins organisés installés à partir des sources et migrés. Voir [Native Codex plugins](/fr/plugins/codex-native-plugins). |
| `computerUse`              | disabled                         | Configuration de Codex Computer Use. Voir [Codex Computer Use](/fr/plugins/codex-computer-use).                                                                                           |

## Transport du serveur d'application

Par défaut, OpenClaw démarre le binaire Codex géré livré avec le plugin
bundlé :

```bash
codex app-server --listen stdio://
```

Cela permet de lier la version du serveur d'application au plugin `codex` bundlé plutôt qu'au Codex CLI distinct installé localement. Ne définissez
`appServer.command` que lorsque vous souhaitez intentionnellement exécuter un autre
exécutable.

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

| Champ                         | Par défaut                                                    | Signification                                                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                                     | `"stdio"` génère Codex ; `"websocket"` se connecte à `url`.                                                                                                                                                                                                                  |
| `command`                     | binaire Codex géré                                            | Exécutable pour le transport stdio. Laisser non défini pour utiliser le binaire géré.                                                                                                                                                                                        |
| `args`                        | `["app-server", "--listen", "stdio://"]`                      | Arguments pour le transport stdio.                                                                                                                                                                                                                                           |
| `url`                         | non défini                                                    | URL du serveur d'application WebSocket.                                                                                                                                                                                                                                      |
| `authToken`                   | non défini                                                    | Jeton Bearer pour le transport WebSocket.                                                                                                                                                                                                                                    |
| `headers`                     | `{}`                                                          | En-têtes WebSocket supplémentaires.                                                                                                                                                                                                                                          |
| `clearEnv`                    | `[]`                                                          | Noms de variables d'environnement supplémentaires supprimés du processus de serveur d'application stdio généré après qu'OpenClaw a construit son environnement hérité.                                                                                                       |
| `requestTimeoutMs`            | `60000`                                                       | Délai d'attente pour les appels au plan de contrôle du serveur d'application.                                                                                                                                                                                                |
| `turnCompletionIdleTimeoutMs` | `60000`                                                       | Fenêtre de silence après que Codex a accepté un tour ou après une demande app-server limitée à un tour, pendant que OpenClaw attend `turn/completed`.                                                                                                                        |
| `mode`                        | `"yolo"` sauf si les exigences Codex locales interdisent YOLO | Préréglage pour l'exécution YOLO ou révisée par le gardien.                                                                                                                                                                                                                  |
| `approvalPolicy`              | `"never"` ou une stratégie d'approbation de gardien autorisée | Stratégie d'approbation Codex native envoyée au démarrage, à la reprise et au tour du fil de discussion.                                                                                                                                                                     |
| `sandbox`                     | `"danger-full-access"` ou un bac à sable de gardien autorisé  | Mode de bac à sable (sandbox) natif Codex envoyé au démarrage et à la reprise du fil de discussion. Les bacs à sable OpenClaw actifs limitent les tours `danger-full-access` à Codex `workspace-write` ; l'indicateur réseau du tour suit la sortie du bac à sable OpenClaw. |
| `approvalsReviewer`           | `"user"` ou un réviseur gardien autorisé                      | Utilisez `"auto_review"` pour laisser Codex réviser les invites d'approbation natives lorsque cela est autorisé.                                                                                                                                                             |
| `defaultWorkspaceDir`         | répertoire du processus actuel                                | Espace de travail utilisé par `/codex bind` lorsque `--cwd` est omis.                                                                                                                                                                                                        |
| `serviceTier`                 | non défini                                                    | Niveau de service optionnel du serveur d'application Codex. `"priority"` active le routage en mode rapide, `"flex"` demande un traitement flexible, et `null` efface la substitution. L'ancien `"fast"` est accepté comme `"priority"`.                                      |

Le plugin bloque les négociations (handshakes) avec le serveur d'application anciennes ou sans version. Le serveur d'application Codex
doit signaler la version stable `0.125.0` ou plus récente.

## Modes d'approbation et de bac à sable (sandbox)

Les sessions locales du serveur d'application stdio sont par défaut en mode YOLO :
`approvalPolicy: "never"`, `approvalsReviewer: "user"` et
`sandbox: "danger-full-access"`. Cette posture d'opérateur local de confiance permet aux tours
OpenClaw et aux battements de cœur non supervisés de progresser sans invites d'approbation
native auxquelles personne n'est là pour répondre.

Si le fichier des exigences système local de Codex interdit les valeurs implicites d'approbation,
de révision ou de bac à sable YOLO, OpenClaw traite la valeur implicite par défaut comme un gardien
à la place et sélectionne les autorisations de gardien autorisées. Les entrées `[[remote_sandbox_config]]`
correspondant au nom d'hôte dans le même fichier d'exigences sont respectées
pour la décision par défaut du bac à sable.

Définissez `appServer.mode: "guardian"` pour les approbations Codex examinées par le gardien :

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
valeur de réviseur `guardian_subagent` est toujours acceptée comme alias de compatibilité,
mais les nouvelles configurations doivent utiliser `auto_review`.

Lorsqu'un bac à sable OpenClaw est actif, le processus local du serveur d'application Codex
s'exécute toujours sur l'hôte Gateway. OpenClaw conserve donc le propre bac à sable
système de fichiers de Codex pour les tours en mode code natif. Les tours `danger-full-access` sont limités
au `workspace-write` de Codex, et le `networkAccess` de tour `workspace-write` est dérivé
du paramètre de sortie du bac à sable OpenClaw : Docker `network: "none"` reste
hors ligne, tandis que `network: "bridge"` ou un réseau Docker personnalisé autorise l'accès
sortant.

## Authentification et isolation de l'environnement

L'authentification est sélectionnée dans cet ordre :

1. Un profil d'authentification Codex OpenClaw explicite pour l'agent.
2. Le compte existant du serveur d'application dans le domicile Codex de cet agent.
3. Pour les lancements locaux du serveur d'application stdio uniquement, `CODEX_API_KEY`, puis
   `OPENAI_API_KEY`, lorsqu'aucun compte de serveur d'application n'est présent et que l'authentification OpenAI est
   toujours requise.

Lorsque OpenClaw détecte un profil d'authentification Codex de type abonnement ChatGPT, il supprime
`CODEX_API_KEY` et `OPENAI_API_KEY` du processus enfant Codex généré. Cela
garde les clés Gateway de niveau API disponibles pour les incorporations ou les modèles OpenAI directs
sans faire facturer par inadvertance les tours du serveur d'application Codex natifs via l'API.

Les profils de clé API Codex explicites et le repli de clé d'environnement stdio local utilisent la connexion app-server au lieu de l'environnement de processus enfant hérité. Les connexions WebSocket app-server ne reçoivent pas le repli de clé API Gateway de l'environnement ; utilisez un profil d'authentification explicite ou le propre compte de l'app-server distant.

Les lancements d'app-server stdio héritent de l'environnement de processus d'OpenClaw par défaut. OpenClaw possède le pont de compte app-server Codex et définit OpenClawOpenClaw`CODEX_HOME`OpenClawOpenClaw sur un répertoire par agent sous l'état OpenClaw de cet agent. Cela maintient la configuration Codex, les comptes, le cache/les données des plugins et l'état des threads limités à l'agent OpenClaw au lieu de fuir depuis le dossier personnel `~/.codex` de l'opérateur.

OpenClaw ne réécrit pas OpenClaw`HOME` pour les lancements normaux d'app-server locaux. Les sous-processus exécutés par Codex tels que `openclaw`, `gh`, `git`, les CLI cloud et les commandes shell voient le dossier de processus normal et peuvent trouver la configuration et les jetons du dossier personnel. Codex peut également découvrir `$HOME/.agents/skills` et `$HOME/.agents/plugins/marketplace.json` ; cette découverte `.agents` est intentionnellement partagée avec le dossier personnel de l'opérateur et est distincte de l'état `~/.codex` isolé.

Les plugins OpenClaw et les instantanés de compétences OpenClaw passent toujours par le propre registre de plugins et le chargeur de compétences d'OpenClaw. Les ressources Codex OpenClawOpenClawOpenClaw`~/.codex` personnelles ne le font pas. Si vous avez des compétences Codex CLIOpenClaw ou des plugins utiles d'un dossier Codex qui devraient faire partie d'un agent OpenClaw, inventoriez-les explicitement :

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

`appServer.clearEnv` n'affecte que le processus enfant app-server Codex généré.
OpenClaw supprime `CODEX_HOME` et `HOME` de cette liste lors de la normalisation
du lancement local : `CODEX_HOME` reste par agent, et `HOME` reste hérité pour que
les sous-processus puissent utiliser l'état normal du répertoire personnel de l'utilisateur.

## Outils dynamiques

Les outils dynamiques Codex utilisent par défaut le chargement `searchable`. OpenClaw n'expose pas
les outils dynamiques qui dupliquent les opérations d'espace de travail natives de Codex :

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

La plupart des outils d'intégration OpenClaw restants, tels que la messagerie, les médias, cron,
le navigateur, les nœuds, la passerelle, `heartbeat_respond` et `web_search`, sont disponibles
via la recherche d'outils Codex sous l'espace de noms `openclaw`. Cela permet de garder le contexte initial
du modèle plus petit. `sessions_yield` et les réponses source utilisant uniquement l'outil de message
restent directes car il s'agit de contrats de contrôle de tour. `sessions_spawn` reste
recherchable pour que le `spawn_agent` natif de Codex reste la surface principale du sous-agent Codex,
tandis que la délégation explicite à OpenClaw ou à l'ACP est toujours disponible via
l'espace de noms de l'outil dynamique `openclaw`.

Ne définissez `codexDynamicToolsLoading: "direct"` que lors de la connexion à un app-server Codex personnalisé
qui ne peut pas rechercher des outils dynamiques différés ou lors du débogage de la charge utile complète
de l'outil.

## Délais d'expiration

Les appels d'outils dynamiques détenus par OpenClaw sont bornés indépendamment de
`appServer.requestTimeoutMs`. Chaque requête Codex `item/tool/call` utilise le premier
délai d'expiration disponible dans cet ordre :

- Un argument `timeoutMs` positif par appel.
- Pour `image_generate`, `agents.defaults.imageGenerationModel.timeoutMs`.
- Pour l'outil `image` de compréhension des médias, `tools.media.image.timeoutSeconds`
  converti en millisecondes, ou la valeur par défaut de 60 secondes pour les médias.
- La valeur par défaut de 30 secondes pour l'outil dynamique.

Les budgets des outils dynamiques sont plafonnés à 600 000 ms. En cas d'expiration du délai, OpenClaw abandonne le signal de l'outil lorsque cela est pris en charge et renvoie une réponse d'outil dynamique échouée à Codex pour que le tour puisse continuer au lieu de laisser la session en `processing`.

Une fois que Codex a accepté un tour et après que OpenClaw a répondu à une demande de serveur d'application limitée au tour, le harnais s'attend à ce que Codex progresse dans le tour en cours et finisse éventuellement le tour natif avec `turn/completed`. Si le serveur d'application reste silencieux pendant `appServer.turnCompletionIdleTimeoutMs`, OpenClaw interrompt de manière optimale le tour Codex, enregistre un délai d'attente de diagnostic et libère le OpenClaw session lane afin que les messages de chat suivants ne soient pas mis en file d'attente derrière un tour natif périmé.

La plupart des notifications non terminales pour le même tour désactivent ce chien de garde court car Codex a prouvé que le tour est toujours actif. Les achèvements bruts `custom_tool_call_output` maintiennent le chien de garde court post-outil armé car ils constituent le transfert du résultat de l'outil limité au tour. Les éléments `agentMessage` terminés et les éléments bruts d'assistant pré-outil `rawResponseItem/completed` arment la libération de la sortie de l'assistant : si Codex se tait ensuite sans `turn/completed`, OpenClaw interrompt de manière optimale le tour natif et libère le voie de session. La progression brute de l'assistant post-outil continue d'attendre `turn/completed` ou le chien de garde terminal. Les diagnostics de délai d'attente incluent la dernière méthode de notification du serveur d'application et, pour les éléments de réponse brute de l'assistant, le type d'élément, le rôle, l'identifiant et un aperçu borné du texte de l'assistant.

## Découverte de modèle

Par défaut, le plugin Codex demande à l'application serveur les modèles disponibles. La disponibilité des modèles est gérée par l'application serveur Codex, la liste peut donc changer lorsqu'OpenClaw met à jour la version intégrée de `@openai/codex` ou lorsqu'un déploiement pointe `appServer.command` vers un binaire Codex différent. La disponibilité peut également être limitée au compte. Utilisez `/codex models` sur une passerelle en cours d'exécution pour voir le catalogue en direct pour ce harnais et ce compte.

Si la découverte échoue ou expire, OpenClaw utilise un catalogue de repli intégré pour :

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

Le harnais intégré actuel est `@openai/codex` `0.130.0`. Une sonde `model/list` contre cette application serveur intégrée a renvoyé :

| ID de modèle          | Par défaut | Masqué | Modalités d'entrée | Efforts de raisonnement          |
| --------------------- | ---------- | ------ | ------------------ | -------------------------------- |
| `gpt-5.5`             | Oui        | Non    | texte, image       | faible, moyen, élevé, très élevé |
| `gpt-5.4`             | Non        | Non    | texte, image       | faible, moyen, élevé, très élevé |
| `gpt-5.4-mini`        | Non        | Non    | texte, image       | faible, moyen, élevé, très élevé |
| `gpt-5.3-codex`       | Non        | Non    | texte, image       | faible, moyen, élevé, très élevé |
| `gpt-5.3-codex-spark` | Non        | Non    | texte              | faible, moyen, élevé, très élevé |
| `gpt-5.2`             | Non        | Non    | texte, image       | faible, moyen, élevé, très élevé |

Les modèles masqués peuvent être renvoyés par le catalogue de l'application serveur pour des flux internes ou spécialisés, mais ils ne sont pas des choix normaux du sélecteur de modèles.

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

Désactivez la découverte lorsque vous souhaitez que le démarrage évite de sonder Codex et n'utilise que le catalogue de repli :

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

Codex gère `AGENTS.md` lui-même via la découverte native de documents de projet. OpenClaw n'écrit pas de fichiers de documents de projet Codex synthétiques ni ne dépend des noms de fichiers de repli Codex pour les fichiers de persona, car les replis Codex ne s'appliquent que lorsque `AGENTS.md` est manquant.

Pour la parité de l'espace de travail OpenClaw, le harnais Codex résout les autres fichiers d'amorçage, y compris `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` et `MEMORY.md` lorsqu'ils sont présents, et les transmet via les instructions développeur Codex sur `thread/start` et `thread/resume`. Cela permet de garder le contexte de persona et de profil de l'espace de travail visible sur la voie native de façonnage du comportement Codex sans dupliquer `AGENTS.md`.

## Remplacements d'environnement

Les remplacements d'environnement restent disponibles pour les tests locaux :

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` contourne le binaire géré lorsque `appServer.command` n'est pas défini.

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` a été supprimé. Utilisez plutôt `plugins.entries.codex.config.appServer.mode: "guardian"`, ou `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` pour des tests locaux ponctuels. La configuration est préférée pour les déploiements répétables car elle conserve le comportement du plugin dans le même fichier examiné que le reste de la configuration du harnais Codex.

## Connexes

- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness runtime](/fr/plugins/codex-harness-runtime)
- [Native Codex plugins](/fr/plugins/codex-native-plugins)
- [Codex Computer Use](/fr/plugins/codex-computer-use)
- [OpenAI provider](/fr/providers/openai)
- [Configuration reference](/fr/gateway/configuration-reference)
