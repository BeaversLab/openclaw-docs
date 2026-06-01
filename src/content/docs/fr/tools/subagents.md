---
summary: "Lancer des exécutions d'agent isolées en arrière-plan qui annoncent leurs résultats au canal de discussion demandeur"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sous-agents"
sidebarTitle: "Sous-agents"
---

Les sous-agents sont des exécutions d'agent en arrière-plan générées à partir d'une exécution d'agent existante.
Ils s'exécutent dans leur propre session (`agent:<agentId>:subagent:<uuid>`) et,
lorsqu'ils sont terminés, **annoncent** leur résultat au canal de discussion
demandeur. Chaque exécution de sous-agent est suivie comme une
tâche d'arrière-plan (/en/automation/tasks).

Objectifs principaux :

- Paralléliser le travail de « recherche / tâche longue / tool lent » sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation de session + sandboxing optionnel).
- Rendre la surface du tool difficile à utiliser à mauvais escient : les sous-agents n'obtiennent **pas** les tools de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

<Note>
  **Note de coût :** par défaut, chaque sous-agent possède son propre contexte et sa propre utilisation de jetons. Pour les tâches lourdes ou répétitives, définissez un modèle moins coûteux pour les sous-agents et gardez votre agent principal sur un modèle de meilleure qualité. Configurez via `agents.defaults.subagents.model` ou des remplacements par agent. Lorsqu'un enfant a réellement besoin de
  la transcription actuelle du demandeur, l'agent peut demander `context: "fork"` pour cette génération. Les sessions de sous-agent liées aux fils par défaut à `context: "fork"` car elles bifurquent la conversation actuelle vers un fil de suite.
</Note>

## Commande slash

