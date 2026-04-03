---
summary: "Tâches Cron + réveils pour le planificateur Gateway"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Tâches Cron"
---

# Tâches Cron (planificateur Gateway)

> **Cron vs Heartbeat ?** Voir [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) pour des conseils sur l'utilisation de chacun.

Cron est le planificateur intégré du Gateway. Il rend les tâches persistantes, réveille l'agent au bon moment et peut éventuellement renvoyer la sortie vers un chat.

Toutes les exécutions cron créent des enregistrements de [tâche d'arrière-plan](/en/automation/tasks). La principale différence réside dans la visibilité :

- `sessionTarget: "main"` crée une tâche avec une politique de notification `silent` — elle planifie un événement système pour la session principale et le flux heartbeat, mais ne génère pas de notifications.
- `sessionTarget: "isolated"` ou `sessionTarget: "session:..."` crée une tâche visible qui apparaît dans `openclaw tasks` avec des notifications de livraison.

Si vous souhaitez _« exécuter ceci chaque matin »_ ou _« réveiller l'agent dans 20 minutes »_,
cron est le mécanisme approprié.

Dépannage : [/automation/troubleshooting](/en/automation/troubleshooting)

## En résumé

- Cron s'exécute **au sein du Gateway** (pas au sein du modèle).
- Les tâches sont persistantes sous `~/.openclaw/cron/`, donc les redémarrages ne font pas perdre les planifications.
- Deux styles d'exécution :
  - **Session principale** : mettre en file un événement système, puis exécuter au prochain heartbeat.
  - **Isolé** : exécuter un tour d'agent dédié dans `cron:<jobId>` ou une session personnalisée, avec livraison (annoncer par défaut ou aucune).
  - **Session actuelle** : lier à la session où le cron est créé (`sessionTarget: "current"`).
  - **Session personnalisée** : exécuter dans une session nommée persistante (`sessionTarget: "session:custom-id"`).
- Les réveils sont de première classe : une tâche peut demander « réveil immédiat » contre « prochain heartbeat ».
- La publication de webhook est par tâche via `delivery.mode = "webhook"` + `delivery.to = "<url>"`.
- Le repli de compatibilité reste pour les tâches stockées avec `notify: true` lorsque `cron.webhook` est défini, migrez ces tâches vers le mode de livraison webhook.
- Pour les mises à niveau, `openclaw doctor --fix` peut normaliser les champs hérités du stock cron, y compris d'anciennes indications de livraison de premier niveau telles que `threadId`.

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

## Équivalents d'appel d'outil (outil cron Gateway)

Pour les formes JSON canoniques et les exemples, voir [Schéma JSON pour les appels d'outils](/en/automation/cron-jobs#json-schema-for-tool-calls).

## Où sont stockés les tâches cron

Les tâches cron sont persistées sur l'hôte Gateway à `~/.openclaw/cron/jobs.json` par défaut.
Le Gateway charge le fichier en mémoire et le réécrit lors des modifications, donc les modifications manuelles
ne sont sûres que lorsque le Gateway est arrêté. Privilégiez `openclaw cron add/edit` ou l'API d'appel d'outil cron pour les modifications.

## Aperçu pour débutants

Considérez une tâche cron comme : **quand** exécuter + **quoi** faire.

1. **Choisir un horaire**
   - Rappel ponctuel → `schedule.kind = "at"` (CLI : `--at`)
   - Tâche répétitive → `schedule.kind = "every"` ou `schedule.kind = "cron"`
   - Si votre horodatage ISO omet un fuseau horaire, il est traité comme **UTC**.

2. **Choisir où elle s'exécute**
   - `sessionTarget: "main"` → s'exécute lors du prochain battement de cœur (heartbeat) avec le contexte principal.
   - `sessionTarget: "isolated"` → exécute un tour d'agent dédié dans `cron:<jobId>`.
   - `sessionTarget: "current"` → se lie à la session actuelle (résolue au moment de la création en `session:<sessionKey>`).
   - `sessionTarget: "session:custom-id"` → s'exécute dans une session nommée persistante qui maintient le contexte entre les exécutions.

   Comportement par défaut (inchangé) :
   - Les charges utiles `systemEvent` sont `main` par défaut
   - Les charges utiles `agentTurn` sont `isolated` par défaut

   Pour utiliser la liaison à la session actuelle, définissez explicitement `sessionTarget: "current"`.

3. **Choisir la charge utile**
   - Session principale → `payload.kind = "systemEvent"`
   - Session isolée → `payload.kind = "agentTurn"`

Optionnel : les tâches ponctuelles (`schedule.kind = "at"`) sont supprimées après succès par défaut. Définissez
`deleteAfterRun: false` pour les conserver (elles seront désactivées après succès).

## Concepts

### Tâches

Une tâche cron est un enregistrement stocké avec :

- un **horaire** (quand elle doit s'exécuter),
- une **charge utile** (ce qu'elle doit faire),
- un **mode de livraison** optionnel (`announce`, `webhook`, ou `none`).
- une **liaison d'agent** optionnelle (`agentId`) : exécute la tâche sous un agent spécifique ; si
  manquant ou inconnu, la passerelle revient à l'agent par défaut.

Les tâches sont identifiées par un `jobId` stable (utilisé par les API CLI/Gateway).
Dans les appels d'outils de l'agent, `jobId` est canonique ; l'ancien `id` est accepté pour compatibilité.
Les tâches ponctuelles sont supprimées automatiquement après succès par défaut ; définissez `deleteAfterRun: false` pour les conserver.

### Planifications

Cron prend en charge trois types de planifications :

- `at` : horodatage ponctuel via `schedule.at` (ISO 8601).
- `every` : intervalle fixe (ms).
- `cron` : expression cron à 5 champs (ou 6 champs avec secondes) avec fuseau horaire IANA facultatif.

Les expressions cron utilisent `croner`. Si un fuseau horaire est omis, le fuseau horaire local de l'hôte Gateway est utilisé.

Pour réduire les pics de charge en début d'heure sur de nombreuses passerelles, OpenClaw applique une fenêtre d'étalonnement déterministe par tâche pouvant aller jusqu'à 5 minutes pour les expressions récurrentes en début d'heure (par exemple `0 * * * *`, `0 */2 * * *`). Les expressions à heure fixe telles que `0 7 * * *` restent exactes.

Pour n'importe quelle planification cron, vous pouvez définir une fenêtre d'étalonnement explicite avec `schedule.staggerMs`
(`0` conserve le timing exact). Raccourcis CLI :

- `--stagger 30s` (ou `1m`, `5m`) pour définir une fenêtre d'étalonnement explicite.
- `--exact` pour forcer `staggerMs = 0`.

### Exécution principale vs isolée

#### Tâches de session principale (événements système)

Les tâches principales mettent en file d'attente un événement système et réveillent éventuellement le moteur de heartbeat.
Elles doivent utiliser `payload.kind = "systemEvent"`.

- `wakeMode: "now"` (par défaut) : l'événement déclenche une exécution immédiate du heartbeat.
- `wakeMode: "next-heartbeat"` : l'événement attend le prochain heartbeat planifié.

C'est la meilleure solution lorsque vous souhaitez le prompt heartbeat normal + le contexte de la session principale.
Voir [Heartbeat](/en/gateway/heartbeat).

Les tâches cron de session principale créent des enregistrements de [tâche d'arrière-plan](/en/automation/tasks) avec la stratégie de notification `silent` (pas de notifications par défaut). Elles apparaissent dans `openclaw tasks list` mais ne génèrent pas de messages de livraison.

#### Tâches isolées (sessions cron dédiées)

Les tâches isolées exécutent un tour d'agent dédié dans la session `cron:<jobId>` ou une session personnalisée.

Comportements clés :

- Le prompt est préfixé avec `[cron:<jobId> <job name>]` pour la traçabilité.
- Chaque exécution démarre un **id de session frais** (aucun report de conversation précédente), sauf si une session personnalisée est utilisée.
- Les sessions personnalisées (`session:xxx`) conservent le contexte entre les exécutions, permettant des flux de travail comme les points quotidiens qui s'appuient sur les résumés précédents.
- Comportement par défaut : si `delivery` est omis, les tâches isolées annoncent un résumé (`delivery.mode = "announce"`).
- `delivery.mode` choisit ce qui se passe :
  - `announce` : délivrer un résumé au canal cible et poster un bref résumé à la session principale.
  - `webhook` : POST la charge utile de l'événement terminé vers `delivery.to` lorsque l'événement terminé inclut un résumé.
  - `none` : interne uniquement (aucune livraison, aucun résumé de session principale).
- `wakeMode` contrôle quand le résumé de la session principale est posté :
  - `now` : battement de cœur immédiat.
  - `next-heartbeat` : attend le prochain battement de cœur programmé.

Utilisez des tâches isolées pour les tâches bruyantes, fréquentes ou les "tâches d'arrière-plan" qui ne doivent pas polluer
votre historique de chat principal.

Ces exécutions détachées créent des enregistrements de [tâche d'arrière-plan](/en/automation/tasks) visibles dans `openclaw tasks` et soumis à l'audit et à la maintenance des tâches.

### Formes de charge utile (ce qui s'exécute)

Deux types de charges utiles sont pris en charge :

- `systemEvent` : session principale uniquement, acheminé via le prompt de battement de cœur.
- `agentTurn` : session isolée uniquement, exécute un tour d'agent dédié.

Champs `agentTurn` courants :

- `message` : prompt texte requis.
- `model` / `thinking` : substitutions facultatives (voir ci-dessous).
- `timeoutSeconds` : substitution de délai d'attente facultative.
- `lightContext` : mode d'amorçage léger facultatif pour les tâches qui n'ont pas besoin de l'injection de fichier d'amorçage de l'espace de travail.
- `toolsAllow` : tableau facultatif de noms d'outils pour restreindre les outils que la tâche peut utiliser (par ex. `["exec", "read", "write"]`).

Configuration de la livraison :

- `delivery.mode` : `none` | `announce` | `webhook`.
- `delivery.channel` : `last` ou un channel spécifique.
- `delivery.to` : cible spécifique au channel (annonce) ou URL de webhook (mode webhook).
- `delivery.threadId` : id de fil ou de sujet explicite facultatif lorsque le channel cible prend en charge la livraison en fil de discussion.
- `delivery.bestEffort` : éviter d'échouer la tâche si la livraison de l'annonce échoue.

La livraison par annonce supprime les envois d'outils de messagerie pour l'exécution ; utilisez `delivery.channel`/`delivery.to`
pour cibler le chat à la place. Lorsque `delivery.mode = "none"`, aucun résumé n'est publié dans la session principale.

Si `delivery` est omis pour les tâches isolées, OpenClaw utilise par défaut `announce`.

#### Flux de livraison par annonce

Lorsque `delivery.mode = "announce"`, cron livre directement via les adaptateurs de canal sortant.
L'agent principal n'est pas démarré pour crafting ou transférer le message.

Détails du comportement :

- Contenu : la livraison utilise les charges utiles sortantes (texte/média) de l'exécution isolée avec le découpage normal et
  le formatage du channel.
- Les réponses heartbeat uniquement (`HEARTBEAT_OK` sans réel contenu) ne sont pas livrées.
- Si l'exécution isolée a déjà envoyé un message à la même cible via l'outil de message, la livraison est
  ignorée pour éviter les doublons.
- Les cibles de livraison manquantes ou invalides font échouer la tâche, sauf si `delivery.bestEffort = true`.
- Un court résumé est posté dans la session principale uniquement lorsque `delivery.mode = "announce"`.
- Le résumé de session principale respecte `wakeMode` : `now` déclenche un heartbeat immédiat et
  `next-heartbeat` attend le prochain heartbeat programmé.

#### Flux de livraison par webhook

Lorsque `delivery.mode = "webhook"`, cron publie la charge utile de l'événement terminé sur `delivery.to` lorsque l'événement terminé inclut un résumé.

Détails du comportement :

- Le point de terminaison doit être une URL HTTP(S) valide.
- Aucune livraison sur le channel n'est tentée en mode webhook.
- Aucun résumé de session principale n'est posté en mode webhook.
- Si `cron.webhookToken` est défini, l'en-tête d'authentification est `Authorization: Bearer <cron.webhookToken>`.
- Contingence obsolète : les tâches héritées stockées avec `notify: true` publient toujours vers `cron.webhook` (si configuré), avec un avertissement pour que vous puissiez migrer vers `delivery.mode = "webhook"`.

### Remplacements du model et de la réflexion

Les tâches isolées (`agentTurn`) peuvent remplacer le model et le niveau de réflexion :

- `model` : Chaîne fournisseur/model (par ex., `anthropic/claude-sonnet-4-20250514`) ou alias (par ex., `opus`)
- `thinking` : Niveau de réflexion (`off`, `minimal`, `low`, `medium`, `high`, `xhigh` ; modèles GPT-5.2 + Codex uniquement)

Remarque : Vous pouvez définir `model` sur les tâches de session principale également, mais cela modifie le model de la session principale partagée. Nous recommandons les remplacements de model uniquement pour les tâches isolées afin d'éviter des changements de contexte inattendus.

Priorité de résolution :

1. Remplacement par la charge utile de la tâche (le plus élevé)
2. Défauts spécifiques aux hooks (par ex., `hooks.gmail.model`)
3. Défaut de la configuration de l'agent

### Contexte d'amorçage léger

Les tâches isolées (`agentTurn`) peuvent définir `lightContext: true` pour s'exécuter avec un contexte d'amorçage léger.

- Utilisez ceci pour les tâches programmées qui n'ont pas besoin de l'injection de fichiers d'amorçage de l'espace de travail.
- En pratique, le runtime intégré s'exécute avec `bootstrapContextMode: "lightweight"`, ce qui garde volontairement vide le contexte d'amorçage cron.
- Équivalents CLI : `openclaw cron add --light-context ...` et `openclaw cron edit --light-context`.

### Livraison (channel + cible)

Les tâches isolées peuvent livrer la sortie vers un channel via la configuration de premier niveau `delivery` :

- `delivery.mode` : `announce` (livraison sur le channel), `webhook` (HTTP POST), ou `none`.
- `delivery.channel` : `last` ou tout identifiant de channel livrable, par exemple `discord`, `matrix`, `telegram`, ou `whatsapp`.
- `delivery.to` : destinataire cible spécifique au channel.
- `delivery.threadId` : substitution facultative de fil/sujet pour des channels comme Telegram, Slack, Discord ou Matrix lorsque vous souhaitez un fil spécifique sans l'encoder dans `delivery.to`.

La livraison `announce` n'est valide que pour les tâches isolées (`sessionTarget: "isolated"`).
La livraison `webhook` est valide pour les tâches principales et isolées.

Si `delivery.channel` ou `delivery.to` est omis, le cron peut revenir à la « dernière route »
de la session principale (le dernier endroit où l'agent a répondu).

Rappels sur le format de la cible :

- Les cibles Slack/Discord/Mattermost (plugin) doivent utiliser des préfixes explicites (ex. `channel:<id>`, `user:<id>`) pour éviter toute ambiguïté.
  Les identifiants bruts de 26 caractères Mattermost sont résolus en **priorité utilisateur** (DM si l'utilisateur existe, sinon channel) — utilisez `user:<id>` ou `channel:<id>` pour un routage déterministe.
- Les sujets Telegram doivent utiliser la forme `:topic:` (voir ci-dessous).

#### Cibles de livraison Telegram (sujets / fils de forum)

Telegram prend en charge les sujets de forum via `message_thread_id`. Pour la livraison cron, vous pouvez encoder
le sujet/fil dans le champ `to` :

- `-1001234567890` (identifiant de chat uniquement)
- `-1001234567890:topic:123` (préféré : marqueur de sujet explicite)
- `-1001234567890:123` (abréviation : suffixe numérique)

Les cibles préfixées comme `telegram:...` / `telegram:group:...` sont également acceptées :

- `telegram:group:-1001234567890:topic:123`

## Schéma JSON pour les appels d'outil

Utilisez ces formats lors de l'appel direct des outils `cron.*` du Gateway (appels d'outils d'agent ou Gateway).
Les indicateurs du RPC acceptent des durées humaines comme `20m`, mais les appels d'outils doivent utiliser une chaîne ISO 8601
pour `schedule.at` et des millisecondes pour `schedule.everyMs`.

### Paramètres de cron.add

Tâche unique de session principale (événement système) :

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

Tâche récurrente isolée avec livraison :

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

Tâche récurrente liée à la session actuelle (résolue automatiquement à la création) :

```json
{
  "name": "Daily standup",
  "schedule": { "kind": "cron", "expr": "0 9 * * *" },
  "sessionTarget": "current",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize yesterday's progress."
  }
}
```

Tâche récurrente dans une session persistante personnalisée :

```json
{
  "name": "Project monitor",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "sessionTarget": "session:project-alpha-monitor",
  "payload": {
    "kind": "agentTurn",
    "message": "Check project status and update the running log."
  }
}
```

Notes :

- `schedule.kind` : `at` (`at`), `every` (`everyMs`), ou `cron` (`expr`, `tz` facultatif).
- `schedule.at` accepte l'ISO 8601. Les valeurs d'outil/API sans fuseau horaire sont traitées comme UTC ; le CLI accepte également `openclaw cron add|edit --at "<offset-less-iso>" --tz <iana>` pour des tâches uniques horloge murale locales.
- `everyMs` est en millisecondes.
- `sessionTarget` : `"main"`, `"isolated"`, `"current"`, ou `"session:<custom-id>"`.
- `"current"` est résolu en `"session:<sessionKey>"` au moment de la création.
- Les sessions personnalisées (`session:xxx`) maintiennent un contexte persistant entre les exécutions.
- Champs facultatifs : `agentId`, `description`, `enabled`, `deleteAfterRun` (par défaut true pour `at`),
  `delivery`, `toolsAllow`.
- `toolsAllow` : tableau facultatif de noms d'outils pour restreindre les outils que la tâche peut utiliser (par ex. `["exec", "read"]`). Omettez ou définissez `null` pour utiliser tous les outils.
- `wakeMode` prend par défaut la valeur `"now"` en cas d'omission.

### Paramètres de cron.update

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

- `jobId` est la forme canonique ; `id` est accepté pour compatibilité.
- Utilisez `agentId: null` dans le correctif pour effacer une liaison d'agent.

### Paramètres de cron.run et cron.remove

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## Stockage et historique

- Magasin de tâches : `~/.openclaw/cron/jobs.json` (JSON géré par Gateway).
- Historique d'exécution : `~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL, nettoyé automatiquement par taille et nombre de lignes).
- Les sessions d'exécution cron isolées dans `sessions.json` sont nettoyées par `cron.sessionRetention` (par défaut `24h` ; définissez `false` pour désactiver).
- Remplacer le chemin du magasin : `cron.store` dans la configuration.

## Politique de réessai

Lorsqu'une tâche échoue, OpenClaw classe les erreurs comme **transitoires** (réessayables) ou **permanentes** (désactiver immédiatement).

### Erreurs transitoires (réessayées)

- Limite de débit (429, trop de demandes, ressources épuisées)
- Surcharge du fournisseur (par exemple Anthropic `529 overloaded_error`, résumés de repli en cas de surcharge)
- Erreurs réseau (expiration, ECONNRESET, échec de récupération, socket)
- Erreurs serveur (5xx)
- Erreurs liées à Cloudflare

### Erreurs permanentes (pas de réessai)

- Échecs d'authentification (clé API non valide, non autorisé)
- Erreurs de configuration ou de validation
- Autres erreurs non transitoires

### Comportement par défaut (sans configuration)

**Tâches ponctuelles (`schedule.kind: "at"`) :**

- En cas d'erreur transitoire : réessayer jusqu'à 3 fois avec un backoff exponentiel (30 s → 1 min → 5 min).
- En cas d'erreur permanente : désactiver immédiatement.
- En cas de succès ou d'ignorance : désactiver (ou supprimer si `deleteAfterRun: true`).

**Tâches récurrentes (`cron` / `every`) :**

- En cas d'erreur quelconque : appliquer un backoff exponentiel (30 s → 1 min → 5 min → 15 min → 60 min) avant la prochaine exécution planifiée.
- La tâche reste activée ; le backoff est réinitialisé après la prochaine exécution réussie.

Configurez `cron.retry` pour remplacer ces valeurs par défaut (voir [Configuration](/en/automation/cron-jobs#configuration)).

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

Comportement du nettoyage du journal d'exécution :

- `cron.runLog.maxBytes` : taille maximale du fichier de journal d'exécution avant nettoyage.
- `cron.runLog.keepLines` : lors du nettoyage, ne conserver que les N lignes les plus récentes.
- Les deux s'appliquent aux fichiers `cron/runs/<jobId>.jsonl`.

Comportement du Webhook :

- Préféré : définir `delivery.mode: "webhook"` avec `delivery.to: "https://..."` par tâche.
- Les URL de Webhook doivent être des URL `http://` ou `https://` valides.
- Lorsqu'il est envoyé, la charge utile est le JSON de l'événement de fin de cron.
- Si `cron.webhookToken` est défini, l'en-tête d'authentification est `Authorization: Bearer <cron.webhookToken>`.
- Si `cron.webhookToken` n'est pas défini, aucun en-tête `Authorization` n'est envoyé.
- Solution de repli obsolète : les tâches héritées stockées avec `notify: true` utilisent toujours `cron.webhook` lorsqu'il est présent.

Désactiver entièrement cron :

- `cron.enabled: false` (config)
- `OPENCLAW_SKIP_CRON=1` (env)

## Maintenance

Cron dispose de deux chemins de maintenance intégrés : la rétention des sessions d'exécution isolées et l'élagage des journaux d'exécution.

### Valeurs par défaut

- `cron.sessionRetention` : `24h` (définissez `false` pour désactiver l'élagage des sessions d'exécution)
- `cron.runLog.maxBytes` : `2_000_000` octets
- `cron.runLog.keepLines` : `2000`

### Fonctionnement

- Les exécutions isolées créent des entrées de session (`...:cron:<jobId>:run:<uuid>`) et des fichiers de transcription.
- Le faucheur (reaper) supprime les entrées de session d'exécution expirées plus anciennes que `cron.sessionRetention`.
- Pour les sessions d'exécution supprimées qui ne sont plus référencées par le magasin de sessions, OpenClaw archive les fichiers de transcription et purge les anciennes archives supprimées sur la même fenêtre de rétention.
- Après chaque ajout d'exécution, `cron/runs/<jobId>.jsonl` est vérifié en taille :
  - si la taille du fichier dépasse `runLog.maxBytes`, il est réduit aux `runLog.keepLines` lignes les plus récentes.

### Mise en garde concernant les performances pour les planificateurs à fort volume

Les configurations cron à haute fréquence peuvent générer des empreintes de sessions d'exécution et de journaux d'exécution importantes. La maintenance est intégrée, mais des limites souples peuvent encore créer des E/S et des travaux de nettoyage évitables.

Ce qu'il faut surveiller :

- de longues fenêtres `cron.sessionRetention` avec de nombreuses exécutions isolées
- un `cron.runLog.keepLines` élevé combiné à un grand `runLog.maxBytes`
- de nombreuses tâches récurrentes bruyantes écrivant dans le même `cron/runs/<jobId>.jsonl`

Ce qu'il faut faire :

- garder `cron.sessionRetention` aussi court que vos besoins de débogage/d'audit le permettent
- garder les journaux d'exécution bornés avec des valeurs `runLog.maxBytes` et `runLog.keepLines` modérées
- déplacer les tâches d'arrière-plan bruyantes en mode isolé avec des règles de livraison évitant les bavardages inutiles
- examinez périodiquement la croissance avec `openclaw cron runs` et ajustez la rétention avant que les journaux ne deviennent volumineux

### Personnaliser les exemples

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

Désactiver le nettoyage isolé des sessions d'exécution mais conserver le nettoyage des journaux d'exécution :

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

Ajustements pour une utilisation intensive de cron (exemple) :

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

## CLI démarrage rapide

Rappel unique (UTC ISO, suppression automatique après succès) :

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

Rappel unique (session principale, réveil immédiat) :

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

Tâche isolée récurrente (annoncer à WhatsApp) :

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

Tâche isolée récurrente (envoyer vers un sujet Telegram) :

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

Tâche isolée avec substitution de model et de réflexion :

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

Listes d'autorisation d'outils (limiter les outils qu'une tâche peut utiliser) :

```bash
# Only allow exec and read tools for this job
openclaw cron add --name "Scoped job" --cron "0 8 * * *" --session isolated --message "Run scoped checks" --tools exec,read

# Update an existing job's tool allowlist
openclaw cron edit <jobId> --tools exec,read,write

# Remove a tool allowlist (use all tools)
openclaw cron edit <jobId> --clear-tools
```

Exécution manuelle (force est la valeur par défaut, utilisez `--due` pour exécuter uniquement lorsque prévu) :

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` confirme désormais dès que l'exécution manuelle est mise en file d'attente, et non après la fin de la tâche. Les réponses de file d'attente réussies ressemblent à `{ ok: true, enqueued: true, runId }`. Si la tâche est déjà en cours d'exécution ou que `--due` ne trouve rien de prévu, la réponse reste `{ ok: true, ran: false, reason }`. Utilisez `openclaw cron runs --id <jobId>` ou la méthode de passerelle `cron.runs` pour inspecter l'entrée terminée éventuelle.

Modifier une tâche existante (patcher les champs) :

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

Forcer une tâche cron existante à s'exécuter exactement selon l'horaire (sans décalage) :

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

## Surface Gateway API

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force ou prévu), `cron.runs`
  Pour les événements système immédiats sans tâche, utilisez [`openclaw system event`](/en/cli/system).

## Dépannage

### "Rien ne s'exécute"

- Vérifiez que cron est activé : `cron.enabled` et `OPENCLAW_SKIP_CRON`.
- Vérifiez que la Gateway fonctionne en continu (cron s'exécute dans le processus Gateway).
- Pour les horaires `cron` : confirmez le fuseau horaire (`--tz`) par rapport au fuseau horaire de l'hôte.

### Une tâche récurrente continue de retarder après des échecs

- OpenClaw applique une temporisation exponentielle de nouvelle tentative pour les tâches récurrentes après des erreurs consécutives :
  30s, 1m, 5m, 15m, puis 60m entre les tentatives.
- La temporisation est réinitialisée automatiquement après la prochaine exécution réussie.
- Les tâches ponctuelles (`at`) réessayent les erreurs transitoires (limite de débit, surcharge, réseau, server_error) jusqu'à 3 fois avec temporisation ; les erreurs permanentes les désactivent immédiatement. Voir [Politique de nouvelle tentative](/en/automation/cron-jobs#retry-policy).

### Telegram envoie au mauvais endroit

- Pour les sujets de forum, utilisez `-100…:topic:<id>` pour que ce soit explicite et sans ambiguïté.
- Si vous voyez des préfixes `telegram:...` dans les journaux ou les cibles de « dernière route » stockées, c'est normal ;
  la livraison cron les accepte et analyse toujours correctement les ID de sujet.

### Nouvelles tentatives de livraison d'annonce de sous-agent

- Lorsqu'une exécution de sous-agent est terminée, la passerelle annonce le résultat à la session demanderesse.
- Si le flux d'annonce renvoie `false` (par exemple, la session demanderesse est occupée), la passerelle réessaie jusqu'à 3 fois avec un suivi via `announceRetryCount`.
- Les annonces datant de plus de 5 minutes après `endedAt` sont expirées de force pour empêcher les entrées obsolètes de boucler indéfiniment.
- Si vous voyez des livraisons d'annonces répétées dans les journaux, vérifiez le registre des sous-agents pour les entrées avec des valeurs `announceRetryCount` élevées.

## Connexes

- [Aperçu de l'automatisation](/en/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) — quand utiliser chacun
- [Tâches d'arrière-plan](/en/automation/tasks) — registre des tâches pour les exécutions cron
- [Heartbeat](/en/gateway/heartbeat) — tours périodiques de session principale
- [Dépannage](/en/automation/troubleshooting) — débogage des problèmes d'automatisation
