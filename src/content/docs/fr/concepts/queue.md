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

La guidance au sein du même tour est la valeur par défaut. Un prompt qui arrive en cours d'exécution est injecté dans le runtime actif lorsque l'exécution peut accepter la guidance, ce qui évite de lancer une deuxième exécution de session. Si l'exécution active ne peut pas accepter la guidance, OpenClaw attend la fin de l'exécution active avant de lancer le prompt.

## Modes de file d'attente

`/queue` contrôle le comportement des messages entrants normaux lorsqu'une session a déjà une exécution active :

- `steer` : injecte les messages dans le runtime actif. Pi délivre tous les messages de guidance en attente **après que le tour de l'assistant actuel a terminé d'exécuter ses appels d'outils**, avant le prochain appel LLM ; le serveur d'application Codex reçoit un `turn/steer` groupé. Si l'exécution n'est pas en train de diffuser (streaming) ou si la guidance n'est pas disponible, OpenClaw attend la fin de l'exécution active avant de lancer le prompt.
- `followup` : ne pas guider. Mettre en file d'attente chaque message pour un tour d'agent ultérieur après la fin de l'exécution actuelle.
- `collect` : ne pas guider. Fusionner les messages en file d'attente en un tour de suivi **unique** après la fenêtre de silence. Si les messages ciblent différents canaux/fils de discussion, ils sont vidés individuellement pour préserver le routage.
- `interrupt` : annule l'exécution active pour cette session, puis exécute le message le plus récent.

Pour le comportement de minutage et de dépendance spécifique au runtime, voir [Steering queue](/fr/concepts/queue-steering). Pour la commande explicite `/steer <message>`, voir [Steer](/fr/tools/steer).

Configurer globalement ou par canal via `messages.queue` :

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

## Options de file d'attente

Les options s'appliquent à la livraison en file d'attente. `debounceMs` définit également la fenêtre de silence de guidance Codex en mode `steer` :

- `debounceMs` : fenêtre de silence avant de vider les suivis en file d'attente ou de collecter les lots ; en mode Codex `steer`, fenêtre de silence avant d'envoyer le `turn/steer` groupé. Les nombres nus sont des millisecondes ; les unités `ms`, `s`, `m`, `h` et `d` sont acceptées par les options `/queue`.
- `cap` : nombre maximal de messages mis en file d'attente par session. Les valeurs inférieures à `1` sont ignorées.
- `drop: "summarize"` : valeur par défaut. Supprime les entrées les plus anciennes de la file d'attente si nécessaire, conserve des résumés compacts et les injecte sous forme deinvite de suivi synthétique.
- `drop: "old"` : supprime les entrées les plus anciennes de la file d'attente si nécessaire, sans conserver les résumés.
- `drop: "new"` : rejette le message le plus récent lorsque la file d'attente est déjà pleine.

Par défaut : `debounceMs: 500`, `cap: 20`, `drop: summarize`.

## Priorité

Pour la sélection du mode, OpenClaw résout :

1. La priorité au `/queue` en ligne ou stocké par session.
2. `messages.queue.byChannel.<channel>`.
3. `messages.queue.mode`.
4. `steer` par défaut.

Pour les options, les options `/queue` en ligne ou stockées priment sur la configuration. Ensuite,
le debounce spécifique au canal (`messages.queue.debounceMsByChannel`), les valeurs par défaut de
debounce des plug-ins, les options globales `messages.queue` et les valeurs par défaut intégrées sont
appliquées. `cap` et `drop` sont des options globales/session, pas des clés de configuration par canal.

## Remplacements par session

- Envoyez `/queue <steer|followup|collect|interrupt>` comme une commande autonome pour stocker le mode de file pour la session actuelle.
- Les options peuvent être combinées : `/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` ou `/queue reset` efface le remplacement de session.

## Portée et garanties

- S'applique aux exécutions d'agents de réponse automatique sur tous les canaux entrants utilisant le pipeline de réponse de passerelle (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- La voie par défaut (`main`) est à l'échelle du processus pour les battements de cœur entrants + principaux ; définissez `agents.defaults.maxConcurrent` pour permettre plusieurs sessions en parallèle.
- Des voies supplémentaires peuvent exister (par ex. `cron`, `cron-nested`, `nested`, `subagent`) afin que les tâches d'arrière-plan puissent s'exécuter en parallèle sans bloquer les réponses entrantes. Les tours d'agent cron isolés occupent un emplacement `cron` tandis que leur exécution d'agent interne utilise `cron-nested` ; les deux utilisent `cron.maxConcurrentRuns`. Les flux `nested` non cron partagés conservent leur propre comportement de voie. Ces exécutions détachées sont suivies en tant que [tâches d'arrière-plan](/fr/automation/tasks).
- Les voies par session garantissent qu'une seule exécution d'agent traite une session donnée à la fois.
- Aucune dépendance externe ni threads de travail d'arrière-plan ; pur TypeScript + promesses.

## Dépannage

- Si les commandes semblent bloquées, activez les journaux détaillés et recherchez les lignes « queued for ...ms » pour confirmer que la file d'attente se vide.
- Si vous avez besoin de la profondeur de la file d'attente, activez les journaux détaillés et surveillez les lignes de synchronisation de la file d'attente.
- Les exécutions du serveur d'application Codex qui acceptent un tour puis cessent d'émettre des progrès sont interrompues par l'adaptateur Codex afin que la voie de session active puisse être libérée au lieu d'attendre l'expiration du délai d'exécution externe.
- Lorsque le diagnostic est activé, les sessions qui restent dans `processing` au-delà de `diagnostics.stuckSessionWarnMs` sans réponse, outil, statut, bloc ou progression ACP observé sont classées par activité actuelle. Le travail actif est journalisé comme `session.long_running` ; le travail actif sans progression récente est journalisé comme `session.stalled` ; `session.stuck` est réservé à la gestion des sessions périmées sans travail actif, et seul ce chemin peut libérer la voie de session affectée afin que le travail en file d'attente se vide. Les diagnostics `session.stuck` répétés se désengagent tant que la session reste inchangée.

## Connexes

- [Gestion de session](/fr/concepts/session)
- [File d'attente de pilotage](/fr/concepts/queue-steering)
- [Piloter (Steer)](/fr/tools/steer)
- [Politique de réessai](/fr/concepts/retry)