Utilisez `/subagents` pour inspecter les exécutions de sous-agents pour la **session actuelle** :

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` affiche les métadonnées d'exécution (statut, horodatages, id de session,
chemin de transcription, nettoyage). Utilisez `sessions_history` pour une vue de rappel bornée
et filtrée par sécurité ; inspectez le chemin de transcription sur le disque lorsque vous
avez besoin de la transcription brute complète.

### Contrôles de liaison de fil

Ces commandes fonctionnent sur les canaux qui prennent en charge les liaisons de fils persistantes.
Voir [Canaux prenant en charge les fils](#thread-supporting-channels) ci-dessous.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportement de lancement

Les agents démarrant des sous-agents en arrière-plan avec `sessions_spawn`. Les achèvements de sous-agents
retournent en tant qu'événements internes de session parente ; l'agent parent/demandeur décide
si une mise à jour visible par l'utilisateur est nécessaire.

<AccordionGroup>
  <Accordion title="Non-blocking, push-based completion">
    - `sessions_spawn` est non bloquant ; il renvoie un identifiant d'exécution immédiatement.
    - Une fois terminé, le sous-agent rapporte le résultat à la session parente/demanderesse.
    - Les tours d'agent qui nécessitent les résultats enfants doivent appeler `sessions_yield` après avoir lancé le travail requis. Cela termine le tour actuel et permet aux événements de finition d'arriver en tant que prochain message visible par le modèle.
    - La finition est basée sur le push (push-based). Une fois lancé, n'interrogez **pas** (poll) `/subagents list`, `sessions_list` ou `sessions_history`OpenClaw en boucle uniquement pour attendre qu'il se termine ; n'inspectez le statut que à la demande pour la visibilité du débogage.
    - La sortie enfant est un rapport/une preuve pour l'agent demandeur à synthétiser. Ce n'est pas du texte d'instruction rédigé par l'utilisateur et ne peut pas remplacer la politique système, développeur ou utilisateur.
    - Lors de la finition, OpenClaw fait de son mieux pour fermer les onglets/processus de navigateur suivis ouverts par cette session de sous-agent avant que le flux de nettoyage d'annonce ne se poursuive.

  </Accordion>
  <Accordion title="Completion delivery">
    - OpenClaw renvoie les complétions à la session demandeur via un tour `agent` avec une clé d'idempotence stable.
    - Si l'exécution du demandeur est toujours active, OpenClaw essaie d'abord de réveiller/guider cette exécution au lieu de démarrer un second chemin de réponse visible.
    - Si un demandeur actif ne peut pas être réveillé, OpenClaw revient à une transmission requester-agent avec le même contexte de complétion au lieu d'abandonner l'annonce.
    - Une transmission parent réussie complète la livraison du sous-agent même lorsque le parent décide qu'aucune mise à jour visible pour l'utilisateur n'est nécessaire.
    - Les sous-agents natifs n'obtiennent pas l'outil de message. Ils renvoient du texte d'assistant brut à l'agent parent/demandeur ; les réponses visibles pour l'homme sont gérées par la politique de livraison normale de l'agent parent/demandeur.
    - Si la transmission directe ne peut pas être utilisée, elle revient au routage de file d'attente.
    - Si le routage de file d'attente n'est toujours pas disponible, l'annonce est réessayée avec un court délai exponentiel avant l'abandon final.
    - La livraison des complétions conserve la route du demandeur résolue : les routes de complétion liées au fil de discussion ou à la conversation l'emportent si disponibles ; si l'origine de la complétion fournit uniquement un channel, OpenClaw remplit la cible/compte manquant à partir de la route résolue de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe fonctionne toujours.

  </Accordion>
  <Accordion title="Métadonnées de transfert de complétion">
    Le transfert de complétion vers la session du demandeur est un contexte interne généré à l'exécution
    (pas du texte rédigé par l'utilisateur) et comprend :

    - `Result` — le dernier texte de réponse `assistant` visible de l'enfant. La sortie des outils/toolResult n'est pas promue dans les résultats de l'enfant. Les exécutions échouées en phase terminale ne réutilisent pas le texte de réponse capturé.
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`.
    - Des statistiques compactes sur l'exécution/les jetons.
    - Une instruction de révision demandant à l'agent demandeur de vérifier le résultat avant de décider si la tâche d'origine est terminée.
    - Des directives de suivi indiquant à l'agent demandeur de continuer la tâche ou d'enregistrer une suite lorsque le résultat de l'enfant laisse davantage d'action.
    - Une instruction de mise à jour finale pour le chemin sans plus d'action, rédigée avec la voix normale de l'assistant sans transférer les métadonnées internes brutes.

  </Accordion>
  <Accordion title="Modes et runtime ACP">
    - `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
    - Utilisez `info`/`log` pour inspecter les détails et la sortie après l'achèvement.
    - Pour les sessions persistantes liées aux fils de discussion, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
    - Si le channel demandeur ne prend pas en charge les liaisons de fils de discussion, utilisez `mode: "run"` au lieu de réessayer des combinaisons impossibles liées aux fils de discussion.
    - Pour les sessions de harnais ACP (Claude Code, Gemini CLI, OpenCode, ou Codex ACP/acpx explicite), utilisez `sessions_spawn` avec `runtime: "acp"` lorsque le tool annonce ce runtime. Consultez le [modèle de livraison ACP](/fr/tools/acp-agents#delivery-model) lors du débogage des complétions ou des boucles agent-à-agent. Lorsque le plugin `codex` est activé, le contrôle de chat/fil de discussion Codex doit préférer `/codex ...` à ACP, sauf si l'utilisateur demande explicitement ACP/acpx.
    - OpenClaw masque `runtime: "acp"` jusqu'à ce que l'ACP soit activé, que le demandeur ne soit pas sandboxed et qu'un plugin backend tel que `acpx` soit chargé. `runtime: "acp"` attend un identifiant de harnais ACP externe, ou une entrée `agents.list[]` avec `runtime.type="acp"` ; utilisez le runtime de sous-agent par défaut pour les agents de configuration OpenClaw normaux de `agents_list`.

  </Accordion>
</AccordionGroup>

## Modes de contexte

Les sous-agents natifs démarrent isolés, sauf si l'appelant demande explicitement à forker la transcription actuelle.

| Mode       | Quand l'utiliser                                                                                                                                                | Comportement                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `isolated` | Recherche fraîche, implémentation indépendante, travail d'outil lent, ou tout ce qui peut être brièvement décrit dans le texte de la tâche                      | Crée une transcription enfant propre. C'est la valeur par défaut et permet de réduire l'utilisation des jetons. |
| `fork`     | Travail qui dépend de la conversation actuelle, des résultats d'outils précédents, ou d'instructions nuancées déjà présentes dans la transcription du demandeur | Branche la transcription du demandeur dans la session enfant avant le démarrage de l'enfant.                    |

Utilisez `fork` avec parcimonie. Il est destiné à la délégation sensible au contexte, et non comme un remplacement pour la rédaction d'une invite de tâche claire.

## Tool : `sessions_spawn`

Démarre une exécution de sous-agent avec `deliver: false` sur la voie `subagent` globale,
puis exécute une étape d'annonce et publie la réponse d'annonce sur le channel
de chat demandeur.

La disponibilité dépend de la stratégie d'outil effective de l'appelant. Les profils `coding` et `full` exposent `sessions_spawn` par défaut. Le profil `messaging` ne le fait pas ; ajoutez `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"` pour les agents qui doivent déléguer
le travail. Les stratégies d'autorisation/refus par canal/groupe, fournisseur, sandbox et par agent peuvent
toujours supprimer l'outil après l'étape du profil. Utilisez `/tools` depuis la même
session pour confirmer la liste effective des outils.

