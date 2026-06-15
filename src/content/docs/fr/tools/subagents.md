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
lorsqu'ils ont terminé, **annoncent** leur résultat au channel de discussion
demandeur. Chaque exécution de sous-agent est suivie comme une
[tâche d'arrière-plan](/fr/automation/tasks).

Objectifs principaux :

- Paralléliser le travail de « recherche / tâche longue / tool lent » sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation de session + sandboxing optionnel).
- Rendre la surface du tool difficile à utiliser à mauvais escient : les sous-agents n'obtiennent **pas** les tools de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

<Note>
  **Note de coût :** chaque sous-agent possède son propre contexte et sa propre utilisation de jetons par défaut. Pour les tâches lourdes ou répétitives, définissez un modèle moins coûteux pour les sous-agents et gardez votre agent principal sur un modèle de meilleure qualité. Configurez via `agents.defaults.subagents.model` ou des redéfinitions par agent. Lorsqu'un agent enfant a réellement
  besoin de la transcription actuelle du demandeur, l'agent peut demander `context: "fork"` pour ce lancement spécifique. Les sessions de sous-agent liées aux fils ont par défaut la valeur `context: "fork"` car elles bifurquent la conversation actuelle vers un fil de suivi.
</Note>

## Commande slash

Utilisez `/subagents` pour inspecter les exécutions de sous-agents pour la **session actuelle** :

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` affiche les métadonnées d'exécution (statut, horodatages, id de session,
chemin de transcription, nettoyage). Utilisez `sessions_history` pour une vue de rappel
bornée et filtrée par sécurité ; inspectez le chemin de transcription sur le disque lorsque vous
avez besoin de la transcription brute complète.

### Contrôles de liaison de fil

Ces commandes fonctionnent sur les channels qui prennent en charge les liaisons de fils persistantes.
Voir [Channels supportant les fils](#thread-supporting-channels) ci-dessous.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportement de lancement

Les agents lancent des sous-agents en arrière-plan avec `sessions_spawn`. Les achèvements de sous-agents
retournent sous forme d'événements internes de session parente ; l'agent parent/demandeur décide
si une mise à jour visible par l'utilisateur est nécessaire.

<AccordionGroup>
  <Accordion title="Non-blocking, push-based completion">
    - `sessions_spawn` est non bloquant ; il renvoie un identifiant d'exécution immédiatement.
    - Une fois terminé, le sous-agent rapporte le résultat à la session parente/demanderesse.
    - Les tours d'agent qui nécessitent les résultats enfants doivent appeler `sessions_yield` après avoir lancé le travail requis. Cela termine le tour actuel et permet aux événements de terminaison d'arriver en tant que prochain message visible par le modèle.
    - La terminaison est basée sur le push (poussée). Une fois lancé, n'interrogez **pas** `/subagents list`, `sessions_list` ou `sessions_history` en boucle juste pour attendre qu'il se termine ; n'inspectez le statut que à la demande pour le débogage.
    - La sortie de l'enfant est un rapport/une preuve pour que l'agent demandeur puisse le synthétiser. Ce n'est pas un texte d'instruction rédigé par l'utilisateur et il ne peut pas remplacer la politique système, développeur ou utilisateur.
    - À la terminaison, OpenClaw fait de son mieux pour fermer les onglets/processus de navigateur suivis ouverts par cette session de sous-agent avant que le flux de nettoyage d'annonce ne continue.

  </Accordion>
  <Accordion title="Livraison des complétions">
    - OpenClaw renvoie les complétions à la session demanderesse via un tour `agent` avec une clé d'idempotence stable.
    - Si l'exécution du demandeur est toujours active, OpenClaw essaie d'abord de réveiller/guider cette exécution au lieu de démarrer un second chemin de réponse visible.
    - Si un demandeur actif ne peut pas être réveillé, OpenClaw revient à une passation agent-demandeur avec le même contexte de complétion au lieu d'abandonner l'annonce.
    - Une passation réussie au parent complète la livraison du sous-agent même lorsque le parent décide qu'aucune mise à jour visible pour l'utilisateur n'est nécessaire.
    - Les sous-agents natifs ne reçoivent pas l'outil de message. Ils renvoient du texte d'assistant brut à l'agent parent/demandeur ; les réponses visibles par l'homme sont gérées par la stratégie de livraison normale de l'agent parent/demandeur.
    - Si la passation directe ne peut pas être utilisée, elle revient au routage par file d'attente.
    - Si le routage par file d'attente n'est toujours pas disponible, l'annonce est réessayée avec un court délai exponentiel avant l'abandon final.
    - La livraison des complétions conserve la route résolue du demandeur : les routes de complétion liées au fil ou à la conversation l'emportent si disponibles ; si l'origine de la complétion ne fournit qu'un canal, OpenClaw remplit la cible/le compte manquant à partir de la route résolue de la session demanderesse (`lastChannel` / `lastTo` / `lastAccountId`) pour que la livraison directe fonctionne toujours.

  </Accordion>
  <Accordion title="Métadonnées de transfert de complétion">
    Le transfert de complétion vers la session du demandeur est un contexte interne généré lors de l'exécution (et non un texte rédigé par l'utilisateur) et inclut :

    - `Result` — le dernier texte de réponse `assistant` visible provenant de l'enfant. La sortie des outils/toolResult n'est pas intégrée aux résultats de l'enfant. Les exécutions ayant échoué de manière terminale ne réutilisent pas le texte de réponse capturé.
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`.
    - Des statistiques compactes d'exécution/jetons.
    - Une instruction de révision indiquant à l'agent demandeur de vérifier le résultat avant de décider si la tâche originale est terminée.
    - Des conseils de suite indiquant à l'agent demandeur de poursuivre la tâche ou d'enregistrer une suite lorsque le résultat de l'enfant laisse place à plus d'action.
    - Une instruction de mise à jour finale pour le chemin sans action supplémentaire, rédigée avec la voix normale de l'assistant sans transférer de métadonnées internes brutes.

  </Accordion>
  <Accordion title="Modes et runtime ACP">
    - `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
    - Utilisez `info`/`log` pour inspecter les détails et la sortie après l'achèvement.
    - Pour les sessions persistantes liées aux fils, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
    - Si le channel demandeur ne prend pas en charge les liaisons de fils, utilisez `mode: "run"` au lieu de réessayer des combinaisons liées aux fils impossibles.
    - Pour les sessions de harnais ACP (Claude Code, Gemini CLI, OpenCode, ou Codex ACP/acpx explicite), utilisez `sessions_spawn` avec `runtime: "acp"` lorsque l'outil annonce ce runtime. Consultez le [modèle de livraison ACP](/fr/tools/acp-agents#delivery-model) lors du débogage des complétions ou des boucles agent-à-agent. Lorsque le plugin `codex` est activé, le contrôle de chat/fil Codex devrait préférer `/codex ...` à ACP, sauf si l'utilisateur demande explicitement ACP/acpx.
    - OpenClaw masque `runtime: "acp"` jusqu'à ce que ACP soit activé, que le demandeur ne soit pas sandboxed, et qu'un plugin backend tel que `acpx` soit chargé. `runtime: "acp"` attend un identifiant de harnais ACP externe, ou une entrée `agents.list[]` avec `runtime.type="acp"` ; utilisez le runtime de sous-agent par défaut pour les agents de configuration OpenClaw normaux depuis `agents_list`.

  </Accordion>
</AccordionGroup>

## Modes de contexte

Les sous-agents natifs démarrent isolés, sauf si l'appelant demande explicitement à forker la transcription actuelle.

| Mode       | Quand l'utiliser                                                                                                                                                | Comportement                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `isolated` | Recherche fraîche, implémentation indépendante, travail d'outil lent, ou tout ce qui peut être brièvement décrit dans le texte de la tâche                      | Crée une transcription enfant propre. C'est la valeur par défaut et permet de réduire l'utilisation des jetons. |
| `fork`     | Travail qui dépend de la conversation actuelle, des résultats d'outils précédents, ou d'instructions nuancées déjà présentes dans la transcription du demandeur | Branche la transcription du demandeur dans la session enfant avant le démarrage de l'enfant.                    |

Utilisez `fork` avec parcimonie. Il est destiné à la délégation sensible au contexte, et non à remplacer la rédaction d'une invite de tâche claire.

## Tool : `sessions_spawn`

Démarre une exécution de sous-agent avec `deliver: false` sur la voie globale `subagent`,
alors exécute une étape d'annonce et publie la réponse d'annonce sur le channel de chat demandeur.

La disponibilité dépend de la stratégie d'outil effective de l'appelant. Les profils `coding` et
`full` exposent `sessions_spawn` par défaut. Le profil `messaging` ne
le fait pas ; ajoutez `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"` pour les agents qui doivent déléguer
le travail. Les stratégies d'autorisation/refus par canal/groupe, fournisseur, bac à sable et par agent peuvent
toujours supprimer l'outil après l'étape du profil. Utilisez `/tools` depuis la même
session pour confirmer la liste effective des outils.

