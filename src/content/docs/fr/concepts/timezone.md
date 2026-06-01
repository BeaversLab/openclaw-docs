---
summary: "OpenClawOù les fuseaux horaires apparaissent dans OpenClaw — enveloppes, charges utiles d'outils, système de prompt"
read_when:
  - You want a quick mental model for timezone handling
  - You are deciding where to set or override a timezone
title: "Fuseaux horaires"
---

OpenClaw normalise les horodatages afin que le model voie une **heure de référence unique** au lieu d'un mélange d'horloges locales aux fournisseurs. Il existe trois surfaces où les fuseaux horaires apparaissent, chacune ayant son propre objectif :

## Trois surfaces de fuseau horaire

| Surface                 | Ce qu'elle affiche                                                                                                              | Par défaut                                                  | Configuré via                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Enveloppes de messages  | Encapsule les messages du channel entrant : `[Signal +1555 Sun 2026-01-18 00:19:42 PST] hello`                                  | Hôte local                                                  | `agents.defaults.envelopeTimezone`                             |
| Charges utiles d'outils | Les outils de style channel `readMessages` renvoient l'heure brute du provider + `timestampMs` normalisé / `timestampUtc`       | Champs UTC toujours présents                                | Non configurable — préserve les horodatages natifs du provider |
| Prompt système          | Un petit bloc `Current Date & Time` avec **uniquement le fuseau horaire** (pas de valeur d'horloge, pour la stabilité du cache) | Fuseau horaire de l'hôte si `userTimezone` n'est pas défini | `agents.defaults.userTimezone`                                 |

Le prompt système omet délibérément l'horloge en direct pour garder la mise en cache du prompt stable entre les tours. Lorsque l'agent a besoin de l'heure actuelle, il appelle `session_status`.

## Définir le fuseau horaire de l'utilisateur

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
    },
  },
}
```

Si `userTimezone`OpenClaw n'est pas défini, OpenClaw résout le fuseau horaire de l'hôte au moment de l'exécution (pas d'écriture de configuration). `agents.defaults.timeFormat` (`auto` | `12` | `24`) contrôle le rendu 12h/24h dans les enveloppes et les surfaces en aval, et non dans la section du prompt système.

## Quand remplacer

- **Utilisez les enveloppes UTC** (`envelopeTimezone: "utc"`) lorsque vous souhaitez des horodatages stables sur les hôtes dans différentes régions, ou lorsque vous souhaitez que les journaux alignés sur l'UTC correspondent à la sortie de diagnostic.
- **Utilisez un fuseau IANA fixe** (par exemple `"Europe/Vienna"`) lorsque l'hôte de passerelle est dans une zone mais que l'utilisateur est dans une autre et que vous souhaitez que les enveloppes soient lues dans la zone de l'utilisateur quelle que soit la migration de l'hôte.
- **Définissez `envelopeTimestamp: "off"`** pour des enveloppes à faible nombre de jetons lorsque le contexte d'horodatage n'est pas utile pour la conversation.

Pour la référence complète du comportement, les exemples par provider et le formatage de la durée écoulée, voir [Date & Time](/fr/date-time).

## Connexes

- [Date & Time](/fr/date-time) — comportement complet de l'enveloppe/tool/prompt et exemples.
- [Heartbeat](/fr/gateway/heartbeat) — les heures actives utilisent le fuseau horaire pour la planification.
- [Cron Jobs](/fr/automation/cron-jobs) — les expressions cron utilisent le fuseau horaire pour la planification.
