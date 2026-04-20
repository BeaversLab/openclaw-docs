---
summary: "Gestion de la date et de l'heure pour les enveloppes, les invites, les outils et les connecteurs"
read_when:
  - You are changing how timestamps are shown to the model or users
  - You are debugging time formatting in messages or system prompt output
title: "Date et heure"
---

# Date & heure

OpenClaw utilise par défaut **l'heure locale de l'hôte pour les horodatages de transport** et **le fuseau horaire de l'utilisateur uniquement dans l'invite système**.
Les horodatages du provider sont conservés pour que les outils gardent leur sémantique native (l'heure actuelle est disponible via `session_status`).

## Enveloppes de messages (locales par défaut)

Les messages entrants sont encapsulés avec un horodatage (précision à la minute) :

```
[Provider ... 2026-01-05 16:26 PST] message text
```

Cet horodatage d'enveloppe est **local à l'hôte par défaut**, quel que soit le fuseau horaire du provider.

Vous pouvez remplacer ce comportement :

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
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**Fuseau horaire utilisateur :**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**Temps écoulé activé :**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## Invite système : Date et heure actuelles

Si le fuseau horaire de l'utilisateur est connu, l'invite système comprend une section dédiée
**Date et heure actuelles** avec **uniquement le fuseau horaire** (sans format d'horloge/d'heure)
pour garder stable le cache de l'invite :

```
Time zone: America/Chicago
```

Lorsque l'agent a besoin de l'heure actuelle, utilisez l'outil `session_status` ; la carte de statut
comprend une ligne d'horodatage.

## Lignes d'événements système (locales par défaut)

Les événements système mis en file d'attente et insérés dans le contexte de l'agent sont préfixés par un horodatage utilisant le
même choix de fuseau horaire que les enveloppes de messages (par défaut : local à l'hôte).

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### Configurer le fuseau horaire et le format utilisateur

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

- `userTimezone` définit le **fuseau horaire utilisateur local** pour le contexte de l'invite.
- `timeFormat` contrôle l'**affichage 12h/24h** dans le prompt. `auto` suit les préférences de l'OS.

## Détection automatique du format de l'heure

Lorsque `timeFormat: "auto"`, OpenClaw inspecte les préférences de l'OS (macOS/Windows)
et revient au formatage des paramètres régionaux. La valeur détectée est **mise en cache par processus**
pour éviter les appels système répétés.

## Payloads d'outils + connecteurs (heure provider brute + champs normalisés)

Les outils de canal renvoient des **horodatages natifs du provider** et ajoutent des champs normalisés pour la cohérence :

- `timestampMs` : millisecondes depuis l'époque (UTC)
- `timestampUtc` : chaîne ISO 8601 UTC

Les champs bruts du provider sont conservés pour ne rien perdre.

- Slack : chaînes de type époque provenant de API
- Discord : horodatages ISO UTC
- Telegram/WhatsApp : horodatages numériques/ISO spécifiques au provider

Si vous avez besoin de l'heure locale, convertissez-la en aval en utilisant le fuseau horaire connu.

## Documentation connexe

- [Prompt système](/fr/concepts/system-prompt)
- [Fuseaux horaires](/fr/concepts/timezone)
- [Messages](/fr/concepts/messages)