**Valeurs par défaut :**

- **Modèle :** les sous-agents natifs héritent de l'appelant, sauf si vous définissez `agents.defaults.subagents.model` (ou `agents.list[].subagents.model` par agent). Les créations d'exécution du runtime ACP utilisent le même modèle de sous-agent configuré lorsqu'il est présent ; sinon, le harnais ACP conserve sa propre valeur par défaut. Un `sessions_spawn.model` explicite l'emporte toujours.
- **Réflexion :** les sous-agents natifs héritent de l'appelant, sauf si vous définissez `agents.defaults.subagents.thinking` (ou `agents.list[].subagents.thinking` par agent). Les créations d'exécution du runtime ACP appliquent également `agents.defaults.models["provider/model"].params.thinking` pour le modèle sélectionné. Un `sessions_spawn.thinking` explicite l'emporte toujours.
- **Délai d'exécution :** OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` lorsqu'il est défini ; sinon, il revient à `0` (pas de délai). `sessions_spawn` n'accepte pas les substitutions de délai par appel.
- **Livraison de la tâche :** les sous-agents natifs reçoivent la tâche déléguée dans leur premier message `[Subagent Task]` visible. Le prompt système du sous-agent contient les règles d'exécution et le contexte de routage, et non un doublon caché de la tâche.

