---
summary: "Gestion des fuseaux horaires pour les agents, les enveloppes et les invites"
read_when:
  - You need to understand how timestamps are normalized for the model
  - Configuring the user timezone for system prompts
title: "Fuseaux horaires"
---

OpenClaw normalise les horodatages afin que le modèle voie une **heure de référence unique**.

## Enveloppes de messages (locales par défaut)

Les messages entrants sont enveloppés dans une enveloppe telle que :

```
[Provider ... 2026-01-05 16:26 PST] message text
```

L'horodatage dans l'enveloppe est **local à l'hôte par défaut**, avec une précision à la minute.

Vous pouvez modifier ce paramètre avec :

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA timezone
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  },
}
```

- `envelopeTimezone: "utc"` utilise UTC.
- `envelopeTimezone: "user"` utilise `agents.defaults.userTimezone` (revient au fuseau horaire de l'hôte).
- Utilisez un fuseau horaire IANA explicite (par ex., `"Europe/Vienna"`) pour un décalage fixe.
- `envelopeTimestamp: "off"` supprime les horodatages absoluts des en-têtes de l'enveloppe.
- `envelopeElapsed: "off"` supprime les suffixes de temps écoulé (le style `+2m`).

### Exemples

**Local (par défaut) :**

```
[Signal Alice +1555 2026-01-18 00:19 PST] hello
```

**Fuseau horaire fixe :**

```
[Signal Alice +1555 2026-01-18 06:19 GMT+1] hello
```

**Temps écoulé :**

```
[Signal Alice +1555 +2m 2026-01-18T05:19Z] follow-up
```

## Payloads d'outils (données brutes du provider + champs normalisés)

Les appels d'outils (`channels.discord.readMessages`, `channels.slack.readMessages`, etc.) renvoient des **horodatages bruts du provider**.
Nous attachons également des champs normalisés pour la cohérence :

- `timestampMs` (millisecondes depuis l'époque UTC)
- `timestampUtc` (chaîne ISO 8601 UTC)

Les champs bruts du provider sont conservés.

## Fuseau horaire de l'utilisateur pour le système de prompt

Définissez `agents.defaults.userTimezone` pour indiquer au modèle le fuseau horaire local de l'utilisateur. S'il n'est
pas défini, OpenClaw résout le **fuseau horaire de l'hôte au moment de l'exécution** (sans écriture de configuration).

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

Le système de prompt inclut :

- Section `Current Date & Time` avec l'heure locale et le fuseau horaire
- `Time format: 12-hour` ou `24-hour`

Vous pouvez contrôler le format du prompt avec `agents.defaults.timeFormat` (`auto` | `12` | `24`).

Voir [Date & Time](/fr/date-time) pour le comportement complet et les exemples.

## Connexes

- [Heartbeat](/fr/gateway/heartbeat) — les heures actives utilisent le fuseau horaire pour la planification
- [Cron Jobs](/fr/automation/cron-jobs) — les expressions cron utilisent le fuseau horaire pour la planification
- [Date & Time](/fr/date-time) — comportement complet de la date/heure et exemples
