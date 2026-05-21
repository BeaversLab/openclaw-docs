---
summary: "CLIRéférence CLI pour `openclaw cron` (planifier et exécuter des tâches d'arrière-plan)"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

Gérer les tâches cron pour le planificateur du Gateway.

<Tip>Exécutez `openclaw cron --help` pour accéder à l'interface complète des commandes. Consultez [Tâches cron](/fr/automation/cron-jobs) pour le guide conceptuel.</Tip>

## Sessions

`--session` accepte `main`, `isolated`, `current` ou `session:<id>`.

<AccordionGroup>
  <Accordion title="Clés de session">
    - `main` se lie à la session principale de l'agent.
    - `isolated` crée une nouvelle transcription et un nouvel identifiant de session pour chaque exécution.
    - `current` se lie à la session active au moment de la création.
    - `session:<id>` épingler à une clé de session persistante explicite.

  </Accordion>
  <Accordion title="Sémantique de session isolée">
    Les exécutions isolées réinitialisent le contexte de conversation ambiant. Le routage de canal et de groupe, la stratégie d'envoi/file d'attente, l'élévation, l'origine et la liaison au runtime ACP sont réinitialisés pour la nouvelle exécution. Les préférences sûres et les remplacements explicites de modèle ou d'authentification sélectionnés par l'utilisateur peuvent persister entre les exécutions.
  </Accordion>
</AccordionGroup>

## Livraison

`openclaw cron list` et `openclaw cron show <job-id>` prévisualisent la route de livraison résolue. Pour `channel: "last"`, la prévisualisation indique si la route est résolue à partir de la session principale ou actuelle, ou si elle échouera en se fermant.

Les cibles préfixées par le fournisseur peuvent lever l'ambiguïté des canaux de diffusion non résolus. Par exemple, `to: "telegram:123"`Telegram sélectionne Telegram lorsque `delivery.channel` est omis ou `last`. Seuls les préfixes annoncés par le plugin chargé sont des sélecteurs de fournisseur. Si `delivery.channel` est explicite, le préfixe doit correspondre à ce canal ; `channel: "whatsapp"` avec `to: "telegram:123"` est rejeté. Les préfixes de service tels que `imessage:` et `sms:` restent une syntaxe de cible appartenant au canal.

<Note>Les tâches `cron add` isolées utilisent par défaut la livraison `--announce`. Utilisez `--no-deliver` pour conserver la sortie en interne. `--deliver` reste un alias obsolète pour `--announce`.</Note>

### Propriété de la livraison

La livraison de chat cron isolée est partagée entre l'agent et le runner :

- L'agent peut envoyer directement en utilisant l'`message` lorsqu'une route de discussion est disponible.
- `announce` assure la livraison de secours de la réponse finale uniquement lorsque l'agent n'a pas envoyé directement à la cible résolue.
- `webhook` envoie la charge utile terminée à une URL.
- `none` désactive la livraison de secours du runner.

`--announce` est la livraison de secours du runner pour la réponse finale. `--no-deliver` désactive ce secours mais ne supprime pas l'`message` de l'agent lorsqu'une route de discussion est disponible.

Les rappels créés à partir d'un chat actif conservent la cible de livraison du chat en direct pour la livraison de annonce de repli. Les clés de session internes peuvent être en minuscules ; ne les utilisez pas comme source de vérité pour les ID de fournisseurs sensibles à la casse tels que les ID de salle Matrix.

### Échec de la livraison

Les notifications d'échec sont résolues dans l'ordre suivant :

1. `delivery.failureDestination` sur la tâche.
2. `cron.failureDestination` global.
3. La cible d'annonce principale de la tâche (lorsqu'aucune destination d'échec explicite n'est définie).

<Note>Les tâches de session principale ne peuvent utiliser `delivery.failureDestination` que lorsque le mode de livraison principal est `webhook`. Les tâches isolées l'acceptent dans tous les modes.</Note>

Remarque : les exécutions cron isolées traitent les échecs de l'agent au niveau de l'exécution comme des erreurs de travail même si aucun contenu de réponse n'est produit, les échecs de modèle/fournisseur incrémentent donc toujours les compteurs d'erreurs et déclenchent les notifications d'échec.

Si une exécution isolée expire avant la première requête de model, `openclaw cron show`
et `openclaw cron runs` incluent une erreur spécifique à la phase telle que
`setup timed out before runner start` ou
`stalled before first model call (last phase: context-engine)`.
Pour les fournisseurs basés sur la CLI, le chien de garde pré-model reste actif jusqu'à ce que le tour
CLI externe commence, donc les blocages de recherche de session, de hook, d'auth, de prompt et de configuration de la CLI sont
signalés comme des échecs de cron pré-model.

## Planification

### Tâches ponctuelles