**Valeurs par défaut :**

- **Modèle :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.model` (ou `agents.list[].subagents.model` par agent) ; un `sessions_spawn.model` explicite l'emporte toujours.
- **Réflexion :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.thinking` (ou `agents.list[].subagents.thinking` par agent) ; un `sessions_spawn.thinking` explicite l'emporte toujours.
- **Délai d'exécution :** si `sessions_spawn.runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` lorsqu'il est défini ; sinon, il revient à `0` (aucun délai).
- **Livraison de la tâche :** les sous-agents natifs reçoivent la tâ déléguée dans leur premier message `[Subagent Task]` visible. Le prompt système du sous-agent contient les règles d'exécution et le contexte de routage, et non un doublon caché de la tâche.

### Mode d'invite de délégation

`agents.defaults.subagents.delegationMode` contrôle uniquement les conseils de prompt ; il ne modifie pas la stratégie d'outil ni n'applique la délégation.

- `suggest` (par défaut) : conserve l'encouragement standard du prompt à utiliser des sous-agents pour le travail plus important ou plus lent.
- `prefer` : indique à l'agent principal de rester réactif et de déléguer tout ce qui dépasse une réponse directe via `sessions_spawn`.

Les remplacements par agent utilisent `agents.list[].subagents.delegationMode`.

```json5
{
  agents: {
    defaults: {
      subagents: {
        delegationMode: "prefer",
        maxConcurrent: 4,
      },
    },
    list: [
      {
        id: "coordinator",
        subagents: { delegationMode: "prefer" },
      },
    ],
  },
}
```

### Paramètres de l'outil

<ParamField path="task" type="string" required>
  La description de la tâche pour le sous-agent.
</ParamField>
<ParamField path="taskName" type="string">
  Identifiant stable facultatif pour identifier un enfant spécifique dans la sortie d'état ultérieure. Doit correspondre à `[a-z][a-z0-9_-]{0,63}` et ne peut pas être des cibles réservées telles que `last` ou `all`.
</ParamField>
<ParamField path="label" type="string">
  Libellé lisible par l'homme facultatif.
</ParamField>
<ParamField path="agentId" type="string">
  Génère sous un autre identifiant d'agent configuré lorsque autorisé par `subagents.allowAgents`.
</ParamField>
<ParamField path="cwd" type="string">
  Répertoire de travail de tâche facultatif pour l'exécution de l'enfant. Les sous-agents natifs chargent toujours les fichiers d'amorçage depuis l'espace de travail de l'agent cible ; `cwd` ne modifie que l'endroit où les outils d'exécution et les harnais CLI effectuent le travail délégué.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` est uniquement pour les harnais ACP externes (`claude`, `droid`, `gemini`, `opencode`, ou Codex ACP/acpx explicitement demandé) et pour les entrées `agents.list[]` dont le `runtime.type` est `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  ACP uniquement. Reprend une session de harnais ACP existante lorsque `runtime: "acp"` ; ignoré pour les générations de sous-agents natifs.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  ACP uniquement. Diffuse la sortie d'exécution ACP vers la session parente lorsque `runtime: "acp"` ; omettre pour les générations de sous-agents natifs.
