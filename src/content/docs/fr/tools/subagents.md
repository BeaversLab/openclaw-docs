---
summary: "Lancez des exécutions d'agent d'arrière-plan isolées qui annoncent leurs résultats au canal de discussion demandeur"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sous-agents"
sidebarTitle: "Sous-agents"
---

Les sous-agents sont des exécutions d'agent d'arrière-plan lancées à partir d'une exécution d'agent existante.
Ils s'exécutent dans leur propre session (`agent:<agentId>:subagent:<uuid>`) et,
lorsqu'ils ont terminé, **annoncent** leur résultat au canal de discussion
demandeur. Chaque exécution de sous-agent est suivie en tant que
[tâche d'arrière-plan](/fr/automation/tasks).

Objectifs principaux :

- Paralléliser le travail de « recherche / tâche longue / tool lent » sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation de session + sandboxing optionnel).
- Rendre la surface du tool difficile à utiliser à mauvais escient : les sous-agents n'obtiennent **pas** les tools de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

<Note>
  **Note sur les coûts :** chaque sous-agent possède son propre contexte et sa propre utilisation de tokens par défaut. Pour les tâches lourdes ou répétitives, définissez un model moins coûteux pour les sous-agents et conservez votre agent principal sur un model de meilleure qualité. Configurez via `agents.defaults.subagents.model` ou des redéfinitions par agent. Lorsqu'un enfant a réellement
  besoin de la transcription actuelle du demandeur, l'agent peut demander `context: "fork"` pour ce lancement spécifique.
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

`/subagents info` affiche les métadonnées d'exécution (statut, horodatages, id de session,
chemin de transcription, nettoyage). Utilisez `sessions_history` pour une vue de rappel
bornée et filtrée par sécurité ; inspectez le chemin de transcription sur le disque lorsque vous
avez besoin de la transcription brute complète.

### Contrôles de liaison de fil

Ces commandes fonctionnent sur les channels qui prennent en charge les liaisons de fil persistantes.
Voir [Channels prenant en charge les fils](#thread-supporting-channels) ci-dessous.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportement de lancement

`/subagents spawn` démarre un sous-agent d'arrière-plan en tant que commande utilisateur (pas un
relais interne) et envoie une mise à jour finale d'achèvement au canal de discussion
demandeur lorsque l'exécution est terminée.

<AccordionGroup>
  <Accordion title="Non-blocking, push-based completion">
    - La commande de spawn (génération) est non bloquante ; elle renvoie immédiatement un identifiant d'exécution.
    - Une fois terminé, le sous-agent annonce un message de résumé/résultat au channel de discussion demandeur.
    - L'achèvement se fait par poussée (push-based). Une fois généré, n'interrogez `/subagents list`, `sessions_list` ou `sessions_history` en boucle uniquement pour attendre qu'il se termine ; inspectez l'état uniquement à la demande pour le débogage ou une intervention.
    - Une fois terminé, OpenClaw fait de son mieux pour fermer les onglets/processus de navigateur suivis ouverts par cette session de sous-agent avant que le flux de nettoyage de l'annonce ne continue.
  </Accordion>
  <Accordion title="Manual-spawn delivery resilience">
    - OpenClaw essaie d'abord la livraison directe `agent` avec une clé d'idempotence stable.
    - Si la livraison directe échoue, elle revient au routage par file d'attente.
    - Si le routage par file d'attente n'est toujours pas disponible, l'annonce est réessayée avec un court délai exponentiel avant l'abandon final.
    - La livraison de l'achèvement conserve la route demandeur résolue : les routes d'achèvement liées au thread ou à la conversation prévalent lorsqu'elles sont disponibles ; si l'origine de l'achèvement ne fournit qu'un channel, OpenClaw remplit la cible/le compte manquant à partir de la route résolue de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe fonctionne toujours.
  </Accordion>
  <Accordion title="Completion handoff metadata">
    La transmission de l'achèvement à la session du demandeur est un contexte interne
    généré à l'exécution (pas du texte rédigé par l'utilisateur) et comprend :

    - `Result` — texte de réponse `assistant` visible le plus récent, sinon le texte nettoyé le plus récent de tool/toolResult. Les exécutions ayant échoué de manière terminale ne réutilisent pas le texte de réponse capturé.
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`.
    - Statistiques compactes d'exécution/jetons.
    - Une instruction de livraison indiquant à l'agent demandeur de reformuler avec une voix d'assistant normale (ne pas transférer les métadonnées internes brutes).

  </Accordion>
  <Accordion title="Modes et runtime ACP">
    - `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
    - Utilisez `info`/`log` pour inspecter les détails et la sortie après l'achèvement.
    - `/subagents spawn` est le mode ponctuel (`mode: "run"`). Pour les sessions persistantes liées au fil, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
    - Pour les sessions de harnais ACP (Claude Code, Gemini CLI, OpenCode, ou Codex ACP/acpx explicite), utilisez `sessions_spawn` avec `runtime: "acp"` lorsque l'outil annonce ce runtime. Voir [Modèle de livraison ACP](/fr/tools/acp-agents#delivery-model) lors du débogage des complétions ou des boucles agent-à-agent. Lorsque le plugin `codex` est activé, le contrôle de discussion/fil Codex devrait préférer `/codex ...` à ACP, sauf si l'utilisateur demande explicitement ACP/acpx.
    - OpenClaw masque `runtime: "acp"` jusqu'à ce que ACP soit activé, que le demandeur ne soit pas sandboxé, et qu'un plugin backend tel que `acpx` soit chargé. `runtime: "acp"` attend un id de harnais ACP externe, ou une entrée `agents.list[]` avec `runtime.type="acp"` ; utilisez le runtime de sous-agent par défaut pour les agents de configuration OpenClaw normaux depuis `agents_list`.
  </Accordion>
