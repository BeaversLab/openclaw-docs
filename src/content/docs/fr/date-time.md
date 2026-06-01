---
summary: "Gestion de la date et de l'heure pour les enveloppes, les invites, les outils et les connecteurs"
read_when:
  - You are changing how timestamps are shown to the model or users
  - You are debugging time formatting in messages or system prompt output
title: "Date et heure"
---

OpenClaw utilise par défaut l'**heure locale de l'hôte pour les horodatages de transport** et le **fuseau horaire de l'utilisateur uniquement dans le prompt système**.
Les horodatages du provider sont conservés afin que les outils gardent leur sémantique native (l'heure actuelle est disponible via OpenClaw`session_status`).

## Enveloppes de messages (locale par défaut)

Les messages entrants sont encapsulés avec un horodatage (précision à la seconde) :

```
[Provider ... Mon 2026-01-05 16:26:34 PST] message text
```

Cet horodatage d'enveloppe est **local à l'hôte par défaut**, quel que soit le fuseau horaire du provider.

Vous pouvez modifier ce comportement :

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
- `envelopeTimezone: "local"` utilise le fuseau horaire de l'hôte.
- `envelopeTimezone: "user"` utilise `agents.defaults.userTimezone` (revient au fuseau horaire de l'hôte).
- Utilisez un fuseau horaire IANA explicite (par exemple, `"America/Chicago"`) pour une zone fixe.
- `envelopeTimestamp: "off"` supprime les horodatages absolus des en-têtes d'enveloppe.
- `envelopeElapsed: "off"` supprime les suffixes de temps écoulé (le style `+2m`).

### Exemples

**Local (par défaut) :**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 PST] hello
```

**Fuseau horaire de l'utilisateur :**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 CST] hello
```

**Temps écoulé activé :**

```
[WhatsApp +1555 +30s Sun 2026-01-18T05:19:00Z] follow-up
```

## Prompt système : date et heure actuelles

Si le fuseau horaire de l'utilisateur est connu, le prompt système inclut une section dédiée
**Date et heure actuelles** avec **uniquement le fuseau horaire** (sans format d'horloge/heure)
pour garder le cache du prompt stable :

```
Time zone: America/Chicago
```

Lorsque l'agent a besoin de l'heure actuelle, utilisez l'outil `session_status` ; la carte de statut
inclut une ligne d'horodatage.

## Lignes d'événements système (locales par défaut)

Les événements système mis en file d'attente et insérés dans le contexte de l'agent sont préfixés par un horodatage utilisant le
même choix de fuseau horaire que les enveloppes de messages (par défaut : local à l'hôte).

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### Configurer le fuseau horaire + format de l'utilisateur

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto", // auto | 12 | 24
    },
  },
}
```

- `userTimezone` définit le **fuseau horaire local de l'utilisateur** pour le contexte du prompt.
- `timeFormat` contrôle l'**affichage 12h/24h** dans le prompt. `auto` suit les préférences de l'OS.

## Détection du format de l'heure (auto)

Quand `timeFormat: "auto"`OpenClaw, OpenClaw inspecte la préférence de l'OS (macOS/Windows)
et revient au format de la locale. La valeur détectée est **mise en cache par processus**
pour éviter les appels système répétés.

## Payloads d'outils + connecteurs (heure brute du provider + champs normalisés)

Les outils de canal renvoient des horodatages **natifs du provider** et ajoutent des champs normalisés pour la cohérence :

- `timestampMs` : millisecondes de l'époque (UTC)
- `timestampUtc` : chaîne ISO 8601 UTC

Les champs bruts du provider sont conservés pour ne rien perdre.

- Slack : chaînes de type epoch provenant de l'API
- Discord : horodatages ISO UTC
- Telegram/WhatsApp : horodatages numériques/ISO spécifiques au provider

Si vous avez besoin de l'heure locale, convertissez-la en aval en utilisant le fuseau horaire connu.

## Documentation connexe

- [Invite système](/fr/concepts/system-prompt)
- [Fuseaux horaires](/fr/concepts/timezone)
- [Messages](/fr/concepts/messages)