Les créations de sous-agents natifs acceptées incluent les métadonnées du modèle enfant résolu dans
le résultat de l'outil : `resolvedModel` contient la référence du modèle appliquée et
`resolvedProvider` contient le préfixe du fournisseur lorsque la référence en a un.

### Mode d'invite de délégation

`agents.defaults.subagents.delegationMode` contrôle uniquement les indications de prompt ; il ne modifie pas la stratégie d'outil et n'applique pas la délégation.

- `suggest` (par défaut) : conserve l'incitation de prompt standard pour utiliser des sous-agents pour les travaux plus volumineux ou plus lents.
- `prefer` : indiquez à l'agent principal de rester réactif et de déléguer tout ce qui dépasse une réponse directe via `sessions_spawn`.

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
  Identifiant stable facultatif pour identifier un enfant spécifique dans la sortie d'état ultérieure. Doit correspondre à `[a-z][a-z0-9_-]{0,63}` et ne peut pas être des cibles réservées telles que `last` ou `all`.
</ParamField>
<ParamField path="label" type="string">
  Libellé lisible par l'homme facultatif.
</ParamField>
<ParamField path="agentId" type="string">
  Génère sous un autre identifiant d'agent configuré lorsqu'il est autorisé par `subagents.allowAgents`.
</ParamField>
<ParamField path="cwd" type="string">
  Répertoire de travail de la tâche facultatif pour l'exécution enfant. Les sous-agents natifs chargent toujours les fichiers d'amorçage à partir de l'espace de travail de l'agent cible ; `cwd` ne modifie que l'endroit où les outils d'exécution et les harnais CLI effectuent le travail délégué.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` est uniquement destiné aux harnais ACP externes (`claude`, `droid`, `gemini`, `opencode`, ou Codex ACP/acpx explicitement demandé) et pour les entrées `agents.list[]` dont le `runtime.type` est `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  ACP uniquement. Reprend une session de harnais ACP existante lorsque `runtime: "acp"` ; ignoré pour les générations de sous-agents natifs.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  ACP uniquement. Diffuse la sortie de l'exécution ACP vers la session parente lorsque `runtime: "acp"` ; à omettre pour les générations de sous-agents natifs.
</ParamField>
<ParamField path="model" type="string">
  Remplace le modèle du sous-agent. Les valeurs invalides sont ignorées et le sous-agent s'exécute sur le modèle par défaut avec un avertissement dans le résultat de l'outil.
