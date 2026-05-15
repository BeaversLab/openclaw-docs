---
summary: "Référence de la CLI pour `openclaw cron` (planifier et exécuter des tâches en arrière-plan)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

Gérer les tâches cron pour le planificateur du Gateway.

<Tip>Exécutez `openclaw cron --help` pour la surface de commande complète. Voir [Tâches Cron](/fr/automation/cron-jobs) pour le guide conceptuel.</Tip>

## Sessions

`--session` accepte `main`, `isolated`, `current`, ou `session:<id>`.

<AccordionGroup>
  <Accordion title="Clés de session">
    - `main` se lie à la session principale de l'agent.
    - `isolated` crée une nouvelle transcription et un nouvel identifiant de session pour chaque exécution.
    - `current` se lie à la session active au moment de la création.
    - `session:<id>` épingler à une clé de session persistante explicite.

  </Accordion>
  <Accordion title="Sémantique de session isolée">
    Les exécutions isolées réinitialisent le contexte de conversation ambiant. Le routage de canal et de groupe, la stratégie d'envoi/mise en file d'attente, l'élévation, l'origine et la liaison d'exécution ACP sont réinitialisés pour la nouvelle exécution. Les préférences sûres et les substitutions explicites de modèle ou d'authentification sélectionnées par l'utilisateur peuvent être transmises d'une exécution à l'autre.
  </Accordion>
</AccordionGroup>

## Livraison

`openclaw cron list` et `openclaw cron show <job-id>` prévisualisent la route de livraison résolue. Pour `channel: "last"`, la prévisualisation indique si la route a été résolue depuis la session principale ou actuelle, ou si elle échouera en mode fermé.

Les cibles préfixées par le fournisseur peuvent lever l'ambiguïté des canaux de diffusion non résolus. Par exemple, `to: "telegram:123"` sélectionne Telegram lorsque `delivery.channel` est omis ou `last`. Seuls les préfixes annoncés par le plugin chargé sont des sélecteurs de fournisseur. Si `delivery.channel` est explicite, le préfixe doit correspondre à ce canal ; `channel: "whatsapp"` avec `to: "telegram:123"` est rejeté. Les préfixes de service tels que `imessage:` et `sms:` restent une syntaxe de cible appartenant au canal.

<Note>Les tâches cron isolées `cron add` sont livrées par défaut via `--announce`. Utilisez `--no-deliver` pour conserver la sortie en interne. `--deliver` reste un alias déprécié pour `--announce`.</Note>

### Propriété de la livraison

La livraison de chat cron isolée est partagée entre l'agent et le runner :

- L'agent peut envoyer directement en utilisant l'outil `message` lorsqu'une route de chat est disponible.
- `announce` effectue une livraison de secours de la réponse finale uniquement lorsque l'agent n'a pas envoyé directement à la cible résolue.
- `webhook` envoie la charge utile terminée à une URL.
- `none` désactive la livraison de secours par le runner.

`--announce` est la livraison de repli du runner pour la réponse finale. `--no-deliver` désactive ce repli mais ne supprime pas l'outil `message` de l'agent lorsqu'une route de chat est disponible.

Les rappels créés à partir d'un chat actif conservent la cible de livraison du chat en direct pour la livraison de annonce de repli. Les clés de session internes peuvent être en minuscules ; ne les utilisez pas comme source de vérité pour les ID de fournisseurs sensibles à la casse tels que les ID de salle Matrix.

### Échec de la livraison

Les notifications d'échec sont résolues dans l'ordre suivant :

1. `delivery.failureDestination` sur la tâche.
2. `cron.failureDestination` global.
3. La cible d'annonce principale de la tâche (lorsqu'aucune destination d'échec explicite n'est définie).

<Note>Les tâches de session principale ne peuvent utiliser `delivery.failureDestination` que lorsque le mode de livraison principal est `webhook`. Les tâches isolées l'acceptent dans tous les modes.</Note>

