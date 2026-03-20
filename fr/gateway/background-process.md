---
summary: "Exécution exec en arrière-plan et gestion des processus"
read_when:
  - Ajout ou modification du comportement exec en arrière-plan
  - Débogage des tâches exec de longue durée
title: "Background Exec and Process Tool"
---

# Background Exec + Process Tool

OpenClaw exécute des commandes shell via l'outil `exec` et conserve les tâches de longue durée en mémoire. L'outil `process` gère ces sessions en arrière-plan.

## exec tool

Paramètres clés :

- `command` (requis)
- `yieldMs` (par défaut 10000) : mise en arrière-plan automatique après ce délai
- `background` (booléen) : mettre immédiatement en arrière-plan
- `timeout` (secondes, par défaut 1800) : tuer le processus après ce délai d'expiration
- `elevated` (booléen) : exécuter sur l'hôte si le mode élevé est activé/autorisé
- Besoin d'un vrai TTY ? Définissez `pty: true`.
- `workdir`, `env`

Comportement :

- Les exécutions au premier plan renvoient la sortie directement.
- Lorsqu'il est en arrière-plan (explicite ou délai dépassé), l'outil renvoie `status: "running"` + `sessionId` et une courte fin.
- La sortie est conservée en mémoire jusqu'à ce que la session soit interrogée ou effacée.
- Si l'outil `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- Les commandes exec générées reçoivent `OPENCLAW_SHELL=exec` pour les règles shell/profile contextuelles.

## Child process bridging

Lors du lancement de processus enfants de longue durée en dehors des outils exec/process (par exemple, redémarrages CLI ou assistants de passerelle), attachez l'assistant de pont child-process afin que les signaux de terminaison soient transmis et les auditeurs détachés à la sortie/erreur. Cela évite les processus orphelins sur systemd et maintient un comportement d'arrêt cohérent sur toutes les plateformes.

Remplacements d'environnement :

- `PI_BASH_YIELD_MS` : rendement par défaut (ms)
- `PI_BASH_MAX_OUTPUT_CHARS` : limite de sortie en mémoire (caractères)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` : limite stdout/stderr en attente par flux (caractères)
- `PI_BASH_JOB_TTL_MS` : TTL pour les sessions terminées (ms, limité à 1 min–3 h)

Config (préféré) :

- `tools.exec.backgroundMs` (par défaut 10000)
- `tools.exec.timeoutSec` (par défaut 1800)
- `tools.exec.cleanupMs` (par défaut 1800000)
- `tools.exec.notifyOnExit` (par défaut true) : mettre en file un événement système + demander un heartbeat lorsqu'un exec en arrière-plan se termine.
- `tools.exec.notifyOnExitEmptySuccess` (par défaut false) : quand c'est true, met aussi en file les événements de fin pour les exécutions en arrière-plan réussies qui n'ont produit aucune sortie.

## process tool

Actions :

- `list` : sessions en cours d'exécution + terminées
- `poll` : drainer la nouvelle sortie pour une session (rapporte aussi le statut de sortie)
- `log` : lire la sortie agrégée (supporte `offset` + `limit`)
- `write` : envoyer stdin (`data`, `eof` optionnel)
- `kill` : terminer une session en arrière-plan
- `clear` : supprimer une session terminée de la mémoire
- `remove` : tuer si en cours d'exécution, sinon nettoyer si terminée

Notes :

- Seules les sessions en arrière-plan sont listées/persistées en mémoire.
- Les sessions sont perdues lors du redémarrage du processus (pas de persistance sur disque).
- Les journaux de session sont sauvegardés dans l'historique du chat uniquement si vous exécutez `process poll/log` et que le résultat de l'outil est enregistré.
- `process` est délimité par agent ; il ne voit que les sessions démarrées par cet agent.
- `process list` inclut un `name` dérivé (verbe de commande + cible) pour des examens rapides.
- `process log` utilise des `offset`/`limit` basés sur les lignes.
- Lorsque `offset` et `limit` sont tous deux omis, cela retourne les 200 dernières lignes et inclut un indice de pagination.
- Lorsque `offset` est fourni et que `limit` est omis, cela retourne de `offset` jusqu'à la fin (non limité à 200).

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

import fr from "/components/footer/fr.mdx";

<fr />