</ParamField>
<ParamField path="thinking" type="string">
  Remplace le niveau de réflexion pour l'exécution du sous-agent.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Lorsque `true`, demande une liaison de thread de canal pour cette session de sous-agent.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si `thread: true` et `mode` sont omis, la valeur par défaut devient `session`. `mode: "session"` nécessite `thread: true`.
  Si la liaison de thread n'est pas disponible pour le canal demandeur, utilisez `mode: "run"` à la place.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via un renommage).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rejette la génération sauf si l'exécution de l'enfant cible est isolée (sandboxed).
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` crée une branche de la transcription actuelle du demandeur dans la session enfant. Sous-agents natifs uniquement. Les générations liées à un thread sont par défaut `fork` ; les générations sans thread sont par défaut `isolated`.
</ParamField>

<Warning>`sessions_spawn` n'accepte **pas** les paramètres de livraison vers le channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Les sub-agents natifs rapportent leur dernier tour d'assistant au demandeur ; la livraison externe reste avec l'agent parent/demandeur.</Warning>

### Noms des tâches et ciblage

`taskName` est un identifiant d'orchestration orienté model, pas une clé de session.
Utilisez-le pour des noms d'enfants stables tels que `review_subagents`,
`linux_validation` ou `docs_update` lorsqu'un coordinateur pourrait avoir besoin d'inspecter
cet enfant plus tard.

La résolution de cible accepte les correspondances exactes de `taskName` et les préfixes
non ambigus. La correspondance est limitée à la même fenêtre de cibles actives/récentes utilisée
par les cibles numérotées `/subagents`, donc un enfant terminé obsolète ne rend pas
un identifiant réutilisé ambigu. Si deux enfants actifs ou récents partagent le même
`taskName`, la cible est ambiguë ; utilisez plutôt l'index de la liste, la clé de session ou
l'ID d'exécution.

Les cibles réservées `last` et `all` ne sont pas des valeurs `taskName` valides
car elles ont déjà des significations de contrôle.

## Tool : `sessions_yield`

Termine le tour actuel du modèle et attend que les événements d'exécution, principalement
les événements d'achèvement des sous-agents, arrivent comme le prochain message. Utilisez-le après
avoir lancé le travail enfant requis lorsque le demandeur ne peut pas fournir de réponse
finale avant que ces achèvements n'arrivent.

`sessions_yield` est la primitive d'attente. Ne le remplacez pas par des boucles
de polling sur `subagents`, `sessions_list`, `sessions_history`, le shell
`sleep` ou le polling de processus juste pour détecter la fin de l'enfant.

N'utilisez `sessions_yield` que lorsque la liste effective des tools de la session l'inclut.
Certains profils de tools minimaux ou personnalisés peuvent exposer `sessions_spawn` et
`subagents` sans exposer `sessions_yield` ; dans ce cas, n'inventez pas
une boucle de polling juste pour attendre la fin.

Lorsque des enfants actifs existent, OpenClaw injecte un bloc de prompt `Active Subagents` compact généré à l'exécution dans les tours normaux afin que le demandeur puisse voir les sessions enfants actuelles, les IDs d'exécution, les statuts, les étiquettes, les tâches et les alias `taskName` sans avoir à interroger. Les champs de tâche et d'étiquette dans ce bloc sont cités en tant que données, et non en tant qu'instructions, car ils peuvent provenir d'arguments de génération fournis par l'utilisateur ou le modèle.

## Outil : `subagents`

Liste les exécutions de sous-agents générées appartenant à la session du demandeur. Elle est limitée
au demandeur actuel ; un enfant ne peut voir que ses propres enfants contrôlés.

Utilisez `subagents` pour le statut à la demande et le débogage. Utilisez `sessions_yield` pour attendre les événements de finition.

## Sessions liées aux fils (Thread-bound sessions)

Lorsque les liaisons de fils sont activées pour un canal, un sous-agent peut rester lié
à un fil afin que les messages de suivi de l'utilisateur dans ce fil continuent d'être acheminés vers la
même session de sous-agent.

### Canaux supportant les fils

Tout canal avec un adaptateur de liaison de session peut prendre en charge les sessions de sous-agent persistantes liées aux fils de discussion (`sessions_spawn` avec `thread: true`).
Les adaptateurs fournis incluent actuellement les fils de discussion Discord, les fils de discussion Matrix, les sujets de forum Telegram et les liaisons de conversation actuelle pour Feishu.
Utilisez les clés de configuration `threadBindings` par canal pour l'activation, les délais d'attente et `spawnSessions`.

### Flux rapide

<Steps>
  <Step title="Spawn">`sessions_spawn` avec `thread: true` (et facultativement `mode: "session"`).</Step>
  <Step title="Bind">OpenClaw crée ou lie un fil de discussion à cette cible de session dans le canal actif.</Step>
  <Step title="Route follow-ups">Les réponses et les messages de suivi dans ce fil sont routés vers la session liée.</Step>
  <Step title="Inspect timeouts">Utilisez `/session idle` pour inspecter/mettre à jour l'auto-défocus par inactivité et `/session max-age` pour contrôler la limite stricte.</Step>
  <Step title="Detach">Utilisez `/unfocus` pour détacher manuellement.</Step>
</Steps>

### Contrôles manuels

| Commande           | Effet                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Lier le fil actuel (ou en créer un) à une cible de sous-agent/session                        |
| `/unfocus`         | Supprimer la liaison pour le fil lié actuel                                                  |
| `/agents`          | Lister les exécutions actives et l'état de liaison (`thread:<id>` ou `unbound`)              |
| `/session idle`    | Inspecter/mettre à jour le focus automatique par inactivité (fils liés focalisés uniquement) |
| `/session max-age` | Inspecter/mettre à jour la limite stricte (fils liés focalisés uniquement)                   |

### Commutateurs de configuration

- **Par défaut global :** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Les **clés de substitution de canal et de liaison automatique de spawn** sont spécifiques à l'adaptateur. Voir [Canaux prenant en charge les fils](#thread-supporting-channels) ci-dessus.

Voir [Référence de configuration](/fr/gateway/configuration-reference) et
[Commandes slash](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

### Liste blanche

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Liste des IDs d'agents configurés qui peuvent être ciblés via un `agentId` explicite (`["*"]` autorise n'importe quelle cible configurée). Par défaut : uniquement l'agent demandeur. Si vous définissez une liste et que vous voulez toujours que le demandeur se lance lui-même avec `agentId`, incluez l'ID du demandeur dans la liste.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Liste blanche d'agents cibles configurés par défaut utilisée lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloque les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil). Substitution par agent : `agents.list[].subagents.requireAgentId`.
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  Délai d'attente par appel pour les tentatives de livraison d'annonce de passerelle `agent`. Les valeurs sont des millisecondes entières positives et sont limitées au maximum de la minuterie sécurisée pour la plate-forme. Les nouvelles tentatives transitoires peuvent rendre l'attente d'annonce totale plus longue qu'un délai d'attente configuré.
</ParamField>

Si la session du demandeur est isolée (sandboxed), `sessions_spawn` rejette les cibles
qui s'exécuteraient sans isolation.

### Découverte

Utilisez `agents_list` pour voir quels ids d'agent sont actuellement autorisés pour `sessions_spawn`. La réponse inclut le modèle effectif de chaque agent listé et les métadonnées d'exécution intégrées afin que les appelants puissent distinguer OpenClaw, le serveur d'application Codex et autres runtimes natifs configurés.

Les entrées `allowAgents` doivent pointer vers des ids d'agent configurés dans `agents.list[]`. `["*"]` signifie n'importe quel agent cible configuré plus le demandeur. Si une configuration d'agent est supprimée mais que son id reste dans `allowAgents`, `sessions_spawn` rejette cet id et `agents_list` l'omet. Exécutez `openclaw doctor --fix` pour nettoyer les entrées obsolètes de la liste d'autorisation, ou ajoutez une entrée `agents.list[]` minimale lorsque la cible doit rester générable tout en héritant des paramètres par défaut.

### Archive automatique

- Les sessions de sous-agents sont archivées automatiquement après `agents.defaults.subagents.archiveAfterMinutes` (défaut `60`).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via le renommage).
- L'archive automatique est sur une base de best-effort (meilleur effort) ; les minuteurs en attente sont perdus si la passerelle redémarre.
- Les délais d'expiration d'exécution configurés **ne** font pas l'objet d'un archivage automatique ; ils arrêtent uniquement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archive automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.
- Le nettoyage du navigateur est distinct du nettoyage de l'archive : les onglets/processus de navigateur suivis sont fermés sur une base de best-effort lorsque l'exécution se termine, même si l'enregistrement de la transcription/session est conservé.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas générer leurs propres sous-agents (`maxSpawnDepth: 1`). Définissez `maxSpawnDepth: 2` pour activer un niveau d'imbrication — le **modèle d'orchestrateur** : principal → sous-agent orchestrateur → sous-sous-agents ouvriers.

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn (0 = no timeout)
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
  **Conseil opérationnel :** lancez le travail enfant une seule fois et attendez les événements de finition au lieu de créer des boucles d'interrogation autour des commandes de sommeil `sessions_list`, `sessions_history`, `/subagents list`, ou `exec`. `sessions_list` et `/subagents list` maintiennent les relations de session enfants concentrées sur le travail en cours — les enfants actifs restent
  attachés, les enfants terminés restent visibles pendant une courte période récente, et les liens enfants périmés en magasin uniquement sont ignorés après leur fenêtre de fraîcheur. Cela empêche les anciennes métadonnées `spawnedBy` / `parentSessionKey` de ressusciter des enfants fantômes après un redémarrage. Si un événement de finition d'enfant arrive après que vous ayez déjà envoyé la réponse
  finale, le suivi correct est le jeton silencieux exact `NO_REPLY` / `no_reply`.
</Note>

### Politique d'outil par profondeur

- Le rôle et la portée de contrôle sont écrits dans les métadonnées de session au moment de la création (spawn). Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`) :** obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` afin qu'il puisse générer des enfants et inspecter leur statut. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`) :** aucun outil de session (comportement par défaut actuel).
- **Profondeur 2 (travailleur feuille) :** aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Ne peut pas générer d'enfants supplémentaires.

