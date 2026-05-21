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
[tâche en arrière-plan](/fr/automation/tasks).

Objectifs principaux :

- Paralléliser le travail de « recherche / tâche longue / tool lent » sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation de session + sandboxing optionnel).
- Rendre la surface du tool difficile à utiliser à mauvais escient : les sous-agents n'obtiennent **pas** les tools de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

<Note>
  **Note de coût :** chaque sous-agent possède son propre contexte et sa propre utilisation de jetons par défaut. Pour les tâches lourdes ou répétitives, définissez un modèle moins coûteux pour les sous-agents et gardez votre agent principal sur un modèle de plus haute qualité. Configurez via `agents.defaults.subagents.model` ou des overrides par agent. Lorsqu'un enfant a réellement besoin de la
  transcription actuelle du demandeur, l'agent peut demander `context: "fork"` pour ce lancement spécifique. Les sessions de sous-agents liées aux fils (thread-bound) utilisent par défaut `context: "fork"` car elles bifurquent la conversation actuelle vers un fil de suivi.
</Note>

## Commande slash

Utilisez `/subagents` pour inspecter ou contrôler les exécutions de sous-agents pour la **session
actuelle** :

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

Utilisez [`/steer <message>`](/fr/tools/steer) de premier niveau pour diriger l'exécution active de la session demandeur actuelle. Utilisez `/subagents steer <id|#> <message>` lorsque la cible est une exécution enfant.

`/subagents info` affiche les métadonnées d'exécution (statut, horodatages, id de session,
chemin de transcription, nettoyage). Utilisez `sessions_history` pour une vue de rappel bornée et
filtrée par sécurité ; inspectez le chemin de transcription sur le disque lorsque vous
avez besoin de la transcription brute complète.

### Contrôles de liaison de fil