</AccordionGroup>

## Modes de contexte

Les sous-agents natifs démarrent isolés, sauf si l'appelant demande explicitement à forker la transcription actuelle.

| Mode       | Quand l'utiliser                                                                                                                                                | Comportement                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `isolated` | Recherche fraîche, implémentation indépendante, travail d'outil lent, ou tout ce qui peut être brièvement décrit dans le texte de la tâche                      | Crée une transcription enfant propre. C'est la valeur par défaut et permet de réduire l'utilisation des jetons. |
| `fork`     | Travail qui dépend de la conversation actuelle, des résultats d'outils précédents, ou d'instructions nuancées déjà présentes dans la transcription du demandeur | Branche la transcription du demandeur dans la session enfant avant le démarrage de l'enfant.                    |

Utilisez `fork` avec parcimonie. Il est destiné à la délégation contextuelle, non à un remplacement de la rédaction d'une invite de tâche claire.

## Outil : `sessions_spawn`

Lance une exécution de sous-agent avec `deliver: false` sur la voie `subagent` globale, puis exécute une étape d'annonce et publie la réponse d'annonce sur le canal de chat demandeur.

La disponibilité dépend de la politique d'outil effective de l'appelant. Les profils `coding` et `full` exposent `sessions_spawn` par défaut. Le profil `messaging` ne le fait pas ; ajoutez `tools.alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"]` or use `tools.profile: "coding"` pour les agents qui doivent déléguer le travail. Les stratégies allow/deny de canal/groupe, de fournisseur, de sandbox et par agent peuvent toujours supprimer l'outil après l'étape du profil. Utilisez `/tools` de la même session pour confirmer la liste effective des outils.

**Valeurs par défaut :**

- **Modèle :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.model` (ou `agents.list[].subagents.model` par agent) ; un `sessions_spawn.model` explicite l'emporte toujours.
- **Réflexion :** hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.thinking` (ou `agents.list[].subagents.thinking` par agent) ; un `sessions_spawn.thinking` explicite l'emporte toujours.
- **Délai d'exécution :** si `sessions_spawn.runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` lorsqu'il est défini ; sinon, il revient à `0` (pas de délai).

### Paramètres de l'outil

<ParamField path="task" type="string" required>
  La description de la tâche pour le sous-agent.
</ParamField>
<ParamField path="label" type="string">
  Libellé lisible par l'homme en option.