### Limite de création par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent`
(par défaut `5`) enfants actifs à la fois. Cela empêche une expansion incontrôlée à partir d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se répercute sur leurs enfants de profondeur 2.

## Authentification

L'authentification du sous-agent est résolue par **agent id**, et non par le type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir du `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours** ; les profils de l'agent priment sur les profils principaux en cas de conflit.

La fusion est additive, les profils principaux sont donc toujours disponibles comme
secours. Une authentification totalement isolée par agent n'est pas encore prise en charge.

## Annoncer

Les sous-agents font rapport via une étape d'annonce :

- L'étape d'annonce s'exécute à l'intérieur de la session du sous-agent (et non de la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Si le dernier texte de l'assistant est le jeton silencieux exact `NO_REPLY` / `no_reply`, la sortie de l'annonce est supprimée même s'il existait une progression visible antérieure.

La livraison dépend de la profondeur du demandeur :

- Les sessions de requête de niveau supérieur utilisent un appel de suivi `agent` avec une livraison externe (`deliver=true`).
- Les sessions de sous-agent de requête imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session.
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

| Champ               | Source                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Source              | `subagent` ou `cron`                                                                                               |
| Ids de session      | Clé/id de session enfant                                                                                           |
| Type                | Type d'annonce + libellé de tâche                                                                                  |
| Statut              | Dérivé du résultat de l'exécution (`success`, `error`, `timeout`, ou `unknown`) — **non** déduit du texte du model |
| Contenu du résultat | Dernier texte de l'assistant visible depuis l'enfant                                                               |
| Suivi               | Instruction décrivant quand répondre ou rester silencieux                                                          |

Les exécutions ayant échoué de manière terminale signalent l'état d'échec sans rejouer le
texte de réponse capturé. La sortie du tool/toolResult n'est pas promue dans le texte du résultat de l'enfant.

### Ligne de statistiques

Les payloads d'annonce incluent une ligne de statistiques à la fin (même lorsqu'ils sont enveloppés) :

