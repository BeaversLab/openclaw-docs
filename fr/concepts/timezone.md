---
summary: "Gestion des fuseaux horaires pour les agents, les enveloppes et les invites"
read_when:
  - Vous devez comprendre comment les horodatages sont normalisés pour le model
  - Configuration du fuseau horaire de l'utilisateur pour les invites système
title: "Fuseaux horaires"
---

# Fuseaux horaires

OpenClaw normalise les horodatages afin que le model voie une **heure de référence unique**.

## Enveloppes de messages (locales par défaut)

Les messages entrants sont enveloppés comme suit :

```
[Provider ... 2026-01-05 16:26 PST] message text
```

L'horodatage dans l'enveloppe est **local à l'hôte par défaut**, avec une précision à la minute.

Vous pouvez remplacer ce comportement par :

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
- Utilisez un fuseau horaire IANA explicite (par ex. `"Europe/Vienna"`) pour un décalage fixe.
- `envelopeTimestamp: "off"` supprime les horodatages absolus des en-têtes de l'enveloppe.
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
- `timestampUtc` (chaîne UTC ISO 8601)

Les champs bruts du provider sont préservés.

## Fuseau horaire utilisateur pour l'invite système

Définissez `agents.defaults.userTimezone` pour indiquer au model le fuseau horaire local de l'utilisateur. S'il n'est
pas défini, OpenClaw résout le **fuseau horaire de l'hôte au moment de l'exécution** (pas d'écriture de configuration).

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

L'invite système comprend :

- section `Current Date & Time` avec l'heure locale et le fuseau horaire
- `Time format: 12-hour` ou `24-hour`

Vous pouvez contrôler le format de l'invite avec `agents.defaults.timeFormat` (`auto` | `12` | `24`).

Voir [Date & Time](/fr/date-time) pour le comportement complet et les exemples.

import fr from "/components/footer/fr.mdx";

<fr />
