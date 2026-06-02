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

Ces commandes fonctionnent sur des canaux qui prennent en charge les liaisons de thread persistantes.
Voir [Canaux prenant en charge les threads](#thread-supporting-channels) ci-dessous.

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
    - Utilisez `info`/`log` pour inspecter les détails et la sortie après achèvement.
    - Pour les sessions liées à des threads persistants, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
    - Si le canal demandeur ne prend pas en charge les liaisons de thread, utilisez `mode: "run"` au lieu de réessayer des combinaisons liées aux threads impossibles.
    - Pour les sessions de harnais ACP (Claude Code, Gemini CLI, OpenCode, ou Codex ACP/acpx explicite), utilisez `sessions_spawn` avec `runtime: "acp"` lorsque l'outil annonce ce runtime. Voir [Modèle de livraison ACP](/fr/tools/acp-agents#delivery-model) lors du débogage des achèvements ou des boucles agent-à-agent. Lorsque le plugin `codex` est activé, le contrôle de discussion/thread Codex devrait préférer `/codex ...` à ACP, sauf si l'utilisateur demande explicitement ACP/acpx.
    - OpenClaw masque `runtime: "acp"` jusqu'à ce qu'ACP soit activé, que le demandeur ne soit pas sandboxé, et qu'un plugin backend tel que `acpx` soit chargé. `runtime: "acp"` attend un identifiant de harnais ACP externe, ou une entrée `agents.list[]` avec `runtime.type="acp"` ; utilisez le runtime de sous-agent par défaut pour les agents de configuration OpenClaw normaux depuis `agents_list`.

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

Les créations natives de sous-agents acceptées incluent les métadonnées du modèle enfant résolu dans le résultat de l'outil : `resolvedModel` contient la référence du modèle appliquée et `resolvedProvider` contient le préfixe du fournisseur lorsque la référence en possède un.

### Mode d'invite de délégation

`agents.defaults.subagents.delegationMode` contrôle uniquement les indications d'invite ; il ne modifie pas la stratégie de l'outil et n'applique pas la délégation.

- `suggest` (par défaut) : conserve l'incitation standard à utiliser des sous-agents pour les tâches plus importantes ou plus lentes.
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
  Identifiant stable optionnel pour identifier un enfant spécifique dans la sortie d'état ultérieure. Doit correspondre à `[a-z][a-z0-9_-]{0,63}` et ne peut pas être des cibles réservées telles que `last` ou `all`.
</ParamField>
<ParamField path="label" type="string">
  Libellé lisible par l'homme optionnel.
</ParamField>
<ParamField path="agentId" type="string">
  Lancer sous un autre id d'agent configuré lorsque autorisé par `subagents.allowAgents`.
</ParamField>
<ParamField path="cwd" type="string">
  Répertoire de travail de tâche optionnel pour l'exécution enfant. Les sous-agents natifs chargent toujours les fichiers d'amorçage depuis l'espace de travail de l'agent cible ; `cwd` ne modifie que l'endroit où les outils d'exécution et les harnais CLI effectuent le travail délégué.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` est uniquement pour les harnais ACP externes (`claude`, `droid`, `gemini`, `opencode`, ou Codex ACP/acpx explicitement demandé) et pour les entrées `agents.list[]` dont `runtime.type` est `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  ACP uniquement. Reprend une session de harnais ACP existante lorsque `runtime: "acp"` ; ignoré pour les lancements de sous-agents natifs.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  ACP uniquement. Diffuse la sortie de l'exécution ACP vers la session parente lorsque `runtime: "acp"` ; omettre pour les lancements de sous-agents natifs.
</ParamField>
<ParamField path="model" type="string">
  Remplacer le model du sous-agent. Les valeurs non valides sont ignorées et le sous-agent s'exécute sur le model par défaut avec un avertissement dans le résultat de l'outil.
</ParamField>
<ParamField path="thinking" type="string">
  Remplacer le niveau de réflexion pour l'exécution du sous-agent.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Par défaut à `agents.defaults.subagents.runTimeoutSeconds` lorsqu'il est défini, sinon `0`. Lorsqu'il est défini, l'exécution du sous-agent est abandonnée après N secondes.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Lorsque `true`, demande la liaison de thread de channel pour cette session de sous-agent.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si `thread: true` et `mode` sont omis, la valeur par défaut devient `session`. `mode: "session"` nécessite `thread: true`.
  Si la liaison de thread n'est pas disponible pour le channel demandeur, utilisez `mode: "run"` à la place.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via renommage).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rejette le lancement à moins que le runtime enfant cible ne soit sandboxed.
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` crée une branche de la transcription actuelle du demandeur dans la session enfant. Sous-agents natifs uniquement. Les lancements liés à un thread sont par défaut `fork` ; les lancements sans thread sont par défaut `isolated`.
</ParamField>

<Warning>`sessions_spawn` n'accepte **pas** les paramètres de livraison vers un channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Les sous-agents natifs rapportent leur dernier tour d'assistant au demandeur ; la livraison externe reste avec l'agent parent/demandeur.</Warning>

### Noms des tâches et ciblage

`taskName` est un identifiant pour l'orcheststration orienté model, et non une clé de session.
Utilisez-le pour les noms d'enfants stables tels que `review_subagents`,
`linux_validation`, ou `docs_update` lorsqu'un coordinateur pourrait avoir besoin d'inspecter
cet enfant plus tard.

La résolution de cible accepte les correspondances exactes de `taskName` et les préfixes
non ambigus. La correspondance est limitée à la même fenêtre de cibles actives/récentes utilisée
par les cibles numérotées `/subagents`, afin qu'un enfant terminé obsolète ne rende pas
un identifiant réutilisé ambigu. Si deux enfants actifs ou récents partagent le même
`taskName`, la cible est ambiguë ; utilisez plutôt l'index de la liste, la clé de session, ou
l'identifiant d'exécution.

Les cibles réservées `last` et `all` ne sont pas des valeurs `taskName` valides
car elles ont déjà des significations de contrôle.

## Outil : `sessions_yield`

Termine le tour actuel du modèle et attend que les événements d'exécution, principalement
les événements d'achèvement des sous-agents, arrivent comme le prochain message. Utilisez-le après
avoir lancé le travail enfant requis lorsque le demandeur ne peut pas fournir de réponse
finale avant que ces achèvements n'arrivent.

`sessions_yield` est la primitive d'attente. Ne le remplacez pas par des boucles
de polling sur `subagents`, `sessions_list`, `sessions_history`, le shell
`sleep`, ou le polling de processus juste pour détecter l'achèvement de l'enfant.

N'utilisez `sessions_yield` que lorsque la liste effective des outils de la session l'inclut.
Certains profils d'outils minimaux ou personnalisés peuvent exposer `sessions_spawn` et
`subagents` sans exposer `sessions_yield` ; dans ce cas, n'inventez
pas une boucle de sondage juste pour attendre la fin.

Lorsque des enfants actifs existent, OpenClaw injecte un bloc de prompt
`Active Subagents` compact généré à l'exécution dans les tours normaux afin que le demandeur puisse
voir les sessions enfants actuelles, les IDs d'exécution, les statuts, les étiquettes, les tâches et
les alias `taskName` sans sondage. Les champs de tâche et d'étiquette dans ce
bloc sont cités en tant que données, et non en tant qu'instructions, car ils peuvent provenir
d'arguments de génération fournis par l'utilisateur/le modèle.

## Outil : `subagents`

Liste les exécutions de sous-agents générées appartenant à la session du demandeur. Elle est limitée
au demandeur actuel ; un enfant ne peut voir que ses propres enfants contrôlés.

Utilisez `subagents` pour le statut à la demande et le débogage. Utilisez `sessions_yield` pour
attendre les événements de fin.

## Sessions liées aux fils (Thread-bound sessions)

Lorsque les liaisons de fils sont activées pour un canal, un sous-agent peut rester lié
à un fil afin que les messages de suivi de l'utilisateur dans ce fil continuent d'être acheminés vers la
même session de sous-agent.

### Canaux supportant les fils

Tout canal avec un adaptateur de liaison de session peut prendre en charge les sessions de sous-agents
liées aux fils persistantes (`sessions_spawn` avec `thread: true`).
Les adaptateurs fournis incluent actuellement les fils Discord, les fils Matrix,
les sujets de forum Telegram et les liaisons de conversation actuelle pour Feishu.
Utilisez les clés de configuration `threadBindings` par canal pour l'activation,
les délais d'attente et `spawnSessions`.

### Flux rapide

<Steps>
  <Step title="Générer">`sessions_spawn` avec `thread: true` (et optionnellement `mode: "session"`).</Step>
  <Step title="Lier">OpenClaw crée ou lie un fil à cette cible de session dans le canal actif.</Step>
  <Step title="Acheminer les suites">Les réponses et les messages de suivi dans ce fil sont acheminés vers la session liée.</Step>
  <Step title="Inspecter les délais d'attente">Utilisez `/session idle` pour inspecter/mettre à jour le focus automatique par inactivité et `/session max-age` pour contrôler la limite stricte.</Step>
  <Step title="Détacher">Utilisez `/unfocus` pour détacher manuellement.</Step>
</Steps>

### Contrôles manuels

| Commande           | Effet                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Lier le fil actuel (ou en créer un) à une cible de sous-agent/session                        |
| `/unfocus`         | Supprimer la liaison pour le fil lié actuel                                                  |
| `/agents`          | Lister les exécutions actives et l'état des liaisons (`thread:<id>` ou `unbound`)            |
| `/session idle`    | Inspecter/mettre à jour le focus automatique par inactivité (fils liés focalisés uniquement) |
| `/session max-age` | Inspecter/mettre à jour la limite stricte (fils liés focalisés uniquement)                   |

### Commutateurs de configuration

- **Par défaut global :** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Les **clés de substitution de canal et de liaison automatique lors du spawning** sont spécifiques à l'adaptateur. Voir [Canaux prenant en charge les fils](#thread-supporting-channels) ci-dessus.

Voir [Référence de configuration](/fr/gateway/configuration-reference) et
[Commandes slash](/fr/tools/slash-commands) pour les détails de l'adaptateur actuel.

### Liste blanche

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Liste des IDs d'agents configurés qui peuvent être ciblés via `agentId` explicite (`["*"]` autorise toute cible configurée). Par défaut : uniquement l'agent demandeur. Si vous définissez une liste et souhaitez toujours que le demandeur puisse se générer lui-même avec `agentId`, incluez l'ID du demandeur dans la liste.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Liste d'autorisation de l'agent cible configurée par défaut, utilisée lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloquer les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil). Remplacement par agent : `agents.list[].subagents.requireAgentId`.
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  Délai d'expiration par appel pour les tentatives de livraison d'annonce `agent` de la passerelle. Les valeurs sont des millisecondes entières positives et sont limitées au maximum de la minuteur sécurisé de la plate-forme. Les nouvelles tentatives transitoires peuvent rendre l'attente d'annonce totale plus longue qu'un délai d'expiration configuré.
</ParamField>

Si la session demandeur est sandboxed (bac à sable), `sessions_spawn` rejette les cibles
qui s'exécuteraient sans bac à sable.

### Découverte

Utilisez `agents_list` pour voir quels IDs d'agent sont actuellement autorisés pour
`sessions_spawn`. La réponse inclut le modèle effectif de chaque agent répertorié et les métadonnées d'exécution intégrées afin que les appelants puissent distinguer OpenClaw, le serveur d'application Codex
et autres runtimes natifs configurés.

Les entrées `allowAgents` doivent pointer vers des ids d'agents configurés dans `agents.list[]`.
`["*"]` signifie n'importe quel agent cible configuré plus le demandeur. Si une configuration d'agent
est supprimée mais que son id reste dans `allowAgents`, `sessions_spawn` rejette cet id
et `agents_list` l'omet. Exécutez `openclaw doctor --fix` pour nettoyer les entrées
obsolètes de la liste d'autorisation, ou ajoutez une entrée `agents.list[]` minimale lorsque la cible doit
rester capable d'être générée tout en héritant des valeurs par défaut.

### Archive automatique

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut `60`).
- L'archive utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via le renommage).
- L'archive automatique est sur une base de best-effort (meilleur effort) ; les minuteurs en attente sont perdus si la passerelle redémarre.
- `runTimeoutSeconds` n'archive **pas** automatiquement ; cela arrête seulement l'exécution. La session reste jusqu'à l'archive automatique.
- L'archive automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.
- Le nettoyage du navigateur est distinct du nettoyage de l'archive : les onglets/processus de navigateur suivis sont fermés sur une base de best-effort lorsque l'exécution se termine, même si l'enregistrement de la transcription/session est conservé.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas générer leurs propres sous-agents
(`maxSpawnDepth: 1`). Définissez `maxSpawnDepth: 2` pour activer un niveau d'
imbrication — le **modèle d'orchestrateur** : principal → sous-agent orchestrateur →
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

### Chaîne d'annonce

Les résultats remontent la chaîne :

1. Le travailleur de profondeur 2 se termine → annonce à son parent (orchestrateur de profondeur 1).
2. L'orchestrateur de profondeur 1 reçoit l'annonce, synthétise les résultats, se termine → annonce au principal.
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur.

Chaque niveau ne voit que les annonces de ses enfants directs.

<Note>
  **Conseil opérationnel :** lancez le travail enfant une seule fois et attendez les événements de finition au lieu de construire des boucles de polling autour des commandes de sommeil `sessions_list`, `sessions_history`, `/subagents list` ou `exec`. `sessions_list` et `/subagents list` maintiennent les relations de session enfant concentrées sur le travail en cours — les enfants actifs restent
  attachés, les enfants terminés restent visibles pendant une courte fenêtre récente, et les liens enfants périmés (stockés uniquement) sont ignorés après leur fenêtre de fraîcheur. Cela empêche les anciennes métadonnées `spawnedBy` / `parentSessionKey` de ressusciter des enfants fantômes après un redémarrage. Si un événement de finition d'enfant arrive après que vous ayez déjà envoyé la réponse
  finale, la suite correcte est le jeton silencieux exact `NO_REPLY` / `no_reply`.
</Note>

### Politique d'outil par profondeur

- Le rôle et la portée de contrôle sont écrits dans les métadonnées de session au moment de la création (spawn). Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`) :** obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` afin qu'il puisse créer des enfants et inspecter leur état. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`) :** aucun outil de session (comportement actuel par défaut).
- **Profondeur 2 (travailleur feuille) :** aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Ne peut pas créer davantage d'enfants.