Remarque : les exécutions cron isolées traitent les échecs de l'agent au niveau de l'exécution comme des erreurs de travail même si aucun contenu de réponse n'est produit, les échecs de modèle/fournisseur incrémentent donc toujours les compteurs d'erreurs et déclenchent les notifications d'échec.

## Planification

### Tâches uniques

`--at <datetime>` planifie une exécution unique. Les dates/heures sans décalage sont traitées comme UTC, sauf si vous passez aussi `--tz <iana>`, qui interprète l'heure de l'horloge murale dans le fuseau horaire donné.

<Note>Les tâches uniques sont supprimées après succès par défaut. Utilisez `--keep-after-run` pour les conserver.</Note>

### Tâches récurrentes

Les tâches récurrentes utilisent un retour exponentiel après des erreurs consécutives : 30s, 1m, 5m, 15m, 60m. La planification redevient normale après la prochaine exécution réussie.

Les exécutions ignorées sont suivies séparément des erreurs d'exécution. Elles n'affectent pas l'attente avant nouvelle tentative (retry backoff), mais `openclaw cron edit <job-id> --failure-alert-include-skipped` peut activer les alertes d'échec pour recevoir des notifications répétées sur les exécutions ignorées.

Pour les tâches isolées qui ciblent un fournisseur de modèles configuré localement, cron exécute une vérification préalable légère du fournisseur avant de démarrer le tour de l'agent. Les fournisseurs de bouclage (loopback), de réseau privé et `.local` `api: "ollama"` sont sondés à `/api/tags` ; les fournisseurs locaux compatibles OpenAI tels que vLLM, SGLang et LM Studio sont sondés à `/models`. Si le point de terminaison est inaccessible, l'exécution est enregistrée comme `skipped` et retentée selon la planification ultérieure ; les points de terminaison défaillants correspondants sont mis en cache pendant 5 minutes pour éviter que de nombreuses tâches ne surchargent le même serveur local.

Remarque : les définitions des tâches cron résident dans `jobs.json`, tandis que l'état d'exécution en attente réside dans `jobs-state.json`. Si `jobs.json` est modifié en externe, le Gateway recharge les planifications modifiées et efface les créneaux en attente obsolètes ; les réécritures de formatage uniquement n'effacent pas le créneau en attente.

### Exécutions manuelles

`openclaw cron run` renvoie dès que l'exécution manuelle est mise en file d'attente. Les réponses réussies incluent `{ ok: true, enqueued: true, runId }`. Utilisez `openclaw cron runs --id <job-id>` pour suivre le résultat final.

<Note>
`openclaw cron run <job-id>` force l'exécution par défaut. Utilisez `--due` pour conserver l'ancien comportement « exécuter uniquement si dû ».
</Note>

## Modèles

`cron add|edit --model <ref>` sélectionne un modèle autorisé pour la tâche.

<Warning>Si le model n'est pas autorisé ou ne peut pas être résolu, cron échoue l'exécution avec une erreur de validation explicite au lieu de revenir à l'agent de la tâche ou à la sélection du model par défaut.</Warning>

Cron `--model` est une **tâche principale**, et non une substitution de session `/model`. Cela signifie :

- Les replis de model configurés s'appliquent toujours lorsque le model de tâche sélectionné échoue.
- La charge utile par tâche `fallbacks` remplace la liste de repli configurée lorsqu'elle est présente.
- Une liste de repli par tâche vide (`fallbacks: []` dans la charge utile de la tâche/API) rend l'exécution cron stricte.
- Lorsqu'une tâche a `--model` mais qu'aucune liste de repli n'est configurée, OpenClaw transmet une substitution de repli vide explicite pour que l'agent principal ne soit pas ajouté en tant que cible de réessai masquée.

### Priorité du modèle cron isolé

Le cron isolé résout le modèle actif dans cet ordre :

