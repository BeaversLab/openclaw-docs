---
summary: "Modes de file d'attente de réponse automatique, valeurs par défaut et remplacements par session"
read_when:
  - Changing auto-reply execution or concurrency
  - Explaining /queue modes or message steering behavior
title: "File d'attente de commandes"
---

Nous sérialisons les exécutions de réponses automatiques entrantes (tous les canaux) via une petite file d'attente en processus pour éviter que plusieurs exécutions d'agents n'entrent en collision, tout en permettant toujours un parallélisme sûr entre les sessions.

## Pourquoi

- Les exécutions de réponses automatiques peuvent être coûteuses (appels LLM) et peuvent entrer en collision lorsque plusieurs messages entrants arrivent à proximité.
- La sérialisation évite la concurrence pour les ressources partagées (fichiers de session, journaux, stdin CLI) et réduit les risques de limites de taux en amont.

## Fonctionnement

- Une file d'attente FIFO consciente des voies (lane-aware) draine chaque voie avec une limite de concurrence configurable (1 par défaut pour les voies non configurées ; main par défaut à 4, subagent à 8).
- `runEmbeddedPiAgent` met en file d'attente par **clé de session** (voie `session:<key>`) pour garantir une seule exécution active par session.
- Chaque exécution de session est ensuite mise en file d'attente dans une **voie globale** (`main` par défaut), de sorte que le parallélisme global est plafonné par `agents.defaults.maxConcurrent`.
- Lorsque la journalisation détaillée est activée, les exécutions en file d'attente émettent un court avis si elles ont attendu plus de ~2s avant de commencer.
- Les indicateurs de frappe se déclenchent toujours immédiatement lors de la mise en file d'attente (lorsqu'ils sont pris en charge par le canal), de sorte que l'expérience utilisateur reste inchangée pendant que nous attendons notre tour.

## Valeurs par défaut

Lorsqu'ils ne sont pas définis, toutes les surfaces de canal entrantes utilisent :

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

`steer` est la valeur par défaut car elle maintient le tour de model actif réactif sans
démarrer une deuxième exécution de session. Elle vide tous les messages de direction qui sont arrivés
avant la prochaine limite de model. Si l'exécution en cours ne peut pas accepter la direction,
OpenClaw revient à une entrée de file d'attente de suivi.

## Modes de file d'attente

Les messages entrants peuvent diriger l'exécution en cours, attendre un tour de suivi, ou les deux :

- `steer` : mettre en file d'attente les messages de direction dans le runtime actif. Pi délivre tous les messages de direction en attente **une fois que le tour de l'assistant actuel a fini d'exécuter ses tool calls**, avant le prochain appel LLM ; le serveur d'application Codex reçoit un `turn/steer` groupé. Si l'exécution n'est pas en cours de streaming actif ou si la direction n'est pas disponible, OpenClaw revient à une entrée de file d'attente de suivi.
- `queue` (legacy) : ancienne direction un par un. Pi délivre un message de direction en file d'attente à chaque limite de model ; le serveur d'application Codex reçoit des requêtes `turn/steer` séparées. Préférez `steer` sauf si vous avez besoin de l'ancien comportement sérialisé.
- `followup` : mettre en file d'attente chaque message pour un tour d'agent ultérieur après la fin de l'exécution en cours.
- `collect` : regrouper les messages en file d'attente en un tour de suivi **unique** après la fenêtre de silence. Si les messages ciblent différents canaux/fils, ils sont vidés individuellement pour préserver le routage.
- `steer-backlog` (aka `steer+backlog`) : diriger maintenant **et** conserver le même message pour un tour de suivi.
- `interrupt` (legacy) : abandonner l'exécution active pour cette session, puis exécuter le message le plus récent.

Steer-backlog signifie que vous pouvez obtenir une réponse de suivi après l'exécution dirigée, de sorte que
les surfaces de diffusion peuvent ressembler à des doublons. Préférez `collect`/`steer` si vous voulez
une réponse par message entrant.

Pour le comportement de synchronisation et de dépendance spécifique à l'exécution, voir
[Steering queue](/fr/concepts/queue-steering). Pour la commande explicite `/steer <message>`
, voir [Steer](/fr/tools/steer).

Configurez globalement ou par channel via `messages.queue` :