Ces commandes fonctionnent sur des canaux qui prennent en charge les liaisons de fils persistantes.
Voir [Canaux prenant en charge les fils](#thread-supporting-channels) ci-dessous.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportement de lancement

`/subagents spawn` démarre un sous-agent en arrière-plan en tant que commande utilisateur (pas un
relais interne) et envoie une mise à jour finale d'achèvement au
chat demandeur lorsque l'exécution est terminée.

<AccordionGroup>
  <Accordion title="Non-blocking, push-based completion">
    - La commande de spawn (génération) est non bloquante ; elle renvoie un ID d'exécution immédiatement.
    - Une fois terminé, le sous-agent annonce un message de résumé/résultat au canal de chat demandeur.
    - Les tours d'agent qui nécessitent des résultats enfants doivent appeler `sessions_yield` après avoir généré le travail requis. Cela met fin au tour actuel et permet aux événements de complétion d'arriver en tant que prochain message visible par le modèle.
    - La complétion est basée sur l'envoi (push). Une fois généré, n'interrogez **pas** `/subagents list`, `sessions_list` ou `sessions_history` en boucle juste pour attendre qu'il se termine ; inspectez l'état uniquement à la demande pour le débogage ou l'intervention.
    - La sortie enfant est un rapport/une preuve pour que l'agent demandeur puisse la synthétiser. Ce n'est pas un texte d'instruction rédigé par l'utilisateur et elle ne peut pas remplacer la politique système, développeur ou utilisateur.
    - Une fois terminé, OpenClaw fait de son mieux pour fermer les onglets/processus de navigateur suivis ouverts par cette session de sous-agent avant que le flux de nettoyage d'annonce ne se poursuive.

  </Accordion>
  <Accordion title="Résilience de la livraison par génération manuelle"OpenClaw>
    - OpenClaw renvoie les complétions à la session de demande via un tour `agent`OpenClawOpenClawOpenClawOpenClaw avec une clé d'idempotence stable.
    - Si l'exécution du demandeur est toujours active, OpenClaw essaie d'abord de réveiller/guider cette exécution au lieu de démarrer un second chemin de réponse visible.
    - Si un demandeur actif ne peut pas être réveillé, OpenClaw revient à un transfert à l'agent demandeur avec le même contexte de complétion au lieu d'abandonner l'annonce.
    - Si le transfert de complétion à l'agent demandeur échoue ou ne produit aucune sortie visible, OpenClaw considère la livraison comme ayant échoué et revient au routage/réessai de la file d'attente. Il n'envoie pas directement (raw-send) le résultat de l'enfant au chat externe.
    - Les transferts de complétion de groupe et de channel suivent la même politique de réponse visible uniquement pour les tools de message que les tours de groupe/channel normaux, donc l'agent demandeur doit utiliser le tool de message lorsque cela est requis.
    - Si le transfert direct ne peut pas être utilisé, il revient au routage de la file d'attente.
    - Si le routage de la file d'attente n'est toujours pas disponible, l'annonce est réessayée avec un court délai exponentiel avant l'abandon final.
    - La livraison de complétion conserve la route résolue du demandeur : les routes de complétion liées au thread ou à la conversation prévalent lorsque disponibles ; si l'origine de la complétion ne fournit qu'un channel, OpenClaw remplit la cible/le compte manquant à partir de la route résolue de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe fonctionne toujours.

  </Accordion>
  <Accordion title="Completion handoff metadata">
    La transmission de l'achèvement à la session demanderesse est un contexte interne généré lors de l'exécution (pas du texte rédigé par l'utilisateur) et inclut :

    - `Result` — dernier texte de réponse visible `assistant`, sinon le dernier texte nettoyé de tool/toolResult. Les exécutions ayant échoué de manière terminale ne réutilisent pas le texte de réponse capturé.
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`.
    - Statistiques compactes d'exécution/jetons.
    - Une instruction de révision indiquant à l'agent demandeur de vérifier le résultat avant de décider si la tâche d'origine est terminée.
    - Des instructions de suite indiquant à l'agent demandeur de continuer la tâche ou d'enregistrer une suite lorsque le résultat de l'enfant laisse place à plus d'action.
    - Une instruction de mise à jour finale pour le chemin sans action supplémentaire, rédigée dans la voix normale de l'assistant sans transmettre les métadonnées internes brutes.

  </Accordion>
  <Accordion title="Modes et runtime ACP">
    - `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
    - Utilisez `info`/`log` pour inspecter les détails et la sortie après l'achèvement.
    - `/subagents spawn` est le mode ponctuel (`mode: "run"`). Pour les sessions persistantes liées aux fils, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
    - Pour les sessions de harnais ACP (Claude Code, Gemini CLI, OpenCode, ou Codex ACP/acpx explicite), utilisez `sessions_spawn` avec `runtime: "acp"` lorsque l'outil annonce ce runtime. Consultez le [modèle de livraison ACP](/fr/tools/acp-agents#delivery-model) lors du débogage des achèvements ou des boucles agent-à-agent. Lorsque le plugin `codex` est activé, le contrôle de discussion/fil Codex devrait préférer `/codex ...` à ACP, sauf si l'utilisateur demande explicitement ACP/acpx.
    - OpenClaw masque `runtime: "acp"` jusqu'à ce que ACP soit activé, que le demandeur ne soit pas sandboxé et qu'un plugin backend tel que `acpx` soit chargé. `runtime: "acp"` attend un id de harnais ACP externe, ou une entrée `agents.list[]` avec `runtime.type="acp"` ; utilisez le runtime de sous-agent par défaut pour les agents de configuration OpenClaw normaux provenant de `agents_list`.

  </Accordion>
</AccordionGroup>

## Modes de contexte

Les sous-agents natifs démarrent de manière isolée, sauf si l'appelant demande explicitement à bifurquer la transcription actuelle.

| Mode       | Quand l'utiliser                                                                                                                                               | Comportement                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `isolated` | Nouvelle recherche, implémentation indépendante, travail d'outil lent, ou tout ce qui peut être briefé dans le texte de la tâche                               | Crée une transcription enfant propre. C'est la valeur par défaut et permet de réduire l'utilisation des jetons. |
| `fork`     | Travail dépendant de la conversation actuelle, des résultats d'outils précédents, ou d'instructions nuancées déjà présentes dans la transcription du demandeur | Branche la transcription du demandeur dans la session enfant avant le démarrage de l'enfant.                    |

Utilisez `fork` avec parcimonie. Il est destiné à la délégation sensible au contexte, et non comme un
remplacement pour la rédaction d'un invite de tâche claire.

## Outil : `sessions_spawn`

Démarre une exécution de sous-agent avec `deliver: false` sur le volet `subagent` global,
puis exécute une étape d'annonce et publie la réponse d'annonce sur le canal de
discussion du demandeur.

La disponibilité dépend de la stratégie d'outil effective de l'appelant. Les profils `coding` et `full` exposent `sessions_spawn` par défaut. Le profil `messaging` ne le fait pas ; ajoutez `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"` pour les agents qui doivent déléguer
le travail. Les stratégies d'autorisation/refus de canal/groupe, de fournisseur, de bac à sable et par agent peuvent
encore retirer l'outil après l'étape du profil. Utilisez `/tools` de la même
session pour confirmer la liste effective des outils.

**Valeurs par défaut :**

- **Modèle :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.model` (ou `agents.list[].subagents.model` par agent) ; un `sessions_spawn.model` explicite l'emporte toujours.
- **Réflexion (Thinking) :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.thinking` (ou `agents.list[].subagents.thinking` par agent) ; un `sessions_spawn.thinking` explicite l'emporte toujours.
- **Délai d'exécution :** si `sessions_spawn.runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` lorsqu'il est défini ; sinon, il revient à `0` (pas de délai).
- **Livraison des tâches :** les sous-agents natifs reçoivent la tâche déléguée dans leur premier message visible `[Subagent Task]`. Le prompt système du sous-agent porte les règles d'exécution et le contexte de routage, et non un doublon caché de la tâche.

### Mode de prompt de délégation

`agents.defaults.subagents.delegationMode` contrôle uniquement les directives de prompt ; il ne modifie pas la stratégie d'outil et n'applique pas la délégation.

- `suggest` (par défaut) : conserve l'incitation standard du prompt à utiliser des sous-agents pour des tâches plus importantes ou plus lentes.
- `prefer` : indique à l'agent principal de rester réactif et de déléguer tout ce qui dépasse une réponse directe via `sessions_spawn`.

Les redéfinitions par agent utilisent `agents.list[].subagents.delegationMode`.

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
  Identifiant stable facultatif pour un ciblage ultérieur `subagents`. Doit correspondre à `[a-z][a-z0-9_]{0,63}` et ne peut pas être des cibles réservées telles que `last` ou `all`. À privilégier lorsque le coordinateur peut avoir besoin de diriger, d'arrêter ou d'identifier un enfant spécifique après en avoir généré plusieurs.
</ParamField>
<ParamField path="label" type="string">
  Libellé lisible par l'homme facultatif.
</ParamField>
<ParamField path="agentId" type="string">
  Générer sous un autre identifiant d'agent lorsque `subagents.allowAgents` l'autorise.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` est uniquement destiné aux harnais ACP externes (`claude`, `droid`, `gemini`, `opencode`, ou Codex ACP/acpx explicitement demandé) et pour les entrées `agents.list[]` dont le `runtime.type` est `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  ACP uniquement. Reprend une session de harnais ACP existante lorsque `runtime: "acp"` ; ignoré pour les générations de sous-agents natifs.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  ACP uniquement. Diffuse la sortie de l'exécution ACP vers la session parente lorsque `runtime: "acp"` ; à omettre pour les générations de sous-agents natifs.
</ParamField>
<ParamField path="model" type="string">
  Remplacer le modèle du sous-agent. Les valeurs non valides sont ignorées et le sous-agent s'exécute sur le modèle par défaut avec un avertissement dans le résultat de l'outil.
</ParamField>
<ParamField path="thinking" type="string">
  Remplacer le niveau de réflexion pour l'exécution du sous-agent.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Par défaut `agents.defaults.subagents.runTimeoutSeconds` si défini, sinon `0`. Lorsqu'il est défini, l'exécution du sous-agent est abandonnée après N secondes.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Lorsque `true`, demande la liaison du fil de discussion du channel pour cette session de sous-agent.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si `thread: true` et `mode` sont omis, la valeur par défaut devient `session`. `mode: "session"` nécessite `thread: true`.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via un renommage).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rejette la génération sauf si le runtime enfant cible est sandboxed.
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` duplique la transcription actuelle du demandeur dans la session enfant. Sous-agents natifs uniquement. Les générations liées à un fil (thread-bound) sont par défaut `fork` ; les générations non liées à un fil sont par défaut `isolated`.
</ParamField>

<Warning>`sessions_spawn` n'accepte **pas** les paramètres de livraison par channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Pour la livraison, utilisez `message`/`sessions_send` depuis l'exécution générée.</Warning>

### Noms des tâches et ciblage

`taskName` est un identifiant d'orchestration orienté model, pas une clé de session.
Utilisez-le pour des noms d'enfants stables tels que `review_subagents`,
`linux_validation`, ou `docs_update` lorsqu'un coordinateur pourrait avoir besoin de diriger
ou d'arrêter cet enfant plus tard.

La résolution de cible accepte les correspondances exactes de `taskName` et les préfixes
non ambigus. La correspondance est limitée à la même fenêtre de cible active/récente utilisée
par les cibles numérotées `/subagents`, donc un enfant obsolète et terminé ne rend pas
un identifiant réutilisé ambigu. Si deux enfants actifs ou récents partagent le même
`taskName`, la cible est ambiguë ; utilisez plutôt l'index de la liste, la clé de session ou
l'identifiant d'exécution.

Les cibles réservées `last` et `all` ne sont pas des valeurs `taskName` valides
car elles ont déjà des significations de contrôle.

## Outil : `sessions_yield`

Met fin au tour actuel du model et attend que les événements d'exécution, principalement
les événements d'achèvement des sous-agents, arrivent en tant que prochain message. Utilisez-le après
avoir généré le travail enfant requis lorsque le demandeur ne peut pas fournir de réponse
finale tant que ces achèvements ne sont pas arrivés.

`sessions_yield` est la primitive d'attente. Ne le remplacez pas par des boucles
de polling sur `subagents`, `sessions_list`, `sessions_history`, le shell
`sleep`, ou le polling de processus juste pour détecter l'achèvement de l'enfant.

N'utilisez `sessions_yield` que lorsque la liste effective des outils de la session l'inclut.
Certains profils d'outils minimaux ou personnalisés peuvent exposer `sessions_spawn` et
`subagents` sans exposer `sessions_yield` ; dans ce cas, n'inventez pas
une boucle de polling juste pour attendre la fin.

Lorsque des enfants actifs existent, OpenClaw injecte un bloc d'invite `Active Subagents` compact généré à l'exécution
dans les tours normaux afin que le demandeur puisse voir
les sessions enfants actuelles, les ids d'exécution, les statuts, les étiquettes, les tâches et
les alias `taskName` sans avoir à faire de polling. Les champs de tâche et d'étiquette dans ce
bloc sont cités en tant que données, et non en tant qu'instructions, car ils peuvent provenir
d'arguments de génération fournis par l'utilisateur/model.

## Outil : `subagents`

Liste, pilote ou tue les exécutions de sous-agents générées appartenant à la session
du demandeur. Il est limité au demandeur actuel ; un enfant ne peut
que voir/contrôler ses propres enfants contrôlés.

Utilisez `subagents` pour l'état à la demande, le débogage, le pilotage ou la destruction.
Utilisez `sessions_yield` pour attendre les événements de fin.

## Sessions liées aux fils (Thread-bound sessions)

Lorsque les liaisons de fils sont activées pour un canal, un sous-agent peut rester lié
à un fil pour que les messages de suivi de l'utilisateur dans ce fil continuent d'être acheminés vers la
même session de sous-agent.

### Canaux supportant les fils

**Discord** est actuellement le seul canal pris en charge. Il prend en charge
les sessions de sous-agents persistantes liées aux fils (`sessions_spawn` avec
`thread: true`), les contrôles manuels de fils (`/focus`, `/unfocus`, `/agents`,
`/session idle`, `/session max-age`) et les clés d'adaptateur
`channels.discord.threadBindings.enabled`,
`channels.discord.threadBindings.idleHours`,
`channels.discord.threadBindings.maxAgeHours` et
`channels.discord.threadBindings.spawnSessions`.

### Flux rapide

<Steps>
  <Step title="Génération">`sessions_spawn` avec `thread: true` (et optionnellement `mode: "session"`).</Step>
  <Step title="Bind" OpenClaw>
    OpenClaw crée ou lie un fil à cette cible de session dans le channel actif.
  </Step>
  <Step title="Route follow-ups">Les réponses et les messages de suivi dans ce fil sont acheminés vers la session liée.</Step>
  <Step title="Inspect timeouts">Utilisez `/session idle` pour inspecter/mettre à jour l'auto-perte de focus par inactivité et `/session max-age` pour contrôler la limite stricte.</Step>
  <Step title="Detach">Utilisez `/unfocus` pour détacher manuellement.</Step>
</Steps>

### Contrôles manuels

| Commande           | Effet                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Lier le fil actuel (ou en créer un) à une cible de sous-agent/session                       |
| `/unfocus`         | Supprimer la liaison pour le fil lié actuel                                                 |
| `/agents`          | Lister les exécutions actives et l'état des liaisons (`thread:<id>` ou `unbound`)           |
| `/session idle`    | Inspecter/mettre à jour l'auto-perte de focus au repos (uniquement les fils liés focalisés) |
| `/session max-age` | Inspecter/mettre à jour la limite stricte (uniquement les fils liés focalisés)              |

### Commutateurs de configuration

- **Par défaut global :** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- **Les clés de substitution de channel et d'auto-liaison au spawn** sont spécifiques à l'adaptateur. Voir [Canaux prenant en charge les fils](#thread-supporting-channels) ci-dessus.

Voir [Référence de configuration](/fr/gateway/configuration-reference) et
[Commandes slash](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

### Liste blanche

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Liste des IDs d'agents qui peuvent être ciblés via `agentId` explicite (`["*"]` autorise n'importe quelle cible configurée). Par défaut : uniquement l'agent demandeur. Si vous définissez une liste et souhaitez toujours que le demandeur puisse se générer lui-même avec `agentId`, incluez l'ID du demandeur dans la liste.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Liste d'autorisation d'agents cibles par défaut utilisée lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloque les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil). Remplacement par agent : `agents.list[].subagents.requireAgentId`.
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  Délai d'expiration par appel pour les tentatives de livraison d'annonce de passerelle `agent`. Les valeurs sont des millisecondes entières positives et sont limitées au maximum de la minuterie sécurisée pour la plateforme. Les tentatives de réessai transitoires peuvent rendre l'attente d'annonce totale plus longue qu'un délai d'expiration configuré.
</ParamField>

Si la session du demandeur est en bac à sable (sandboxed), `sessions_spawn` rejette les cibles
qui s'exécuteraient sans bac à sable.

### Discovery

Utilisez `agents_list` pour voir quels identifiants d'agents sont actuellement autorisés pour
`sessions_spawn`. La réponse inclut le modèle effectif et les métadonnées d'exécution intégrées de chaque agent répertorié afin que les appelants puissent distinguer PI, le serveur d'application Codex
et autres runtimes natifs configurés.

### Archivage automatique

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut `60`).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via renommage).
- L'archivage automatique est au mieux effort ; les minuteries en attente sont perdues si la passerelle redémarre.
- `runTimeoutSeconds` n'archive **pas** automatiquement ; il arrête simplement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.
- Le nettoyage du navigateur est distinct du nettoyage des archives : les onglets/processus de navigateur suivis sont fermés au mieux lorsque l'exécution se termine, même si l'enregistrement de la transcription/session est conservé.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas générer leurs propres sous-agents
(`maxSpawnDepth: 1`). Définissez `maxSpawnDepth: 2` pour activer un niveau d'imbrication
— le **modèle d'orchestrateur** : principal → sous-agent orchestrateur →
sous-sous-agents travailleurs.

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
  **Directives opérationnelles :** lancez le travail enfant une seule fois et attendez les événements de fin au lieu de créer des boucles d'interrogation autour des commandes `sessions_list`, `sessions_history`, `/subagents list` ou `exec` sleep. `sessions_list` et `/subagents list` maintiennent les relations de session enfant concentrées sur le travail en direct — les enfants actifs restent
  attachés, les enfants terminés restent visibles pendant une courte fenêtre récente, et les liens enfants obsolètes en lecture seule sont ignorés après leur fenêtre de fraîcheur. Cela empêche les anciennes métadonnées `spawnedBy` / `parentSessionKey` de ressusciter des enfants fantômes après redémarrage. Si un événement d'achèvement enfant arrive après que vous ayez déjà envoyé la réponse finale,
  la suite correcte est le jeton silencieux exact `NO_REPLY` / `no_reply`.
</Note>

### Stratégie d'outil par profondeur

- Le rôle et la portée de contrôle sont écrits dans les métadonnées de la session lors du lancement. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, lorsque `maxSpawnDepth >= 2`) :** obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` afin qu'il puisse gérer ses enfants. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, lorsque `maxSpawnDepth == 1`) :** aucun outil de session (comportement actuel par défaut).
- **Profondeur 2 (feuille de travail) :** aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Impossible de lancer d'autres enfants.

### Limite de lancement par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent`
(défaut `5`) enfants actifs à la fois. Cela empêche une expansion incontrôlée
à partir d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants
de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.
- `/subagents kill all` arrête tous les sous-agents pour le demandeur et se propage.

## Authentification

L'authentification du sous-agent est résolue par **id d'agent**, et non par type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir de `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours** ; les profils de l'agent prévalent sur les profils principaux en cas de conflit.

La fusion est additive, donc les profils principaux sont toujours disponibles comme
secours. Une authentification entièrement isolée par agent n'est pas encore prise en charge.

## Annonce

Les sous-agents rapportent via une étape d'annonce :

- L'étape d'annonce s'exécute dans la session du sous-agent (et non la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Si le dernier texte de l'assistant est exactement le jeton silencieux `NO_REPLY` / `no_reply`, la sortie de l'annonce est supprimée même s'il y avait une progression visible antérieure.

La livraison dépend de la profondeur du demandeur :

- Les sessions de demandeur de niveau supérieur utilisent un appel de suivi `agent` avec une livraison externe (`deliver=true`).
- Les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session.
- Si une session de sous-agent demandeur imbriqué a disparu, OpenClaw se rabat sur le demandeur de cette session si disponible.

Pour les sessions de demandeur de niveau supérieur, la livraison directe en mode achèvement résout d'abord toute route de conversation/fil liée et tout remplacement de hook, puis remplit les champs manquants de la cible du channel à partir de la route stockée de la session du demandeur. Cela permet de garder les achèvements sur le bon sujet de discussion, même lorsque l'origine de l'achèvement n'identifie que le channel.

L'agrégation des achèvements enfants est limitée à l'exécution du demandeur actuelle lors de la construction des résultats d'achèvement imbriqués, empêchant ainsi les sorties enfants périmées d'exécutions précédentes de fuir dans l'annonce actuelle. Les réponses d'annonce préservent le routage du fil/sujet lorsqu'il est disponible sur les adaptateurs de channel.

### Contexte d'annonce

Le contexte d'annonce est normalisé en un bloc d'événement interne stable :

| Champ                   | Source                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Source                  | `subagent` ou `cron`                                                                                                |
| Identifiants de session | Clé/ID de session enfant                                                                                            |
| Type                    | Type d'annonce + étiquette de tâche                                                                                 |
| Statut                  | Dérivé du résultat de l'exécution (`success`, `error`, `timeout`, ou `unknown`) — **non** déduit du texte du modèle |
| Contenu du résultat     | Dernier texte visible de l'assistant, sinon le dernier texte nettoyé de tool/toolResult                             |
| Suivi                   | Instruction décrivant quand répondre versus rester silencieux                                                       |

Les exécutions échouées terminales signalent le statut d'échec sans rejouer le texte de réponse capturé. En cas de timeout, si l'enfant n'a effectué que des appels de tool, l'annonce peut réduire cet historique en un bref résumé de progrès partiel au lieu de rejouer la sortie brute du tool.

### Ligne de statistiques

Les charges utiles d'annonce incluent une ligne de statistiques à la fin (même lorsqu'elles sont enveloppées) :

- Durée d'exécution (ex. `runtime 5m12s`).
- Utilisation des jetons (entrée/sortie/total).
- Coût estimé lorsque la tarification du modèle est configurée (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId` et le chemin de la transcription afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque.

Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses destinées à l'utilisateur doivent être réécrites avec la voix normale de l'assistant.

### Pourquoi préférer `sessions_history`

`sessions_history` est le chemin d'orchestration le plus sûr :

- La mémoire de l'assistant est d'abord normalisée : balises de réflexion supprimées ; échafaudage `<relevant-memories>` / `<relevant_memories>` supprimé ; blocs de payload XML d'appel d'outil en texte brut (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`) supprimés, y compris les payloads tronqués qui ne se ferment jamais correctement ; échafaudage d'appel/résultat d'outil rétrogradé et marqueurs de contexte historique supprimés ; jetons de contrôle de modèle fuités (`<|assistant|>`, autres `<|...|>` ASCII, `<｜...｜>` pleine chasse) supprimés ; XML d'appel d'outil MiniMax malformé supprimé.
- Le texte ressemblant à des informations d'identification ou des jetons est masqué.
- Les longs blocs peuvent être tronqués.
- Les historiques très volumineux peuvent supprimer les anciennes lignes ou remplacer une ligne trop grande par `[sessions_history omitted: message too large]`.
- L'inspection brute de la transcription sur disque est la solution de repli lorsque vous avez besoin de la transcription complète octet par octet.

## Stratégie d'outil

Les sous-agents utilisent d'abord le même profil et le même pipeline de stratégie d'outil que l'agent parent ou cible. Ensuite, OpenClaw applique la couche de restriction des sous-agents.

Sans `tools.profile` restrictif, les sous-agents obtiennent **tous les outils sauf
les outils de session** et les outils système :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` reste ici aussi une vue de mémoire bornée et nettoyée — ce
n'est pas une vidange brute de la transcription.

Lorsque `maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent également `sessions_spawn`, `subagents`, `sessions_list` et `sessions_history` afin qu'ils puissent gérer leurs enfants.

### Remplacer via la configuration

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

`tools.subagents.tools.allow` est un filtre final d'autorisation uniquement. Il peut restreindre l'ensemble d'outils déjà résolu, mais il ne peut pas **rétablir** un outil supprimé par `tools.profile`. Par exemple, `tools.profile: "coding"` inclut `web_search`/`web_fetch` mais pas l'outil `browser`. Pour permettre aux sous-agents de profil de codage d'utiliser l'automatisation du navigateur, ajoutez le navigateur au niveau du profil :

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Utilisez `agents.list[].tools.alsoAllow: ["browser"]` par agent lorsque seul un agent doit bénéficier de l'automatisation du navigateur.

## Simultanéité

Les sous-agents utilisent une file d'attente dédiée dans le processus :

- **Nom de la voie (Lane name) :** `subagent`
- **Concurrence :** `agents.defaults.subagents.maxConcurrent` (par défaut `8`)

## Activité et récupération

OpenClaw ne considère pas l'absence de `endedAt` comme une preuve permanente qu'un sous-agent est toujours actif. Les exécutions non terminées plus anciennes que la fenêtre d'exécution obsolète cessent d'être comptées comme actives/en attente dans `/subagents list`, les résumés de statut, le verrouillage de l'achèvement des descendants et les vérifications de concurrence par session.

Après un redémarrage de la passerelle, les exécutions restaurées obsolètes et non terminées sont élaguées, sauf si leur session enfant est marquée `abortedLastRun: true`. Ces sessions enfants abandonnées par redémarrage restent récupérables via le flux de récupération des orphelins de sous-agent, qui envoie un message de reprise synthétique avant d'effacer le marqueur d'abandon.

La récupération automatique au redémarrage est limitée par session enfant. Si le même enfant de sous-agent est accepté pour la récupération des orphelins à plusieurs reprises dans la fenêtre de ré-enclenchement rapide, OpenClaw persiste une pierre tombale de récupération sur cette session et cesse de la reprendre automatiquement lors des redémarrages ultérieurs. Exécutez `openclaw tasks maintenance --apply` pour réconcilier l'enregistrement de la tâche, ou `openclaw doctor --fix` pour effacer les drapeaux de récupération abandonnée obsolètes sur les sessions avec pierre tombale.

<Note>
  Si l'apparition d'un sous-agent échoue avec le Gateway `PAIRING_REQUIRED` / `scope-upgrade`, vérifiez l'appelant RPC avant de modifier l'état d'appariement. La coordination interne `sessions_spawn` doit se connecter en tant que `client.id: "gateway-client"` avec `client.mode: "backend"` via une authentification par bouclage direct avec jeton/mot de passe partagé ; ce chemin ne dépend pas de la
  ligne de base de la portée des appareils appariés du CLI. Les appelants distants, les `deviceIdentity` explicites, les chemins explicites par jeton d'appareil et les clients navigateur/nœud ont toujours besoin de l'approbation normale de l'appareil pour les mises à niveau de portée.
</Note>

## Arrêt

- L'envoi de `/stop` dans le chat demandeur abandonne la session demandeur et arrête toutes les exécutions actives de sous-agents lancées à partir de celle-ci, en cascade vers les enfants imbriqués.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.

## Limitations

- L'annonce du sous-agent est effectuée sur la base du **meilleur effort**. Si la passerelle redémarre, le travail d'« annonce en retour » en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md`, `TOOLS.md`, `SOUL.md`, `IDENTITY.md` et `USER.md` (pas de `MEMORY.md`, `HEARTBEAT.md` ou `BOOTSTRAP.md`).
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'utilisation.
- `maxChildrenPerAgent` limite les enfants actifs par session (par défaut `5`, plage `1–20`).

## Connexes

- [Agents ACP](/fr/tools/acp-agents)
- [Envoi d'agent](/fr/tools/agent-send)
- [Tâches d'arrière-plan](/fr/automation/tasks)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
