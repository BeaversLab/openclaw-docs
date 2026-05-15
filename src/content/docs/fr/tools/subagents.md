---
summary: "Lancer des exécutions d'agent isolées en arrière-plan qui annoncent leurs résultats au canal de discussion demandeur"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sous-agents"
sidebarTitle: "Sous-agents"
---

Les sous-agents sont des exécutions d'agent en arrière-plan lancées à partir d'une exécution d'agent existante.
Ils s'exécutent dans leur propre session (`agent:<agentId>:subagent:<uuid>`) et,
lorsqu'ils ont terminé, **annoncent** leur résultat au canal de discussion
demandeur. Chaque exécution de sous-agent est suivie comme une
[tâche d'arrière-plan](/fr/automation/tasks).

Objectifs principaux :

- Paralléliser le travail de « recherche / tâche longue / tool lent » sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation de session + sandboxing optionnel).
- Rendre la surface du tool difficile à utiliser à mauvais escient : les sous-agents n'obtiennent **pas** les tools de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

<Note>
  **Note de coût :** chaque sous-agent possède son propre contexte et sa propre utilisation de tokens par défaut. Pour les tâches lourdes ou répétitives, configurez un modèle moins coûteux pour les sous-agents et gardez votre agent principal sur un modèle de meilleure qualité. Configurez via `agents.defaults.subagents.model` ou des redéfinitions par agent. Lorsqu'un enfant a véritablement besoin
  de la transcription actuelle du demandeur, l'agent peut demander `context: "fork"` pour ce lancement. Les sessions de sous-agents liées aux fils (thread-bound) sont réglées par défaut sur `context: "fork"` car elles créent une branche de la conversation actuelle dans un fil de suivi.
</Note>

## Commande slash

Utilisez `/subagents` pour inspecter ou contrôler les exécutions de sous-agents pour la **session
courante** :

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

Utilisez le [`/steer <message>`](/fr/tools/steer) de premier niveau pour diriger l'exécution active de la session du demandeur actuelle. Utilisez `/subagents steer <id|#> <message>` lorsque la cible est une exécution enfant.

`/subagents info` affiche les métadonnées de l'exécution (statut, horodatages, id de session,
chemin de la transcription, nettoyage). Utilisez `sessions_history` pour une vue de rappel
délimitée et filtrée par sécurité ; inspectez le chemin de la transcription sur le disque lorsque vous
avez besoin de la transcription complète brute.

### Contrôles de liaison de fil