- Durée d'exécution (p. ex. `runtime 5m12s`).
- Utilisation des jetons (entrée/sortie/total).
- Coût estimé lorsque la tarification du model est configurée (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId`, et le chemin de la transcription afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque.

Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses orientées utilisateur
doivent être réécrites avec la voix normale de l'assistant.

### Pourquoi préférer `sessions_history`

`sessions_history` est le chemin d'orchestration le plus sûr :

- La mémoire de l'assistant est d'abord normalisée : balises de réflexion supprimées ; échafaudage `<relevant-memories>` / `<relevant_memories>` supprimé ; blocs de payload XML d'appel de tool en texte brut (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`) supprimés, y compris les payloads tronqués qui ne se ferment jamais proprement ; échafaudage d'appel/résultat de tool rétrogradé et marqueurs de contexte historique supprimés ; jetons de contrôle de model fuyants (`<|assistant|>`, autre ASCII `<|...|>`, pleine largeur `<｜...｜>`) supprimés ; XML d'appel de tool MiniMax malformé supprimé.
- Le texte de type identifiant/jeton est expurgé.
- Les longs blocs peuvent être tronqués.
- Les historiques très volumineux peuvent abandonner les anciennes lignes ou remplacer une ligne trop volumineuse par `[sessions_history omitted: message too large]`.
- L'inspection brute de la transcription sur disque est la solution de repli lorsque vous avez besoin de la transcription complète octet par octet.

