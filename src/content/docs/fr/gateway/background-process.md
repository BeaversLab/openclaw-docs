---
summary: "Exécution en arrière-plan et gestion des processus"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Tool d'exécution en arrière-plan et de processus"
---

OpenClaw exécute des commandes shell via le tool OpenClaw`exec` et conserve les tâches de longue durée en mémoire. Le tool `process` gère ces sessions en arrière-plan.

## exec tool

Paramètres clés :

- `command` (requis)
- `yieldMs` (défaut 10000) : mise en arrière-plan automatique après ce délai
- `background` (bool) : mise en arrière-plan immédiate
- `timeout` (secondes, défaut `tools.exec.timeoutSec`) : tuer le processus après ce délai d'attente ; définir `timeout: 0` uniquement pour désactiver le délai d'attente du processus exec pour cet appel
- `elevated` (bool) : exécuter en dehors du bac à sable si le mode élevé est activé/autorisé (`gateway` par défaut, ou `node` lorsque la cible exec est `node`)
- Besoin d'un vrai TTY ? Définissez `pty: true`.
- `workdir`, `env`

Comportement :

- Les exécutions au premier plan renvoient la sortie directement.
- Lorsqu'il est en arrière-plan (explicite ou délai d'attente), le tool renvoie `status: "running"` + `sessionId` et une courte queue.
- Les exécutions en arrière-plan et `yieldMs` héritent de `tools.exec.timeoutSec` sauf si l'appel fournit un `timeout` explicite.
- La sortie est conservée en mémoire jusqu'à ce que la session soit interrogée ou effacée.
- Si le tool `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- Les commandes exec générées reçoivent `OPENCLAW_SHELL=exec` pour les règles de shell/profil sensibles au contexte.
- Pour un travail de longue durée qui commence maintenant, lancez-le une fois et comptez sur le
  réveil automatique de fin lorsqu'il est activé et que la commande émet une sortie ou échoue.
- Si le réveil par achèvement automatique n'est pas disponible, ou si vous avez besoin d'une confirmation de réussite silencieuse
  pour une commande qui s'est terminée proprement sans sortie, utilisez `process`
  pour confirmer l'achèvement.
- N'émulez pas les rappels ou les suivis différés avec des boucles `sleep` ou des
  sondages répétés ; utilisez cron pour le travail futur.

## Pontage des processus fils

Lors de la création de processus enfants longs en dehors des outils d'exécution/traitement (par exemple, les redémarrages CLI ou les assistants de passerelle), attachez l'assistant de pont de processus enfant afin que les signaux de terminaison soient transmis et que les écouteurs soient détachés en cas de sortie/d'erreur. Cela évite les processus orphelins sur systemd et conserve un comportement d'arrêt cohérent sur les différentes plateformes.

Remplacements d'environnement :

- `PI_BASH_YIELD_MS` : cession par défaut (ms)
- `PI_BASH_MAX_OUTPUT_CHARS` : limite de sortie en mémoire (caractères)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` : plafond de stdout/stderr en attente par flux (caractères)
- `PI_BASH_JOB_TTL_MS` : TTL pour les sessions terminées (ms, borné à 1m–3h)
- `OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS` : seuil de sortie inactive avant que les sessions d'arrière-plan inscriptibles ne soient marquées comme étant probablement en attente d'entrée (par défaut 15000 ms)

Configuration (préférée) :

- `tools.exec.backgroundMs` (par défaut 10000)
- `tools.exec.timeoutSec` (par défaut 1800)
- `tools.exec.cleanupMs` (par défaut 1800000)
- `tools.exec.notifyOnExit` (par défaut true) : mettre en file d'attente un événement système + demander un battement de cœur (heartbeat) lorsqu'un exec en arrière-plan se termine.
- `tools.exec.notifyOnExitEmptySuccess` (par défaut false) : si true, met également en file d'attente les événements de fin pour les exécutions en arrière-plan réussies qui n'ont produit aucune sortie.

## process tool

Actions :

- `list` : sessions en cours d'exécution + terminées
- `poll` : drainer la nouvelle sortie d'une session (signale également l'état de sortie)
- `log` : lire la sortie agrégée et afficher les conseils de récupération d'entrée (prend en charge `offset` + `limit`)
- `write` : envoyer stdin (`data`, `eof` facultatif)
- `send-keys` : envoyer des jetons de clé explicites ou des octets à une session basée sur PTY
- `submit` : envoyer Entrée / retour chariot à une session basée sur PTY
- `paste` : envoyer du texte littéral, facultativement enveloppé dans le mode de collage entre crochets
- `kill` : terminer une session d'arrière-plan
- `clear` : supprimer une session terminée de la mémoire
- `remove` : tuer si en cours d'exécution, sinon effacer si terminé

Notes :

- Seules les sessions en arrière-plan sont répertoriées/persistées en mémoire.
- Les sessions sont perdues lors du redémarrage du processus (aucune persistance sur disque).
- Les journaux de session ne sont sauvegardés dans l'historique de chat que si vous exécutez `process poll/log` et que le résultat de l'outil est enregistré.
- `process` est limité par agent ; il ne voit que les sessions démarrées par cet agent.
- Utilisez `poll` / `log` pour le statut, les journaux, la confirmation de réussite silencieuse, ou
  la confirmation de fin lorsque le réveil automatique de fin est indisponible.
- Utilisez `log`CLI avant de récupérer une CLI interactive afin que la transcription actuelle,
  l'état stdin et l'indice d'attente d'entrée soient visibles ensemble.
- Utilisez `write` / `send-keys` / `submit` / `paste` / `kill` lorsque vous avez besoin d'une entrée
  ou d'une intervention.
- `process list` inclut un `name` dérivé (verbe de commande + cible) pour des analyses rapides.
- `process list`, `poll` et `log` signalent `waitingForInput` uniquement
  lorsque la session possède encore un stdin accessible en écriture et est restée inactive plus longtemps que le
  seuil d'attente d'entrée.
- `process log` utilise un `offset`/`limit` basé sur les lignes.
- Lorsque `offset` et `limit` sont tous deux omis, il retourne les 200 dernières lignes et inclut un indice de pagination.
- Lorsque `offset` est fourni et que `limit` est omis, il retourne de `offset` jusqu'à la fin (non limité à 200).
- Le polling est pour l'état à la demande, pas pour la planification de boucles d'attente. Si le travail doit
  avoir lieu plus tard, utilisez plutôt cron.

## Exemples

Exécuter une tâche longue et interroger plus tard :

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

Inspecter une session interactive avant d'envoyer une entrée :

```json
{ "tool": "process", "action": "log", "sessionId": "<id>" }
```

Démarrer immédiatement en arrière-plan :

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

Envoyer stdin :

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

Envoyer les touches PTY :

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

Soumettre la ligne actuelle :

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

Coller du texte littéral :

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## Connexes

- [Outil d'exécution](/fr/tools/exec)
- [Approbations d'exécution](/fr/tools/exec-approvals)