`--at <datetime>` planifie une exécution unique. Les datetimes sans décalage sont traités comme UTC sauf si vous passez également `--tz <iana>`, qui interprète l'heure de l'horloge murale dans le fuseau horaire donné.

<Note>Les tâches uniques sont supprimées après succès par défaut. Utilisez `--keep-after-run` pour les conserver.</Note>

### Tâches récurrentes

Les tâches récurrentes utilisent un backoff de réessai exponentiel après des erreurs consécutives : 30s, 1m, 5m, 15m, 60m. La planification redevient normale après la prochaine exécution réussie.

Les exécutions ignorées sont suivies séparément des erreurs d'exécution. Elles n'affectent pas l'attente de nouvelle tentative, mais `openclaw cron edit <job-id> --failure-alert-include-skipped` peut permettre aux alertes d'échec de recevoir des notifications répétées pour les exécutions ignorées.

Pour les tâches isolées qui ciblent un fournisseur de modèles local configuré, cron exécute une vérification préliminaire légère du fournisseur avant de commencer le tour de l'agent. Les fournisseurs de bouclage, de réseau privé et `.local` `api: "ollama"` sont sondés à `/api/tags` ; les fournisseurs locaux compatibles avec OpenAI tels que vLLM, SGLang et LM Studio sont sondés à `/models`. Si le point de terminaison est inaccessible, l'exécution est enregistrée comme `skipped` et réessayée selon un calendrier ultérieur ; les points de terminaison morts correspondants sont mis en cache pendant 5 minutes pour éviter que de nombreuses tâches n'attaquent le même serveur local.

Remarque : les définitions des tâches cron résident dans `jobs.json`, tandis que l'état d'exécution en attente réside dans `jobs-state.json`. Si `jobs.json` est modifié en externe, le Gateway recharge les calendriers modifiés et efface les créneaux en attente obsolètes ; les réécritures de formatage uniquement n'effacent pas le créneau en attente.

### Exécutions manuelles

`openclaw cron run <job-id>` force l'exécution par défaut et retourne dès que l'exécution manuelle est mise en file d'attente. Les réponses réussies incluent `{ ok: true, enqueued: true, runId }`. Utilisez le `runId` retourné pour inspecter le résultat ultérieur :

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

Ajoutez `--wait` lorsqu'un script doit bloquer jusqu'à ce que cette exécution mise en file d'attente exacte enregistre un état terminal :

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

Avec `--wait`, le CLI appelle toujours `cron.run` en premier, puis interroge `cron.runs` pour le `runId` retourné. La commande se termine `0` uniquement lorsque l'exécution se termine avec l'état `ok`. Elle se termine avec un code non nul lorsque l'exécution se termine avec `error` ou `skipped`, lorsque la réponse du Gateway n'inclut pas de `runId`, ou lorsque `--wait-timeout` expire. `--poll-interval` doit être supérieur à zéro.

<Note>Utilisez `--due` lorsque vous voulez que la commande manuelle ne s'exécute que si la tâche est actuellement due. Si `--due --wait` ne met pas en file d'attente une exécution, la commande retourne la réponse normale sans exécution au lieu d'interroger.</Note>

## Modèles

`cron add|edit --model <ref>` sélectionne un modèle autorisé pour la tâche.

<Warning>Si le modèle n'est pas autorisé ou ne peut pas être résolu, cron échoue l'exécution avec une erreur de validation explicite au lieu de revenir à l'agent de la tâche ou à la sélection de modèle par défaut.</Warning>

Cron `--model` est un **job primary**, et non une priorité (override) de session de chat `/model`. Cela signifie :

- Les replis (fallbacks) de modèle configurés s'appliquent toujours lorsque le modèle de tâche sélectionné échoue.
- La charge utile `fallbacks` par tâche remplace la liste de repli configurée lorsqu'elle est présente.
- Une liste de repli vide par tâche (`fallbacks: []` dans la charge utile de la tâche/API) rend l'exécution cron stricte.
- Lorsqu'une tâche a `--model` mais qu'aucune liste de repli n'est configurée, OpenClaw transmet une priorité de repli vide explicite afin que l'agent principal ne soit pas ajouté comme cible de réessai cachée.

`openclaw doctor` signale les tâches qui ont déjà `payload.model` défini, y compris les comptes d'espaces de noms de fournisseur et les incohérences avec `agents.defaults.model`. Utilisez cette vérification lorsque le comportement d'authentification, de fournisseur ou de facturation semble différent entre le chat en direct et les tâches planifiées.

### Priorité du modèle cron isolé

Le cron isolé résout le modèle actif dans cet ordre :

