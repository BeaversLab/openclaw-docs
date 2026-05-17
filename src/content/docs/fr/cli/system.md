---
summary: "Référence CLI pour `openclaw system` (événements système, battement de cœur, présence)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "Système"
---

# `openclaw system`

Aides de niveau système pour la Gateway : mettre en file d'attente des événements système, contrôler les battements de cœur,
et afficher la présence.

Toutes les sous-commandes `system` utilisent le Gateway RPC et acceptent les indicateurs client partagés :

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## Commandes courantes

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

Enqueue a system event on the **main** session by default. The next heartbeat
will inject it as a `System:` line in the prompt. Use `--mode now` to trigger
the heartbeat immediately; `next-heartbeat` waits for the next scheduled tick.

Pass `--session-key` to target a specific session (for example to relay an
async-task completion back to the channel that started it).

> **Timing exception with `--session-key`:** when `--session-key` is supplied,
> `--mode next-heartbeat` collapses to an immediate targeted wake instead of
> waiting for the next scheduled tick. Targeted wakes use heartbeat intent
> `immediate` so they bypass the runner's not-due gate that would otherwise
> defer (and effectively drop) an `event`-intent wake. If you want delayed
> delivery, omit `--session-key` so the event lands on the main session and
> rides the next regular heartbeat.

Flags:

- `--text <text>`: required system event text.
- `--mode <mode>`: `now` or `next-heartbeat` (default).
- `--session-key <sessionKey>`: optional; target a specific agent session
  instead of the agent's main session. Keys that do not belong to the
  resolved agent fall back to the agent's main session.
- `--json`: machine-readable output.
- `--url`, `--token`, `--timeout`, `--expect-final`: shared Gateway RPC flags.

## `system heartbeat last|enable|disable`

Heartbeat controls:

- `last`: show the last heartbeat event.
- `enable`: turn heartbeats back on (use this if they were disabled).
- `disable`: pause heartbeats.

Flags:

- `--json`: machine-readable output.
- `--url`, `--token`, `--timeout`, `--expect-final`: shared Gateway RPC flags.

## `system presence`

Liste les entrées de présence système actuelles connues du Gateway (nœuds,
instances et lignes d'état similaires).

Drapeaux :

- `--json` : sortie lisible par machine.
- `--url`, `--token`, `--timeout`, `--expect-final` : drapeaux partagés Gateway RPC.

## Remarques

- Nécessite un Gateway en cours d'exécution accessible par votre configuration actuelle (locale ou distante).
- Les événements système sont éphémères et ne sont pas conservés après les redémarrages.

## Connexes

- [Référence CLI](/fr/cli)