</ParamField>
<ParamField path="model" type="string">
  Remplace le modèle du sous-agent. Les valeurs invalides sont ignorées et le sous-agent s'exécute sur le modèle par défaut avec un avertissement dans le résultat de l'outil.
</ParamField>
<ParamField path="thinking" type="string">
  Remplace le niveau de réflexion pour l'exécution du sous-agent.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Par défaut à `agents.defaults.subagents.runTimeoutSeconds` lorsqu'il est défini, sinon `0`. Lorsqu'il est défini, l'exécution du sous-agent est interrompue après N secondes.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Lorsque `true`, demande la liaison de thread du channel pour cette session de sous-agent.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si `thread: true` et `mode` sont omis, la valeur par défaut devient `session`. `mode: "session"` nécessite `thread: true`.
  Si la liaison de thread n'est pas disponible pour le channel demandeur, utilisez `mode: "run"` à la place.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via renommage).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rejette la génération sauf si l'exécution de l'enfant cible est en bac à sable (sandboxed).
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` crée une branche de la transcription actuelle du demandeur dans la session enfant. Sous-agents natifs uniquement. Les générations liées à un thread ont par défaut la valeur `fork` ; les générations non liées à un thread ont par défaut la valeur `isolated`.
</ParamField>

<Warning>`sessions_spawn` n'accepte **pas** les paramètres de remise via channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Les sous-agents natifs renvoient leur dernier tour d'assistant au demandeur ; la livraison externe reste avec l'agent parent/demandeur.</Warning>

### Noms des tâches et ciblage

`taskName` est un identifiant d'orchestration pour le model, pas une clé de session.
Utilisez-le pour des noms d'enfants stables tels que `review_subagents`,
`linux_validation` ou `docs_update` lorsqu'un coordinateur pourrait avoir besoin d'inspecter
cet enfant plus tard.

La résolution de la cible accepte les correspondances exactes de `taskName` et les préfixes non ambigus.
La correspondance est limitée à la même fenêtre de cibles actives/récentes utilisée
par les cibles numérotées `/subagents`, de sorte qu'un enfant obsolète et terminé ne rende pas
un identifiant réutilisé ambigu. Si deux enfants actifs ou récents partagent le même
`taskName`, la cible est ambiguë ; utilisez plutôt l'index de la liste, la clé de session ou
l'identifiant d'exécution.

Les cibles réservées `last` et `all` ne sont pas des valeurs `taskName` valides
car elles ont déjà des significations de contrôle.

## Tool: `sessions_yield`

Met fin au tour actuel du modèle et attend que les événements d'exécution, principalement
les événements d'achèvement des sous-agents, arrivent en tant que prochain message. Utilisez-le après
avoir généré le travail enfant requis lorsque le demandeur ne peut pas fournir de réponse finale
avant l'arrivée de ces achèvements.

`sessions_yield` est la primitive d'attente. Ne le remplacez pas par des boucles
de polling sur `subagents`, `sessions_list`, `sessions_history`, le shell
`sleep` ou le polling de processus juste pour détecter l'achèvement de l'enfant.

N'utilisez `sessions_yield` que lorsque la liste effective des outils de la session l'inclut.
Certains profils d'outils minimaux ou personnalisés peuvent exposer `sessions_spawn` et
`subagents` sans exposer `sessions_yield` ; dans ce cas, n'inventez pas
une boucle de polling juste pour attendre l'achèvement.

Lorsque des enfants actifs existent, OpenClaw injecte un bloc de prompt `Active Subagents` compact généré à l'exécution dans les tours normaux afin que le demandeur puisse voir les sessions enfants actuelles, les identifiants d'exécution, les statuts, les étiquettes, les tâches et les alias `taskName` sans interroger. Les champs de tâche et d'étiquette dans ce bloc sont cités en tant que données, et non en tant qu'instructions, car ils peuvent provenir d'arguments de génération fournis par l'utilisateur/le modèle.

## Outil : `subagents`

Liste les exécutions de sous-agents générées appartenant à la session du demandeur. Elle est limitée
au demandeur actuel ; un enfant ne peut voir que ses propres enfants contrôlés.

Utilisez `subagents` pour le statut à la demande et le débogage. Utilisez `sessions_yield` pour
attendre les événements de finition.

## Sessions liées aux fils de discussion

Lorsque les liaisons de fils sont activées pour un canal, un sous-agent peut rester lié
à un fil de sorte que les messages de suivi de l'utilisateur dans ce fil continuent d'être acheminés vers la
même session de sous-agent.

### Canaux prenant en charge les fils de discussion

**Discord** est actuellement le seul channel pris en charge. Il prend en charge les sessions de sous-agent liées aux threads persistantes (`sessions_spawn` avec
`thread: true`), les contrôles manuels de thread (`/focus`, `/unfocus`, `/agents`,
`/session idle`, `/session max-age`) et les clés d'adaptateur
`channels.discord.threadBindings.enabled`,
`channels.discord.threadBindings.idleHours`,
`channels.discord.threadBindings.maxAgeHours` et
`channels.discord.threadBindings.spawnSessions`.

### Flux rapide

<Steps>
  <Step title="Spawn">`sessions_spawn` avec `thread: true` (et optionnellement `mode: "session"`).</Step>
  <Step title="Bind">OpenClaw crée ou lie un thread à cette cible de session dans le channel actif.</Step>
  <Step title="Route follow-ups">Les réponses et les messages de suivi dans ce thread sont acheminés vers la session liée.</Step>
  <Step title="Inspect timeouts">Utilisez `/session idle` pour inspecter/mettre à jour l'auto-désactivation par inactivité et `/session max-age` pour contrôler la limite stricte.</Step>
  <Step title="Detach">Utilisez `/unfocus` pour détacher manuellement.</Step>
</Steps>

### Contrôles manuels

| Commande           | Effet                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Lier le thread actuel (ou en créer un) à une cible de sous-agent/session                          |
| `/unfocus`         | Supprimer la liaison pour le thread lié actuel                                                    |
| `/agents`          | Lister les exécutions actives et l'état de liaison (`thread:<id>` ou `unbound`)                   |
| `/session idle`    | Inspecter/mettre à jour le défocus automatique par inactivité (threads liés focalisés uniquement) |
| `/session max-age` | Inspecter/mettre à jour la limite stricte (threads liés focalisés uniquement)                     |

### Commutateurs de configuration

- **Par défaut global :** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Les clés de **remplacement de channel et de liaison automatique au spawn (spawn auto-bind)** sont spécifiques à l'adaptateur. Voir [Thread supporting channels](#thread-supporting-channels) ci-dessus.

Voir [Configuration reference](/fr/gateway/configuration-reference) et
[Slash commands](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

### Liste d'autorisation

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Liste des ids d'agents configurés qui peuvent être ciblés via `agentId` explicite (`["*"]` autorise n'importe quelle cible configurée). Par défaut : uniquement l'agent demandeur. Si vous définissez une liste et que vous souhaitez toujours que le demandeur puisse se générer lui-même avec `agentId`, incluez l'id du demandeur dans la liste.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Liste d'autorisation (allowlist) d'agents cibles configurés par défaut, utilisée lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloque les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil). Remplacement par agent : `agents.list[].subagents.requireAgentId`.
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  Délai d'expiration par appel pour les tentatives de livraison d'annonces `agent` de la passerelle. Les valeurs sont des millisecondes entières positives et sont limitées au maximum de la minuterie sécurisée par la plateforme. Les nouvelles tentatives transitoires peuvent rendre l'attente d'annonce totale plus longue qu'un délai d'expiration configuré.
</ParamField>

Si la session du demandeur est sandboxed, `sessions_spawn` rejette les cibles
qui s'exécuteraient sans sandbox.

### Discovery

Utilisez `agents_list` pour voir quels ids d'agents sont actuellement autorisés pour
`sessions_spawn`. La réponse inclut le modèle effectif et les métadonnées d'exécution intégrées de chaque agent répertorié afin que les appelants puissent distinguer OpenClaw, le serveur d'application Codex
et autres runtimes natifs configurés.

Les entrées `allowAgents` doivent pointer vers des ids d'agents configurés dans `agents.list[]`.
`["*"]` signifie n'importe quel agent cible configuré plus le demandeur. Si une configuration d'agent
est supprimée mais que son id reste dans `allowAgents`, `sessions_spawn` rejette cet id
et `agents_list` l'omet. Exécutez `openclaw doctor --fix` pour nettoyer les entrées
de liste d'autorisation obsolètes, ou ajoutez une entrée `agents.list[]` minimale lorsque la cible doit
rester générable tout en héritant des valeurs par défaut.

### Archivage automatique

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut `60`).
- L'archive utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via renommage).
- L'archivage automatique est au mieux effort ; les minuteries en attente sont perdues si la passerelle redémarre.
- `runTimeoutSeconds` n'archive **pas** automatiquement ; il arrête simplement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.
- Le nettoyage du navigateur est distinct du nettoyage des archives : les onglets/processus de navigateur suivis sont fermés au mieux lorsque l'exécution se termine, même si l'enregistrement de la transcription/session est conservé.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas créer leurs propres sous-agents
(`maxSpawnDepth: 1`). Définissez `maxSpawnDepth: 2` pour activer un niveau
d'imbrication — le **modèle d'orchestrateur** : principal → sous-agent orchestrateur →
sous-sous-agents workers.

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
        announceTimeoutMs: 120000, // per-call gateway announce timeout
      },
    },
  },
}
```

