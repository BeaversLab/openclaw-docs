---
summary: "Conception de la file d'attente de commandes qui sérialise les exécutions de réponses automatiques entrantes"
read_when:
  - Changing auto-reply execution or concurrency
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

## Modes de file d'attente (par canal)

Les messages entrants peuvent diriger l'exécution actuelle, attendre un tour de suite, ou faire les deux :

- `steer` : injecter immédiatement dans l'exécution actuelle (annule les appels d'outil en attente après la prochaine limite d'outil). S'il n'y a pas de diffusion en continu (streaming), revient à followup.
- `followup` : mettre en file d'attente pour le prochain tour d'agent après la fin de l'exécution actuelle.
- `collect` : regrouper tous les messages en file d'attente en un tour de suite **unique** (par défaut). Si les messages ciblent différents canaux/fils, ils sont drainés individuellement pour préserver le routage.
- `steer-backlog` (aka `steer+backlog`) : diriger maintenant **et** conserver le message pour un tour de suite.
- `interrupt` (legacy) : abandonner l'exécution active pour cette session, puis exécuter le message le plus récent.
- `queue` (legacy alias) : identique à `steer`.

Steer-backlog signifie que vous pouvez obtenir une réponse de suivi après l'exécution dirigée, donc
les surfaces de diffusion peuvent sembler contenir des doublons. Préférez `collect`/`steer` si vous voulez
une réponse par message entrant.
Envoyez `/queue collect` en tant que commande autonome (par session) ou définissez `messages.queue.byChannel.discord: "collect"`.

Valeurs par défaut (lorsque non défini dans la configuration) :

- Toutes les surfaces → `collect`

Configurez globalement ou par canal via `messages.queue` :

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## Options de file d'attente

Les options s'appliquent à `followup`, `collect` et `steer-backlog` (et à `steer` lorsqu'il revient à followup) :

- `debounceMs` : attendre le calme avant de commencer un tour de suivi (empêche « continuer, continuer »).
- `cap` : nombre maximum de messages en file d'attente par session.
- `drop` : politique de dépassement (`old`, `new`, `summarize`).

Summarize conserve une courte liste à puces des messages supprimés et l'injecte en tant que prompt de suivi synthétique.
Par défaut : `debounceMs: 1000`, `cap: 20`, `drop: summarize`.

## Remplacements par session

- Envoyez `/queue <mode>` en tant que commande autonome pour stocker le mode de la session actuelle.
- Les options peuvent être combinées : `/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` ou `/queue reset` efface le remplacement de session.

## Portée et garanties

- S'applique aux exécutions de l'agent de réponse automatique sur tous les canaux entrants utilisant le pipeline de réponse de passerelle (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- La voie par défaut (`main`) est à l'échelle du processus pour les battements de cœur entrants + principaux ; définissez `agents.defaults.maxConcurrent` pour autoriser plusieurs sessions en parallèle.
- Des voies supplémentaires peuvent exister (par ex. `cron`, `cron-nested`, `nested`, `subagent`) afin que les tâches en arrière-plan puissent s'exécuter en parallèle sans bloquer les réponses entrantes. Les tours d'agent cron isolés occupent un emplacement `cron` tandis que leur exécution d'agent interne utilise `cron-nested` ; les deux utilisent `cron.maxConcurrentRuns`. Les flux `nested` non cron partagés conservent leur propre comportement de voie. Ces exécutions détachées sont suivies en tant que [tâches en arrière-plan](/fr/automation/tasks).
- Les voies par session garantissent qu'une seule exécution d'agent touche une session donnée à la fois.
- Aucune dépendance externe ni threads de travail en arrière-plan ; pur TypeScript + promesses.

## Dépannage

- Si les commandes semblent bloquées, activez les journaux détaillés et recherchez les lignes « queued for …ms » pour confirmer que la file d'attente se vide.
- Si vous avez besoin de connaître la profondeur de la file d'attente, activez les journaux détaillés et surveillez les lignes de minutage de la file.

## Connexes

- [Gestion de session](/fr/concepts/session)
- [Politique de réessai](/fr/concepts/retry)
