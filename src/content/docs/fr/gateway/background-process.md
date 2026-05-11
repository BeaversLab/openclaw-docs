---
summary: "Exécution en arrière-plan de exec et gestion des processus"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Background exec and process tool"
---

# Outil Exec d'arrière-plan et de processus

OpenClaw exécute des commandes shell via le tool `exec` et conserve les tâches de longue durée en mémoire. Le tool `process` gère ces sessions d'arrière-plan.

## outil exec

Paramètres clés :

- `command` (obligatoire)
- `yieldMs` (défaut 10000) : passage automatique en arrière-plan après ce délai
- `background` (bool) : passage immédiat en arrière-plan
- `timeout` (secondes, par défaut `tools.exec.timeoutSec`) : tuer le processus après ce délai d'attente ; définir `timeout: 0` uniquement pour désactiver le délai d'attente du processus exec pour cet appel
- `elevated` (booléen) : exécuter en dehors du bac à sable si le mode élevé est activé/autorisé (`gateway` par défaut, ou `node` lorsque la cible exec est `node`)
- Besoin d'un vrai TTY ? Définissez `pty: true`.
- `workdir`, `env`

Comportement :

- Les exécutions au premier plan renvoient directement la sortie.
- Lorsqu'il est en arrière-plan (explicite ou délai d'attente), l'outil renvoie `status: "running"` + `sessionId` et une courte fin.
- Les exécutions en arrière-plan et `yieldMs` héritent de `tools.exec.timeoutSec` sauf si l'appel fournit un `timeout` explicite.
- La sortie est conservée en mémoire jusqu'à ce que la session soit interrogée ou effacée.
- Si l'outil `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- Les commandes exec générées reçoivent `OPENCLAW_SHELL=exec` pour les règles de shell/profil dépendantes du contexte.
- Pour le travail de longue durée qui commence maintenant, lancez-le une fois et comptez sur le réveil automatique de l'achèvement lorsqu'il est activé et que la commande émet une sortie ou échoue.
- Si le réveil automatique de l'achèvement n'est pas disponible, ou si vous avez besoin d'une confirmation de réussite silencieuse pour une commande qui s'est terminée proprement sans sortie, utilisez `process` pour confirmer l'achèvement.
- N'émulez pas les rappels ou les suivis différés avec des boucles `sleep` ou des sondages répétés ; utilisez cron pour le travail futur.

## Pontage des processus enfants

Lors de la génération de processus enfants de longue durée en dehors des outils exec/process (par exemple, les réinitialisations de CLI ou les assistants de passerelle), attachez l'assistant de pontage de processus enfant afin que les signaux de terminaison soient transférés et que les écouteurs soient détachés lors de la sortie/erreur. Cela évite les processus orphelins sur systemd et maintient un comportement d'arrêt cohérent sur différentes plateformes.

Remplacements d'environnement :

- `PI_BASH_YIELD_MS` : cédant par défaut (ms)
- `PI_BASH_MAX_OUTPUT_CHARS` : limite de sortie en mémoire (caractères)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` : limite de stdout/stderr en attente par flux (caractères)
- `PI_BASH_JOB_TTL_MS` : TTL pour les sessions terminées (ms, compris entre 1 m et 3 h)

Configuration (préférée) :

- `tools.exec.backgroundMs` (par défaut 10000)
- `tools.exec.timeoutSec` (par défaut 1800)
- `tools.exec.cleanupMs` (par défaut 1800000)
- `tools.exec.notifyOnExit` (par défaut true) : mettre en file d'attente un événement système + demander un heartbeat lorsqu'un exec en arrière-plan se termine.
- `tools.exec.notifyOnExitEmptySuccess` (par défaut false) : si vrai, mettre également en file d'attente les événements de complétion pour les exécutions en arrière-plan réussies qui n'ont produit aucune sortie.

## process tool

Actions :

- `list` : sessions en cours d'exécution + terminées
- `poll` : drainer la nouvelle sortie d'une session (signale également l'état de sortie)
- `log` : lire la sortie agrégée (supporte `offset` + `limit`)
- `write` : envoyer stdin (`data`, `eof` facultatif)
- `send-keys` : envoyer des jetons de clé explicites ou des octets à une session prenant en charge PTY
- `submit` : envoyer Entrée / retour chariot à une session prenant en charge PTY
- `paste` : envoyer du texte littéral, éventuellement enveloppé dans le mode de collage entre crochets
- `kill` : terminer une session en arrière-plan
- `clear` : supprimer une session terminée de la mémoire
- `remove` : tuer si en cours d'exécution, sinon effacer si terminé

Notes :

- Seules les sessions en arrière-plan sont répertoriées/persistées en mémoire.
- Les sessions sont perdues lors du redémarrage du processus (aucune persistance sur disque).
- Les journaux de session sont enregistrés dans l'historique du chat uniquement si vous exécutez `process poll/log` et que le résultat de l'outil est enregistré.
- `process` est délimité par agent ; il ne voit que les sessions démarrées par cet agent.
- Utilisez `poll` / `log` pour le statut, les journaux, la confirmation de succès silencieux, ou
  la confirmation de complétion lorsque le réveil automatique de complétion n'est pas disponible.
- Utilisez `write` / `send-keys` / `submit` / `paste` / `kill` lorsque vous avez besoin d'une saisie
  ou d'une intervention.
- `process list` inclut un `name` dérivé (verbe de commande + cible) pour des analyses rapides.
- `process log` utilise une pagination `offset`/`limit` basée sur les lignes.
- Lorsque `offset` et `limit` sont tous deux omis, il renvoie les 200 dernières lignes et inclut une indication de pagination.
- Lorsque `offset` est fourni et que `limit` est omis, il renvoie les lignes de `offset` jusqu'à la fin (non limité à 200).
- Le sondage est pour l'état à la demande, pas pour la planification de boucles d'attente. Si le travail doit
  se produire plus tard, utilisez plutôt cron.

## Exemples

Exécuter une tâche longue et interroger plus tard :

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
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

Coller le texte littéral :

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## Connexes

- [Exec tool](/fr/tools/exec)
- [Exec approvals](/fr/tools/exec-approvals)