### Niveaux de profondeur

| Profondeur | Forme de la clé de session                   | Rôle                                                             | Peut générer ?                    |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| 0          | `agent:<id>:main`                            | Agent principal                                                  | Toujours                          |
| 1          | `agent:<id>:subagent:<uuid>`                 | Sous-agent (orchestrateur lorsque la profondeur 2 est autorisée) | Seulement si `maxSpawnDepth >= 2` |
| 2          | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sous-sous-agent (travailleur feuille)                            | Jamais                            |

### Chaîne d'annonces

Les résultats remontent la chaîne :

1. Le travailleur de profondeur 2 se termine → annonce à son parent (orchestrateur de profondeur 1).
2. L'orchestrateur de profondeur 1 reçoit l'annonce, synthétise les résultats, se termine → annonce au principal.
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur.

Chaque niveau ne voit que les annonces de ses enfants directs.

<Note>
  **Directives opérationnelles :** lancez le travail enfant une fois et attendez les événements de finition au lieu de construire des boucles de polling autour de `sessions_list`, `sessions_history`, `/subagents list`, ou des commandes de sommeil `exec`. `sessions_list` et `/subagents list` gardent les relations de sessions enfants centrées sur le travail actif — les enfants actifs restent
  attachés, les enfants terminés restent visibles pendant une courte période récente, et les liens enfants périmés en stockage seul sont ignorés après leur fenêtre de fraîcheur. Cela empêche les anciennes métadonnées `spawnedBy` / `parentSessionKey` de ressusciter des enfants fantômes après redémarrage. Si un événement d'achèvement enfant arrive après que vous ayez déjà envoyé la réponse finale,
  le suivi correct est le jeton silencieux exact `NO_REPLY` / `no_reply`.