</ParamField>
<ParamField path="agentId" type="string">
  Lancé sous un autre identifiant d'agent lorsqu'autorisé par `subagents.allowAgents`.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` est uniquement pour les harnais ACP externes (`claude`, `droid`, `gemini`, `opencode`, ou Codex ACP/acpx explicitement demandé) et pour les entrées `agents.list[]` dont le `runtime.type` est `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  ACP uniquement. Reprend une session de harnais ACP existante lorsque `runtime: "acp"`; ignoré pour les créations de sous-agents natifs.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  ACP uniquement. Diffuse la sortie de l'exécution ACP vers la session parente lorsque `runtime: "acp"`; à omettre pour les créations de sous-agents natifs.
</ParamField>
<ParamField path="model" type="string">
  Remplace le modèle du sous-agent. Les valeurs invalides sont ignorées et le sous-agent s'exécute sur le modèle par défaut avec un avertissement dans le résultat de l'outil.
</ParamField>
<ParamField path="thinking" type="string">
  Remplace le niveau de réflexion pour l'exécution du sous-agent.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Par défaut, `agents.defaults.subagents.runTimeoutSeconds` si défini, sinon `0`. Lorsqu'il est défini, l'exécution du sous-agent est abandonnée après N secondes.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Lorsque `true`, demande la liaison du fil de discussion du canal pour cette session de sous-agent.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si `thread: true` et `mode` sont omis, la valeur par défaut devient `session`. `mode: "session"` nécessite `thread: true`.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archive immédiatement après l'annonce (garde tout de même la transcription via renommage).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rejette la création sauf si l'exécution enfant cible est isolée (sandboxed).
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` duplique la transcription actuelle du demandeur dans la session enfant. Sous-agents natifs uniquement. Utilisez `fork` uniquement lorsque l'enfant a besoin de la transcription actuelle.
</ParamField>

<Warning>`sessions_spawn` n'accepte **pas** les paramètres de livraison via channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Pour la livraison, utilisez `message`/`sessions_send` depuis le run généré.</Warning>

## Sessions liées aux fils de discussion

Lorsque les liaisons de fils (thread bindings) sont activées pour un channel, un sous-agent peut rester lié
à un fil de sorte que les messages de suivi des utilisateurs dans ce fil continuent d'être acheminés vers la
même session de sous-agent.

### Channels prenant en charge les fils

**Discord** est actuellement le seul channel pris en charge. Il prend en charge
les sessions persistantes de sous-agents liées aux fils (`sessions_spawn` avec
`thread: true`), les contrôles manuels des fils (`/focus`, `/unfocus`, `/agents`,
`/session idle`, `/session max-age`) et les clés d'adaptateur
`channels.discord.threadBindings.enabled`,
`channels.discord.threadBindings.idleHours`,
`channels.discord.threadBindings.maxAgeHours` et
`channels.discord.threadBindings.spawnSubagentSessions`.

### Flux rapide

<Steps>
  <Step title="Générer">`sessions_spawn` avec `thread: true` (et optionnellement `mode: "session"`).</Step>
  <Step title="Lier">OpenClaw crée ou lie un fil à cette cible de session dans le channel actif.</Step>
  <Step title="Acheminer les suivis">Les réponses et les messages de suivi dans ce fil sont acheminés vers la session liée.</Step>
  <Step title="Inspecter les délais d'expiration">Utilisez `/session idle` pour inspecter/mettre à jour la défocalisation automatique par inactivité et `/session max-age` pour contrôler la limite stricte.</Step>
  <Step title="Détacher">Utilisez `/unfocus` pour détacher manuellement.</Step>
</Steps>

### Contrôles manuels

| Commande           | Effet                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Lier le fil actuel (ou en créer un) à une cible de sous-agent/session                                 |
| `/unfocus`         | Supprimer la liaison pour le thread lié actuel                                                        |
| `/agents`          | Lister les exécutions actives et l'état de la liaison (`thread:<id>` ou `unbound`)                    |
| `/session idle`    | Inspecter/mettre à jour l'auto-perte de focus en cas d'inactivité (threads liés focalisés uniquement) |
| `/session max-age` | Inspecter/mettre à jour la limite stricte (threads liés focalisés uniquement)                         |

### Commutateurs de configuration

- **Par défaut global :** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Les **clés de substitution de canal et d'auto-liaison au spawn** sont spécifiques à l'adaptateur. Voir [Canaux prenant en charge les threads](#thread-supporting-channels) ci-dessus.

Voir [Référence de configuration](/fr/gateway/configuration-reference) et
[Commandes slash](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

### Liste blanche

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Liste des ids d'agents qui peuvent être ciblés via un `agentId` explicite (`["*"]` autorise n'importe lequel). Par défaut : seulement l'agent demandeur. Si vous définissez une liste et souhaitez toujours que le demandeur puisse se lancer lui-même avec `agentId`, incluez l'identifiant du demandeur dans la liste.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Liste blanche d'agent cible par défaut utilisée lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloquer les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil). Substitution par agent : `agents.list[].subagents.requireAgentId`.
</ParamField>

Si la session demandeur est sandboxed, `sessions_spawn` rejette les cibles
qui s'exécuteraient sans sandbox.

### Discovery

Utilisez `agents_list` pour voir quels ids d'agents sont actuellement autorisés pour
`sessions_spawn`. La réponse inclut le modèle effectif et les métadonnées d'exécution intégrées de chaque agent répertorié afin que les appelants puissent distinguer PI, le serveur d'application Codex
et autres runtimes natifs configurés.

### Archivage automatique

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut `60`).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via le renommage).
- L'archivage automatique est basé sur le « best-effort » ; les minuteries en attente sont perdues si la passerelle redémarre.
- `runTimeoutSeconds` n'effectue **pas** l'archivage automatique ; il arrête simplement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.
- Le nettoyage du navigateur est distinct du nettoyage de l'archive : les onglets/processus de navigateur suivis sont fermés au mieux lorsque l'exécution se termine, même si l'enregistrement de la transcription/session est conservé.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas créer leurs propres sous-agents
(`maxSpawnDepth: 1`). Définissez `maxSpawnDepth: 2` pour activer un niveau d'imbrication — le **modèle d'orchestrateur** : principal → sous-agent orchestrateur →
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
      },
    },
  },
}
```