### Limite de création par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent`
(par défaut `5`) enfants actifs à la fois. Cela empêche une divergence incontrôlée (fan-out) d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.

## Authentification

L'authentification du sous-agent est résolue par **agent id**, et non par le type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir de `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours** ; les profils de l'agent priment sur les profils principaux en cas de conflit.

La fusion est additive, les profils principaux sont donc toujours disponibles comme
secours. Une authentification totalement isolée par agent n'est pas encore prise en charge.

## Annoncer

Les sous-agents font rapport via une étape d'annonce :

- L'étape d'annonce s'exécute à l'intérieur de la session du sous-agent (et non de la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Si le dernier texte de l'assistant est le jeton silencieux exact `NO_REPLY` / `no_reply`, la sortie de l'annonce est supprimée même s'il y avait une progression visible antérieure.

La livraison dépend de la profondeur du demandeur :

- Les sessions de demandeur de premier niveau utilisent un appel de suivi `agent` avec livraison externe (`deliver=true`).
- Les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session.
- Si une session de sous-agent demandeur imbriqué a disparu, OpenClaw se rabat sur le demandeur de cette session si disponible.

Pour les sessions de demandeur de premier niveau, la livraison directe en mode achèvement résout d'abord
n'importe quelle route de conversation/discussion liée et le remplacement de crochet, puis remplit
les champs cibles de channel manquants à partir de la route stockée de la session du demandeur.
Cela permet de garder les achèvements sur le bon sujet/topic de discussion, même lorsque l'origine
de l'achèvement n'identifie que le channel.

L'agrégation des achèvements enfants est limitée à l'exécution du demandeur actuelle lors
de la construction des résultats d'achèvement imbriqués, empêchant les sorties enfants
périmées de l'exécution précédente de fuir dans l'annonce actuelle. Les réponses d'annonce
préservent le routage de discussion/topic lorsque disponible sur les adaptateurs de channel.

### Contexte d'annonce

Le contexte d'annonce est normalisé en un bloc d'événement interne stable :

| Champ               | Source                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Source              | `subagent` ou `cron`                                                                                                |
| Ids de session      | Clé/id de session enfant                                                                                            |
| Type                | Type d'annonce + libellé de tâche                                                                                   |
| Statut              | Dérivé du résultat de l'exécution (`success`, `error`, `timeout`, ou `unknown`) — **non** déduit du texte du modèle |
| Contenu du résultat | Dernier texte de l'assistant visible depuis l'enfant                                                                |
| Suivi               | Instruction décrivant quand répondre ou rester silencieux                                                           |

Les exécutions ayant échoué de manière terminale signalent l'état d'échec sans rejouer le
texte de réponse capturé. La sortie du tool/toolResult n'est pas promue dans le texte du résultat de l'enfant.

### Ligne de statistiques

Les payloads d'annonce incluent une ligne de statistiques à la fin (même lorsqu'ils sont enveloppés) :

