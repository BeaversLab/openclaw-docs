---
summary: "Référence CLI pour `openclaw system` (événements système, battement de cœur, présence)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "system"
---

# `openclaw system`

Aides de niveau système pour la Gateway : mettre en file d'attente des événements système, contrôler les battements de cœur,
et afficher la présence.

## Commandes courantes

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

Met en file d'attente un événement système sur la session **principale**. Le prochain battement de cœur l'injectera
en tant que ligne `System:` dans l'invite. Utilisez `--mode now` pour déclencher le battement de cœur
immédiatement ; `next-heartbeat` attend le prochain cycle programmé.

Indicateurs :

- `--text <text>` : texte de l'événement système requis.
- `--mode <mode>` : `now` ou `next-heartbeat` (par défaut).
- `--json` : sortie lisible par machine.

## `system heartbeat last|enable|disable`

Contrôles du battement de cœur :

- `last` : afficher le dernier événement de battement de cœur.
- `enable` : réactiver les battements de cœur (à utiliser s'ils ont été désactivés).
- `disable` : suspendre les battements de cœur.

Indicateurs :

- `--json` : sortie lisible par machine.

## `system presence`

Lister les entrées de présence système actuelles que la Gateway connaît (nœuds,
instances et lignes d'état similaires).

Indicateurs :

- `--json` : sortie lisible par machine.

## Notes

- Nécessite une Gateway en cours d'exécution accessible par votre configuration actuelle (locale ou distante).
- Les événements système sont éphémères et ne sont pas persistants après les redémarrages.

import fr from "/components/footer/fr.mdx";

<fr />
