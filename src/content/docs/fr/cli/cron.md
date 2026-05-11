---
summary: "Référence CLI pour `openclaw cron` (planifier et exécuter des tâches en arrière-plan)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

Gérer les tâches cron pour le planificateur du Gateway.

<Tip>Exécutez `openclaw cron --help` pour la surface de commande complète. Consultez [Tâches Cron](/fr/automation/cron-jobs) pour le guide conceptuel.</Tip>

## Sessions

`--session` accepte `main`, `isolated`, `current` ou `session:<id>`.

<AccordionGroup>
  <Accordion title="Clés de session">
    - `main` se lie à la session principale de l'agent.
    - `isolated` crée une nouvelle transcription et un nouvel identifiant de session pour chaque exécution.
    - `current` se lie à la session active au moment de la création.
    - `session:<id>` s'épingle à une clé de session persistante explicite.
  </Accordion>
  <Accordion title="Sémantique de session isolée">
    Les exécutions isolées réinitialisent le contexte de conversation ambiant. Le routage des canaux et des groupes, la stratégie d'envoi/mise en file d'attente, l'élévation, l'origine et la liaison d'exécution ACP sont réinitialisés pour la nouvelle exécution. Les préférences sécurisées et les substitutions explicites de modèle ou d'authentification sélectionnées par l'utilisateur peuvent être transmises d'une exécution à l'autre.
  </Accordion>
</AccordionGroup>

## Livraison

`openclaw cron list` et `openclaw cron show <job-id>` prévisualisent la route de livraison résolue. Pour `channel: "last"`, la prévisualisation indique si la route a été résolue à partir de la session principale ou actuelle, ou si elle échouera en mode fermé.

<Note>Les tâches `cron add` isolées utilisent par défaut la livraison `--announce`. Utilisez `--no-deliver` pour garder la sortie interne. `--deliver` reste un alias déprécié pour `--announce`.</Note>

### Propriété de la livraison

La livraison de chat cron isolée est partagée entre l'agent et le runner :

- L'agent peut envoyer directement en utilisant l'outil `message` lorsqu'une route de chat est disponible.
- `announce` effectue une livraison de secours de la réponse finale uniquement lorsque l'agent n'a pas envoyé directement à la cible résolue.
- `webhook` publie la charge utile finale sur une URL.
- `none` désactive la livraison de repli du runner.

`--announce` est la livraison de repli du runner pour la réponse finale. `--no-deliver` désactive ce repli mais ne supprime pas l'outil `message` de l'agent lorsqu'une route de chat est disponible.

Les rappels créés à partir d'un chat actif conservent la cible de livraison du chat en direct pour la livraison de repli d'annonce. Les clés de session internes peuvent être en minuscules ; ne les utilisez pas comme source de vérité pour les ID de fournisseur sensibles à la casse tels que les ID de salle Matrix.

### Livraison en cas d'échec

Les notifications d'échec sont résolues dans cet ordre :

1. `delivery.failureDestination` sur la tâche.
2. `cron.failureDestination` global.
3. La cible d'annonce principale de la tâche (lorsqu'aucune destination d'échec explicite n'est définie).

<Note>Les tâches de session principale ne peuvent utiliser `delivery.failureDestination` que lorsque le mode de livraison principal est `webhook`. Les tâches isolées l'acceptent dans tous les modes.</Note>

Remarque : les exécutions cron isolées traitent les échecs de l'agent au niveau de l'exécution comme des erreurs de tâche même lorsque aucune charge utile de réponse n'est produite, donc les échecs de model/provider incrémentent toujours les compteurs d'erreurs et déclenchent les notifications d'échec.

## Planification

### Tâches ponctuelles

`--at <datetime>` planifie une exécution ponctuelle. Les datetimes sans décalage sont traités comme UTC sauf si vous passez également `--tz <iana>`, qui interprète l'heure de l'horloge murale dans le fuseau horaire donné.

<Note>Les tâches ponctuelles sont supprimées après succès par défaut. Utilisez `--keep-after-run` pour les conserver.</Note>

### Tâches récurrentes

Les tâches récurrentes utilisent un backoff de nouvelle tentative exponentiel après des erreurs consécutives : 30 s, 1 min, 5 min, 15 min, 60 min. La planification redevient normale après la prochaine exécution réussie.

Les exécutions ignorées sont suivies séparément des erreurs d'exécution. Elles n'affectent pas le backoff de nouvelle tentative, mais `openclaw cron edit <job-id> --failure-alert-include-skipped` peut permettre aux alertes d'échec de recevoir des notifications répétées d'exécution ignorée.

Remarque : les définitions de tâches cron résident dans `jobs.json`, tandis que l'état d'exécution en attente réside dans `jobs-state.json`. Si `jobs.json` est modifié en externe, le Gateway recharge les planifications modifiées et efface les créneaux en attente obsolètes ; les réécritures de formatage uniquement n'effacent pas le créneau en attente.