- Durée d'exécution (par ex. `runtime 5m12s`).
- Utilisation des jetons (entrée/sortie/total).
- Coût estimé lorsque la tarification du modèle est configurée (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId`, et le chemin de la transcription afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque.

Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses orientées utilisateur
doivent être réécrites avec la voix normale de l'assistant.

### Pourquoi préférer `sessions_history`

`sessions_history` est le chemin d'orchestration le plus sûr :

- La mémoire de l'assistant est d'abord normalisée : les balises de réflexion sont supprimées ; l'échafaudage `<relevant-memories>` / `<relevant_memories>` est supprimé ; les blocs de payloads XML d'appel de tool en texte brut (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`) sont supprimés, y compris les payloads tronqués qui ne se ferment jamais proprement ; l'échafaudage d'appel/résultat de tool rétrogradé et les marqueurs de contexte historique sont supprimés ; les jetons de contrôle de modèle fuités (`<|assistant|>`, autres `<|...|>` ASCII, pleine chasse `<｜...｜>`) sont supprimés ; l'XML d'appel de tool MiniMax malformé est supprimé.
- Le texte de type identifiant/jeton est expurgé.
- Les longs blocs peuvent être tronqués.
- Les très grands historiques peuvent abandonner les anciennes lignes ou remplacer une ligne trop volumineuse par `[sessions_history omitted: message too large]`.
- L'inspection brute de la transcription sur disque est la solution de repli lorsque vous avez besoin de la transcription complète octet par octet.

