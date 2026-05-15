---
summary: "Exécution en arrière-plan de exec et gestion des processus"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Background exec and process tool"
---

OpenClaw exécute les commandes shell via le OpenClaw`exec` tool et conserve les tâches de longue durée en mémoire. Le `process` tool gère ces sessions d'arrière-plan.

## exec tool

Paramètres clés :

- `command` (requis)
- `yieldMs` (par défaut 10000) : arrière-plan automatique après ce délai
- `background` (booléen) : arrière-plan immédiat
- `timeout` (secondes, par défaut `tools.exec.timeoutSec`) : tuer le processus après ce délai d'attente ; définissez `timeout: 0` uniquement pour désactiver le délai d'attente du processus exec pour cet appel
- `elevated` (booléen) : exécuter en dehors du bac à sable si le mode élevé est activé/autorisé (`gateway` par défaut, ou `node` lorsque la cible exec est `node`)
- Besoin d'un vrai TTY ? Définissez `pty: true`.
- `workdir`, `env`

Comportement :

- Les exécutions au premier plan renvoient la sortie directement.
- Lorsqu'il est en arrière-plan (explicite ou timeout), le tool renvoie `status: "running"` + `sessionId` et une courte queue.
- Les exécutions en arrière-plan et `yieldMs` héritent de `tools.exec.timeoutSec` sauf si l'appel fournit un `timeout` explicite.
- La sortie est conservée en mémoire jusqu'à ce que la session soit interrogée ou effacée.
- Si le `process` tool n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- Les commandes exec générées reçoivent `OPENCLAW_SHELL=exec` pour les règles de shell/profil dépendantes du contexte.
- Pour un travail de longue durée qui commence maintenant, lancez-le une fois et comptez sur le
  réveil automatique de fin lorsqu'il est activé et que la commande émet une sortie ou échoue.
- Si le réveil automatique de fin est indisponible, ou si vous avez besoin d'une confirmation de succès silencieux
  pour une commande qui s'est terminée proprement sans sortie, utilisez `process`
  pour confirmer l'achèvement.
- N'émulez pas de rappels ou de suivis retardés avec des boucles `sleep` ou des
  sondages répétés ; utilisez cron pour le travail futur.

## Pontage des processus fils

Lors de la création de processus enfants longs en dehors des outils d'exécution/traitement (par exemple, les redémarrages CLI ou les assistants de passerelle), attachez l'assistant de pont de processus enfant afin que les signaux de terminaison soient transmis et que les écouteurs soient détachés en cas de sortie/d'erreur. Cela évite les processus orphelins sur systemd et conserve un comportement d'arrêt cohérent sur les différentes plateformes.

Remplacements d'environnement :

- `PI_BASH_YIELD_MS` : cession par défaut (ms)
- `PI_BASH_MAX_OUTPUT_CHARS` : limite de sortie en mémoire (caractères)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS` : limite de stdout/stderr en attente par flux (caractères)
- `PI_BASH_JOB_TTL_MS` : TTL pour les sessions terminées (ms, limité à 1m–3h)

Configuration (préféré) :

- `tools.exec.backgroundMs` (par défaut 10000)
- `tools.exec.timeoutSec` (par défaut 1800)
- `tools.exec.cleanupMs` (par défaut 1800000)
- `tools.exec.notifyOnExit` (par défaut true) : mettre en file d'attente un événement système + demander un heartbeat lorsqu'un exec en arrière-plan se termine.
- `tools.exec.notifyOnExitEmptySuccess` (par défaut false) : si vrai, met également en file d'attente les événements de complétion pour les exécutions en arrière-plan réussies qui n'ont produit aucune sortie.

## outil de processus

Actions :

- `list` : sessions en cours + terminées
- `poll` : drainer la nouvelle sortie d'une session (rapporte également l'état de sortie)
- `log` : lire la sortie agrégée (prend en charge `offset` + `limit`)
- `write` : envoyer stdin (`data`, `eof` optionnel)
- `send-keys` : envoyer des jetons de clé explicites ou des octets à une session soutenue par PTY
- `submit` : envoyer Entrée / retour chariot à une session soutenue par PTY
- `paste` : envoyer du texte littéral, enveloppé en option dans le mode de collage entre crochets
- `kill` : terminer une session en arrière-plan
- `clear` : supprimer une session terminée de la mémoire
- `remove` : tuer si en cours d'exécution, sinon effacer si terminé

Notes :

- Seules les sessions en arrière-plan sont répertoriées/persistées en mémoire.
- Les sessions sont perdues lors du redémarrage du processus (aucune persistance sur disque).
- Les journaux de session ne sont enregistrés dans l'historique de chat que si vous exécutez `process poll/log` et que le résultat de l'outil est enregistré.
- `process` est délimité par agent ; il ne voit que les sessions démarrées par cet agent.
- Utilisez `poll` / `log` pour le statut, les journaux, la confirmation de succès silencieux ou
  la confirmation de complétion lorsque le réveil automatique de complétion n'est pas disponible.
- Utilisez `write` / `send-keys` / `submit` / `paste` / `kill` lorsque vous avez besoin d'une saisie
  ou d'une intervention.
- `process list` inclut un `name` dérivé (verbe de commande + cible) pour des analyses rapides.
- `process log` utilise `offset`/`limit` basé sur des lignes.
- Lorsque `offset` et `limit` sont tous deux omis, il retourne les 200 dernières lignes et inclut une indication de pagination.
- Lorsque `offset` est fourni et que `limit` est omis, il retourne de `offset` jusqu'à la fin (non limité à 200).
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

## Connexes

- [Outil Exec](/fr/tools/exec)
- [Approbations Exec](/fr/tools/exec-approvals)
