---
summary: "Tâches Cron + réveils pour le planificateur Gateway"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Tâches Cron"
---

# Tâches Cron (planificateur Gateway)

> **Cron vs Heartbeat ?** Consultez [Cron vs Heartbeat](/fr/automation/cron-vs-heartbeat) pour des conseils sur l'utilisation de chacun.

Cron est le planificateur intégré du Gateway. Il rend les tâches persistantes, réveille l'agent au bon moment et peut éventuellement renvoyer la sortie vers un chat.

Si vous souhaitez _« exécuter ceci chaque matin »_ ou _« solliciter l'agent dans 20 minutes »_,
cron est le mécanisme approprié.

Dépannage : [/automation/troubleshooting](/fr/automation/troubleshooting)

## TL;DR

- Cron s'exécute **à l'intérieur du Gateway** (et non à l'intérieur du modèle).
- Les tâches sont persistantes sous `~/.openclaw/cron/`, les redémarrages ne perdent donc pas les planifications.
- Deux styles d'exécution :
  - **Session principale** : mettre en file d'attente un événement système, puis exécuter lors du prochain battement de cœur (heartbeat).
  - **Isolé** : exécuter un tour d'agent dédié dans `cron:<jobId>`, avec livraison (annoncer par défaut ou aucune).
- Les réveils sont de première classe : une tâche peut demander « réveil immédiat » ou « prochain battement de cœur ».
- La publication de Webhook est par tâche via `delivery.mode = "webhook"` + `delivery.to = "<url>"`.
- Un repli de compatibilité (legacy) reste pour les tâches stockées avec `notify: true` lorsque `cron.webhook` est défini, migrez ces tâches vers le mode de livraison par Webhook.
- Pour les mises à niveau, `openclaw doctor --fix` peut normaliser les champs hérités du magasin cron avant que le planificateur n'y touche.

## Démarrage rapide (actionnable)

Créer un rappel ponctuel, vérifier son existence et l'exécuter immédiatement :

```bash
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

openclaw cron list
openclaw cron run <job-id>
openclaw cron runs --id <job-id>
```

Planifier une tâche isolée récurrente avec livraison :

```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

## Équivalents d'appels d'outil (outil cron Gateway)

Pour les formes JSON canoniques et les exemples, consultez [Schéma JSON pour les appels d'outils](/fr/automation/cron-jobs#json-schema-for-tool-calls).

## Où sont stockées les tâches cron

Les tâches cron sont persistées sur l'hôte du Gateway à `~/.openclaw/cron/jobs.json` par défaut.
Le Gateway charge le fichier en mémoire et le réécrit en cas de modification, donc les modifications manuelles
ne sont sûres que lorsque le Gateway est arrêté. Privilégiez `openclaw cron add/edit` ou l'API d'appel de l'outil cron pour les modifications.

## Aperçu adapté aux débutants

Considérez une tâche cron comme : **quand** exécuter + **quoi** faire.

1. **Choisir une planification**
   - Rappel ponctuel → `schedule.kind = "at"` (CLI : `--at`)
   - Tâche répétitive → `schedule.kind = "every"` ou `schedule.kind = "cron"`
   - Si votre horodatage ISO omet un fuseau horaire, il est traité comme **UTC**.

2. **Choisir où elle s'exécute**
   - `sessionTarget: "main"` → exécuter lors du prochain battement de cœur (heartbeat) avec le contexte principal.
   - `sessionTarget: "isolated"` → exécuter un tour d'agent dédié dans `cron:<jobId>`.

3. **Choisir la charge utile**
   - Session principale → `payload.kind = "systemEvent"`
   - Session isolée → `payload.kind = "agentTurn"`

Optionnel : les tâches ponctuelles (`schedule.kind = "at"`) sont supprimées après succès par défaut. Définissez
`deleteAfterRun: false` pour les conserver (elles seront désactivées après succès).

## Concepts

### Tâches

Une tâche cron est un enregistrement stocké avec :

- une **planification** (quand elle doit s'exécuter),
- une **charge utile** (ce qu'elle doit faire),
- un **mode de livraison** optionnel (`announce`, `webhook`, ou `none`).
- une **liaison d'agent** optionnelle (`agentId`) : exécuter la tâche sous un agent spécifique ; si
  manquante ou inconnue, la passerelle revient à l'agent par défaut.

Les tâches sont identifiées par un `jobId` stable (utilisé par les CLI/Gateway).
Dans les appels d'outils de l'agent, `jobId` est canonique ; l'ancien `id` est accepté pour compatibilité.
Les tâches ponctuelles se suppriment automatiquement après succès par défaut ; définissez `deleteAfterRun: false` pour les conserver.

### Planifications

Cron prend en charge trois types de planification :

- `at` : horodatage ponctuel via `schedule.at` (ISO 8601).
- `every` : intervalle fixe (ms).
- `cron` : expression cron à 5 champs (ou 6 champs avec les secondes) avec fuseau horaire IANA optionnel.

Les expressions cron utilisent `croner`. Si un fuseau horaire est omis, le fuseau horaire local de l'hôte Gateway est utilisé.

Pour réduire les pics de charge en haut de l'heure sur de nombreuses passerelles, OpenClaw applique une fenêtre de décalage déterministe par tâche allant jusqu'à 5 minutes pour les expressions récurrentes en haut de l'heure (par exemple `0 * * * *`, `0 */2 * * *`). Les expressions à heure fixe telles que `0 7 * * *` restent exactes.

Pour toute planification cron, vous pouvez définir une fenêtre de décalage explicite avec `schedule.staggerMs` (`0` conserve le timing exact). Raccourcis CLI :

- `--stagger 30s` (ou `1m`, `5m`) pour définir une fenêtre de décalage explicite.
- `--exact` pour forcer `staggerMs = 0`.

### Exécution principale vs isolée

#### Tâches de session principale (événements système)

Les tâches principales mettent en file d'attente un événement système et réveillent facultativement le lanceur de heartbeat. Elles doivent utiliser `payload.kind = "systemEvent"`.

- `wakeMode: "now"` (par défaut) : l'événement déclenche une exécution immédiate du heartbeat.
- `wakeMode: "next-heartbeat"` : l'événement attend le prochain heartbeat planifié.

C'est la meilleure option lorsque vous souhaitez le prompt heartbeat normal + le contexte de la session principale. Voir [Heartbeat](/fr/gateway/heartbeat).

#### Tâches isolées (sessions cron dédiées)

Les tâches isolées exécutent un tour d'agent dédié dans la session `cron:<jobId>`.

Comportements clés :

- Le prompt est préfixé avec `[cron:<jobId> <job name>]` pour la traçabilité.
- Chaque exécution démarre un **id de session frais** (aucun report de conversation précédente).
- Comportement par défaut : si `delivery` est omis, les tâches isolées annoncent un résumé (`delivery.mode = "announce"`).
- `delivery.mode` choisit ce qui se passe :
  - `announce` : envoyer un résumé au channel cible et poster un bref résumé dans la session principale.
  - `webhook` : POST le payload de l'événement terminé à `delivery.to` lorsque l'événement terminé inclut un résumé.
  - `none` : interne uniquement (pas de livraison, pas de résumé de session principale).
- `wakeMode` contrôle quand le résumé de session principale est posté :
  - `now` : heartbeat immédiat.
  - `next-heartbeat` : attend le prochain heartbeat programmé.

Utilisez des tâches isolées pour les travaux bruyants, fréquents ou les « tâches d'arrière-plan » qui ne doivent pas polluer
l'historique de votre chat principal.

### Formes de payload (ce qui s'exécute)

Deux types de payload sont pris en charge :

- `systemEvent` : session principale uniquement, acheminé via le prompt heartbeat.
- `agentTurn` : session isolée uniquement, exécute un tour d'agent dédié.

Champs communs de `agentTurn` :

- `message` : prompt texte requis.
- `model` / `thinking` : remplacements optionnels (voir ci-dessous).
- `timeoutSeconds` : remplacement du délai d'attente optionnel.
- `lightContext` : mode d'amorçage léger optionnel pour les tâches qui n'ont pas besoin de l'injection de fichier d'amorçage de l'espace de travail.

Configuration de la livraison :

- `delivery.mode` : `none` | `announce` | `webhook`.
- `delivery.channel` : `last` ou un channel spécifique.
- `delivery.to` : cible spécifique au channel (annonce) ou URL de webhook (mode webhook).
- `delivery.bestEffort` : éviter d'échouer la tâche si la livraison de l'annonce échoue.

La livraison par annonce supprime les envois d'outil de messagerie pour l'exécution ; utilisez `delivery.channel`/`delivery.to`
pour cibler le chat à la place. Lorsque `delivery.mode = "none"`, aucun résumé n'est posté dans la session principale.

Si `delivery` est omis pour les tâches isolées, OpenClaw utilise par défaut `announce`.

#### Flux de livraison par annonce

Lorsque `delivery.mode = "announce"`, cron livre directement via les adaptateurs de canal sortant.
L'agent principal n'est pas lancé pour créer ou transférer le message.

Détails du comportement :

- Contenu : la livraison utilise les charges utiles sortantes (texte/média) de l'exécution isolée avec le découpage normal et le formatage du canal.
- Les réponses uniquement de pulsation (`HEARTBEAT_OK` sans contenu réel) ne sont pas livrées.
- Si l'exécution isolée a déjà envoyé un message à la même cible via l'outil de message, la livraison est ignorée pour éviter les doublons.
- Les cibles de livraison manquantes ou invalides font échouer la tâche, sauf si `delivery.bestEffort = true`.
- Un court résumé est publié dans la session principale uniquement lorsque `delivery.mode = "announce"`.
- Le résumé de la session principale respecte `wakeMode` : `now` déclenche une pulsation immédiate et `next-heartbeat` attend la prochaine pulsation programmée.

#### Flux de livraison par webhook

Lorsque `delivery.mode = "webhook"`, cron publie la charge utile de l'événement terminé sur `delivery.to` lorsque l'événement terminé inclut un résumé.

Détails du comportement :

- Le point de terminaison doit être une URL HTTP(S) valide.
- Aucune livraison par canal n'est tentée en mode webhook.
- Aucun résumé de session principale n'est publié en mode webhook.
- Si `cron.webhookToken` est défini, l'en-tête d'authentification est `Authorization: Bearer <cron.webhookToken>`.
- Alternative obsolète : les tâches héritées stockées avec `notify: true` publient toujours sur `cron.webhook` (si configuré), avec un avertissement pour que vous puissiez migrer vers `delivery.mode = "webhook"`.

### Remplacements de modèle et de réflexion

Les tâches isolées (`agentTurn`) peuvent remplacer le modèle et le niveau de réflexion :

- `model` : Chaîne fournisseur/modèle (ex. : `anthropic/claude-sonnet-4-20250514`) ou alias (ex. : `opus`)
- `thinking` : Niveau de réflexion (`off`, `minimal`, `low`, `medium`, `high`, `xhigh` ; modèles GPT-5.2 + Codex uniquement)

Remarque : Vous pouvez définir `model` sur les tâches de session principale également, mais cela modifie le modèle de la session principale partagée. Nous recommandons les redéfinitions de modèle uniquement pour les tâches isolées afin d'éviter des changements de contexte inattendus.

Priorité de résolution :

1. Redéfinition de la charge utile de la tâche (la plus élevée)
2. Par défaut spécifiques aux hooks (par exemple, `hooks.gmail.model`)
3. Par défaut de la configuration de l'agent

### Contexte d'amorçage léger

Les tâches isolées (`agentTurn`) peuvent définir `lightContext: true` pour s'exécuter avec un contexte d'amorçage léger.

- Utilisez ceci pour les tâches programmées qui n'ont pas besoin de l'injection de fichiers d'amorçage de l'espace de travail.
- En pratique, le runtime intégré s'exécute avec `bootstrapContextMode: "lightweight"`, ce qui garde le contexte d'amorçage cron vide volontairement.
- Équivalents CLI : `openclaw cron add --light-context ...` et `openclaw cron edit --light-context`.

### Livraison (channel + cible)

Les tâches isolées peuvent livrer la sortie vers un channel via la configuration de niveau supérieur `delivery` :

- `delivery.mode` : `announce` (livraison sur channel), `webhook` (HTTP POST), ou `none`.
- `delivery.channel` : `whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (plugin) / `signal` / `imessage` / `last`.
- `delivery.to` : cible du destinataire spécifique au channel.

La livraison `announce` n'est valide que pour les tâches isolées (`sessionTarget: "isolated"`).
La livraison `webhook` est valide pour les tâches principales et isolées.

Si `delivery.channel` ou `delivery.to` est omis, cron peut revenir à la « dernière route » (last route) de la session principale (le dernier endroit où l'agent a répondu).

Rappels sur le format de la cible :

- Les cibles Slack/Discord/Mattermost (plugin) doivent utiliser des préfixes explicites (par ex. `channel:<id>`, `user:<id>`) pour éviter toute ambiguïté.
  Les IDs bruts de 26 caractères Mattermost sont résolus en **priorisant l'utilisateur** (DM si l'utilisateur existe, sinon channel) — utilisez `user:<id>` ou `channel:<id>` pour un routage déterministe.
- Les sujets Telegram doivent utiliser la forme `:topic:` (voir ci-dessous).

#### Cibles de livraison Telegram (sujets / fils de discussion de forum)

Telegram prend en charge les sujets de forum via `message_thread_id`. Pour la livraison cron, vous pouvez encoder le sujet/fil dans le champ `to` :

- `-1001234567890` (chat id uniquement)
- `-1001234567890:topic:123` (préféré : marqueur de sujet explicite)
- `-1001234567890:123` (abréviation : suffixe numérique)

Les cibles préfixées comme `telegram:...` / `telegram:group:...` sont également acceptées :

- `telegram:group:-1001234567890:topic:123`

## Schéma JSON pour les appels d'outil

Utilisez ces formes lors de l'appel direct des outils `cron.*` Gateway (appels d'outil de l'agent ou RPC).
Les indicateurs CLI acceptent les durées humaines comme `20m`, mais les appels d'outil doivent utiliser une chaîne ISO 8601
pour `schedule.at` et des millisecondes pour `schedule.everyMs`.

### paramètres cron.add

Tâche unique, session principale (événement système) :

```json
{
  "name": "Reminder",
  "schedule": { "kind": "at", "at": "2026-02-01T16:00:00Z" },
  "sessionTarget": "main",
  "wakeMode": "now",
  "payload": { "kind": "systemEvent", "text": "Reminder text" },
  "deleteAfterRun": true
}
```

Tâche récurrente, isolée avec livraison :

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates.",
    "lightContext": true
  },
  "delivery": {
    "mode": "announce",
    "channel": "slack",
    "to": "channel:C1234567890",
    "bestEffort": true
  }
}
```

Notes :

- `schedule.kind` : `at` (`at`), `every` (`everyMs`), ou `cron` (`expr`, `tz` facultatif).
- `schedule.at` accepte ISO 8601 (fuseau horaire facultatif ; traité comme UTC si omis).
- `everyMs` est en millisecondes.
- `sessionTarget` doit être `"main"` ou `"isolated"` et doit correspondre à `payload.kind`.
- Champs facultatifs : `agentId`, `description`, `enabled`, `deleteAfterRun` (valeur par défaut true pour `at`),
  `delivery`.
- `wakeMode` prend par défaut la valeur `"now"` lorsqu'il est omis.

### paramètres cron.update

```json
{
  "jobId": "job-123",
  "patch": {
    "enabled": false,
    "schedule": { "kind": "every", "everyMs": 3600000 }
  }
}
```

Notes :

- `jobId` est canonique ; `id` est accepté pour compatibilité.
- Utilisez `agentId: null` dans le correctif pour effacer une liaison d'agent.

### paramètres cron.run et cron.remove

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## Stockage et historique

- Magasin de tâches : `~/.openclaw/cron/jobs.json` (JSON géré par Gateway).
- Historique des exécutions : `~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL, nettoyé automatiquement par taille et nombre de lignes).
- Les sessions d'exécution cron isolées dans `sessions.json` sont nettoyées par `cron.sessionRetention` (par défaut `24h` ; définissez `false` pour désactiver).
- Chemin du magasin de substitution : `cron.store` dans la configuration.