1. Priorité (override) Gmail-hook.
2. `--model` par tâche.
3. Priorité de modèle de session cron stockée (lorsque l'utilisateur en a sélectionné une).
4. Sélection de modèle par agent ou par défaut.

### Mode rapide

Le mode rapide du cron isolé suit la sélection du modèle en direct résolu. La configuration de modèle `params.fastMode` s'applique par défaut, mais une priorité de session stockée `fastMode` l'emporte toujours sur la configuration.

### Nouvelles tentatives de changement de modèle en direct

Si une exécution isolée génère `LiveSessionModelSwitchError`, cron conserve le fournisseur et le modèle changés (ainsi que la priorité de profil d'authentification changée si présente) pour l'exécution active avant de réessayer. La boucle de réessai externe est limitée à deux réessais de changement après la tentative initiale, puis s'interrompt au lieu de boucler indéfiniment.

## Sortie d'exécution et refus

### Suppression des accusés de réception périmés

Les tâches cron isolées suppriment les réponses d'accusé de réception obsolètes. Si le premier résultat est seulement une mise à jour de l'état provisoire et qu'aucune exécution de sous-agent descendant n'est responsable de la réponse finale, cron redemande une fois pour le résultat réel avant la livraison.

### Suppression du jeton silencieux

Si une exécution cron isolée renvoie uniquement le jeton silencieux (`NO_REPLY` ou `no_reply`), cron supprime à la fois la livraison sortante directe et le chemin de repli de résumé mis en file d'attente, de sorte que rien n'est renvoyé au chat.

### Refus structurés

Les exécutions cron isolées utilisent les métadonnées structurées de refus d'exécution de l'exécution intégrée comme signal de refus faisant autorité. Elles respectent également les wrappers `UNAVAILABLE` de l'hôte nœud lorsque le message d'erreur structuré imbriqué commence par `SYSTEM_RUN_DENIED` ou `INVALID_REQUEST`.

Cron ne classe pas le texte final ou les phrases de refus ressemblant à une approbation comme des refus, sauf si l'exécution intégrée fournit également des métadonnées de refus structurées. Par conséquent, le texte ordinaire de l'assistant n'est pas traité comme une commande bloquée.

`cron list` et l'historique des exécutions affichent la raison du refus au lieu de signaler une commande bloquée comme `ok`.

## Rétention

La rétention et le nettoyage sont contrôlés dans la configuration :

- `cron.sessionRetention` (par défaut `24h`) nettoie les sessions d'exécution isolées terminées.
- `cron.runLog.maxBytes` et `cron.runLog.keepLines` nettoient `~/.openclaw/cron/runs/<jobId>.jsonl`.

## Migration des anciennes tâches

<Note>
  Si vous avez des tâches cron antérieures au format de livraison et de stockage actuel, exécutez `openclaw doctor --fix`. Doctor normalise les champs cron hérités (`jobId`, `schedule.cron`, champs de livraison de premier niveau incluant l'ancien `threadId`, alias de livraison de payload `provider`) et migre les simples tâches de repli webhook `notify: true` vers une livraison webhook explicite
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

`--light-context` s'applique uniquement aux tâches isolées de tour d'agent. Pour les exécutions cron, le mode léger maintient le contexte d'amorçage vide au lieu d'injecter l'ensemble complet d'amorçage de l'espace de travail.

## Commandes d'administration courantes

Exécution manuelle et inspection :

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron get <job-id>
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron run <job-id> --wait --wait-timeout 10m
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
openclaw cron runs --id <job-id> --limit 50
openclaw cron runs --id <job-id> --run-id <run-id>
```

`openclaw cron list` affiche toutes les tâches correspondantes par défaut. Passez `--agent <id>` pour n'afficher que les tâches dont l'ID d'agent effectif normalisé correspond ; les tâches sans ID d'agent stocké comptent comme l'agent par défaut configuré.

`openclaw cron get <job-id>` renvoie directement le JSON de la tâche stockée. Utilisez `cron show <job-id>` lorsque vous souhaitez la vue lisible par un humain avec l'aperçu de la route de livraison.

`cron list --json` et `cron show <job-id> --json` incluent un champ `status` de niveau supérieur sur chaque tâche, calculé à partir de `enabled`, `state.runningAtMs` et `state.lastRunStatus`. Valeurs : `disabled`, `running`, `ok`, `error`, `skipped` ou `idle`. Cela reflète la colonne d'état lisible par l'homme afin que les outils externes puissent lire l'état de la tâche sans avoir à le recalculer.

Les entrées `cron runs` incluent des diagnostics de livraison avec la cible cron prévue, la cible résolue, les envois du message-tool, l'utilisation du repli et l'état de livraison.

Redirection d'agent et de session :

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

`openclaw cron add` avertit lorsque `--agent` est omis sur les tâches de tour d'agent (agent-turn) et revient à l'agent par défaut (`main`). Passez `--agent <id>` au moment de la création pour épingler un agent spécifique.

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