## Politique de tool

Les sous-agents utilisent d'abord le même profil et le même pipeline de stratégie d'outil (tool-policy) que l'agent parent ou l'agent cible. Ensuite, OpenClaw applique la couche de restriction des sous-agents.

Sans `tools.profile` restrictif, les sous-agents obtiennent **tous les outils sauf l'outil de message, les outils de session et les outils système** :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` reste ici aussi une vue de rappel délimitée et nettoyée — ce n'est pas une vidée brute de la transcription.

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

`tools.subagents.tools.allow` est un filtre d'autorisation final. Il peut réduire l'ensemble d'outils déjà résolu, mais il ne peut pas **réintégrer** un outil supprimé par `tools.profile`. Par exemple, `tools.profile: "coding"` inclut `web_search`/`web_fetch` mais pas l'outil `browser`. Pour permettre aux sous-agents du profil de codage d'utiliser l'automatisation du navigateur, ajoutez le navigateur au niveau du profil :

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Utilisez un `agents.list[].tools.alsoAllow: ["browser"]` par agent lorsqu'un seul agent doit bénéficier de l'automatisation du navigateur.

## Simultanéité

Les sous-agents utilisent une file d'attente de processus dédiée :

- **Nom de la file :** `subagent`
- **Simultanéité :** `agents.defaults.subagents.maxConcurrent` (par défaut `8`)