### Niveaux de profondeur

| Profondeur | Forme de la clé de session                   | Rôle                                                             | Peut créer ?                      |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| 0          | `agent:<id>:main`                            | Agent principal                                                  | Toujours                          |
| 1          | `agent:<id>:subagent:<uuid>`                 | Sous-agent (orchestrateur lorsque la profondeur 2 est autorisée) | Seulement si `maxSpawnDepth >= 2` |
| 2          | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sous-sous-agent (travailleur feuille)                            | Jamais                            |

### Chaîne d'annonces

Les résultats remontent la chaîne :

1. Le travailleur de profondeur 2 termine → annonce à son parent (orchestrateur de profondeur 1).
2. L'orchestrateur de profondeur 1 reçoit l'annonce, synthétise les résultats, termine → annonce au principal.
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur.

Chaque niveau ne voit que les annonces de ses enfants directs.

<Note>
  **Directives opérationnelles :** lancez le travail enfant une fois et attendez les événements de finition au lieu de construire des boucles d'interrogation autour des commandes de sommeil `sessions_list`, `sessions_history`, `/subagents list` ou `exec`. `sessions_list` et `/subagents list` maintiennent les relations de session enfant focalisées sur le travail en cours — les enfants actifs
  restent attachés, les enfants terminés restent visibles pendant une courte période récente, et les liens enfants périmés en magasin seul sont ignorés après leur fenêtre de fraîcheur. Cela empêche les anciennes métadonnées `spawnedBy` / `parentSessionKey` de faire ressusciter des enfants fantômes après redémarrage. Si un événement de finition d'enfant arrive après que vous ayez déjà envoyé la
  réponse finale, la suite correcte est le jeton silencieux exact `NO_REPLY` / `no_reply`.
</Note>

### Stratégie d'outil par profondeur

