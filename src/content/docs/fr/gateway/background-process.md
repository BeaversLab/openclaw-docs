---
summary: "Exécution en arrière-plan de exec et gestion des processus"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Exec en arrière-plan et outil de processus"
---

# Outil Exec d'arrière-plan et de processus

OpenClaw exécute des commandes shell via le tool `exec` et conserve les tâches de longue durée en mémoire. Le tool `process` gère ces sessions d'arrière-plan.

## outil exec

Paramètres clés :

- `command` (obligatoire)
- `yieldMs` (défaut 10000) : passage automatique en arrière-plan après ce délai
- `background` (bool) : passage immédiat en arrière-plan
- `timeout` (secondes, défaut 1800) : tuer le processus après ce délai d'attente
- `elevated` (bool) : exécuter en dehors du bac à sable si le mode élevé est activé/autorisé (`gateway` par défaut, ou `node` lorsque la cible d'exécution est `node`)
- Besoin d'un vrai TTY ? Définissez `pty: true`.
- `workdir`, `env`

Comportement :

- Les exécutions au premier plan renvoient directement la sortie.
- Lorsqu'il est en arrière-plan (explicite ou délai d'attente), le tool renvoie `status: "running"` + `sessionId` et une courte fin de sortie.
- La sortie est conservée en mémoire jusqu'à ce que la session soit interrogée ou effacée.
- Si le tool `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- Les commandes exec lancées reçoivent `OPENCLAW_SHELL=exec` pour les règles de shell/profil contextuelles.
- Pour un travail de longue durée qui commence maintenant, lancez-le une fois et comptez sur le
  réveil automatique de fin lorsqu'il est activé et que la commande émet une sortie ou échoue.
- Si le réveil automatique de fin est indisponible, ou si vous avez besoin d'une confirmation de réussite silencieuse
  pour une commande qui s'est terminée correctement sans sortie, utilisez `process`
  pour confirmer la fin.
- N'émulez pas de rappels ou de suivis différés avec des boucles `sleep` ou un
  sondage répété ; utilisez cron pour le futur travail.

## Pontage des processus fils

Lors de la création de processus enfants longs en dehors des outils d'exécution/traitement (par exemple, les redémarrages CLI ou les assistants de passerelle), attachez l'assistant de pont de processus enfant afin que les signaux de terminaison soient transmis et que les écouteurs soient détachés en cas de sortie/d'erreur. Cela évite les processus orphelins sur systemd et conserve un comportement d'arrêt cohérent sur les différentes plateformes.

Remplacements d'environnement :

- `PI_BASH_YIELD_MS` : céduler par défaut (ms)
- `PI_BASH_MAX_OUTPUT_CHARS` : limite de sortie en mémoire (caractères)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` : limite stdout/stderr en attente par flux (caractères)
- `PI_BASH_JOB_TTL_MS` : TTL pour les sessions terminées (ms, compris entre 1 m et 3 h)

Configuration (préféré) :

- `tools.exec.backgroundMs` (par défaut 10000)
- `tools.exec.timeoutSec` (par défaut 1800)
- `tools.exec.cleanupMs` (par défaut 1800000)
- `tools.exec.notifyOnExit` (par défaut true) : mettre en file d'attente un événement système + demander un battement de cœur (heartbeat) lorsqu'une exécution en arrière-plan se termine.
- `tools.exec.notifyOnExitEmptySuccess` (par défaut false) : si vrai, met également en file d'attente les événements de fin pour les exécutions en arrière-plan réussies qui n'ont produit aucune sortie.

## outil de processus

Actions :

- `list` : sessions en cours + terminées
- `poll` : drainer la nouvelle sortie d'une session (rapporte également l'état de sortie)
- `log` : lire la sortie agrégée (prend en charge `offset` + `limit`)
- `write` : envoyer stdin (`data`, `eof` optionnel)
- `send-keys` : envoyer des jetons de clé explicites ou des octets à une session prise en charge par PTY
- `submit` : envoyer Entrée / retour chariot à une session prise en charge par PTY
- `paste` : envoyer du texte littéral, éventuellement encapsulé dans le mode de collage entre crochets
- `kill` : terminer une session en arrière-plan
- `clear` : supprimer une session terminée de la mémoire
- `remove` : tuer si en cours d'exécution, sinon effacer si terminé

Notes :

- Seules les sessions en arrière-plan sont répertoriées/persistées en mémoire.
- Les sessions sont perdues lors du redémarrage du processus (aucune persistance sur disque).
- Les journaux de session ne sont sauvegardés dans l'historique de chat que si vous exécutez `process poll/log` et que le résultat de l'outil est enregistré.
- `process` est délimité par agent ; il ne voit que les sessions démarrées par cet agent.
- Utilisez `poll` / `log` pour le statut, les journaux, la confirmation silencieuse de succès, ou
  la confirmation d'achèvement lorsque le réveil automatique à l'achèvement n'est pas disponible.
- Utilisez `write` / `send-keys` / `submit` / `paste` / `kill` lorsque vous avez besoin d'une entrée
  ou d'une intervention.
- `process list` inclut un `name` dérivé (verbe de commande + cible) pour des analyses rapides.
- `process log` utilise une `offset`/`limit` basée sur les lignes.
- Lorsque `offset` et `limit` sont tous deux omis, il renvoie les 200 dernières lignes et inclut un indice de pagination.
- Lorsque `offset` est fourni et `limit` est omis, il renvoie de `offset` jusqu'à la fin (non limité à 200).
- Le sondage (polling) est pour le statut à la demande, pas pour la planification de boucles d'attente. Si le travail doit
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

Coller du texte littéral :

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```