## Politique de tool

Les sous-agents utilisent d'abord le même profil et le même pipeline de stratégie d'outil (tool-policy) que l'agent parent ou l'agent cible. Ensuite, OpenClaw applique la couche de restriction des sous-agents.

Sans `tools.profile` restrictif, les sous-agents obtiennent **tous les tools sauf le
tool de message, les tools de session et les tools système** :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` reste ici aussi une vue de rappel bornée et nettoyée — ce n'est pas une vidange brute de transcription.

Lorsque `maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent en outre `sessions_spawn`, `subagents`, `sessions_list` et `sessions_history` afin qu'ils puissent gérer leurs enfants.

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

Utilisez `agents.list[].tools.alsoAllow: ["browser"]` par agent lorsqu'un seul agent doit bénéficier de l'automatisation du navigateur.

## Simultanéité

Les sous-agents utilisent une file d'attente de processus dédiée :

- **Nom de voie :** `subagent`
- **Simultanéité :** `agents.defaults.subagents.maxConcurrent` (par défaut `8`)

## État actif et récupération

OpenClaw ne considère pas l'absence de `endedAt` comme une preuve permanente qu'un sous-agent est encore en vie. Les exécutions inachevées plus anciennes que la fenêtre d'exécution périmée cessent d'être comptées comme actives/en attente dans `/subagents list`, les résumés de statut, le blocage de l'achèvement des descendants et les vérifications de simultanéité par session.

Après un redémarrage de la passerelle, les exécutions restaurées inachevées et périmées sont élaguées, sauf si leur session enfant est marquée `abortedLastRun: true`. Ces sessions enfants interrompues par redémarrage restent récupérables via le flux de récupération des orphelins de sous-agent, qui envoie un message de reprise synthétique avant d'effacer le marqueur d'interruption.

La récupération automatique au redémarrage est bornée par session enfant. Si le même enfant de sous-agent est accepté pour la récupération d'orphelin à plusieurs reprises dans la fenêtre de ré-enclenchement rapide, OpenClaw persiste une pierre tombale de récupération sur cette session et cesse de la reprendre automatiquement lors des redémarrages ultérieurs. Exécutez `openclaw tasks maintenance --apply` pour réconcilier l'enregistrement de tâche, ou `openclaw doctor --fix` pour effacer les indicateurs de récupération interrompus périmés sur les sessions avec pierre tombale.

<Note>
  Si la création d'un sous-agent échoue avec le Gateway Gateway`PAIRING_REQUIRED` / `scope-upgrade`RPC, vérifiez l'appelant RPC avant de modifier l'état d'appariement. La coordination interne `sessions_spawn` doit se connecter en tant que `client.id: "gateway-client"` avec `client.mode: "backend"`CLI via une authentification directe par boucle locale avec jeton/mot de passe partagé ; ce chemin ne
  dépend pas de la base de référence de l'étendue des appareils appariés du CLI. Les appelants distants, les `deviceIdentity` explicites, les chemins explicites par jeton d'appareil et les clients navigateur/node ont toujours besoin de l'approbation normale de l'appareil pour les mises à niveau d'étendue.
</Note>

## Arrêt

- Envoyer `/stop` dans le chat demandeur annule la session demandeur et arrête toutes les exécutions actives de sous-agents lancées à partir de celle-ci, en cascade vers les enfants imbriqués.

## Limitations

- L'annonce du sous-agent est sur une base **« best-effort »** (au mieux). Si la passerelle redémarre, le travail d'annonce en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de la passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md` et `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `HEARTBEAT.md`, ou `BOOTSTRAP.md`). Les sous-agents natifs Codex suivent la même limite : `TOOLS.md` reste dans les instructions du fil Codex héritées, tandis que les fichiers de persona, d'identité et d'utilisateur propres au parent sont injectés en tant que instructions de collaboration limitées au tour, afin que les enfants ne les dupliquent pas.
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'usage.
- `maxChildrenPerAgent` limite le nombre d'enfants actifs par session (par défaut `5`, plage `1–20`).

## Connexes

- [Agents ACP](/fr/tools/acp-agents)
- [Agent send](/fr/tools/agent-send)
- [Tâches d'arrière-plan](/fr/automation/tasks)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