## Politique de nouvelle tentative

Lorsqu'une tâche échoue, OpenClaw classe les erreurs comme **transitoires** (réessayables) ou **permanentes** (désactiver immédiatement).

### Erreurs transitoires (réessayées)

- Limite de taux (429, trop de demandes, ressources épuisées)
- Surcharge du fournisseur (par exemple Anthropic `529 overloaded_error`, résumés de repli de surcharge)
- Erreurs réseau (expiration, ECONNRESET, échec de récupération, socket)
- Erreurs serveur (5xx)
- Erreurs liées à Cloudflare

### Erreurs permanentes (pas de nouvelle tentative)

- Échecs d'authentification (clé API non valide, non autorisé)
- Erreurs de configuration ou de validation
- Autres erreurs non transitoires

### Comportement par défaut (sans configuration)

**Tâches ponctuelles (`schedule.kind: "at"`) :**

- En cas d'erreur transitoire : réessayer jusqu'à 3 fois avec un backoff exponentiel (30s → 1m → 5m).
- En cas d'erreur permanente : désactiver immédiatement.
- En cas de succès ou d'ignorance : désactiver (ou supprimer si `deleteAfterRun: true`).

**Tâches récurrentes (`cron` / `every`) :**

- En cas d'erreur quelconque : appliquer un backoff exponentiel (30s → 1m → 5m → 15m → 60m) avant la prochaine exécution planifiée.
- La tâche reste activée ; le backoff est réinitialisé après la prochaine exécution réussie.