- Le rôle et le périmètre de contrôle sont inscrits dans les métadonnées de la session au moment de la génération. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`) :** obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` afin qu'il puisse gérer ses enfants. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`) :** aucun outil de session (comportement actuel par défaut).
- **Profondeur 2 (travailleur feuille) :** aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Impossible de générer d'autres enfants.

### Limite de génération par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent`
(défaut `5`) enfants actifs à la fois. Cela empêche une divergence incontrôlable
depuis un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants
de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.
- `/subagents kill all` arrête tous les sous-agents pour le demandeur et se propage.

## Authentification

L'authentification du sous-agent est résolue par **agent id**, et non par le type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir du `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours** ; les profils de l'agent prévalent sur les profils principaux en cas de conflit.

La fusion est additive, les profils principaux sont donc toujours disponibles en tant que secours. Une authentification totalement isolée par agent n'est pas encore prise en charge.

## Annonce

Les sous-agents font rapport via une étape d'annonce :

- L'étape d'annonce s'exécute dans la session du sous-agent (et non dans la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Si le dernier texte de l'assistant est exactement le jeton silencieux `NO_REPLY` / `no_reply`, la sortie de l'annonce est supprimée même s'il y avait une progression visible antérieure.

La livraison dépend de la profondeur du demandeur :

- Les sessions de demandeur de premier niveau utilisent un appel de suivi `agent` avec une livraison externe (`deliver=true`).
- Les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session.
- Si une session de sous-agent demandeur imbriquée a disparu, OpenClaw revient au demandeur de cette session si disponible.

Pour les sessions de demandeur de premier niveau, la livraison directe en mode completion résout d'abord toute route de conversation/thread liée et le remplacement de hook, puis remplit les champs de cible de channel manquants à partir de la route stockée de la session du demandeur. Cela maintient les completions sur le bon chat/sujet même lorsque l'origine de la completion identifie uniquement le channel.

L'agrégation des complétions enfants est limitée à l'exécution du demandeur actuel lors de la construction des résultats de complétion imbriqués, empêchant les sorties enfants obsolètes de l'exécution précédente de fuir dans l'annonce actuelle. Les réponses d'annonce préservent le routage thread/sujet lorsque disponible sur les adaptateurs de channel.

### Contexte de l'annonce

Le contexte de l'annonce est normalisé en un bloc d'événement interne stable :

| Champ               | Source                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Source              | `subagent` ou `cron`                                                                                                 |
| Ids de session      | Clé/id de session enfant                                                                                             |
| Type                | Type d'annonce + libellé de tâche                                                                                    |
| Statut              | Dérivé du résultat de l'exécution (`success`, `error`, `timeout` ou `unknown`) — et **non** déduit du texte du model |
| Contenu du résultat | Dernier texte de l'assistant visible, sinon le dernier texte tool/toolResult nettoyé                                 |
| Suivi               | Instruction décrivant quand répondre ou rester silencieux                                                            |

Les exécutions ayant échoué de manière terminale signalent le statut d'échec sans rejouer le texte de réponse capturé. En cas d'expiration, si l'enfant n'a effectué que des appels de tool, l'annonce peut réduire cet historique en un bref résumé de progrès partiel au lieu de rejouer la sortie brute du tool.

### Ligne de statistiques

Les payloads d'annonce incluent une ligne de statistiques à la fin (même lorsqu'ils sont enveloppés) :

- Durée d'exécution (ex. `runtime 5m12s`).
- Utilisation des tokens (entrée/sortie/total).
- Coût estimé lorsque la tarification du model est configurée (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId` et le chemin de la transcription afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque.

Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses destinées à l'utilisateur doivent être réécrites avec la voix normale de l'assistant.

### Pourquoi préférer `sessions_history`

`sessions_history` est le chemin d'orchestration le plus sûr :

- L'historique de l'assistant est d'abord normalisé : balises de réflexion supprimées ; échafaudage `<relevant-memories>` / `<relevant_memories>` supprimé ; blocs de payload XML d'appel de tool en texte brut (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`) supprimés, y compris les payloads tronqués qui ne se ferment jamais proprement ; échafaudage d'appel/résultat de tool rétrogradé et marqueurs de contexte historique supprimés ; tokens de contrôle de model fuités (`<|assistant|>`, autres `<|...|>` ASCII, `<｜...｜>` pleine largeur) supprimés ; XML d'appel de tool MiniMax malformé supprimé.
- Le texte de type identifiant/token est censuré.
- Les longs blocs peuvent être tronqués.
- Les historiques très volumineux peuvent supprimer les anciennes lignes ou remplacer une ligne trop volumineuse par `[sessions_history omitted: message too large]`.
- L'inspection de la transcription brute sur disque est la solution de repli lorsque vous avez besoin de la transcription complète octet par octet.