1. Substitution Gmail-hook.
2. Par tâche `--model`.
3. Substitution du modèle de session cron stockée (lorsque l'utilisateur en a sélectionné un).
4. Sélection du modèle par l'agent ou par défaut.

### Mode rapide

Le mode rapide du cron isolé suit la sélection du modèle actif résolu. La configuration du modèle `params.fastMode` s'applique par défaut, mais une substitution de session stockée `fastMode` l'emporte toujours sur la configuration.

### Nouvelles tentatives après changement de modèle actif

Si une exécution isolée génère `LiveSessionModelSwitchError`, cron rend persistant le fournisseur et le modèle commutés (ainsi que la substitution du profil d'authentification commutée si présente) pour l'exécution active avant de réessayer. La boucle de nouvelle tentative externe est limitée à deux nouvelles tentatives de changement après la tentative initiale, puis abandonne au lieu de boucler indéfiniment.

## Sortie d'exécution et refus

### Suppression des accusés de réception périmés

Le cron isolé active la suppression des réponses constituées uniquement d'accusés de réception périmés. Si le premier résultat n'est qu'une mise à jour de l'état intermédiaire et qu'aucune exécution de sous-agent descendant n'est responsable de la réponse finale, cron relance une fois la demande pour obtenir le vrai résultat avant la livraison.

### Suppression des jetons silencieux

Si une exécution cron isolée ne renvoie que le jeton silencieux (`NO_REPLY` ou `no_reply`), cron supprime à la fois la livraison sortante directe et le chemin de résumé mis en file d'attente en repli, de sorte que rien n'est renvoyé dans le chat.

### Refus structurés

Les exécutions cron isolées privilégient les métadonnées de refus d'exécution structurées provenant de l'exécution intégrée, puis reviennent aux marqueurs de refus connus dans la sortie finale, tels que `SYSTEM_RUN_DENIED`, `INVALID_REQUEST`, et les phrases de refus liées aux approbations.

`cron list` et l'historique d'exécution affichent la raison du refus au lieu de signaler une commande bloquée comme `ok`.

## Rétention

La rétention et le nettoyage sont contrôlés dans la configuration :

- `cron.sessionRetention` (par défaut `24h`) nettoie les sessions d'exécution isolées terminées.
- `cron.runLog.maxBytes` et `cron.runLog.keepLines` nettoient `~/.openclaw/cron/runs/<jobId>.jsonl`.

## Migration des tâches plus anciennes

<Note>
  Si vous disposez de tâches cron antérieures au format de livraison et de stockage actuel, exécutez `openclaw doctor --fix`. Doctor normalise les champs cron hérités (`jobId`, `schedule.cron`, champs de livraison de premier niveau y compris l'hérité `threadId`, alias de livraison payload `provider`) et migre les simples tâches de secours webhook `notify: true` vers une livraison webhook explicite
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

Annoncer sur un channel spécifique :

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

Annoncer sur un sujet de forum Telegram :

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
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

`--light-context` s'applique uniquement aux tâches de tour d'agent isolées. Pour les exécutions cron, le mode léger garde le contexte d'amorçage vide au lieu d'injecter l'ensemble complet d'amorçage de l'espace de travail.

## Commandes d'administration courantes

Exécution manuelle et inspection :

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`openclaw cron list` affiche toutes les tâches correspondantes par défaut. Passez `--agent <id>` pour afficher uniquement les tâches dont l'ID d'agent normalisé effectif correspond ; les tâches sans ID d'agent stocké comptent comme l'agent par défaut configuré.

`cron list --json` et `cron show <job-id> --json` incluent un champ `status` de premier niveau sur chaque tâche, calculé à partir de `enabled`, `state.runningAtMs` et `state.lastRunStatus`. Valeurs : `disabled`, `running`, `ok`, `error`, `skipped` ou `idle`. Cela reflète la colonne d'état lisible par l'humain afin que les outils externes puissent lire l'état de la tâche sans avoir à le recalculer.

Les entrées `cron runs` incluent des diagnostics de livraison avec la cible cron prévue, la cible résolue, les envois de l'outil de message, l'utilisation du repli et l'état de livraison.

Redirection d'agent et de session :

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

`openclaw cron add` avertit lorsque `--agent` est omis sur les tâches de tour d'agent et revient à l'agent par défaut (`main`). Passez `--agent <id>` au moment de la création pour épingler un agent spécifique.

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
