---
summary: "Troubleshoot cron and heartbeat scheduling and delivery"
read_when:
  - Cron did not run
  - Cron ran but no message was delivered
  - Heartbeat seems silent or skipped
title: "Automation Troubleshooting"
---

# Automation troubleshooting

Use this page for scheduler and delivery issues (`cron` + `heartbeat`).

## Command ladder

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Then run automation checks:

```bash
openclaw cron status
openclaw cron list
openclaw system heartbeat last
```

## Cron not firing

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow
```

Good output looks like:

- `cron status` reports enabled and a future `nextWakeAtMs`.
- Job is enabled and has a valid schedule/timezone.
- `cron runs` shows `ok` or explicit skip reason.

Common signatures:

- `cron: scheduler disabled; jobs will not run automatically` → cron disabled in config/env.
- `cron: timer tick failed` → scheduler tick crashed; inspect surrounding stack/log context.
- `reason: not-due` in run output → manual run called without `--force` and job not due yet.

## Cron fired but no delivery

```bash
openclaw cron runs --id <jobId> --limit 20
openclaw cron list
openclaw channels status --probe
openclaw logs --follow
```

Good output looks like:

- Run status is `ok`.
- Delivery mode/target are set for isolated jobs.
- Channel probe reports target channel connected.

Common signatures:

- Run succeeded but delivery mode is `none` → no external message is expected.
- Delivery target missing/invalid (`channel`/`to`) → run may succeed internally but skip outbound.
- Channel auth errors (`unauthorized`, `missing_scope`, `Forbidden`) → delivery blocked by channel credentials/permissions.

## Heartbeat suppressed or skipped

```bash
openclaw system heartbeat last
openclaw logs --follow
openclaw config get agents.defaults.heartbeat
openclaw channels status --probe
```

Good output looks like:

- Heartbeat enabled with non-zero interval.
- Last heartbeat result is `ran` (or skip reason is understood).

Common signatures:

- `heartbeat skipped` with `reason=quiet-hours` → outside `activeHours`.
- `requests-in-flight` → main lane busy; heartbeat deferred.
- `empty-heartbeat-file` → interval heartbeat ignoré car `HEARTBEAT.md` n'a pas de contenu actionnable et aucun événement cron étiqueté n'est en file d'attente.
- `alerts-disabled` → les paramètres de visibilité suppriment les messages heartbeat sortants.

## Pièges liés au fuseau horaire et aux activeHours

```bash
openclaw config get agents.defaults.heartbeat.activeHours
openclaw config get agents.defaults.heartbeat.activeHours.timezone
openclaw config get agents.defaults.userTimezone || echo "agents.defaults.userTimezone not set"
openclaw cron list
openclaw logs --follow
```

Règles rapides :

- `Config path not found: agents.defaults.userTimezone` signifie que la clé n'est pas définie ; le heartbeat revient au fuseau horaire de l'hôte (ou `activeHours.timezone` si défini).
- Cron sans `--tz` utilise le fuseau horaire de l'hôte de la passerelle.
- Le heartbeat `activeHours` utilise la résolution de fuseau horaire configurée (`user`, `local` ou tz IANA explicite).
- Les planifications Cron `at` traitent les horodatages ISO sans fuseau horaire comme UTC, sauf si vous avez utilisé le CLI `--at "<offset-less-iso>" --tz <iana>`.

Signatures courantes :

- Les tâches s'exécutent à la mauvaise heure horloge après un changement de fuseau horaire de l'hôte.
- Heartbeat est toujours ignoré pendant la journée car `activeHours.timezone` est incorrect.

Connexes :

- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)
- [/automation/cron-vs-heartbeat](/en/automation/cron-vs-heartbeat)
- [/concepts/timezone](/en/concepts/timezone)