## Stratégie d'outil

Les sous-agents utilisent d'abord le même profil et le même pipeline de stratégie d'outil que l'agent parent ou cible. Ensuite, OpenClaw applique la couche de restriction des sous-agents.

Sans `tools.profile` restrictif, les sous-agents obtiennent **tous les outils à l'exception des outils de session** et des outils système :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` reste ici aussi une vue de rappel limitée et nettoyée — ce n'est pas une vidange brute de la transcription.

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

`tools.subagents.tools.allow` est un filtre final d'autorisation uniquement. Il peut réduire l'ensemble d'outils déjà résolu, mais il ne peut pas **rétablir** un outil supprimé par `tools.profile`. Par exemple, `tools.profile: "coding"` inclut `web_search`/`web_fetch` mais pas l'outil `browser`. Pour permettre aux sous-agents de profil de codage d'utiliser l'automatisation du navigateur, ajoutez le navigateur au niveau du profil :

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

Les sous-agents utilisent une file d'attente dédiée dans le processus :

- **Nom de la file :** `subagent`
- **Simultanéité :** `agents.defaults.subagents.maxConcurrent` (par défaut `8`)

## Vivacité et récupération

OpenClaw ne traite pas l'absence de `endedAt` comme une preuve permanente qu'un sous-agent est toujours en vie. Les exécutions non terminées plus anciennes que la fenêtre d'exécution obsolète cessent d'être comptées comme actives/en attente dans `/subagents list`, les résumés de statut, la porte de finition des descendants et les vérifications de simultanéité par session.

Après un redémarrage de la passerelle, les exécutions restaurées obsolètes et non terminées sont nettoyées, sauf si leur session enfant est marquée `abortedLastRun: true`. Ces sessions enfants interrompues par le redémarrage rest récupérables via le flux de récupération des orphelins de sous-agent, qui envoie un message de reprise synthétique avant d'effacer le marqueur d'interruption.

<Note>
  Si la création d'un sous-agent échoue avec le Gateway `PAIRING_REQUIRED` / `scope-upgrade`, vérifiez l'appelant RPC avant de modifier l'état d'appariement. La coordination interne `sessions_spawn` doit se connecter en tant que `client.id: "gateway-client"` avec `client.mode: "backend"` via une authentification directe par boucle locale avec jeton/mot de passe partagé ; ce chemin ne dépend pas de
  la ligne de base de la portée des appareils appariés du CLI. Les appelants distants, `deviceIdentity` explicites, les chemins explicites par jeton d'appareil et les clients navigateur/nœud ont toujours besoin d'une approbation d'appareil normale pour les mises à niveau de portée.
</Note>

## Arrêt

- Envoyer `/stop` dans le chat du demandeur interrompt la session du demandeur et arrête toutes les exécutions actives de sous-agents lancées à partir de celle-ci, en cascade vers les enfants imbriqués.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.

## Limitations

- L'annonce du sous-agent est effectuée sur la base du **meilleur effort**. Si la passerelle redémarre, le travail d'« annonce en retour » en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md` + `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, ou `BOOTSTRAP.md`).
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'utilisation.
- `maxChildrenPerAgent` limite le nombre d'enfants actifs par session (par défaut `5`, plage `1–20`).

## Connexes

- [Agents ACP](/fr/tools/acp-agents)
- [Envoi d'agent](/fr/tools/agent-send)
- [Tâches d'arrière-plan](/fr/automation/tasks)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