</Note>

### Stratégie d'outil par profondeur

- Le rôle et la portée de contrôle sont écrits dans les métadonnées de la session lors du lancement. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`) :** obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` pour pouvoir créer des enfants et inspecter leur statut. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`) :** aucun outil de session (comportement par défaut actuel).
- **Profondeur 2 (feuille worker) :** aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Impossible de générer d'autres enfants.

### Limite de lancement par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent`
(par défaut `5`) enfants actifs à la fois. Cela empêche une divergence incontrôlable
depuis un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants
de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.

## Authentification

L'authentification du sous-agent est résolue par **id d'agent**, et non par type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé depuis le `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours** ; les profils de l'agent remplacent les profils principaux en cas de conflit.

La fusion est additive, donc les profils principaux sont toujours disponibles en tant que secours. Une authentification totalement isolée par agent n'est pas encore prise en charge.

## Annonce

Les sous-agents rapportent via une étape d'annonce :

- L'étape d'annonce s'exécute dans la session du sous-agent (pas dans la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Si le dernier texte de l'assistant est le jeton silencieux exact `NO_REPLY` / `no_reply`, la sortie d'annonce est supprimée même s'il y a eu une progression visible antérieure.

La livraison dépend de la profondeur du demandeur :

- Les sessions de demandeur de niveau supérieur utilisent un appel `agent` de suivi avec livraison externe (`deliver=true`).
- Les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats des enfants en session.
- Si une session de sous-agent demandeur imbriquée a disparu, OpenClaw revient au demandeur de cette session si disponible.

Pour les sessions demandeur de premier niveau, la livraison directe en mode completion résout d'abord toute route de conversation/fil liée et substitution de hook, puis remplit les champs manquants de cible de channel à partir de la route stockée de la session du demandeur. Cela permet de garder les completions sur le bon chat/sujet même lorsque l'origine de la completion n'identifie que le channel.

L'agrégation des complétions enfants est limitée à l'exécution du demandeur actuelle lors de la construction des résultats de completion imbriqués, empêchant les sorties enfants périmées d'exécutions précédentes de fuir dans l'annonce actuelle. Les réponses d'annonce préservent le routage de fil/sujet lorsque disponible sur les adaptateurs de channel.

### Contexte de l'annonce

Le contexte de l'annonce est normalisé en un bloc d'événement interne stable :

| Champ               | Source                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Source              | `subagent` ou `cron`                                                                                                |
| IDs de session      | Clé/ID de session enfant                                                                                            |
| Type                | Type d'annonce + libellé de la tâche                                                                                |
| Statut              | Dérivé du résultat de l'exécution (`success`, `error`, `timeout`, ou `unknown`) — **pas** déduit du texte du modèle |
| Contenu du résultat | Dernier texte visible de l'assistant issu de l'enfant                                                               |
| Suivi               | Instruction décrivant quand répondre versus rester silencieux                                                       |

Les exécutions ayant échoué de manière terminale rapportent le statut d'échec sans rejouer le texte de réponse capturé. La sortie d'outil/toolResult n'est pas promue dans le texte du résultat enfant.

### Ligne de statistiques

Les charges utiles d'annonce incluent une ligne de statistiques à la fin (même lorsqu'elles sont encapsulées) :

- Runtime (par ex. `runtime 5m12s`).
- Utilisation des jetons (entrée/sortie/total).
- Coût estimé lorsque la tarification du modèle est configurée (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId`, et le chemin de la transcription afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque.

Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses destinées à l'utilisateur
doivent être réécrites avec la voix normale de l'assistant.