## État actif et récupération

OpenClaw ne considère pas l'absence de `endedAt` comme une preuve permanente qu'un sous-agent est toujours actif. Les exécutions non terminées plus anciennes que la fenêtre d'exécution périmée cessent d'être comptées comme actives/en attente dans `/subagents list`, les résumés de statut, la vérification de fin des descendants et les vérifications de simultanéité par session.

Après un redémarrage de la passerelle, les exécutions restaurées périmées et non terminées sont supprimées, sauf si leur session enfant est marquée `abortedLastRun: true`. Ces sessions enfants interrompues par le redémarrage restent récupérables via le flux de récupération des orphelins de sous-agent, qui envoie un message de reprise synthétique avant d'effacer le marqueur d'interruption.

La récupération automatique au redémarrage est bornée par session enfant. Si le même enfant de sous-agent est accepté pour la récupération des orphelins de manière répétée dans la fenêtre de ré-coincement rapide, OpenClaw persiste une pierre tombale de récupération sur cette session et cesse de la reprendre automatiquement lors des redémarrages ultérieurs. Exécutez `openclaw tasks maintenance --apply` pour réconcilier l'enregistrement de tâche, ou `openclaw doctor --fix` pour effacer les drapeaux de récupération interrompue obsolètes sur les sessions avec pierre tombale.