Configurez `cron.retry` pour remplacer ces valeurs par défaut (voir [Configuration](/fr/automation/cron-jobs#configuration)).

## Configuration

```json5
{
  cron: {
    enabled: true, // default true
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1, // default 1
    // Optional: override retry policy for one-shot jobs
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-webhook-token", // optional bearer token for webhook mode
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

Comportement du nettoyage des journaux d'exécution :

- `cron.runLog.maxBytes` : taille maximale du fichier de journal d'exécution avant le nettoyage.
- `cron.runLog.keepLines` : lors du nettoyage, ne conserver que les N lignes les plus récentes.
- Les deux s'appliquent aux fichiers `cron/runs/<jobId>.jsonl`.

Comportement des webhooks :

- Préférence : définir `delivery.mode: "webhook"` avec `delivery.to: "https://..."` par tâche.
- Les URL de webhook doivent être des URL `http://` ou `https://` valides.
- Lors de l'envoi, la charge utile est le JSON de l'événement de fin de cron.
- Si `cron.webhookToken` est défini, l'en-tête d'authentification est `Authorization: Bearer <cron.webhookToken>`.
- Si `cron.webhookToken` n'est pas défini, aucun en-tête `Authorization` n'est envoyé.
- Contre-mesure obsolète : les tâches héritées stockées avec `notify: true` utilisent encore `cron.webhook` si présent.

Désactiver entièrement le cron :

- `cron.enabled: false` (config)
- `OPENCLAW_SKIP_CRON=1` (env)

## Maintenance

Cron possède deux chemins de maintenance intégrés : la rétention des sessions d'exécution isolées et le nettoyage des journaux d'exécution.

### Valeurs par défaut

- `cron.sessionRetention` : `24h` (définir `false` pour désactiver le nettoyage des sessions d'exécution)
- `cron.runLog.maxBytes` : `2_000_000` octets
- `cron.runLog.keepLines` : `2000`

### Fonctionnement

- Les exécutions isolées créent des entrées de session (`...:cron:<jobId>:run:<uuid>`) et des fichiers de transcription.
- Le nettoyeur supprime les entrées de session d'exécution expirées plus anciennes que `cron.sessionRetention`.
- Pour les sessions d'exécution supprimées n'étant plus référencées par le magasin de sessions, OpenClaw archive les fichiers de transcription et purge les anciennes archives supprimées sur la même fenêtre de rétention.
- Après chaque ajout d'exécution, la taille de `cron/runs/<jobId>.jsonl` est vérifiée :
  - si la taille du fichier dépasse `runLog.maxBytes`, il est réduit aux `runLog.keepLines` lignes les plus récentes.

### Mise en garde concernant les performances pour les planificateurs à fort volume

Les configurations cron à haute fréquence peuvent générer des empreintes importantes de sessions d'exécution et de journaux d'exécution. La maintenance est intégrée, mais des limites trop souples peuvent encore créer des E/S et des travaux de nettoyage évitables.

Ce qu'il faut surveiller :

- de longues fenêtres `cron.sessionRetention` avec de nombreuses exécutions isolées
- une fréquence `cron.runLog.keepLines` élevée combinée à une grande taille `runLog.maxBytes`
- de nombreuses tâches récurrentes bruyantes écrivant dans le même `cron/runs/<jobId>.jsonl`

Ce qu'il faut faire :

- garder `cron.sessionRetention` aussi court que vos besoins de débogage/d'audit le permettent
- garder les journaux d'exécution limités avec une taille `runLog.maxBytes` et un nombre de lignes `runLog.keepLines` modérés
- déplacer les tâches d'arrière-plan bruyantes en mode isolé avec des règles de livraison évitant les bavardages inutiles
- examiner périodiquement la croissance avec `openclaw cron runs` et ajuster la rétention avant que les journaux ne deviennent volumineux

### Exemples de personnalisation

Conserver les sessions d'exécution pendant une semaine et autoriser des journaux d'exécution plus volumineux :

```json5
{
  cron: {
    sessionRetention: "7d",
    runLog: {
      maxBytes: "10mb",
      keepLines: 5000,
    },
  },
}
```

Désactiver le nettoyage des sessions d'exécution isolées mais conserver le nettoyage des journaux d'exécution :

```json5
{
  cron: {
    sessionRetention: false,
    runLog: {
      maxBytes: "5mb",
      keepLines: 3000,
    },
  },
}
```

Ajustement pour une utilisation cron à fort volume (exemple) :

```json5
{
  cron: {
    sessionRetention: "12h",
    runLog: {
      maxBytes: "3mb",
      keepLines: 1500,
    },
  },
}
```

## Démarrage rapide CLI

Rappel ponctuel (UTC ISO, suppression automatique après succès) :

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

Rappel ponctuel (session principale, réveil immédiat) :

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

Tâche isolée récurrente (annoncer sur WhatsApp) :

```bash
openclaw cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Tâche cron récurrente avec décalage explicite de 30 secondes :

```bash
openclaw cron add \
  --name "Minute watcher" \
  --cron "0 * * * * *" \
  --tz "UTC" \
  --stagger 30s \
  --session isolated \
  --message "Run minute watcher checks." \
  --announce
```

Tâche isolée récurrente (livrer à un sujet Telegram) :

```bash
openclaw cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --announce \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

Tâche isolée avec remplacement de modèle et de réflexion :

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Sélection de l'agent (configurations multi-agents) :

```bash
# Pin a job to agent "ops" (falls back to default if that agent is missing)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

Exécution manuelle (force est la valeur par défaut, utilisez `--due` pour n'exécuter que lorsque c'est dû) :

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` accuse maintenant réception une fois l'exécution manuelle mise en file d'attente, et non après la fin de la tâche. Les réponses de file d'attente réussies ressemblent à `{ ok: true, enqueued: true, runId }`. Si la tâche est déjà en cours d'exécution ou si `--due` ne trouve rien dû, la réponse reste `{ ok: true, ran: false, reason }`. Utilisez `openclaw cron runs --id <jobId>` ou la méthode de passerelle `cron.runs` pour inspecter l'entrée finie éventuelle.

Modifier une tâche existante (champs de correctif) :

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

Forcer une tâche cron existante à s'exécuter exactement selon l'horaire (pas de décalage) :

```bash
openclaw cron edit <jobId> --exact
```

Historique des exécutions :

```bash
openclaw cron runs --id <jobId> --limit 50
```

Événement système immédiat sans créer de tâche :

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Surface de l'Gateway du API

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force ou due), `cron.runs`
  Pour les événements système immédiats sans tâche, utilisez [`openclaw system event`](/fr/cli/system).

## Dépannage

### « Rien ne s'exécute »

- Vérifiez que cron est activé : `cron.enabled` et `OPENCLAW_SKIP_CRON`.
- Vérifiez que le Gateway fonctionne en continu (cron s'exécute dans le processus du Gateway).
- Pour les horaires `cron` : confirmez le fuseau horaire (`--tz`) par rapport au fuseau horaire de l'hôte.

### Une tâche récurrente continue de retarder après des échecs

- OpenClaw applique une attente exponentielle de nouvelle tentative pour les tâches récurrentes après des erreurs consécutives :
  30 s, 1 min, 5 min, 15 min, puis 60 min entre les nouvelles tentatives.
- L'attente est réinitialisée automatiquement après la prochaine exécution réussie.
- Les tâches ponctuelles (`at`) réessaient les erreurs transitoires (limite de taux, surcharge, réseau, server_error) jusqu'à 3 fois avec attente ; les erreurs permanentes désactivent immédiatement. Voir [Politique de nouvelle tentative](/fr/automation/cron-jobs#retry-policy).

### Telegram envoie au mauvais endroit

- Pour les sujets de forum, utilisez `-100…:topic:<id>` afin que ce soit explicite et sans ambiguïté.
- Si vous voyez des préfixes `telegram:...` dans les journaux ou les cibles « last route » stockées, c'est normal ; la livraison cron les accepte et analyse toujours correctement les ID de sujet.

### Nouvelles tentatives de livraison des annonces de sous-agent

- Lorsqu'une exécution de sous-agent est terminée, la passerelle annonce le résultat à la session demanderesse.
- Si le flux d'annonce renvoie `false` (par exemple, la session demanderesse est occupée), la passerelle réessaie jusqu'à 3 fois avec un suivi via `announceRetryCount`.
- Les annonces datant de plus de 5 minutes après `endedAt` sont forcément expirées pour empêcher les entrées obsolètes de boucler indéfiniment.
- Si vous voyez des livraisons d'annonces répétées dans les journaux, vérifiez le registre des sous-agents pour les entrées avec des valeurs `announceRetryCount` élevées.

import fr from '/components/footer/fr.mdx';

<fr />