```json5
{
  messages: {
    queue: {
      mode: "steer",
      debounceMs: 500,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## Options de la file d'attente

Les options s'appliquent à `followup`, `collect` et `steer-backlog` (et à `steer` ou à l'ancien `queue` lorsque la direction revient à followup) :

- `debounceMs` : période de silence avant le drainage des followups en file d'attente. Les nombres simples sont des millisecondes ; les unités `ms`, `s`, `m`, `h` et `d` sont acceptées par les options `/queue`.
- `cap` : nombre maximal de messages en file d'attente par session. Les valeurs inférieures à `1` sont ignorées.
- `drop: "summarize"` : par défaut. Supprimez les entrées en file d'attente les plus anciennes si nécessaire, gardez des résumés compacts et injectez-les en tant que prompt de suivi synthétique.
- `drop: "old"` : supprimez les entrées en file d'attente les plus anciennes si nécessaire, sans conserver les résumés.
- `drop: "new"` : rejetez le message le plus récent lorsque la file d'attente est déjà pleine.

Par défaut : `debounceMs: 500`, `cap: 20`, `drop: summarize`.

## Priorité

Pour la sélection du mode, OpenClaw résout :

1. Remplacement `/queue` en ligne ou stocké par session.
2. `messages.queue.byChannel.<channel>`.
3. `messages.queue.mode`.
4. `steer` par défaut.

Pour les options, les options `/queue` en ligne ou stockées l'emportent sur la configuration. Ensuite, le debounce spécifique au canal (`messages.queue.debounceMsByChannel`), les valeurs par défaut du debounce du plugin, les options globales `messages.queue` et les valeurs par défaut intégrées sont appliquées. `cap` et `drop` sont des options globales/session, et non des clés de configuration par canal.

## Remplacements par session

- Envoyez `/queue <mode>` comme une commande autonome pour stocker le mode pour la session actuelle.
- Les options peuvent être combinées : `/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` ou `/queue reset` efface le remplacement de session.

## Portée et garanties

- S'applique aux exécutions d'agents de réponse automatique sur tous les canaux entrants qui utilisent le pipeline de réponse passerelle (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- La voie par défaut (`main`) est propre au processus pour les battements de cœur entrants + principaux ; définissez `agents.defaults.maxConcurrent` pour autoriser plusieurs sessions en parallèle.
- Des voies supplémentaires peuvent exister (p. ex. `cron`, `cron-nested`, `nested`, `subagent`) afin que les tâches d'arrière-plan puissent s'exécuter en parallèle sans bloquer les réponses entrantes. Les tours d'agents cron isolés occupent un emplacement `cron` pendant que leur exécution d'agent interne utilise `cron-nested` ; les deux utilisent `cron.maxConcurrentRuns`. Les flux `nested` non cron partagés conservent leur propre comportement de voie. Ces exécutions détachées sont suivies en tant que [tâches d'arrière-plan](/fr/automation/tasks).
- Les voies par session garantissent qu'une seule exécution d'agent touche une session donnée à la fois.
- Aucune dépendance externe ni thread de travail d'arrière-plan ; pur TypeScript + promesses.

## Dépannage

- Si les commandes semblent bloquées, activez les journaux détaillés et recherchez les lignes "queued for ...ms" pour confirmer que la file d'attente se vide.
- Si vous avez besoin de la profondeur de la file d'attente, activez les journaux détaillés et surveillez les lignes de timing de la file d'attente.
- Les exécutions du serveur d'application Codex qui acceptent un tour puis cessent d'émettre des progrès sont interrompues par l'adaptateur Codex afin que la voie de session active puisse être libérée au lieu d'attendre le délai d'expiration de l'exécution externe.
- Lorsque les diagnostics sont activés, les sessions qui restent dans `processing` au-delà de `diagnostics.stuckSessionWarnMs` sans réponse, outil, état, bloc ou progrès ACP observé sont classées selon leur activité actuelle. Le travail actif est consigné comme `session.long_running` ; le travail actif sans progrès récent est consigné comme `session.stalled` ; `session.stuck` est réservé à la gestion comptable des sessions obsolètes sans travail actif, et seul ce chemin peut libérer la voie de session affectée pour que le travail en file d'attente se draine. Les diagnostics répétés `session.stuck` s'espacent pendant que la session reste inchangée.

## Connexes

- [Gestion des sessions](/fr/concepts/session)
- [File d'attente de pilotage](/fr/concepts/queue-steering)
- [Pilotage (Steer)](/fr/tools/steer)
- [Stratégie de réessai](/fr/concepts/retry)