<Note>
  Si un lancement de sous-agent échoue avec Gateway `PAIRING_REQUIRED` / `scope-upgrade`, vérifiez l'appelant RPC avant de modifier l'état d'appariement. La coordination interne `sessions_spawn` doit se connecter en tant que `client.id: "gateway-client"` avec `client.mode: "backend"` via une authentification par bouclage direct avec jeton/mot de passe partagé ; ce chemin ne dépend pas de la ligne
  de base de l'étendue des périphériques appariés du CLI. Les appelants distants, `deviceIdentity` explicite, les chemins explicites par jeton d'appareil et les clients navigateur/nœud ont toujours besoin d'une approbation d'appareil normale pour les mises à niveau d'étendue.
</Note>

## Arrêt

- L'envoi de `/stop` dans le chat demandeur interrompt la session demandeur et arrête toutes les exécutions de sous-agent actives lancées à partir de celle-ci, en cascade vers les enfants imbriqués.

## Limitations

- L'annonce du sous-agent est sur une base **« best-effort »** (au mieux). Si la passerelle redémarre, le travail d'annonce en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent injecte uniquement `AGENTS.md` et `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `HEARTBEAT.md` ou `BOOTSTRAP.md`). Les sous-agents natifs Codex suivent la même limite : `TOOLS.md` reste dans les instructions héritées du fil de discussion Codex, tandis que la persona, l'identité et les fichiers utilisateur propres au parent sont injectés en tant qu'instructions de collaboration limitées au tour, afin que les enfants ne les dupliquent pas.
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'usage.
- `maxChildrenPerAgent` plafonne le nombre d'enfants actifs par session (par défaut `5`, plage `1–20`).

## Connexes

- [Agents ACP](/fr/tools/acp-agents)
- [Envoi d'agent](/fr/tools/agent-send)
- [Tâches d'arrière-plan](/fr/automation/tasks)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