### Exécutions manuelles

`openclaw cron run` retourne dès que l'exécution manuelle est mise en file d'attente. Les réponses réussies incluent `{ ok: true, enqueued: true, runId }`. Utilisez `openclaw cron runs --id <job-id>` pour suivre le résultat final.

<Note>
`openclaw cron run <job-id>` force l'exécution par défaut. Utilisez `--due` pour conserver l'ancien comportement « exécuter uniquement si dû ».
</Note>

## Modèles

`cron add|edit --model <ref>` sélectionne un modèle autorisé pour la tâche.

<Warning>Si le modèle n'est pas autorisé, cron avertit et revient au modèle de l'agent de la tâche ou à la sélection de modèle par défaut. Les chaînes de repli configurées s'appliquent toujours, mais une substitution de modèle simple sans liste de repli explicite par tâche n'ajoute plus l'agent principal comme cible de réessaicachée supplémentaire.</Warning>

### Priorité du modèle cron isolé

Le cron isolé résout le modèle actif dans cet ordre :

1. Substitution Gmail-hook.
2. Par tâche `--model`.
3. Substitution de modèle de session cron stockée (lorsque l'utilisateur en a sélectionné un).
4. Sélection de modèle par l'agent ou par défaut.

### Mode rapide

Le mode rapide du cron isolé suit la sélection du modèle actif résolu. La configuration de modèle `params.fastMode` s'applique par défaut, mais une substitution de session stockée `fastMode` l'emporte toujours sur la configuration.

### Nouvelles tentatives de changement de modèle en direct

Si une exécution isolée génère `LiveSessionModelSwitchError`, cron persiste le fournisseur et le modèle commutés (et la substitution de profil d'authentification commutée si présente) pour l'exécution active avant de réessayer. La boucle de réessaicextérieure est limitée à deux tentatives de changement après la tentative initiale, puis abandonne au lieu de boucler indéfiniment.

## Sortie d'exécution et refus

### Suppression des accusés de réception périmés

Le cron isolé active la suppression des réponses d'accusé de réception uniquement périmés. Si le premier résultat est juste une mise à jour de statut intérimaire et qu'aucune exécution de sous-agent descendant n'est responsable de la réponse finale, cron relance une fois la demande pour le véritable résultat avant la livraison.

### Suppression des jetons silencieux

Si une exécution cron isolée ne renvoie que le jeton silencieux (`NO_REPLY` ou `no_reply`), cron supprime à la fois la livraison sortante directe et le chemin de résumé en file d'attente de secours, de sorte que rien n'est renvoyé au chat.

### Refus structurés

Les exécutions cron isolées privilégient les métadonnées structurées de refus d'exécution de l'exécution intégrée, puis reviennent aux marqueurs de refus connus dans la sortie finale, tels que `SYSTEM_RUN_DENIED`, `INVALID_REQUEST`, et les phrases de refus de liaison d'approbation.

`cron list` et l'historique des exécutions affichent le motif du refus au lieu de signaler une commande bloquée comme `ok`.

## Rétention

La rétention et le nettoyage sont contrôlés dans la configuration :

- `cron.sessionRetention` (par défaut `24h`) nettoie les sessions d'exécution isolées terminées.
- `cron.runLog.maxBytes` et `cron.runLog.keepLines` nettoient `~/.openclaw/cron/runs/<jobId>.jsonl`.

## Migration des anciennes tâches

<Note>
  Si vous avez des tâches cron d'avant le format de livraison et de stockage actuel, exécutez `openclaw doctor --fix`. Doctor normalise les champs cron hérités (`jobId`, `schedule.cron`, champs de livraison de niveau supérieur incluant l'hérité `threadId`, alias de livraison de payload `provider`) et migre les simples tâches de secours webhook `notify: true` vers une livraison webhook explicite
  lorsque `cron.webhook` est configuré.
</Note>

## Modifications courantes

Mettre à jour les paramètres de livraison sans modifier le message :

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Désactiver la livraison pour une tâche isolée :

```bash
openclaw cron edit <job-id> --no-deliver
```

Activer le contexte d'amorçage léger pour une tâche isolée :

```bash
openclaw cron edit <job-id> --light-context
```

Annoncer à un channel spécifique :

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

Créer une tâche isolée avec un contexte d'amorçage léger :

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` s'applique uniquement aux tâches isolées de tour d'agent. Pour les exécutions cron, le mode léger maintient le contexte d'amorçage vide au lieu d'injecter l'ensemble d'amorçage complet de l'espace de travail.

## Commandes d'administration courantes

Exécution et inspection manuelles :

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Les entrées `cron runs` incluent des diagnostics de livraison avec la cible cron prévue, la cible résolue, les envois de l'outil de message, l'utilisation du secours et l'état de livraison.

Redirection d'agent et de session :

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

Ajustements de livraison :

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## Connexes

- [Référence CLI](/fr/cli)
- [Tâches planifiées](/fr/automation/cron-jobs)