### Pourquoi préférer `sessions_history`

`sessions_history` est le chemin d'orchestration le plus sûr :

- La récupération de l'assistant est d'abord normalisée : balises de réflexion supprimées ; échafaudage `<relevant-memories>` / `<relevant_memories>` supprimé ; blocs de payload XML d'appel d'outil en texte brut (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`) supprimés, y compris les payload tronqués qui ne se ferment jamais proprement ; échafaudage d'appel/résultat d'outil rétrogradé et marqueurs de contexte historique supprimés ; jetons de contrôle de modèle fuyants (`<|assistant|>`, autres `<|...|>` ASCII, `<｜...｜>` pleine chasse) supprimés ; XML d'appel d'outil MiniMax malformé supprimé.
- Le texte ressemblant à des informations d'identification/jetons est masqué.
- Les longs blocs peuvent être tronqués.
- Les historiques très volumineux peuvent supprimer les anciennes lignes ou remplacer une ligne trop grande par `[sessions_history omitted: message too large]`.
- L'inspection brute de la transcription sur disque est la solution de repli lorsque vous avez besoin de la transcription complète octet par octet.

## Stratégie d'outil

Les sous-agents utilisent d'abord le même profil et pipeline de stratégie d'outil que l'agent parent ou
cible. Ensuite, OpenClaw applique la couche de restriction des sous-agents.

Sans `tools.profile` restrictif, les sous-agents obtiennent **tous les outils à l'exception de
l'outil de message, des outils de session et des outils système** :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` reste également ici une vue de récupération limitée et nettoyée — ce
n'est pas une vidange brute de transcription.

Lorsque `maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent également
`sessions_spawn`, `subagents`, `sessions_list` et
`sessions_history` afin qu'ils puissent gérer leurs enfants.

### Remplacement via la configuration

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

`tools.subagents.tools.allow` est un filtre d'autorisation final. Il peut réduire
l'ensemble d'outils déjà résolu, mais il ne peut pas **rétablir** un outil supprimé
par `tools.profile`. Par exemple, `tools.profile: "coding"` inclut
`web_search`/`web_fetch` mais pas l'outil `browser`. Pour permettre
aux sous-agents de profil de codage d'utiliser l'automatisation du navigateur, ajoutez le navigateur au
niveau du profil :

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Utilisez `agents.list[].tools.alsoAllow: ["browser"]` par agent lorsque seul un
agent doit disposer de l'automatisation du navigateur.

## Accès concurrent

Les sous-agents utilisent une file d'attente dédiée en cours de traitement :

- **Nom de voie :** `subagent`
- **Simultanéité :** `agents.defaults.subagents.maxConcurrent` (défaut `8`)

## Disponibilité et récupération

OpenClaw ne traite pas l'absence de `endedAt` comme une preuve permanente qu'un sous-agent est toujours actif. Les exécutions non terminées plus anciennes que la fenêtre d'exécution périmée cessent d'être comptées comme actives/en attente dans `/subagents list`, les résumés de statut, le blocage de l'achèvement des descendants et les vérifications de concurrence par session.

Après un redémarrage de la passerelle, les exécutions restaurées non terminées et périmées sont supprimées, sauf si leur session enfant est marquée `abortedLastRun: true`. Ces sessions enfants abandonnées par redémarrage restent récupérables via le flux de récupération des orphelins de sous-agent, qui envoie un message de reprise synthétique avant d'effacer le marqueur d'abandon.

La récupération automatique au redémarrage est limitée par session enfant. Si le même enfant de sous-agent est accepté pour la récupération d'orphelin à plusieurs reprises dans la fenêtre de réinsertion rapide, OpenClaw persiste une pierre tombale de récupération sur cette session et cesse de la reprendre automatiquement lors des redémarrages ultérieurs. Exécutez `openclaw tasks maintenance --apply` pour réconcilier l'enregistrement de la tâche, ou `openclaw doctor --fix` pour effacer les drapeaux de récupération abandonnés périmés sur les sessions avec pierre tombale.

<Note>
  Si un lancement de sous-agent échoue avec Gateway `PAIRING_REQUIRED` / `scope-upgrade`, vérifiez l'appelant RPC avant de modifier l'état de jumelage. La coordination interne `sessions_spawn` doit se connecter en tant que `client.id: "gateway-client"` avec `client.mode: "backend"` via une authentification directe par boucle locale avec jeton/mot de passe partagé ; ce chemin ne dépend pas de la
  ligne de base de l'étendue des appareils jumelés du CLI. Les appelants distants, `deviceIdentity` explicites, les chemins explicites par jeton d'appareil et les clients navigateur/node ont toujours besoin d'une approbation d'appareil normale pour les mises à niveau d'étendue.
</Note>

## Arrêt

- L'envoi de `/stop` dans le chat demandeur abandonne la session demandeur et arrête toutes les exécutions de sous-agent actives lancées à partir de celle-ci, en cascade vers les enfants imbriqués.

## Limitations

- L'annonce du sous-agent est **best-effort** (au mieux effort). Si la passerelle redémarre, le travail d'« annonce en retour » en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md` et `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `HEARTBEAT.md`, ou `BOOTSTRAP.md`). Les sous-agents natifs Codex suivent la même limite : `TOOLS.md` reste dans les instructions de fil de discussion Codex héritées, tandis que les fichiers de persona, d'identité et d'utilisateur propres au parent sont injectés en tant qu'instructions de collaboration limitées au tour, afin que les enfants ne les clonent pas.
- La profondeur d'imbrication maximale est de 5 (`maxSpawnDepth` plage : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'utilisation.
- `maxChildrenPerAgent` plafonne le nombre d'enfants actifs par session (par défaut `5`, plage `1–20`).

## Connexes

- [Agents ACP](/fr/tools/acp-agents)
- [Envoyer par l'agent](/fr/tools/agent-send)
- [Tâches d'arrière-plan](/fr/automation/tasks)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
