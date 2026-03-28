---
summary: "Exécution d'exec en arrière-plan et gestion des processus"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Outil Exec d'arrière-plan et de processus"
---

# Outil Exec d'arrière-plan et de processus

OpenClaw exécute des commandes shell via l'outil `exec` et conserve les tâches de longue durée en mémoire. L'outil `process` gère ces sessions d'arrière-plan.

## outil exec

Paramètres clés :

- `command` (requis)
- `yieldMs` (défaut 10000) : passage automatique en arrière-plan après ce délai
- `background` (booléen) : passage immédiat en arrière-plan
- `timeout` (secondes, défaut 1800) : tuer le processus après ce délai d'attente
- `elevated` (booléen) : exécuter sur l'hôte si le mode élevé est activé/autorisé
- Besoin d'un vrai TTY ? Définissez `pty: true`.
- `workdir`, `env`

Comportement :

- Les exécutions au premier plan renvoient directement la sortie.
- Lorsqu'il est en arrière-plan (explicite ou délai d'attente), l'outil renvoie `status: "running"` + `sessionId` et une courte fin.
- La sortie est conservée en mémoire jusqu'à ce que la session soit interrogée ou effacée.
- Si l'outil `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- Les commandes exec générées reçoivent `OPENCLAW_SHELL=exec` pour les règles de shell/profil contextuelles.

## Pontage des processus enfants

Lors de la génération de processus enfants de longue durée en dehors des outils exec/process (par exemple, les redémarrages CLI ou les assistants de passerelle), attachez l'assistant de pont de processus enfant afin que les signaux de terminaison soient transmis et les auditeurs détachés à la sortie/erreur. Cela évite les processus orphelins sur systemd et maintient un comportement d'arrêt cohérent sur les plateformes.

Remplacements d'environnement :

- `PI_BASH_YIELD_MS` : rendement par défaut (ms)
- `PI_BASH_MAX_OUTPUT_CHARS` : plafond de sortie en mémoire (caractères)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` : limite de stdout/stderr en attente par flux (caractères)
- `PI_BASH_JOB_TTL_MS` : TTL pour les sessions terminées (ms, borné à 1 m–3 h)

Config (préféré) :

- `tools.exec.backgroundMs` (par défaut 10000)
- `tools.exec.timeoutSec` (par défaut 1800)
- `tools.exec.cleanupMs` (par défaut 1800000)
- `tools.exec.notifyOnExit` (par défaut true) : mettre en file un événement système + demander un battement de cœur (heartbeat) lorsqu'un exec en arrière-plan se termine.
- `tools.exec.notifyOnExitEmptySuccess` (par défaut false) : si vrai, met également en file les événements de fin pour les exécutions réussies en arrière-plan qui n'ont produit aucune sortie.

## process tool

Actions :

- `list` : sessions en cours + terminées
- `poll` : drainer la nouvelle sortie d'une session (rapporte également le statut de sortie)
- `log` : lire la sortie agrégée (prend en charge `offset` + `limit`)
- `write` : envoyer stdin (`data`, `eof` en option)
- `kill` : terminer une session en arrière-plan
- `clear` : supprimer une session terminée de la mémoire
- `remove` : tuer si en cours d'exécution, sinon effacer si terminé

Notes :

- Seules les sessions en arrière-plan sont répertoriées/persistées en mémoire.
- Les sessions sont perdues lors du redémarrage du processus (aucune persistance sur disque).
- Les journaux de session sont uniquement sauvegardés dans l'historique du chat si vous exécutez `process poll/log` et que le résultat de l'outil est enregistré.
- `process` est délimité par agent ; il ne voit que les sessions démarrées par cet agent.
- `process list` inclut un `name` dérivé (verbe de commande + cible) pour des analyses rapides.
- `process log` utilise un `offset`/`limit` basé sur les lignes.
- Lorsque `offset` et `limit` sont tous deux omis, il renvoie les 200 dernières lignes et inclut un indicateur de pagination.
- Lorsque `offset` est fourni et que `limit` est omis, cela retourne de `offset` jusqu'à la fin (non limité à 200).

## Exemples

Exécuter une longue tâche et interroger plus tard :

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