Ces commandes fonctionnent sur les canaux qui prennent en charge les liaisons de fil persistantes.
Voir [Canaux prenant en charge les fils](#thread-supporting-channels) ci-dessous.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportement de lancement

`/subagents spawn` démarre un sous-agent en arrière-plan en tant que commande utilisateur (non
un relais interne) et envoie une mise à jour finale d'achèvement au
canal de discussion demandeur lorsque l'exécution est terminée.

<AccordionGroup>
  <Accordion title="Non-blocking, push-based completion">
    - La commande de lancement (spawn) est non bloquante ; elle renvoie immédiatement un identifiant d'exécution.
    - Une fois terminé, le sous-agent annonce un message récapitulatif/le résultat au canal de chat demandeur.
    - Les tours d'agent qui nécessitent les résultats enfants doivent appeler `sessions_yield` après avoir lancé le travail requis. Cela termine le tour actuel et permet aux événements de complétion d'arriver en tant que prochain message visible par le modèle.
    - La complétion est basée sur le push (poussée). Une fois lancé, n'interrogez **pas** `/subagents list`, `sessions_list` ou `sessions_history` en boucle juste pour attendre qu'il se termine ; n'inspectez le statut que à la demande pour le débogage ou l'intervention.
    - La sortie enfant est un rapport/une preuve pour que l'agent demandeur puisse le synthétiser. Ce n'est pas un texte d'instruction rédigé par l'utilisateur et il ne peut pas remplacer la politique système, développeur ou utilisateur.
    - À la fin, OpenClaw fait de son mieux pour fermer les onglets/processus de navigateur suivis ouverts par cette session de sous-agent avant que le flux de nettoyage de l'annonce ne se poursuive.

  </Accordion>
  <Accordion title="Résilience de la livraison pour le spawn manuel"OpenClaw>
    - OpenClaw renvoie les complétions à la session demandeur via un tour `agent`OpenClawOpenClawOpenClaw avec une clé d'idempotence stable.
    - Si l'exécution demandeur est toujours active, OpenClaw essaie d'abord de réveiller/guider cette exécution au lieu de démarrer un second chemin de réponse visible.
    - Si le transfert de complétion à l'agent demandeur échoue ou ne produit aucune sortie visible, OpenClaw considère la livraison comme échouée et revient au routage/réessai en file d'attente. Il n'envoie pas directement le résultat enfant au chat externe.
    - Si le transfert direct ne peut pas être utilisé, il revient au routage en file d'attente.
    - Si le routage en file d'attente n'est toujours pas disponible, l'annonce est réessayée avec un court délai exponentiel avant l'abandon final.
    - La livraison de la complétion conserve la route demandeur résolue : les routes de complétion liées au fil ou à la conversation l'emportent si disponibles ; si l'origine de la complétion ne fournit qu'un channel, OpenClaw renseigne la cible/compte manquant à partir de la route résolue de la session demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe fonctionne toujours.

  </Accordion>
  <Accordion title="Métadonnées du transfert de complétion">
    Le transfert de complétion vers la session demandeur est un contexte interne généré à l'exécution
    (pas un texte rédigé par l'utilisateur) et inclut :

    - `Result` — dernier texte de réponse `assistant` visible, sinon le dernier texte tool/toolResult nettoyé. Les exécutions échouées terminales ne réutilisent pas le texte de réponse capturé.
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`.
    - Statistiques compactes d'exécution/jetons.
    - Une instruction de livraison demandant à l'agent demandeur de réécrire avec la voix normale de l'assistant (ne pas transmettre les métadonnées internes brutes).

  </Accordion>
  <Accordion title="Modes et runtime ACP">
    - `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
    - Utilisez `info`/`log` pour inspecter les détails et la sortie après l'achèvement.
    - `/subagents spawn` est le mode ponctuel (`mode: "run"`). Pour les sessions persistantes liées aux fils de discussion, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
    - Pour les sessions de harnais ACP (Claude Code, Gemini CLI, OpenCode, ou Codex ACP/acpx explicite), utilisez `sessions_spawn` avec `runtime: "acp"` lorsque l'outil annonce ce runtime. Consultez le [modèle de livraison ACP](/fr/tools/acp-agents#delivery-model) lors du débogage des complétions ou des boucles agent-à-agent. Lorsque le plugin `codex` est activé, le contrôle de discussion/fil de Codex doit préférer `/codex ...` à ACP, sauf si l'utilisateur demande explicitement ACP/acpx.
    - OpenClaw masque `runtime: "acp"` jusqu'à ce que l'ACP soit activé, que le demandeur ne soit pas sandboxé et qu'un plugin backend tel que `acpx` soit chargé. `runtime: "acp"` attend un identifiant de harnais ACP externe, ou une entrée `agents.list[]` avec `runtime.type="acp"` ; utilisez le runtime de sous-agent par défaut pour les agents de configuration OpenClaw normaux à partir de `agents_list`.

  </Accordion>
</AccordionGroup>

## Modes de contexte

Les sous-agents natifs démarrent de manière isolée, sauf si l'appelant demande explicitement à bifurquer la transcription actuelle.

| Mode       | Quand l'utiliser                                                                                                                                               | Comportement                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `isolated` | Nouvelle recherche, implémentation indépendante, travail d'outil lent, ou tout ce qui peut être briefé dans le texte de la tâche                               | Crée une transcription enfant propre. C'est la valeur par défaut et permet de réduire l'utilisation des jetons. |
| `fork`     | Travail dépendant de la conversation actuelle, des résultats d'outils précédents, ou d'instructions nuancées déjà présentes dans la transcription du demandeur | Branche la transcription du demandeur dans la session enfant avant le démarrage de l'enfant.                    |

Utilisez `fork` avec parcimonie. Il est destiné à la délégation sensible au contexte, et non comme un remplacement à la rédaction d'une invite de tâche claire.

## Tool : `sessions_spawn`

Lance une exécution de sous-agent avec `deliver: false` sur la voie globale `subagent`, puis exécute une étape d'annonce et publie la réponse d'annonce dans le channel de chat demandeur.

La disponibilité dépend de la stratégie d'outil effective de l'appelant. Les profils `coding` et `full` exposent `sessions_spawn` par défaut. Le profil `messaging` ne le fait pas ; ajoutez `tools.alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"]` or use `tools.profile: "coding"` pour les agents qui doivent déléguer du travail. Les stratégies allow/deny de channel/groupe, provider, bac à sable et par agent peuvent toujours supprimer l'outil après l'étape du profil. Utilisez `/tools` depuis la même session pour confirmer la liste effective des outils.

**Valeurs par défaut :**

- **Modèle :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.model` (ou `agents.list[].subagents.model` par agent) ; un `sessions_spawn.model` explicite l'emporte toujours.
- **Réflexion :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.thinking` (ou `agents.list[].subagents.thinking` par agent) ; un `sessions_spawn.thinking` explicite l'emporte toujours.
- **Délai d'exécution :** si `sessions_spawn.runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` si défini ; sinon, il revient à `0` (pas de délai).

### Mode d'invite de délégation

`agents.defaults.subagents.delegationMode` contrôle uniquement les conseils d'invite ; il ne modifie pas la stratégie d'outil et n'applique pas la délégation.

- `suggest` (par défaut) : conserver l'incitation standard de l'invite à utiliser des sous-agents pour des tâches plus importantes ou plus lentes.
- `prefer` : indiquer à l'agent principal de rester réactif et de déléguer tout ce qui dépasse une réponse directe via `sessions_spawn`.

Les substitutions par agent utilisent `agents.list[].subagents.delegationMode`.

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
  Identifiant stable optionnel pour un ciblage `subagents` ultérieur. Doit correspondre à `[a-z][a-z0-9_]{0,63}` et ne peut pas être des cibles réservées telles que `last` ou `all`. À privilégier lorsque le coordinateur peut avoir besoin de diriger, d'arrêter ou d'identifier un enfant spécifique après en avoir créé plusieurs.
</ParamField>
<ParamField path="label" type="string">
  Libellé lisible par un humain optionnel.
</ParamField>
<ParamField path="agentId" type="string">
  Crée sous un autre identifiant d'agent lorsque `subagents.allowAgents` l'autorise.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` est uniquement destiné aux harnais ACP externes (`claude`, `droid`, `gemini`, `opencode`, ou Codex ACP/acpx demandé explicitement) et pour les entrées `agents.list[]` dont le `runtime.type` est `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  ACP uniquement. Reprend une session de harnais ACP existante lorsque `runtime: "acp"`; ignoré pour les créations de sous-agents natifs.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  ACP uniquement. Transmet la sortie de l'exécution ACP vers la session parente lorsque `runtime: "acp"`; à omettre pour les créations de sous-agents natifs.
</ParamField>
<ParamField path="model" type="string">
  Remplace le model du sous-agent. Les valeurs invalides sont ignorées et le sous-agent s'exécute sur le model par défaut avec un avertissement dans le résultat de l'outil.
</ParamField>
<ParamField path="thinking" type="string">
  Remplace le niveau de réflexion pour l'exécution du sous-agent.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Par défaut à `agents.defaults.subagents.runTimeoutSeconds` si défini, sinon `0`. Lorsqu'il est défini, l'exécution du sous-agent est abandonnée après N secondes.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Lorsque `true`, demande la liaison de thread de channel pour cette session de sous-agent.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si `thread: true` et `mode` sont omis, la valeur par défaut devient `session`. `mode: "session"` nécessite `thread: true`.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via un renommage).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rejette la création sauf si le runtime de l'enfant cible est sandboxed.
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` crée une branche de la transcription actuelle du demandeur dans la session enfant. Sous-agents natifs uniquement. Les créations liées à un thread sont par défaut `fork`; les créations sans thread sont par défaut `isolated`.
</ParamField>

<Warning>`sessions_spawn` n'accepte **pas** les paramètres de diffusion sur le channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Pour la diffusion, utilisez `message`/`sessions_send` à partir de l'exécution générée.</Warning>

### Noms des tâches et ciblage

`taskName` est un identifiant d'orchestration orienté modèle, et non une clé de session.
Utilisez-le pour les noms d'enfants stables tels que `review_subagents`,
`linux_validation` ou `docs_update` lorsqu'un coordinateur peut avoir besoin de diriger
ou d'arrêter cet enfant ultérieurement.

La résolution de la cible accepte les correspondances exactes de `taskName` et les préfixes
non ambigus. La correspondance est limitée à la même fenêtre de cibles actives/récentes utilisée
par les cibles numérotées `/subagents`, de sorte qu'un enfant terminé obsolète ne rende
pas un identifiant réutilisé ambigu. Si deux enfants actifs ou récents partagent le même
`taskName`, la cible est ambiguë ; utilisez plutôt l'index de la liste, la clé de session ou
l'ID d'exécution.

Les cibles réservées `last` et `all` ne sont pas des valeurs `taskName` valides
car elles ont déjà des significations de contrôle.

## Outil : `sessions_yield`

Met fin au tour actuel du modèle et attend que les événements d'exécution, principalement
les événements d'achèvement des sous-agents, arrivent en tant que prochain message. Utilisez-le après
avoir généré le travail enfant requis lorsque le demandeur ne peut pas fournir de réponse finale
avant l'arrivée de ces achèvements.

`sessions_yield` est la primitive d'attente. Ne le remplacez pas par des boucles de sondage
sur `subagents`, `sessions_list`, `sessions_history`, le `sleep` du shell
ou le sondage de processus simplement pour détecter l'achèvement de l'enfant.

N'utilisez `sessions_yield` que lorsque la liste effective des outils de la session l'inclut.
Certains profils d'outils minimaux ou personnalisés peuvent exposer `sessions_spawn` et
`subagents` sans exposer `sessions_yield` ; dans ce cas, n'inventez
pas une boucle de sondage uniquement pour attendre la fin.

Lorsque des enfants actifs existent, OpenClaw injecte un bloc d'invite `Active Subagents` compact et généré à l'exécution
dans les tours normaux afin que le demandeur puisse voir les sessions enfants actuelles,
les ID d'exécution, les statuts, les étiquettes, les tâches et les alias `taskName` sans sondage.
Les champs de tâche et d'étiquette dans ce bloc sont cités en tant que données, et non en tant qu'instructions,
car ils peuvent provenir d'arguments de génération fournis par l'utilisateur/le modèle.

## Outil : `subagents`

Liste, dirige ou tue les exécutions de sous-agents générées appartenant à la session
du demandeur. Il est limité au demandeur actuel ; un enfant ne peut
que voir/contrôler ses propres enfants contrôlés.

Utilisez `subagents` pour le statut à la demande, le débogage, la direction ou la mise à mort.
Utilisez `sessions_yield` pour attendre les événements de finition.

## Sessions liées aux fils de discussion

Lorsque les liaisons de fils sont activées pour un canal, un sous-agent peut rester lié
à un fil de sorte que les messages de suivi de l'utilisateur dans ce fil continuent d'être acheminés vers la
même session de sous-agent.

### Canaux prenant en charge les fils de discussion

**Discord** est actuellement le seul canal pris en charge. Il prend en charge
les sessions persistantes de sous-agents liées aux fils (`sessions_spawn` avec
`thread: true`), les contrôles manuels des fils (`/focus`, `/unfocus`, `/agents`,
`/session idle`, `/session max-age`) et les clés d'adaptateur
`channels.discord.threadBindings.enabled`,
`channels.discord.threadBindings.idleHours`,
`channels.discord.threadBindings.maxAgeHours` et
`channels.discord.threadBindings.spawnSessions`.

### Flux rapide

<Steps>
  <Step title="Générer">`sessions_spawn` avec `thread: true` (et facultativement `mode: "session"`).</Step>
  <Step title="Bind" OpenClaw>
    OpenClaw crée ou lie un thread à cette cible de session dans le channel actif.
  </Step>
  <Step title="Route follow-ups">Les réponses et les messages de suivi dans ce thread sont acheminés vers la session liée.</Step>
  <Step title="Inspect timeouts">Utilisez `/session idle` pour inspecter/mettre à jour le défocus automatique par inactivité et `/session max-age` pour contrôler la limite stricte.</Step>
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
- **Les clés de substitution de channel et de liaison automatique lors du spawn** sont spécifiques à l'adaptateur. Voir [Canaux prenant en charge les threads](#thread-supporting-channels) ci-dessus.

Voir [Référence de configuration](/fr/gateway/configuration-reference) et
[Commandes slash](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

### Liste d'autorisation

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Liste des IDs d'agents pouvant être ciblés via `agentId` explicite (`["*"]` autorise n'importe lequel). Par défaut : uniquement l'agent demandeur. Si vous définissez une liste et souhaitez toujours que le demandeur puisse se lancer lui-même avec `agentId`, incluez l'ID du demandeur dans la liste.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Liste blanche d'agents cibles par défaut utilisée lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloquer les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil). Remplacement par agent : `agents.list[].subagents.requireAgentId`.
</ParamField>

Si la session du demandeur est isolée (sandboxed), `sessions_spawn` rejette les cibles
qui s'exécuteraient sans isolation.

### Discovery

Utilisez `agents_list` pour voir quels IDs d'agent sont actuellement autorisés pour
`sessions_spawn`. La réponse inclut le modèle effectif de chaque agent listé et les métadonnées d'exécution intégrées afin que les appelants puissent distinguer PI, le serveur d'application Codex
et autres runtimes natifs configurés.

### Archivage automatique

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut `60`).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via le renommage).
- L'archivage automatique est au mieux effort ; les minuteurs en attente sont perdus si la passerelle redémarre.
- `runTimeoutSeconds` n'effectue **pas** l'archivage automatique ; il arrête seulement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.
- Le nettoyage du navigateur est distinct du nettoyage de l'archive : les onglets/processus de navigateur suivis sont fermés au mieux lorsque l'exécution se termine, même si l'enregistrement de la transcription/session est conservé.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas générer leurs propres sous-agents
(`maxSpawnDepth: 1`). Définissez `maxSpawnDepth: 2` pour activer un niveau
d'imbrication — le **modèle d'orchestrateur** : principal → sous-agent orchestrateur →
sous-sous-agents ouvriers.

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
      },
    },
  },
}
```

### Niveaux de profondeur

| Profondeur | Forme de la clé de session                   | Rôle                                                        | Peut générer ?                    |
| ---------- | -------------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| 0          | `agent:<id>:main`                            | Agent principal                                             | Toujours                          |
| 1          | `agent:<id>:subagent:<uuid>`                 | Sous-agent (orchestrateur si la profondeur 2 est autorisée) | Seulement si `maxSpawnDepth >= 2` |
| 2          | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sous-sous-agent (ouvrier feuille)                           | Jamais                            |

### Chaîne d'annonce

Les résultats remontent la chaîne :

1. L'ouvrier de profondeur 2 se termine → annonce à son parent (orchestrateur de profondeur 1).
2. L'orchestrateur de profondeur 1 reçoit l'annonce, synthétise les résultats, se termine → annonce au principal.
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur.

Chaque niveau ne voit les annonces que de ses enfants directs.

<Note>
  **Directives opérationnelles :** lancez le travail enfant une fois et attendez les événements de finition au lieu de créer des boucles d'interrogation autour des commandes de sommeil `sessions_list`, `sessions_history`, `/subagents list`, ou `exec`. `sessions_list` et `/subagents list` maintiennent les relations de session enfant concentrées sur le travail en direct — les enfants actifs restent
  attachés, les enfants terminés restent visibles pendant une courte fenêtre récente, et les liens enfants périmés en lecture seule sont ignorés après leur fenêtre de fraîcheur. Cela empêche les anciennes métadonnées `spawnedBy` / `parentSessionKey` de ressusciter des enfants fantômes après un redémarrage. Si un événement de finition enfant arrive après que vous ayez déjà envoyé la réponse finale,
  le suivi correct est le jeton silencieux exact `NO_REPLY` / `no_reply`.
</Note>

### Stratégie d'outil par profondeur

- Le rôle et la portée de contrôle sont écrits dans les métadonnées de session au moment de la génération. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`) :** obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` afin qu'il puisse gérer ses enfants. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`) :** aucun outil de session (comportement actuel par défaut).
- **Profondeur 2 (nœud worker feuille) :** aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Ne peut pas générer d'enfants supplémentaires.

### Limite de génération par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent`
(défaut `5`) enfants actifs à la fois. Cela empêche une divergence incontrôlable
de la part d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants
de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.
- `/subagents kill all` arrête tous les sous-agents pour le demandeur et se propage.

## Authentification

L'authentification du sous-agent est résolue par **l'ID de l'agent**, et non par le type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir du `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours (fallback)** ; les profils de l'agent prévalent sur les profils principaux en cas de conflit.

La fusion est additive, donc les profils principaux sont toujours disponibles comme
secours. Une authentification totalement isolée par agent n'est pas encore prise en charge.

## Annonce

Les sous-agents font rapport via une étape d'annonce :

- L'étape d'annonce s'exécute à l'intérieur de la session du sous-agent (pas la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Si le dernier texte de l'assistant est le jeton silencieux exact `NO_REPLY` / `no_reply`, la sortie de l'annonce est supprimée même s'il y avait une progression visible antérieure.

La livraison dépend de la profondeur du demandeur :

- Les sessions de demandeur de premier niveau utilisent un appel `agent` de suivi avec livraison externe (`deliver=true`).
- Les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session.
- Si une session de sous-agent demandeur imbriquée a disparu, OpenClaw revient au demandeur de cette session lorsque cela est possible.

Pour les sessions demandeur de premier niveau, la livraison directe en mode achèvement résout d'abord toute route de conversation/thread liée et le remplacement de hook, puis remplit les champs manquants de la cible du channel à partir de la route stockée de la session du demandeur. Cela permet de garder les achèvements sur le bon channel/sujet même lorsque l'origine de l'achèvement n'identifie que le channel.

L'agrégation des achèvements enfants est limitée à l'exécution du demandeur actuel lors de la construction des résultats d'achèvement imbriqués, empêchant les sorties enfants périmées d'exécutions précédentes de fuir dans l'annonce actuelle. Les réponses d'annonce préservent le routage thread/sujet lorsque cela est disponible sur les adaptateurs de channel.

### Contexte d'annonce

Le contexte d'annonce est normalisé en un bloc d'événement interne stable :

| Champ               | Source                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Source              | `subagent` ou `cron`                                                                                               |
| IDs de session      | Clé/ID de session enfant                                                                                           |
| Type                | Type d'annonce + étiquette de tâche                                                                                |
| Statut              | Dérivé du résultat de l'exécution (`success`, `error`, `timeout`, ou `unknown`) — **non** déduit du texte du model |
| Contenu du résultat | Dernier texte visible de l'assistant, sinon dernier texte nettoyé de tool/toolResult                               |
| Suivi               | Instruction décrivant quand répondre vs rester silencieux                                                          |

Les exécutions échouées terminales signalent l'état d'échec sans rejouer le texte de réponse capturé. En cas de timeout, si l'enfant n'a effectué que des appels de tool, l'annonce peut réduire cet historique en un bref résumé de progrès partiel au lieu de rejouer la sortie brute du tool.

### Ligne de statistiques

Les payloads d'annonce incluent une ligne de statistiques à la fin (même lorsqu'ils sont encapsulés) :

- Durée d'exécution (ex. `runtime 5m12s`).
- Utilisation de tokens (entrée/sortie/total).
- Coût estimé lorsque la tarification du model est configurée (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId` et le chemin de la transcription afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur disque.

Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses destinées à l'utilisateur doivent être réécrites avec la voix normale de l'assistant.

### Pourquoi préférer `sessions_history`

`sessions_history` est le chemin d'orchestration le plus sûr :

- L'historique de l'assistant est d'abord normalisé : balises de réflexion supprimées ; échafaudage `<relevant-memories>` / `<relevant_memories>` supprimé ; blocs de payload XML d'appel d'outil en texte brut (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`) supprimés, y compris les payloads tronqués qui ne se ferment jamais proprement ; échafaudage dégradé d'appel/résultat d'outil et marqueurs de contexte historique supprimés ; jetons de contrôle de modèle fuités (`<|assistant|>`, autres `<|...|>` ASCII, `<｜...｜>` pleine chasse) supprimés ; XML d'appel d'outil MiniMax malformé supprimé.
- Le texte de type identifiant/jeton est expurgé.
- Les longs blocs peuvent être tronqués.
- Les historiques très volumineux peuvent supprimer les anciennes lignes ou remplacer une ligne trop volumineuse par `[sessions_history omitted: message too large]`.
- L'inspection brute de la transcription sur disque est la solution de repli lorsque vous avez besoin de la transcription complète octet par octet.

## Stratégie d'outil

Les sous-agents utilisent d'abord le même profil et le même pipeline de stratégie d'outil que l'agent parent ou cible. Ensuite, OpenClaw applique la couche de restriction des sous-agents.

En l'absence de `tools.profile` restrictif, les sous-agents obtiennent **tous les outils sauf les outils de session** et les outils système :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` reste ici aussi une vue d'historique limitée et assainie — ce n'est pas un vidage brut de la transcription.

Lors de `maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent également `sessions_spawn`, `subagents`, `sessions_list` et `sessions_history` afin qu'ils puissent gérer leurs enfants.

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

`tools.subagents.tools.allow` est un filtre final d'autorisation uniquement. Il peut restreindre l'ensemble d'outils déjà résolu, mais il ne peut pas **réintégrer** un outil supprimé par `tools.profile`. Par exemple, `tools.profile: "coding"` inclut `web_search`/`web_fetch` mais pas l'outil `browser`. Pour permettre aux sous-agents de profil de codage d'utiliser l'automatisation du navigateur, ajoutez le navigateur à l'étape du profil :

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Utilisez `agents.list[].tools.alsoAllow: ["browser"]` par agent lorsque seul un agent doit bénéficier de l'automatisation du navigateur.

## Accès concurrent

Les sous-agents utilisent une file d'attente dédiée en cours de traitement :

- **Nom de la file :** `subagent`
- **Accès concurrent :** `agents.defaults.subagents.maxConcurrent` (défaut `8`)

## Disponibilité et récupération

OpenClaw ne considère pas l'absence de `endedAt` comme une preuve permanente qu'un sous-agent est toujours en vie. Les exécutions non terminées plus anciennes que la fenêtre d'exécution périmée cessent d'être comptées comme actives/en attente dans `/subagents list`, les résumés de statut, le verrouillage de l'achèvement des descendants et les vérifications de concurrence par session.

Après un redémarrage de la passerelle, les exécutions restaurées périmées et non terminées sont supprimées, sauf si leur session enfant est marquée `abortedLastRun: true`. Ces sessions enfants interrompues par le redémarrage restent récupérables via le flux de récupération des orphelins de sous-agent, qui envoie un message de reprise synthétique avant d'effacer le marqueur d'interruption.

La récupération automatique au redémarrage est limitée par session enfant. Si le même enfant de sous-agent est accepté pour la récupération des orphelins à plusieurs reprises dans la fenêtre de réinsertion rapide, OpenClaw persiste une pierre tombale de récupération sur cette session et cesse de la reprendre automatiquement lors des redémarrages ultérieurs. Exécutez `openclaw tasks maintenance --apply` pour réconcilier l'enregistrement de la tâche, ou `openclaw doctor --fix` pour effacer les indicateurs de récupération interrompue obsolètes sur les sessions avec pierre tombale.

<Note>
  Si un lancement de sous-agent échoue avec Gateway Gateway`PAIRING_REQUIRED` / `scope-upgrade`RPC, vérifiez l'appelant RPC avant de modifier l'état d'appariement. La coordination interne `sessions_spawn` doit se connecter en tant que `client.id: "gateway-client"` avec `client.mode: "backend"`CLI via une authentification par mot de passe/jeton partagé en boucle directe ; ce chemin ne dépend pas de
  la ligne de base de la portée des appareils appariés du CLI. Les appelants distants, `deviceIdentity` explicite, les chemins explicites de jeton d'appareil et les clients navigateur/node nécessitent toujours une approbation normale de l'appareil pour les mises à niveau de portée.
</Note>

## Arrêt

- Envoyer `/stop` dans le chat demandeur annule la session demandeur et arrête toutes les exécutions de sous-agents actives lancées à partir de celle-ci, en cascade vers les enfants imbriqués.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.

## Limitations

- L'annonce de sous-agent est effectuée sur la base du **meilleur effort**. Si la passerelle redémarre, le travail d'« annonce de retour » en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md`, `TOOLS.md`, `SOUL.md`, `IDENTITY.md` et `USER.md` (pas de `MEMORY.md`, `HEARTBEAT.md`, ni `BOOTSTRAP.md`).
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'utilisation.
- `maxChildrenPerAgent` plafonne les enfants actifs par session (par défaut `5`, plage `1–20`).

## Connexes

- [Agents ACP](/fr/tools/acp-agents)
- [Envoi d'agent](/fr/tools/agent-send)
- [Tâches d'arrière-plan](/fr/automation/tasks)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
